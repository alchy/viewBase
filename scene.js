import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// --- Pomocné funkce ---

const TO_RADIANS = Math.PI / 180;

/** Převod stupňů na radiány */
function toRadians(degrees) { 
    return degrees * TO_RADIANS; 
}

/** Normalizace úhlu pro zobrazení (0-360°) */
function normalizeDisplayAngle(degrees) { 
    let normalized = degrees % 360; 
    if (normalized < 0) normalized += 360; 
    return normalized.toFixed(0); 
}

/** Formátování vektoru do čitelného řetězce */
function formatVector(vector) { 
    return `${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}, ${vector.z.toFixed(1)}`; 
}

// --- TŘÍDA: Správce popisků ---
class LabelManager {
    constructor(scene) {
        if (!scene) throw new Error("LabelManager vyžaduje instanci THREE.Scene.");
        this.scene = scene;
        this.labels = new Map();
        this.labelIdCounter = 0;
        console.log("LabelManager inicializován.");
    }

    /** Přidá nový popisek na zadané souřadnice */
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

    /** Odstraní popisek podle ID */
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

    /** Vжите všechny popisky */
    clearAllLabels() {
        console.log(`Mazání všech ${this.labels.size} popisků...`);
        const allIds = [...this.labels.keys()];
        allIds.forEach(id => this.deleteLabel(id));
        console.log("Všechny popisky vymazány.");
    }

    /** Uvolní prostředky správce popisků */
    dispose() {
        this.clearAllLabels();
        this.labels = null;
        this.scene = null;
        console.log("LabelManager uvolněn.");
    }
}

// --- TŘÍDA: Pomocník os s popisky ---
class AxesHelperWithLabels extends THREE.Group {
    constructor({ length = 100, labelOffset = 10 } = {}) {
        super();
        this.name = 'AxesHelperWithLabels';

        const axesMaterials = [
            new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 }),
            new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 }),
            new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 })
        ];

        const points = [
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0),
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, length, 0),
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, length)
        ];

        const axesGeometry = new THREE.BufferGeometry().setFromPoints(points);
        axesGeometry.addGroup(0, 2, 0);
        axesGeometry.addGroup(2, 2, 1);
        axesGeometry.addGroup(4, 2, 2);
        this.add(new THREE.LineSegments(axesGeometry, axesMaterials));

        const axisLabels = ['X', 'Y', 'Z'];
        const labelColors = ['x', 'y', 'z'];
        const labelPositions = [
            new THREE.Vector3(length + labelOffset, 0, 0),
            new THREE.Vector3(0, length + labelOffset, 0),
            new THREE.Vector3(0, 0, length + labelOffset)
        ];

        for (let i = 0; i < axisLabels.length; i++) {
            const labelDiv = document.createElement('div');
            labelDiv.textContent = axisLabels[i];
            labelDiv.className = `axis-label ${labelColors[i]}`;
            const labelObject = new CSS2DObject(labelDiv);
            labelObject.position.copy(labelPositions[i]);
            this.add(labelObject);
        }
    }
}

// --- TŘÍDA: Pomocná mřížka ---
class GridHelper extends THREE.Group {
    constructor({ range = 500, step = 50, color = 0x888888, opacity = 0.5 } = {}) {
        super();
        this.name = 'GridHelper';

        const lineMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
        const pointsXY = [];
        const pointsXZ = [];

        for (let i = -range; i <= range; i += step) {
            pointsXY.push(i, -range, 0); pointsXY.push(i, range, 0);
            pointsXY.push(-range, i, 0); pointsXY.push(range, i, 0);
            pointsXZ.push(i, 0, -range); pointsXZ.push(i, 0, range);
            pointsXZ.push(-range, 0, i); pointsXZ.push(range, 0, i);
        }

        const geometryXY = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pointsXY, 3));
        this.add(new THREE.LineSegments(geometryXY, lineMaterial));
        const geometryXZ = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pointsXZ, 3));
        this.add(new THREE.LineSegments(geometryXZ, lineMaterial));
    }
}

