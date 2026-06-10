// global_controller.js

// Logování načtení souboru – informace o načtení skriptu do konzole
console.log("global_controller.js načten - čekám na inicializaci vieweru...");

// --- Globální stavy ---
// Tyto struktury uchovávají aktuální data grafu synchronizovaná s vizualizací

// Map<nodeId, { labelId, x, y, z }>
// - Klíč: ID uzlu (např. "node_0")
// - Hodnota: Objekt s ID labelu (vrácené z labelManageru) a aktuálními souřadnicemi
const currentNodes = new Map();

// Map<managerEdgeId, { source, target }>
// - Klíč: ID hrany vrácené z edgeManageru (může být číslo nebo string)
// - Hodnota: Objekt s ID zdrojového a cílového uzlu (např. "node_0", "node_1")
const currentEdges = new Map();

// Map<nodeId, Set<managerEdgeId>>
// - Klíč: ID uzlu (např. "node_0")
// - Hodnota: Set ID hran (klíče z currentEdges) připojených k uzlu (jako zdroj nebo cíl)
// Používá se pro aktualizaci hran při pohybu uzlu
const nodeToEdgesMap = new Map();

// Map<'source-target', managerEdgeId>
// - Klíč: Kombinace ID zdrojového a cílového uzlu (např. "node_0-node_1")
// - Hodnota: ID hrany vrácené z edgeManageru
// Slouží pro rychlé zjištění, zda hrana již existuje
const edgeKeyToManagerId = new Map();

