import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

class LabelManager {
    constructor(scene) {
        if (!scene || !(scene instanceof THREE.Scene)) { // Přísnější kontrola typu
             throw new Error("LabelManager vyžaduje platnou instanci THREE.Scene.");
        }
        this.scene = scene;
        this.labels = new Map();
        this.labelIdCounter = 0;
        console.log("[LabelManager] Inicializován s platnou scénou.");
    }

    // Privátní funkce pro odeslání POST požadavku při kliknutí na popisek
    async #sendPostRequest(nodeId) {
        console.log(`[LabelManager] Spouští se POST požadavek pro uzel: ${nodeId}`);
        try {
            console.log(`[LabelManager] Vykonam POST pro uzel ${nodeId}.`);
            const response = await fetch('http://localhost:8080/api/v1.0/post-label-click', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nodeId: nodeId,
                    timestamp: new Date().toISOString(),
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`[LabelManager] POST úspěšný pro uzel ${nodeId}:`, result);
            } else {
                // Logování i textové odpovědi pro lepší diagnostiku chyb API
                const errorText = await response.text();
                console.error(`[LabelManager] Chyba při POST požadavku pro uzel ${nodeId}: Status ${response.status}`, errorText);
            }
        } catch (error) {
            console.error(`[LabelManager] Síťová nebo jiná chyba při POST požadavku pro uzel ${nodeId}:`, error);
        }
    }

    addLabel(x, y, z, text, cssClass = 'static-label') {
        const id = `label-${this.labelIdCounter++}`;
        const labelDiv = document.createElement('div');
        labelDiv.textContent = text;
        labelDiv.className = cssClass;
        labelDiv.dataset.labelId = id;
        labelDiv.dataset.nodeId = text; // Ukládáme ID uzlu

        // Toto zajistí, že element bude reagovat na události myši,
        // i kdyby externí CSS (např. pro .static-label nebo rodičovské elementy)
        // nastavovalo 'pointer-events: none;'.
        labelDiv.style.pointerEvents = 'auto';

        console.log(`[LabelManager] Vytvářím popisek: ID="${id}", Text="${text}", Třída="${cssClass}"`);
        // Uchování reference na metodu pro správné odstranění listeneru
        // Použití arrow funkce zachovává správný kontext 'this' pro #sendPostRequest
        const clickHandler = (event) => {
            // Můžeme přidat kontrolu, zda se nekliklo na něco uvnitř popisku, pokud by obsahoval další elementy
            // if (event.target !== labelDiv) return;

            console.log(`[LabelManager] Kliknuto na popisek: ID="${id}", Uzel="${text}"`);
            this.#sendPostRequest(text);

            // DŮLEŽITÉ: Pokud kliknutí interaguje i s 3D scénou (např. OrbitControls),
            // možná budete chtít zastavit další šíření události, aby se např. neotáčela kamera.
            // event.stopPropagation();
        };

        labelDiv.addEventListener('click', clickHandler);
        console.log(`[LabelManager] Click událost přidána pro popisek: ID="${id}"`);

        // Uchováme si referenci na handler pro možnost pozdějšího odstranění
        // Je bezpečnější ukládat přímo funkci než spoléhat na dataset, který nemusí uchovat referenci správně.
        labelDiv._clickHandler = clickHandler; // Uložení přímo na element

        // Testovací mouseover listener (ponechán pro diagnostiku)
        labelDiv.addEventListener('mouseover', () => {
            console.log(`[LabelManager] Myš nad popiskem: ID="${id}"`);
        });


        const labelObject = new CSS2DObject(labelDiv);
        labelObject.position.set(x, y, z);
        labelObject.name = `CSS2D_${id}`;
        labelObject.userData.labelId = id;
        // Můžeme přidat i nodeId do userData pro případné použití s Raycasterem
        labelObject.userData.nodeId = text;

        this.scene.add(labelObject);
        this.labels.set(id, labelObject);
        console.log(`[LabelManager] Popisek přidán do scény: ID="${id}", Text="${text}", Pozice=(${x},${y},${z})`);

        // Debug ověření připojení k DOM (pro diagnostiku)
        setTimeout(() => {
            if (document.contains(labelDiv)) { // Spolehlivější kontrola než parentNode
                console.log(`[LabelManager] Popisek ID="${id}" je v DOM.`);
                // Zde můžete pomocí DevTools zkontrolovat jeho styly (hlavně pointer-events a z-index)
            } else {
                console.warn(`[LabelManager] Popisek ID="${id}" NENÍ v DOM! Zkontrolujte inicializaci a připojení CSS2DRenderer.domElement.`);
            }
        }, 100); // Mírně delší timeout pro jistotu

        return id;
    }

    deleteLabel(id) {
        const labelObject = this.labels.get(id);
        if (!labelObject) {
            console.warn(`[LabelManager] Pokus o smazání neexistujícího popisku: ID "${id}"`);
            return false;
        }

        const labelDiv = labelObject.element;

        // Odstranění click události před smazáním popisku
        if (labelDiv && typeof labelDiv._clickHandler === 'function') {
            labelDiv.removeEventListener('click', labelDiv._clickHandler);
            console.log(`[LabelManager] Click událost odstraněna pro popisek: ID="${id}"`);
            delete labelDiv._clickHandler; // Uklidíme referenci
        } else {
             console.warn(`[LabelManager] Handler pro click událost nenalezen při mazání popisku ID="${id}"`);
        }

        // Odstranění objektu ze scény three.js
        // Three.js se postará o odstranění elementu z kontejneru CSS2DRenderer při odstranění objektu ze scény.
        this.scene.remove(labelObject);

        // Odstranění elementu z DOM (pro jistotu, i když by to měl dělat three.js)
        if (labelDiv && labelDiv.parentNode) {
             labelDiv.parentNode.removeChild(labelDiv);
             // console.log(`[LabelManager] Popisek ID="${id}" explicitně odstraněn z DOM.`); 
        }

        // Odstranění z naší mapy
        this.labels.delete(id);
        console.log(`[LabelManager] Popisek smazán: ID="${id}"`);
        return true;
    }

    clearAllLabels() {
        console.log(`[LabelManager] Mazání všech ${this.labels.size} popisků...`);
        // Je bezpečnější iterovat přes kopii klíčů, protože deleteLabel modifikuje mapu
        const allIds = Array.from(this.labels.keys());
        allIds.forEach(id => this.deleteLabel(id));
        console.log("[LabelManager] Všechny popisky vymazány.");
    }

    dispose() {
        this.clearAllLabels();
        // Není nutné nastavovat this.labels a this.scene na null, pokud instance zanikne.
        // Garbage collector by si s tím měl poradit.
        // this.labels = null; // Pokud chcete být explicitní
        // this.scene = null;
        console.log("[LabelManager] LabelManager uvolněn.");
    }

    updateLabelPosition(id, x, y, z) {
        const labelObject = this.labels.get(id);
        if (labelObject) {
            labelObject.position.set(x, y, z);
            // Není třeba logovat každou aktualizaci pozice, může to být velmi časté
            // console.log(`[LabelManager] Popisek '${id}' aktualizován na (${x}, ${y}, ${z})`);
        } else {
             console.warn(`[LabelManager] Pokus o aktualizaci pozice neexistujícího popisku ID "${id}"`);
        }
    }
}

// Export a globální instance
let labelManager = null;

window.addEventListener('viewerInitialized', () => {
    if (!window.viewer || !window.viewer.scene) {
        console.error("[LabelManager] viewerInitialized spuštěno, ale window.viewer.scene není definováno!");
        return;
    }
    // Ověření, zda už instance neexistuje (pro jistotu)
    if (!labelManager) {
        labelManager = new LabelManager(window.viewer.scene);
        window.labelManager = labelManager; // Přístup přes window.labelManager
        console.log("[LabelManager] Globální instance vytvořena po viewerInitialized.");
    } else {
        console.warn("[LabelManager] Instance již existuje, nová nebyla vytvořena.");
    }
});

// Export třídy pro případné importy v modulech
export default LabelManager;