// --- TŘÍDA: Ovladač orbitální kamery ---
class OrbitCameraController {
    constructor(camera, domElement, { 
        initialDistance = 500, initialRotationX = 0, initialRotationY = 0,
        minDistance = 10, maxDistance = 10000, verticalLimit = 89.9, initialSpeed = 1,
        zoomSpeedFactor = 25
    } = {}) {
        this.camera = camera;
        this.domElement = domElement;
        this.minDistance = minDistance;
        this.maxDistance = maxDistance;
        this.verticalLimit = verticalLimit;
        this.rotationSpeed = initialSpeed;
        this.zoomSpeedFactor = zoomSpeedFactor;
        this.cameraDistance = initialDistance;
        this.rotationX = initialRotationX;
        this.rotationY = initialRotationY;
        this.initialState = { distance: initialDistance, rotX: initialRotationX, rotY: initialRotationY };
        this._onKeyDown = this._onKeyDown.bind(this);
    }

    connect() { 
        this.domElement.addEventListener('keydown', this._onKeyDown); 
        this.updateCameraPosition(); 
        console.log("Ovladač kamery připojen."); 
    }

    disconnect() { 
        this.domElement.removeEventListener('keydown', this._onKeyDown); 
        console.log("Ovladač kamery odpojen."); 
    }

    reset() { 
        this.cameraDistance = this.initialState.distance; 
        this.rotationX = this.initialState.rotX; 
        this.rotationY = this.initialState.rotY; 
        this.updateCameraPosition(); 
        console.log("Kamera resetována."); 
    }

    setRotationSpeed(speed) { 
        this.rotationSpeed = Math.max(0.01, speed); 
    }

    _onKeyDown(event) {
        const rotationStep = this.rotationSpeed * 1.5;
        const zoomStep = this.zoomSpeedFactor * (this.rotationSpeed / 2 + 0.5);
        let needsUpdate = true;

        switch (event.key.toLowerCase()) {
            case 'a': this.rotationY += rotationStep; break;
            case 'd': this.rotationY -= rotationStep; break;
            case 'w': this.rotationX = Math.min(this.verticalLimit, this.rotationX + rotationStep); break;
            case 's': this.rotationX = Math.max(-this.verticalLimit, this.rotationX - rotationStep); break;
            case 'q': this.cameraDistance = Math.max(this.minDistance, this.cameraDistance - zoomStep); break;
            case 'e': this.cameraDistance = Math.min(this.maxDistance, this.cameraDistance + zoomStep); break;
            case ' ': this.reset(); needsUpdate = false; break;
            default: needsUpdate = false;
        }

        if (needsUpdate) this.updateCameraPosition();
    }

    updateCameraPosition() {
        const radX = toRadians(this.rotationX);
        const radY = toRadians(this.rotationY);
        this.camera.position.y = this.cameraDistance * Math.sin(radX);
        const radiusXZ = this.cameraDistance * Math.cos(radX);
        this.camera.position.x = radiusXZ * Math.sin(radY);
        this.camera.position.z = radiusXZ * Math.cos(radY);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateMatrixWorld();
        this.domElement.dispatchEvent(new CustomEvent('camera-updated', { detail: this }));
    }

    getCameraState() {
        const initialPosVec = new THREE.Vector3();
        const initRadX = toRadians(this.initialState.rotX);
        const initRadY = toRadians(this.initialState.rotY);
        initialPosVec.y = this.initialState.distance * Math.sin(initRadX);
        const initRadiusXZ = this.initialState.distance * Math.cos(initRadX);
        initialPosVec.x = initRadiusXZ * Math.sin(initRadY);
        initialPosVec.z = initRadiusXZ * Math.cos(initRadY);
        return { 
            position: this.camera.position, 
            rotationX: this.rotationX, 
            rotationY: this.rotationY, 
            initialComputedPosition: initialPosVec, 
            initialConfig: this.initialState 
        };
    }
}

// --- TŘÍDA: Správce uživatelského rozhraní ---
class UIManager {
    constructor(cameraController, elementIds) {
        this.cameraController = cameraController;
        this.elements = {};
        this.initialCameraPosition = new THREE.Vector3();
        this.initialCameraPositionSet = false;
        for (const key in elementIds) {
            this.elements[key] = document.getElementById(elementIds[key]);
            if (!this.elements[key]) console.warn(`Prvek UI '${elementIds[key]}' nenalezen.`);
        }
        this._onSpeedChange = this._onSpeedChange.bind(this);
        this.updateDebugInfo = this.updateDebugInfo.bind(this);
    }