// --- Inicializace po načtení vieweru ---
// Spustí se, jakmile viewer signalizuje, že je připraven
window.addEventListener('viewerInitialized', () => {
    console.log("[Main] Viewer inicializován.");

    // --- Reference na managery ---
    // Získáváme API pro práci s uzly (labely) a hranami z globálního objektu window
    const labelManager = window.labelManager; // API pro manipulaci s uzly
    const edgeManager = window.edgeManager;   // API pro manipulaci s hranami

    // Kontrola dostupnosti managerů
    if (!labelManager || !edgeManager) {
        console.error("Chyba: labelManager nebo edgeManager nejsou dostupné!");
        return; // Pokud managery chybí, kód se ukončí
    }

    // --- Vytvoření Web Workerů ---
    // Používáme oddělená vlákna pro načítání dat a výpočty animací
    const fetchWorker = new Worker('fetchWorker.js');   // Načítání dat z URL
    const computeWorker = new Worker('computeWorker.js'); // Výpočet animací

    // --- Zpracování zpráv od fetchWorkeru ---
    // Reakce na data nebo chyby při načítání
    fetchWorker.onmessage = ({ data }) => {
        if (data.type === 'data') {
            // Data úspěšně načtena
            console.log("[Main] Data přijata od fetchWorkeru.");

            // 1. Synchronizace stavu a prvotní vykreslení
            console.log("[Main] Zpracovávám data pro prvotní vykreslení...");
            processInitialGraphData(data.nodes, data.edges || []); // Zajistíme, že edges je pole
            console.log("[Main] Prvotní vykreslení dokončeno.");

            // 2. Předání dat pro animaci
            console.log("[Main] Předávám data computeWorkeru pro animaci...");
            computeWorker.postMessage({
                type: 'data',
                nodes: data.nodes,  // Cílové pozice uzlů
                edges: data.edges || [] // Hrany (pro budoucí rozšíření)
            });
        } else if (data.type === 'error') {
            // Chyba při načítání
            console.error("[Main] Chyba ve fetchWorkeru:", data.error);
        }
    };

    // --- Zpracování zpráv od computeWorkeru ---
    // Reakce na animované pozice uzlů
    computeWorker.onmessage = ({ data }) => {
        if (data.type === 'batch') {
            const edgesToUpdate = new Set(); // Set hran k aktualizaci

            // Procházíme uzly v dávce
            data.nodes.forEach(({ nodeId, pos }) => {
                const node = currentNodes.get(nodeId);
                if (node) {
                    // Aktualizace pozice uzlu
                    labelManager.updateLabelPosition(node.labelId, pos.x, pos.y, pos.z);
                    node.x = pos.x;
                    node.y = pos.y;
                    node.z = pos.z;

                    // Informace pro edgeManager
                    edgeManager.updateNode(nodeId, pos.x, pos.y, pos.z);

                    // Najdeme připojené hrany
                    const connectedEdges = nodeToEdgesMap.get(nodeId);
                    if (connectedEdges) {
                        connectedEdges.forEach(edgeId => edgesToUpdate.add(edgeId));
                    }
                } else {
                    console.warn(`[Main] Batch update pro neexistující uzel: ${nodeId}`);
                }
            });

            // Aktualizace hran
            if (edgesToUpdate.size > 0) {
                const updateEdgeMethodName = 'updateEdgePosition'; // Uprav podle názvu metody edgeManageru!
                if (typeof edgeManager[updateEdgeMethodName] === 'function') {
                    edgesToUpdate.forEach(edgeId => {
                        if (currentEdges.has(edgeId)) {
                            edgeManager[updateEdgeMethodName](edgeId);
                        } else {
                            console.warn(`[Main] Pokus o aktualizaci neexistující hrany: ${edgeId}`);
                        }
                    });
                } else {
                    console.warn(`[Main] Metoda '${updateEdgeMethodName}' v edgeManageru není k dispozici!`);
                }
            }
        }
    };

    // --- Funkce pro synchronizaci dat ---
    // Synchronizuje stav aplikace s přijatými daty a aktualizuje vizualizaci
    function processInitialGraphData(nodes, edges) {
        const receivedNodeIds = new Set(); // Sledování přijatých uzlů

        // Krok 1: Zpracování uzlů (přidání/aktualizace)
        nodes.forEach(node => {
            const nodeId = node.id;
            const targetPos = { x: node.x, y: node.y, z: node.z };
            receivedNodeIds.add(nodeId);
            const existingNode = currentNodes.get(nodeId);

            if (!existingNode) {
                // Nový uzel
                const labelId = labelManager.addLabel(targetPos.x, targetPos.y, targetPos.z, nodeId);
                currentNodes.set(nodeId, { labelId, ...targetPos });
                console.log(`[Main][Initial] Přidán uzel: ${nodeId}`);
                edgeManager.updateNode(nodeId, targetPos.x, targetPos.y, targetPos.z);
            } else {
                // Aktualizace existujícího uzlu
                if (existingNode.x !== targetPos.x || existingNode.y !== targetPos.y || existingNode.z !== targetPos.z) {
                    labelManager.updateLabelPosition(existingNode.labelId, targetPos.x, targetPos.y, targetPos.z);
                    existingNode.x = targetPos.x;
                    existingNode.y = targetPos.y;
                    existingNode.z = targetPos.z;
                    console.log(`[Main][Initial] Aktualizována pozice uzlu: ${nodeId}`);
                    edgeManager.updateNode(nodeId, targetPos.x, targetPos.y, targetPos.z);
                }
            }
        });

        // Krok 2: Odstranění nepřijatých uzlů
        currentNodes.forEach((nodeData, nodeId) => {
            if (!receivedNodeIds.has(nodeId)) {
                console.log(`[Main][Initial] Odstraňuji uzel: ${nodeId}`);
                labelManager.deleteLabel(nodeData.labelId);
                if (typeof edgeManager.removeNode === 'function') {
                    edgeManager.removeNode(nodeId);
                } else if (typeof edgeManager.deleteNode === 'function') {
                    edgeManager.deleteNode(nodeId);
                }
                currentNodes.delete(nodeId);
            }
        });

        // Krok 3: Zpracování hran (přidání/existence)
        const receivedEdgeKeys = new Set();
        edges.forEach(edge => {
            if (!currentNodes.has(edge.source) || !currentNodes.has(edge.target)) {
                console.warn(`[Main][Initial] Přeskakuji hranu ${edge.source}->${edge.target} – uzel chybí.`);
                return;
            }

            const edgeKey = `${edge.source}-${edge.target}`;
            receivedEdgeKeys.add(edgeKey);
            if (!edgeKeyToManagerId.has(edgeKey)) {
                console.log(`[Main][Initial] Přidávám hranu: ${edgeKey}`);
                const managerId = edgeManager.addEdge(edge.source, edge.target);
                if (managerId !== null && managerId !== undefined) {
                    currentEdges.set(managerId, { source: edge.source, target: edge.target });
                    edgeKeyToManagerId.set(edgeKey, managerId);
                } else {
                    console.warn(`[Main][Initial] Selhalo přidání hrany: ${edgeKey}`);
                }
            }
        });

        // Krok 4: Odstranění nepřijatých hran
        currentEdges.forEach((edgeInfo, managerId) => {
            const edgeKey = `${edgeInfo.source}-${edgeInfo.target}`;
            if (!receivedEdgeKeys.has(edgeKey)) {
                console.log(`[Main][Initial] Odstraňuji hranu: ${edgeKey} (ID: ${managerId})`);
                edgeManager.deleteEdge(managerId);
                currentEdges.delete(managerId);
                edgeKeyToManagerId.delete(edgeKey);
            }
        });

        // Krok 5: Aktualizace mapování uzlů na hrany
        console.log("[Main][Initial] Aktualizuji nodeToEdgesMap...");
        nodeToEdgesMap.clear();
        currentEdges.forEach((edgeInfo, managerId) => {
            const { source, target } = edgeInfo;
            if (!nodeToEdgesMap.has(source)) nodeToEdgesMap.set(source, new Set());
            if (!nodeToEdgesMap.has(target)) nodeToEdgesMap.set(target, new Set());
            nodeToEdgesMap.get(source).add(managerId);
            nodeToEdgesMap.get(target).add(managerId);
        });
        console.log(`[Main][Initial] nodeToEdgesMap aktualizována: ${nodeToEdgesMap.size} uzlů.`);
    }

    // --- Spuštění aktualizace grafu ---
    function updateGraph() {
        console.log("[Main] Spouštím updateGraph...");
        //fetchWorker.postMessage({ type: 'fetch', url: 'http://localhost:8080/nodes_test.json' });
        fetchWorker.postMessage({ type: 'fetch', url: 'http://localhost:8080/api/v1.0/get-graph-data' });
    }

    // Inicializace a plánování
    updateGraph(); // První spuštění
    const intervalId = setInterval(updateGraph, 5000); // Aktualizace každých 5 sekund
    console.log(`[Main] Automatická aktualizace nastavena (Interval ID: ${intervalId})`);

    // Návod pro ruční manipulaci v konzoli
    console.log("--- Ruční manipulace v konzoli: ---");
    console.log("  window.labelManager.addLabel(x, y, z, 'text')");
    console.log("  window.edgeManager.addEdge('sourceNodeId', 'targetNodeId')");
    console.log("  window.labelManager.deleteLabel('label-ID')");
    console.log("  window.edgeManager.deleteEdge('edge-ID')");
    console.log("  window.labelManager.clearAllLabels()");
    console.log("  window.edgeManager.clearAllEdges()");
    console.log(`  Zastavení aktualizace: clearInterval(${intervalId})`);
    console.log("----------------------------------");
});