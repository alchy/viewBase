// Soubor: label_controller.js
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

    addLabel(x, y, z, text, cssClass = 'static-label') {
        const id = `label-${this.labelIdCounter++}`;
        const labelDiv = document.createElement('div');
        labelDiv.textContent = text;
        labelDiv.className = cssClass;
        labelDiv.dataset.labelId = id;

        const labelObject = new CSS2DObject(labelDiv);
        labelObject.position.set(x, y, z);
        labelObject.name = `CSS2D_${id}`;
        labelObject.userData.labelId = id;

        this.scene.add(labelObject);
        this.labels.set(id, labelObject);
        console.log(`Popisek přidán: ID="${id}", Text="${text}", Pozice=(${x},${y},${z})`);
        return id;
    }

    deleteLabel(id) {
        const labelObject = this.labels.get(id);
        if (!labelObject) {
            console.warn(`Popisek s ID "${id}" nenalezen.`);
            return false;
        }
        if (labelObject.element && labelObject.element.parentNode) {
            labelObject.element.parentNode.removeChild(labelObject.element);
        }
        this.scene.remove(labelObject);
        this.labels.delete(id);
        console.log(`Popisek smazán: ID="${id}"`);
        return true;
    }

    clearAllLabels() {
        console.log(`Mazání všech ${this.labels.size} popisků...`);
        const allIds = [...this.labels.keys()];
        allIds.forEach(id => this.deleteLabel(id));
        console.log("Všechny popisky vymazány.");
    }

    dispose() {
        this.clearAllLabels();
        this.labels = null;
        this.scene = null;
        console.log("LabelManager uvolněn.");
    }

    updateLabelPosition(id, x, y, z) {
        const labelObject = this.labels.get(id);
        if (labelObject) {
            labelObject.position.set(x, y, z);
            console.log(`Popisek '${id}' aktualizován na (${x}, ${y}, ${z})`);
        }
    }
}

// Export instance pro globální použití
let labelManager = null;

window.addEventListener('viewerInitialized', () => {
    labelManager = new LabelManager(window.viewer.scene);
    window.labelManager = labelManager; // Přístup přes window.labelManager
});

export default LabelManager;