    init() {
        if (this.elements.speedSlider && this.elements.speedValue) {
            this.elements.speedSlider.value = this.cameraController.rotationSpeed;
            this.elements.speedValue.textContent = this.cameraController.rotationSpeed.toFixed(2);
            this.elements.speedSlider.addEventListener('input', this._onSpeedChange);
        }
        this.cameraController.domElement.addEventListener('camera-updated', this.updateDebugInfo);
        this.updateDebugInfo();
        console.log("UI Manager inicializován.");
    }

    _onSpeedChange(event) {
        const speed = parseFloat(event.target.value);
        if (this.elements.speedValue) this.elements.speedValue.textContent = speed.toFixed(2);
        this.cameraController.setRotationSpeed(speed);
    }

    updateDebugInfo() {
        const state = this.cameraController.getCameraState();
        if (!this.initialCameraPositionSet && state.initialComputedPosition) {
            this.initialCameraPosition.copy(state.initialComputedPosition);
            this.initialCameraPositionSet = true;
        }
        if (this.elements.initialPos) this.elements.initialPos.textContent = formatVector(this.initialCameraPosition);
        if (this.elements.currentPos) this.elements.currentPos.textContent = formatVector(state.position);
        if (this.elements.currentRotX) this.elements.currentRotX.textContent = `${normalizeDisplayAngle(state.rotationX)}°`;
        if (this.elements.currentRotY) this.elements.currentRotY.textContent = `${normalizeDisplayAngle(state.rotationY)}°`;
        if (this.elements.initialRotX) this.elements.initialRotX.textContent = `${normalizeDisplayAngle(state.initialConfig.rotX)}°`;
        if (this.elements.initialRotY) this.elements.initialRotY.textContent = `${normalizeDisplayAngle(state.initialConfig.rotY)}°`;
    }

    dispose() {
        if (this.elements.speedSlider) this.elements.speedSlider.removeEventListener('input', this._onSpeedChange);
        if (this.cameraController && this.cameraController.domElement) 
            this.cameraController.domElement.removeEventListener('camera-updated', this.updateDebugInfo);
        console.log("UI Manager uvolněn.");
    }
}

// --- HLAVNÍ TŘÍDA: Interaktivní prohlížeč ---
class InteractiveViewer {
    constructor({ 
        glContainerId, cssContainerId, uiElementIds, 
        cameraOptions = {}, axesOptions = {}, gridOptions = {} 
    }) {
        this.glContainer = document.getElementById(glContainerId);
        this.cssContainer = document.getElementById(cssContainerId);
        if (!this.glContainer || !this.cssContainer) throw new Error("Požadované kontejnery nenalezeny.");
        this.uiElementIds = uiElementIds;
        this.cameraOptions = cameraOptions;
        this.axesOptions = axesOptions;
        this.gridOptions = gridOptions;
        this.scene = null;
        this.camera = null;
        this.webglRenderer = null;
        this.css2dRenderer = null;
        this.cameraController = null;
        this.uiManager = null;
        this.labelManager = null;
        this.animationFrameId = null;
        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
    }

    init() {
        this._initSceneAndCamera();
        this._initRenderers();
        this._initCoreComponents();
        this._initLabelManager();
        this._initEventListeners();
        this.start();
        console.log("InteractiveViewer inicializován.");
    }

