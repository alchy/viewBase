// Soubor: edges_controller.js
import * as THREE from 'three';

class EdgeManager {
    constructor(scene) {
        if (!scene) throw new Error("EdgeManager vyžaduje instanci THREE.Scene.");
        this.scene = scene;
        this.edges = new Map();
        this.nodes = new Map(); // nodeId → { x, y, z }
        this.edgeIdCounter = 0;
        console.log("EdgeManager inicializován v edges_controller.js.");
    }

    updateNode(nodeId, x, y, z) {
        this.nodes.set(nodeId, { x, y, z });
        console.log(`Uzel '${nodeId}' aktualizován/přidán na (${x}, ${y}, ${z})`);
    }

    addEdge(sourceId, targetId) {
        const id = `edge-${this.edgeIdCounter++}`;
        const sourcePos = this.nodes.get(sourceId);
        const targetPos = this.nodes.get(targetId);

        if (!sourcePos || !targetPos) {
            console.warn(`Hrana '${id}' nemůže být přidána - chybí pozice uzlu: ${sourceId} nebo ${targetId}`);
            return null;
        }

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z),
            new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z)
        ]);
        const material = new THREE.LineBasicMaterial({ color: 0x888888 });
        const line = new THREE.Line(geometry, material);

        this.scene.add(line);
        this.edges.set(id, { source: sourceId, target: targetId, lineObject: line });
        console.log(`Hrana přidána: ID="${id}", Mezi '${sourceId}' a '${targetId}'`);
        return id;
    }

    deleteEdge(id) {
        const edge = this.edges.get(id);
        if (!edge) {
            console.warn(`Hrana s ID "${id}" nenalezena.`);
            return false;
        }
        this.scene.remove(edge.lineObject);
        this.edges.delete(id);
        console.log(`Hrana smazána: ID="${id}"`);
        return true;
    }

    clearAllEdges() {
        console.log(`Mazání všech ${this.edges.size} hran...`);
        const allIds = [...this.edges.keys()];
        allIds.forEach(id => this.deleteEdge(id));
        console.log("Všechny hrany vymazány.");
    }

    dispose() {
        this.clearAllEdges();
        this.edges = null;
        this.nodes = null;
        this.scene = null;
        console.log("EdgeManager uvolněn.");
    }

    updateEdgePosition(id) {
        const edge = this.edges.get(id);
        if (!edge) return;

        const sourcePos = this.nodes.get(edge.source);
        const targetPos = this.nodes.get(edge.target);
        if (!sourcePos || !targetPos) return;

        const positions = edge.lineObject.geometry.attributes.position.array;
        if (positions[0] !== sourcePos.x || positions[1] !== sourcePos.y || positions[2] !== sourcePos.z ||
            positions[3] !== targetPos.x || positions[4] !== targetPos.y || positions[5] !== targetPos.z) {
            positions[0] = sourcePos.x;
            positions[1] = sourcePos.y;
            positions[2] = sourcePos.z;
            positions[3] = targetPos.x;
            positions[4] = targetPos.y;
            positions[5] = targetPos.z;
            edge.lineObject.geometry.attributes.position.needsUpdate = true;
            console.log(`Hrana '${id}' aktualizována mezi '${edge.source}' a '${edge.target}'`);
        }
    }
}

// Export instance pro globální použití
let edgeManager = null;

window.addEventListener('viewerInitialized', () => {
    edgeManager = new EdgeManager(window.viewer.scene);
    window.edgeManager = edgeManager; // Přístup přes window.edgeManager
});

export default EdgeManager;