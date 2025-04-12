// compute_worker.js
// Tento worker počítá pouze animace pozic uzlů.
// Neposílá počáteční stav, pouze dávky ('batch') uzlů, které se mají pohnout.

// --- Nastavení animace ---
// Jak velký krok (v procentech zbývající vzdálenosti) udělá uzel za jeden snímek animace
const coordinateStep = 0.1;
// Kolik uzlů (zlomek z celkového počtu *animovaných*) zpracujeme v jedné dávce za snímek
const batchSize = 1/3;
// Interval mezi jednotlivými kroky animace v milisekundách (~60 FPS)
const animationInterval = 16;
// Tolerance pro určení, zda je uzel již na cílové pozici (kvůli nepřesnostem float)
const positionTolerance = coordinateStep / 10;

// --- Paměť workera ---
// Uchovává si stav mezi jednotlivými zprávami od hlavního vlákna

// Map<nodeId, { x, y, z }> - Cílové pozice uzlů přijaté z hlavního vlákna
let targetNodes = new Map();
// Map<nodeId, { x, y, z }> - Aktuální pozice uzlů, které worker animuje a aktualizuje
let actualNodes = new Map();

// --- Stav animace ---
let animationTimerId = null;     // ID časovače pro setTimeout/clearTimeout
let nodeKeysToAnimate = [];      // Pole IDček uzlů, které *aktuálně* potřebují animaci
let currentBatchStartIndex = 0;  // Index v poli nodeKeysToAnimate pro další dávku

// --- Zpracování zpráv od hlavního vlákna ---
self.onmessage = function(event) {
    const data = event.data;

    // Zpracováváme pouze zprávy typu 'data', které obsahují nový cílový stav grafu
    if (data.type === 'data') {
        console.log("[ComputeWorker] Přijata nová cílová data.");

        // Zastavíme jakoukoli předchozí běžící animaci pro stará data
        if (animationTimerId) {
            clearTimeout(animationTimerId);
            animationTimerId = null;
            console.log("[ComputeWorker] Předchozí animace zastavena.");
        }

        // Aktualizujeme cílové pozice na základě nových dat
        targetNodes = new Map(data.nodes.map(node => [node.id, { x: node.x, y: node.y, z: node.z }]));

        // --- Zjistíme, které uzly potřebují animaci ---
        // Porovnáme nové cílové pozice s aktuálními pozicemi (z minula nebo nově inicializovanými)
        const nodesRequiringAnimation = []; // Sem uložíme ID uzlů k animaci

        // Projdeme všechny *cílové* uzly
        targetNodes.forEach((targetPos, nodeId) => {
            if (!actualNodes.has(nodeId)) {
                // Uzel je nový pro tento worker -> inicializujeme jeho 'aktuální' pozici na cílovou.
                // Nepotřebuje animaci, protože hlavní vlákno ho již vykreslilo na cíli.
                actualNodes.set(nodeId, { ...targetPos });
            } else {
                // Uzel již existoval -> zkontrolujeme, zda potřebuje animaci
                if (!isAtTarget(nodeId, targetPos)) {
                    // Pokud jeho aktuální pozice (z minulé animace) není shodná s NOVOU cílovou pozicí,
                    // přidáme ho do seznamu k animaci.
                    nodesRequiringAnimation.push(nodeId);
                } else {
                     // Uzel už je na své nové cílové pozici. Aktualizujeme actualNodes pro konzistenci,
                     // ale není třeba ho animovat.
                     actualNodes.set(nodeId, { ...targetPos });
                }
            }
        });

        // Odstraníme z `actualNodes` ty uzly, které už nejsou v nových `targetNodes`
        const targetNodeIds = new Set(targetNodes.keys());
        actualNodes.forEach((_, nodeId) => {
            if (!targetNodeIds.has(nodeId)) {
                actualNodes.delete(nodeId);
                console.log(`[ComputeWorker] Odstraněn uzel ${nodeId} z actualNodes.`);
            }
        });

        // --- Spuštění nové animace (pokud je potřeba) ---
        if (nodesRequiringAnimation.length > 0) {
            console.log(`[ComputeWorker] ${nodesRequiringAnimation.length} uzlů vyžaduje animaci. Spouštím...`);
            nodeKeysToAnimate = nodesRequiringAnimation; // Nastavíme pole uzlů pro tuto animační sekvenci
            currentBatchStartIndex = 0;                  // Začneme od první dávky
            processAnimationFrame();                     // Spustíme první krok animace
        } else {
            console.log("[ComputeWorker] Žádné uzly nevyžadují animaci.");
            nodeKeysToAnimate = []; // Zajistíme, že je pole prázdné
        }
    }
     // Jiné typy zpráv ignorujeme
};