    _initSceneAndCamera() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#E0E0E0');
        const aspect = this.glContainer.clientWidth / this.glContainer.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 1, 20000);
    }

    _initRenderers() {
        this.webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.webglRenderer.setSize(this.glContainer.clientWidth, this.glContainer.clientHeight);
        this.webglRenderer.setPixelRatio(window.devicePixelRatio);
        this.glContainer.appendChild(this.webglRenderer.domElement);

        this.css2dRenderer = new CSS2DRenderer();
        this.css2dRenderer.setSize(this.cssContainer.clientWidth, this.cssContainer.clientHeight);
        this.cssContainer.appendChild(this.css2dRenderer.domElement);
        console.log("Renderery inicializovány.");
    }

    _initCoreComponents() {
        this.cameraController = new OrbitCameraController(this.camera, document, this.cameraOptions);
        this.cameraController.connect();
        if (this.uiElementIds) {
            this.uiManager = new UIManager(this.cameraController, this.uiElementIds);
            this.uiManager.init();
        }
        const axes = new AxesHelperWithLabels(this.axesOptions);
        this.scene.add(axes);
        const grid = new GridHelper(this.gridOptions);
        this.scene.add(grid);
        console.log("Základní komponenty scény inicializovány.");
    }

    _initLabelManager() {
        this.labelManager = new LabelManager(this.scene);
        //this.labelManager.addLabel(0, 10, 0, "Střed Scény [0, 10, 0]");
        //this.labelManager.addLabel(150, 50, 150, "Bod A [150, 50, 150]");
        console.log("Správce popisků inicializován.");
    }

    _initEventListeners() {
        window.addEventListener('resize', this.onWindowResize);
        this.onWindowResize();
    }

    onWindowResize() {
        const mainContainer = document.getElementById('main-container');
        if (!mainContainer) return;
        const width = mainContainer.clientWidth;
        const height = mainContainer.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.webglRenderer.setSize(width, height);
        this.css2dRenderer.setSize(width, height);
    }

    start() {
        if (!this.animationFrameId) {
            console.log("Spouštění animační smyčky.");
            this.animate();
        }
    }

    stop() {
        if (this.animationFrameId) {
            console.log("Zastavení animační smyčky.");
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate);
        this.webglRenderer.render(this.scene, this.camera);
        this.css2dRenderer.render(this.scene, this.camera);
    }

    dispose() {
        console.log("Uvolňování InteractiveViewer...");
        this.stop();
        window.removeEventListener('resize', this.onWindowResize);
        if (this.labelManager) this.labelManager.dispose();
        if (this.uiManager) this.uiManager.dispose();
        if (this.cameraController) this.cameraController.disconnect();
        if (this.scene) {
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
            console.log("Scéna vymazána.");
        }
        if (this.webglRenderer && this.webglRenderer.domElement.parentNode) 
            this.webglRenderer.domElement.parentNode.removeChild(this.webglRenderer.domElement);
        if (this.css2dRenderer && this.css2dRenderer.domElement.parentNode) 
            this.css2dRenderer.domElement.parentNode.removeChild(this.css2dRenderer.domElement);
        this.scene = null;
        this.camera = null;
        this.webglRenderer = null;
        this.css2dRenderer = null;
        this.cameraController = null;
        this.uiManager = null;
        this.labelManager = null;
        console.log("InteractiveViewer uvolněn.");
    }
}

// --- INICIALIZACE APLIKACE ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        const viewer = new InteractiveViewer({
            glContainerId: 'scene-container',
            cssContainerId: 'css2d-container',
            uiElementIds: {
                speedSlider: 'rotation-speed', speedValue: 'speed-value',
                initialPos: 'initial-pos', currentPos: 'current-pos',
                initialRotX: 'initial-rot-x', currentRotX: 'current-rot-x',
                initialRotY: 'initial-rot-y', currentRotY: 'current-rot-y'
            },
            cameraOptions: {
                initialDistance: 700, initialRotationX: 0, initialRotationY: 0, initialSpeed: 1.5
            },
            axesOptions: {
                length: 400, labelOffset: 25
            },
            gridOptions: {
                range: 1000, step: 100, color: 0xaaaaaa, opacity: 0.4
            }
        });

        viewer.init();

        // Globální přístup pro ladění v konzoli (přesunuto před událost)
        window.viewer = viewer;
        window.addLabel = (x, y, z, text) => {
            if (window.viewer && window.viewer.labelManager) return window.viewer.labelManager.addLabel(x, y, z, text);
            else { console.error("Viewer/LabelManager není dostupný."); return null; }
        };
        window.deleteLabel = (id) => {
            if (window.viewer && window.viewer.labelManager) return window.viewer.labelManager.deleteLabel(id);
            else { console.error("Viewer/LabelManager není dostupný."); return false; }
        };
        window.clearAllLabels = () => {
            if (window.viewer && window.viewer.labelManager) window.viewer.labelManager.clearAllLabels();
            else console.error("Viewer/LabelManager není dostupný.");
        };

        // Oznámíme, že viewer je připraven (po definici funkcí)
        window.dispatchEvent(new Event('viewerInitialized'));

        console.log("Aplikace připravena. Pro přidání/mazání popisků použijte funkce v konzoli:");
        console.log("  addLabel(x, y, z, 'text')");
        console.log("  deleteLabel('label-ID') např. deleteLabel('label-0')");
        console.log("  clearAllLabels()");
        console.log("Nebo přes objekt: viewer.labelManager.addLabel(...) atd.");
    } catch (error) {
        console.error("Chyba při inicializaci InteractiveViewer:", error);
        alert("Došlo k chybě při inicializaci 3D scény. Zkontrolujte konzoli pro detaily.");
    }
});