import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

class LabelManager {
    constructor(scene) {
        if (!scene) throw new Error("LabelManager vyžaduje instanci THREE.Scene.");
        this.scene = scene;
        this.labels = new Map();
        this.labelIdCounter = 0;
        console.log("LabelManager inicializován v label_controller.js.");
    }

    // Funkce pro odeslání POST požadavku při kliknutí na popisek
    async #sendPostRequest(nodeId) {
        console.log(`[LabelManager] Spouští se POST požadavek pro uzel: ${nodeId}`);
        try {
            const response = await fetch('https://your-api-endpoint.com/nodes', {
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
                console.error(`[LabelManager] Chyba při POST požadavku pro uzel ${nodeId}:`, response.status);
            }
        } catch (error) {
            console.error(`[LabelManager] Síťová chyba při POST požadavku pro uzel ${nodeId}:`, error);
        }
    }

    addLabel(x, y, z, text, cssClass = 'static-label') {
        const id = `label-${this.labelIdCounter++}`;
        const labelDiv = document.createElement('div');
        labelDiv.textContent = text;
        labelDiv.className = cssClass;
        labelDiv.dataset.labelId = id;
        labelDiv.dataset.nodeId = text; // Ukládáme ID uzlu (předpokládáme, že text = nodeId)

        // Přidání click události na popisek
        const clickHandler = () => {
            console.log(`[LabelManager] Kliknuto na popisek: ID="${id}", Uzel="${text}"`);
            //this.#sendPostRequest(text); // Odeslání POST požadavku s ID uzlu
        };
        labelDiv.addEventListener('click', clickHandler);
        // Uložení handleru pro pozdější odstranění
        labelDiv.dataset.clickHandler = clickHandler;

        const labelObject = new CSS2DObject(labelDiv);
        labelObject.position.set(x, y, z);
        labelObject.name = `CSS2D_${id}`;
        labelObject.userData.labelId = id;

        this.scene.add(labelObject);
        this.labels.set(id, labelObject);
        console.log(`[LabelManager] Popisek přidán: ID="${id}", Text="${text}", Pozice=(${x},${y},${z})`);
        return id;
    }

    deleteLabel(id) {
        const labelObject = this.labels.get(id);
        if (!labelObject) {
            console.warn(`[LabelManager] Popisek s ID "${id}" nenalezen.`);
            return false;
        }

        // Odstranění click události před smazáním popisku
        const labelDiv = labelObject.element;
        if (labelDiv && labelDiv.dataset.clickHandler) {
            labelDiv.removeEventListener('click', labelDiv.dataset.clickHandler);
            console.log(`[LabelManager] Click událost odstraněna pro popisek: ID="${id}"`);
        }

        // Odstranění elementu z DOM
        if (labelDiv && labelDiv.parentNode) {
            labelDiv.parentNode.removeChild(labelDiv);
        }

        // Odstranění objektu ze scény a mapy
        this.scene.remove(labelObject);
        this.labels.delete(id);
        console.log(`[LabelManager] Popisek smazán: ID="${id}"`);
        return true;
    }

    clearAllLabels() {
        console.log(`[LabelManager] Mazání všech ${this.labels.size} popisků...`);
        const allIds = [...this.labels.keys()];
        allIds.forEach(id => this.deleteLabel(id));
        console.log("[LabelManager] Všechny popisky vymazány.");
    }

    dispose() {
        this.clearAllLabels();
        this.labels = null;
        this.scene = null;
        console.log("[LabelManager] LabelManager uvolněn.");
    }

    updateLabelPosition(id, x, y, z) {
        const labelObject = this.labels.get(id);
        if (labelObject) {
            labelObject.position.set(x, y, z);
            console.log(`[LabelManager] Popisek '${id}' aktualizován na (${x}, ${y}, ${z})`);
        }
    }
}

// Export instance pro globální použití
let labelManager = null;

window.addEventListener('viewerInitialized', () => {
    labelManager = new LabelManager(window.viewer.scene);
    window.labelManager = labelManager; // Přístup přes window.labelManager
    console.log("[LabelManager] Globální instance vytvořena po viewerInitialized.");
});

export default LabelManager;