// --- Funkce pro zpracování jednoho kroku (snímku) animace ---
function processAnimationFrame() {
    // Zkontrolujeme, zda máme co animovat
    if (nodeKeysToAnimate.length === 0) {
         console.warn("[ComputeWorker] processAnimationFrame voláno, ale nejsou uzly k animaci.");
         animationTimerId = null; // Pro jistotu zastavíme další plánování
         return;
    }

    // Pokud jsme v tomto cyklu zpracovali všechny dávky uzlů určených k animaci
    if (currentBatchStartIndex >= nodeKeysToAnimate.length) {
        // Zkontrolujeme, zda všechny animované uzly skutečně dosáhly svých cílů
        const allAnimatedNodesAtTarget = nodeKeysToAnimate.every(nodeId =>
            isAtTarget(nodeId, targetNodes.get(nodeId)) // Zkontrolujeme vůči finálnímu cíli
        );

        if (allAnimatedNodesAtTarget) {
            // Všechny animované uzly jsou v cíli
            console.log("[ComputeWorker] Všechny animované uzly dosáhly cíle. Animace končí.");
            animationTimerId = null; // Zastavit další plánování
            nodeKeysToAnimate = [];    // Vyprázdnit seznam pro příští běh
            return; // Konec animace pro tato data
        } else {
            // Některé uzly se stále pohybují -> začneme další cyklus zpracování dávek
            console.log("[ComputeWorker] Konec cyklu dávek, ale ne všechny uzly v cíli. Spouštím další cyklus.");
            currentBatchStartIndex = 0; // Začneme znovu od první dávky animovaných uzlů
            // Pokračujeme dál ve funkci k naplánování dalšího kroku...
        }
    }

    // --- Zpracování aktuální dávky ---
    // Spočítáme velikost dávky a konečný index v poli `nodeKeysToAnimate`
    // Použijeme Math.max(1, ...) aby batchCount nebyl nula pro malý počet uzlů
    const batchCount = Math.max(1, Math.ceil(nodeKeysToAnimate.length * batchSize));
    const batchEndIndex = Math.min(currentBatchStartIndex + batchCount, nodeKeysToAnimate.length);

    // Vybereme ID uzlů pro TUTO konkrétní dávku
    const batchIds = nodeKeysToAnimate.slice(currentBatchStartIndex, batchEndIndex);
    // console.log(`[ComputeWorker] Zpracovávám dávku: Start=${currentBatchStartIndex}, Konec=${batchEndIndex}, Počet=${batchIds.length}`); // Příliš upovídané

    const updatedNodesBatch = [];      // Pole pro uzly, které se v této dávce pohnuly
    let stillNeedsAnimation = false; // Příznak, zda některý uzel v tomto kroku ještě nedosáhl cíle

    // Projdeme uzly v aktuální dávce
    batchIds.forEach(nodeId => {
        // Uzel by měl existovat v actualNodes i targetNodes, pokud je v nodeKeysToAnimate
        if (!actualNodes.has(nodeId) || !targetNodes.has(nodeId)) {
             console.warn(`[ComputeWorker] Animovaný uzel ${nodeId} nenalezen v mapách, přeskakuji.`);
             return; // Přeskočíme uzel, pokud mezitím zmizel (nemělo by se stát)
        }
        const actual = actualNodes.get(nodeId);
        const target = targetNodes.get(nodeId);

        // Pokud uzel ještě není na cílové pozici (s tolerancí)
        if (!isAtTarget(nodeId, target)) {
            // Vypočítáme vektor posunu
            const dx = target.x - actual.x;
            const dy = target.y - actual.y;
            const dz = target.z - actual.z;

            // Aktualizujeme aktuální pozici o krok směrem k cíli
            actual.x += dx * coordinateStep;
            actual.y += dy * coordinateStep;
            actual.z += dz * coordinateStep;

            // Ošetření "přestřelení" - pokud jsme se dostali velmi blízko, nastavíme přímo cíl
             if (Math.abs(target.x - actual.x) < positionTolerance) actual.x = target.x;
             if (Math.abs(target.y - actual.y) < positionTolerance) actual.y = target.y;
             if (Math.abs(target.z - actual.z) < positionTolerance) actual.z = target.z;

            // Přidáme uzel s novou pozicí do dávky pro odeslání
            updatedNodesBatch.push({ nodeId, pos: { ...actual } });

            // Zkontrolujeme znovu po posunu, zda už jsme v cíli
            if (!isAtTarget(nodeId, target)) {
                // Pokud ani po posunu nejsme v cíli, animace musí pokračovat
                stillNeedsAnimation = true;
            }
        }
         // else: Uzel je již v cíli, nic neděláme
    });

    // Odešleme dávku aktualizovaných pozic hlavnímu vláknu, POUZE pokud obsahuje nějaké změny
    if (updatedNodesBatch.length > 0) {
        self.postMessage({
            type: 'batch',
            nodes: updatedNodesBatch
            // Hrany neposíláme, hlavní vlákno si je aktualizuje samo
        });
    }

    // Posuneme index pro zpracování další dávky v příštím kroku
    currentBatchStartIndex = batchEndIndex;

    // --- Naplánování dalšího kroku animace ---
    // Pokračujeme, pokud:
    // 1. Ještě zbývají dávky v tomto cyklu (currentBatchStartIndex < nodeKeysToAnimate.length)
    // NEBO
    // 2. Jsme na konci cyklu, ALE některý uzel se v tomto kroku ještě hýbal a potřebuje další iteraci (stillNeedsAnimation)
    if (currentBatchStartIndex < nodeKeysToAnimate.length || stillNeedsAnimation) {
        animationTimerId = setTimeout(processAnimationFrame, animationInterval);
    } else {
        // Jsme na konci cyklu (currentBatchStartIndex >= nodeKeysToAnimate.length)
        // a zároveň už žádný uzel v poslední dávce nepotřeboval další animaci (stillNeedsAnimation === false)
        // To znamená, že všechny uzly by měly být v cíli.
        console.log("[ComputeWorker] Všechny dávky zpracovány a uzly by měly být v cíli. Ukončuji animaci pro tato data.");
        animationTimerId = null; // Definitivně konec
        nodeKeysToAnimate = []; // Vyčistit pro příští data
    }
}

// --- Pomocná funkce: Zjistí, zda je uzel na cílové pozici s danou tolerancí ---
function isAtTarget(nodeId, targetPos) {
     // Zkontrolujeme existenci uzlu a cíle
     if (!actualNodes.has(nodeId)) {
         // Pokud uzel z nějakého důvodu zmizel z actualNodes, považujeme ho za "hotový"
         console.warn(`[ComputeWorker] isAtTarget: Uzel ${nodeId} nenalezen v actualNodes.`);
         return true;
     }
     if (!targetPos) {
          console.warn(`[ComputeWorker] isAtTarget: Pro uzel ${nodeId} nebyla poskytnuta cílová pozice.`);
          return true; // Pokud není cíl, nelze určit, zda tam je
     }

    const actual = actualNodes.get(nodeId);
    // Vrátí true, pokud je rozdíl ve všech souřadnicích menší než tolerance
    return Math.abs(actual.x - targetPos.x) < positionTolerance &&
           Math.abs(actual.y - targetPos.y) < positionTolerance &&
           Math.abs(actual.z - targetPos.z) < positionTolerance;
}