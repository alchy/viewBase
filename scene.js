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
// (Bez změn)
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

    /** Vymaže všechny popisky */
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
// (Bez změn)
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
// (Bez změn)
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


// --- TŘÍDA: Ovladač orbitální kamery (UPRAVENÁ VERZE S OVLÁDÁNÍM MYŠÍ) ---
class OrbitCameraController {
    /**
     * Konstruktor ovladače kamery.
     * @param {THREE.PerspectiveCamera} camera Instance kamery Three.js.
     * @param {HTMLElement} renderElement HTML element, na který se mají navázat události myši (typicky kontejner WebGL rendereru).
     * @param {object} options Konfigurace kamery.
     * @param {number} options.initialDistance Počáteční vzdálenost kamery od středu.
     * @param {number} options.initialRotationX Počáteční rotace kamery kolem osy X (stupně).
     * @param {number} options.initialRotationY Počáteční rotace kamery kolem osy Y (stupně).
     * @param {number} options.minDistance Minimální povolená vzdálenost kamery.
     * @param {number} options.maxDistance Maximální povolená vzdálenost kamery.
     * @param {number} options.verticalLimit Maximální úhel vertikální rotace (stupně od rovníku).
     * @param {number} options.initialSpeed Počáteční rychlost rotace (pro klávesnici).
     * @param {number} options.zoomSpeedFactor Faktor rychlosti zoomování (pro klávesnici i myš).
     * @param {number} options.mouseSensitivity Citlivost otáčení myší.
     */
    constructor(camera, renderElement, {
        initialDistance = 500, initialRotationX = 0, initialRotationY = 0,
        minDistance = 10, maxDistance = 10000, verticalLimit = 89.9, initialSpeed = 1,
        zoomSpeedFactor = 0.1, // Upravený výchozí faktor pro zoom kolečkem
        mouseSensitivity = 0.2 // Citlivost pohybu myši
    } = {}) {
        this.camera = camera;
        // DOM element pro klávesnici (document, aby fungoval globálně)
        this.keyboardElement = renderElement.ownerDocument || window.document;
        // DOM element pro myš (konkrétní element, např. canvas kontejner)
        this.renderElement = renderElement;

        this.minDistance = minDistance;
        this.maxDistance = maxDistance;
        this.verticalLimit = verticalLimit; // Limit vertikální rotace v stupních
        this.rotationSpeed = initialSpeed; // Rychlost pro klávesnici
        this.zoomSpeedFactor = zoomSpeedFactor; // Faktor pro zoom myší
        this.mouseSensitivity = mouseSensitivity; // Citlivost pro myš

        this.cameraDistance = initialDistance;
        this.rotationX = initialRotationX; // Vertikální rotace (stupně)
        this.rotationY = initialRotationY; // Horizontální rotace (stupně)
        this.initialState = { distance: initialDistance, rotX: initialRotationX, rotY: initialRotationY };

        // --- Vlastnosti pro sledování stavu myši ---
        this.isDragging = false;      // Je levé tlačítko stisknuté?
        this.previousMouseX = 0;    // Poslední známá X pozice myši
        this.previousMouseY = 0;    // Poslední známá Y pozice myši
        // --- Konec vlastností pro myš ---

        // --- Bindování metod pro zachování 'this' kontextu ---
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onWheel = this._onWheel.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this); // Pro zamezení kontextového menu
        // --- Konec bindování ---
    }

    /** Připojí event listenery pro ovládání kamery. */
    connect() {
        // Klávesnice - vážeme na document, aby fungovalo i když focus není na canvasu
        this.keyboardElement.addEventListener('keydown', this._onKeyDown);

        // Myš - vážeme na renderovací element (např. scene-container)
        // 'wheel' pro zoom kolečkem
        this.renderElement.addEventListener('wheel', this._onWheel, { passive: false }); // passive: false umožňuje preventDefault()
        // 'mousedown' pro zahájení tažení
        this.renderElement.addEventListener('mousedown', this._onMouseDown);
        // 'contextmenu' pro zablokování výchozího menu prohlížeče při kliknutí pravým tlačítkem
        this.renderElement.addEventListener('contextmenu', this._onContextMenu);

        // Mousemove a mouseup vážeme na document (nebo keyboardElement), abychom zachytili pohyb/uvolnění
        // i když kurzor opustí renderovací element během tažení.
        this.keyboardElement.addEventListener('mousemove', this._onMouseMove);
        this.keyboardElement.addEventListener('mouseup', this._onMouseUp);

        // Nastavíme výchozí kurzor pro renderovací element
        this.renderElement.style.cursor = 'grab';

        this.updateCameraPosition(); // Nastavíme počáteční pozici
        console.log("Ovladač kamery připojen (klávesnice + myš).");
    }

    /** Odpojí event listenery. */
    disconnect() {
        this.keyboardElement.removeEventListener('keydown', this._onKeyDown);

        this.renderElement.removeEventListener('wheel', this._onWheel);
        this.renderElement.removeEventListener('mousedown', this._onMouseDown);
        this.renderElement.removeEventListener('contextmenu', this._onContextMenu);

        this.keyboardElement.removeEventListener('mousemove', this._onMouseMove);
        this.keyboardElement.removeEventListener('mouseup', this._onMouseUp);

        // Resetujeme kurzor
        this.renderElement.style.cursor = 'auto';

        console.log("Ovladač kamery odpojen.");
    }

    /** Resetuje kameru na počáteční pozici a rotaci. */
    reset() {
        this.cameraDistance = this.initialState.distance;
        this.rotationX = this.initialState.rotX;
        this.rotationY = this.initialState.rotY;
        this.updateCameraPosition();
        console.log("Kamera resetována.");
    }

    /** Nastaví rychlost rotace pro klávesnici. */
    setRotationSpeed(speed) {
        this.rotationSpeed = Math.max(0.01, speed);
        // Můžeme volitelně navázat citlivost myši na rychlost, např.:
        // this.mouseSensitivity = speed * 0.15;
    }

    /** Zpracování stisku klávesy (původní logika). */
    _onKeyDown(event) {
        const rotationStep = this.rotationSpeed * 1.5; // Krok rotace pro klávesy
        // Použijeme jiný faktor pro zoom klávesnicí než pro kolečko myši
        const keyboardZoomFactor = 25;
        const zoomStep = keyboardZoomFactor * (this.rotationSpeed / 2 + 0.5);
        let needsUpdate = true;

        switch (event.key.toLowerCase()) {
            case 'a': this.rotationY += rotationStep; break; // Vlevo
            case 'd': this.rotationY -= rotationStep; break; // Vpravo
            case 'w': this.rotationX = Math.min(this.verticalLimit, this.rotationX + rotationStep); break; // Nahoru
            case 's': this.rotationX = Math.max(-this.verticalLimit, this.rotationX - rotationStep); break; // Dolů
            case 'q': this.cameraDistance = Math.max(this.minDistance, this.cameraDistance - zoomStep); break; // Zoom in
            case 'e': this.cameraDistance = Math.min(this.maxDistance, this.cameraDistance + zoomStep); break; // Zoom out
            case ' ': this.reset(); needsUpdate = false; break; // Mezerník pro reset
            default: needsUpdate = false;
        }

        if (needsUpdate) this.updateCameraPosition();
    }

    // --- Nové metody pro ovládání myší ---

    /** Zpracování otáčení kolečka myši pro zoom. */
    _onWheel(event) {
        // Zabráníme výchozí akci prohlížeče (scrollování stránky)
        event.preventDefault();

        // Vypočítáme míru zoomu. event.deltaY je obvykle kladné pro scroll dolů (oddálení)
        // a záporné pro scroll nahoru (přiblížení).
        const zoomAmount = event.deltaY * this.zoomSpeedFactor;

        // Aplikujeme zoom a omezíme vzdálenost
        this.cameraDistance += zoomAmount;
        this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance));

        // Aktualizujeme pozici kamery
        this.updateCameraPosition();
    }

    /** Zpracování stisku tlačítka myši. */
    _onMouseDown(event) {
        // Reagujeme pouze na levé tlačítko (event.button === 0)
        if (event.button === 0) {
            this.isDragging = true;
            // Uložíme počáteční pozici myši pro výpočet delta pohybu
            this.previousMouseX = event.clientX;
            this.previousMouseY = event.clientY;
            // Změníme kurzor, aby uživatel věděl, že táhne
            this.renderElement.style.cursor = 'grabbing';
        }
        // Zde by se dala přidat logika pro jiná tlačítka (např. pravé pro posun - panning)
    }

    /** Zpracování pohybu myši, pokud je tlačítko stisknuté (tažení). */
    _onMouseMove(event) {
        // Pokud netáhneme levým tlačítkem, nic neděláme
        if (!this.isDragging) return;

        // Vypočítáme změnu pozice myši od posledního pohybu
        const deltaX = event.clientX - this.previousMouseX;
        const deltaY = event.clientY - this.previousMouseY;

        // Aktualizujeme rotaci kamery na základě pohybu myši a citlivosti
        // Pohyb doleva/doprava (deltaX) ovlivňuje horizontální rotaci (Y)
        // Pohyb nahoru/dolů (deltaY) ovlivňuje vertikální rotaci (X)
        this.rotationY -= deltaX * this.mouseSensitivity;
        this.rotationX -= deltaY * this.mouseSensitivity;

        // Omezíme vertikální rotaci, aby se kamera nepřetočila "přes póly"
        this.rotationX = Math.max(-this.verticalLimit, Math.min(this.verticalLimit, this.rotationX));

        // Uložíme aktuální pozici myši pro další 'mousemove' událost
        this.previousMouseX = event.clientX;
        this.previousMouseY = event.clientY;

        // Aktualizujeme pozici kamery
        this.updateCameraPosition();
    }

    /** Zpracování uvolnění tlačítka myši. */
    _onMouseUp(event) {
        // Pokud bylo uvolněno levé tlačítko
        if (event.button === 0) {
            this.isDragging = false;
            // Vrátíme kurzor zpět na "uchopitelný"
            this.renderElement.style.cursor = 'grab';
        }
    }

    /** Zamezí zobrazení kontextového menu prohlížeče při kliknutí pravým tlačítkem myši na renderovací element. */
     _onContextMenu(event) {
        event.preventDefault();
    }
    // --- Konec nových metod pro myš ---

    /** Aktualizuje pozici kamery na základě aktuální vzdálenosti a rotace. */
    updateCameraPosition() {
        // Převod rotace ze stupňů na radiány
        const radX = toRadians(this.rotationX);
        const radY = toRadians(this.rotationY);

        // Výpočet pozice kamery pomocí sférických souřadnic
        // Osa Y (výška) závisí na vertikální rotaci (radX)
        this.camera.position.y = this.cameraDistance * Math.sin(radX);
        // Poloměr v rovině XZ závisí na vertikální rotaci (cos)
        const radiusXZ = this.cameraDistance * Math.cos(radX);
        // Pozice X a Z závisí na horizontální rotaci (radY)
        this.camera.position.x = radiusXZ * Math.sin(radY);
        this.camera.position.z = radiusXZ * Math.cos(radY);

        // Kamera se vždy dívá do středu scény (0, 0, 0)
        this.camera.lookAt(0, 0, 0);
        // Aktualizujeme matici kamery (důležité pro Three.js)
        this.camera.updateMatrixWorld();

        // Odešleme vlastní událost, aby UI mohlo reagovat na změnu kamery
        // Používáme keyboardElement (document) pro dispatch, protože UIManager na něm naslouchá
        this.keyboardElement.dispatchEvent(new CustomEvent('camera-updated', { detail: this }));
    }

    /** Vrací objekt se stavem kamery (pro UI a debug). */
    getCameraState() {
        // Spočítáme počáteční pozici pro informaci v UI
        const initialPosVec = new THREE.Vector3();
        const initRadX = toRadians(this.initialState.rotX);
        const initRadY = toRadians(this.initialState.rotY);
        initialPosVec.y = this.initialState.distance * Math.sin(initRadX);
        const initRadiusXZ = this.initialState.distance * Math.cos(initRadX);
        initialPosVec.x = initRadiusXZ * Math.sin(initRadY);
        initialPosVec.z = initRadiusXZ * Math.cos(initRadY);

        return {
            position: this.camera.position,     // Aktuální pozice Vector3
            rotationX: this.rotationX,          // Aktuální vertikální rotace (stupně)
            rotationY: this.rotationY,          // Aktuální horizontální rotace (stupně)
            initialComputedPosition: initialPosVec, // Vypočtená počáteční pozice Vector3
            initialConfig: this.initialState      // Původní konfigurační hodnoty
        };
    }
}


// --- TŘÍDA: Správce uživatelského rozhraní ---
// (Bez změn v logice, ale bude reagovat na událost 'camera-updated' vyvolanou i myší)
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
        // Nasloucháme na událost 'camera-updated' na elementu, kde ji controller odesílá (document)
        this.cameraController.keyboardElement.addEventListener('camera-updated', this.updateDebugInfo);
        this.updateDebugInfo(); // Aktualizujeme UI při startu
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
        // Odstraníme listener ze stejného elementu, na který byl přidán
        if (this.cameraController && this.cameraController.keyboardElement)
            this.cameraController.keyboardElement.removeEventListener('camera-updated', this.updateDebugInfo);
        console.log("UI Manager uvolněn.");
    }
}


// --- HLAVNÍ TŘÍDA: Interaktivní prohlížeč ---
class InteractiveViewer {
    constructor({
        glContainerId, cssContainerId, uiElementIds,
        cameraOptions = {}, axesOptions = {}, gridOptions = {}
    }) {
        this.glContainer = document.getElementById(glContainerId); // Kontejner pro WebGL canvas
        this.cssContainer = document.getElementById(cssContainerId); // Kontejner pro CSS2D popisky
        if (!this.glContainer || !this.cssContainer) throw new Error("Požadované kontejnery nenalezeny.");

        this.uiElementIds = uiElementIds;
        this.cameraOptions = cameraOptions;
        this.axesOptions = axesOptions;
        this.gridOptions = gridOptions;

        // Inicializace proměnných na null
        this.scene = null;
        this.camera = null;
        this.webglRenderer = null;
        this.css2dRenderer = null;
        this.cameraController = null;
        this.uiManager = null;
        this.labelManager = null;
        this.animationFrameId = null;
        this.clock = new THREE.Clock();

        // Bindování metod pro zachování 'this'
        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
    }

    /** Inicializuje všechny komponenty prohlížeče. */
    init() {
        this._initSceneAndCamera();
        this._initRenderers();
        this._initCoreComponents(); // Zde se inicializuje cameraController
        this._initLabelManager();
        this._initEventListeners();
        this.start(); // Spustí animační smyčku
        console.log("InteractiveViewer inicializován.");
    }

    /** Inicializuje scénu a kameru. */
    _initSceneAndCamera() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#E0E0E0'); // Světle šedé pozadí
        const aspect = this.glContainer.clientWidth / this.glContainer.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 1, 20000); // Široký zorný úhel, velký rozsah viditelnosti
    }

    /** Inicializuje WebGL a CSS2D renderery. */
    _initRenderers() {
        // WebGL Renderer (pro 3D objekty)
        this.webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Antialiasing a průhledné pozadí
        this.webglRenderer.setSize(this.glContainer.clientWidth, this.glContainer.clientHeight);
        this.webglRenderer.setPixelRatio(window.devicePixelRatio); // Pro ostrý obraz na HiDPI displejích
        this.glContainer.appendChild(this.webglRenderer.domElement); // Přidá canvas do HTML

        // CSS2D Renderer (pro HTML popisky)
        this.css2dRenderer = new CSS2DRenderer();
        this.css2dRenderer.setSize(this.cssContainer.clientWidth, this.cssContainer.clientHeight);
        // Důležité: Nastavíme styl CSS kontejneru, aby překrýval WebGL kontejner a neblokoval myš
        this.css2dRenderer.domElement.style.position = 'absolute';
        this.css2dRenderer.domElement.style.top = '0';
        this.css2dRenderer.domElement.style.left = '0';
        this.css2dRenderer.domElement.style.pointerEvents = 'none'; // Ignoruje události myši, aby procházely na WebGL canvas
        this.cssContainer.appendChild(this.css2dRenderer.domElement); // Přidá div pro popisky do HTML

        console.log("Renderery inicializovány.");
    }

    /** Inicializuje základní komponenty: ovladač kamery, UI, osy, mřížku. */
    _initCoreComponents() {
        // *** ZMĚNA ZDE ***
        // Vytvoříme instanci OrbitCameraController a předáme jí this.glContainer
        // jako element pro navázání událostí myši. Klávesnice se váže na document uvnitř controlleru.
        this.cameraController = new OrbitCameraController(this.camera, this.glContainer, this.cameraOptions);
        this.cameraController.connect(); // Připojí listenery

        // Inicializace UI manažera, pokud jsou definována ID elementů
        if (this.uiElementIds) {
            this.uiManager = new UIManager(this.cameraController, this.uiElementIds);
            this.uiManager.init();
        }

        // Přidání pomocných prvků do scény
        const axes = new AxesHelperWithLabels(this.axesOptions);
        this.scene.add(axes);
        const grid = new GridHelper(this.gridOptions);
        this.scene.add(grid);

        console.log("Základní komponenty scény inicializovány.");
    }

    /** Inicializuje správce popisků. */
    _initLabelManager() {
        this.labelManager = new LabelManager(this.scene);
        // Příklad přidání popisku (odkomentujte pro test)
        // this.labelManager.addLabel(0, 10, 0, "Střed Scény [0, 10, 0]");
        // this.labelManager.addLabel(150, 50, 150, "Bod A [150, 50, 150]");
        console.log("Správce popisků inicializován.");
    }

    /** Inicializuje globální event listenery (např. pro změnu velikosti okna). */
    _initEventListeners() {
        window.addEventListener('resize', this.onWindowResize);
        this.onWindowResize(); // Zavoláme jednou při startu pro správné nastavení velikosti
    }

    /** Reakce na změnu velikosti okna prohlížeče. */
    onWindowResize() {
        // Získáme aktuální rozměry WebGL kontejneru
        const width = this.glContainer.clientWidth;
        const height = this.glContainer.clientHeight;

        // Aktualizujeme poměr stran kamery
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix(); // Nutné po změně aspect ratio

        // Aktualizujeme velikost obou rendererů
        this.webglRenderer.setSize(width, height);
        this.css2dRenderer.setSize(width, height);
    }

    /** Spustí animační smyčku. */
    start() {
        if (!this.animationFrameId) {
            console.log("Spouštění animační smyčky.");
            this.animate(); // Spustí první snímek
        }
    }

    /** Zastaví animační smyčku. */
    stop() {
        if (this.animationFrameId) {
            console.log("Zastavení animační smyčky.");
            cancelAnimationFrame(this.animationFrameId); // Zruší požadavek na další snímek
            this.animationFrameId = null;
        }
    }

    /** Animační smyčka (volá se opakovaně pomocí requestAnimationFrame). */
    animate() {
        // Požádáme prohlížeč o zavolání této funkce znovu před dalším překreslením
        this.animationFrameId = requestAnimationFrame(this.animate);

        // Vykreslíme scénu pomocí obou rendererů
        this.webglRenderer.render(this.scene, this.camera);
        this.css2dRenderer.render(this.scene, this.camera);
    }

    /** Uvolní všechny zdroje a odstraní listenery. */
    dispose() {
        console.log("Uvolňování InteractiveViewer...");
        this.stop(); // Zastavíme animaci

        // Odstraníme globální listenery
        window.removeEventListener('resize', this.onWindowResize);

        // Uvolníme zdroje manažerů
        if (this.labelManager) this.labelManager.dispose();
        if (this.uiManager) this.uiManager.dispose();
        if (this.cameraController) this.cameraController.disconnect(); // Odpojíme listenery kamery

        // Vyčistíme scénu (odstraníme všechny objekty)
        if (this.scene) {
            while (this.scene.children.length > 0) {
                const object = this.scene.children[0];
                // Pokud má objekt geometrii nebo materiál, uvolníme je (prevence memory leaků)
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
                this.scene.remove(object);
            }
            console.log("Scéna vymazána.");
        }

        // Odstraníme renderovací elementy z DOM
        if (this.webglRenderer && this.webglRenderer.domElement.parentNode)
            this.webglRenderer.domElement.parentNode.removeChild(this.webglRenderer.domElement);
        if (this.css2dRenderer && this.css2dRenderer.domElement.parentNode)
            this.css2dRenderer.domElement.parentNode.removeChild(this.css2dRenderer.domElement);

        // Resetujeme všechny vlastnosti na null
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
        // Vytvoření instance prohlížeče s konfigurací
        const viewer = new InteractiveViewer({
            glContainerId: 'scene-container',    // ID elementu pro WebGL canvas
            cssContainerId: 'css2d-container',   // ID elementu pro CSS popisky
            uiElementIds: {                      // ID elementů pro UI ovládací prvky
                speedSlider: 'rotation-speed', speedValue: 'speed-value',
                initialPos: 'initial-pos', currentPos: 'current-pos',
                initialRotX: 'initial-rot-x', currentRotX: 'current-rot-x',
                initialRotY: 'initial-rot-y', currentRotY: 'current-rot-y'
            },
            cameraOptions: {                     // Konfigurace kamery
                initialDistance: 700,          // Počáteční vzdálenost
                initialRotationX: 15,          // Počáteční náklon (stupně)
                initialRotationY: -30,         // Počáteční otočení (stupně)
                initialSpeed: 1.5,             // Rychlost rotace klávesnicí
                minDistance: 50,               // Minimální zoom
                maxDistance: 5000,             // Maximální zoom
                zoomSpeedFactor: 0.1,          // Citlivost zoomu kolečkem (menší číslo = pomalejší zoom)
                mouseSensitivity: 0.2          // Citlivost otáčení myší
            },
            axesOptions: {                       // Konfigurace os
                length: 400,                   // Délka os
                labelOffset: 25                // Odsazení popisků os
            },
            gridOptions: {                       // Konfigurace mřížky
                range: 1000,                   // Rozsah mřížky
                step: 100,                     // Krok mřížky
                color: 0xaaaaaa,               // Barva mřížky
                opacity: 0.4                   // Průhlednost mřížky
            }
        });

        // Inicializace prohlížeče
        viewer.init();

        // === Globální přístup pro ladění v konzoli ===
        // Umožňuje volat metody vieweru přímo z konzole prohlížeče
        window.viewer = viewer;
        // Pomocné funkce pro snadnější manipulaci s popisky z konzole
        window.addLabel = (x, y, z, text, cssClass) => {
            if (window.viewer && window.viewer.labelManager) {
                return window.viewer.labelManager.addLabel(x, y, z, text, cssClass);
            } else {
                console.error("Viewer nebo LabelManager není dostupný.");
                return null;
            }
        };
        window.deleteLabel = (id) => {
            if (window.viewer && window.viewer.labelManager) {
                return window.viewer.labelManager.deleteLabel(id);
            } else {
                console.error("Viewer nebo LabelManager není dostupný.");
                return false;
            }
        };
        window.clearAllLabels = () => {
            if (window.viewer && window.viewer.labelManager) {
                window.viewer.labelManager.clearAllLabels();
            } else {
                console.error("Viewer nebo LabelManager není dostupný.");
            }
        };
        // === Konec globálního přístupu ===

        // Oznámíme, že viewer je připraven (může být využito jinými skripty)
        window.dispatchEvent(new Event('viewerInitialized'));

        // Výpis do konzole pro uživatele
        console.log("Aplikace připravena. Ovládání:");
        console.log(" - Myš: Levé tlačítko + táhnout = otáčení, Kolečko = zoom");
        console.log(" - Klávesnice: W/S = náklon, A/D = otočení, Q/E = zoom, Mezerník = reset pohledu");
        console.log("Pro přidání/mazání popisků použijte funkce v konzoli:");
        console.log("   addLabel(x, y, z, 'text')");
        console.log("   deleteLabel('label-ID') např. deleteLabel('label-0')");
        console.log("   clearAllLabels()");
        console.log("Nebo přes objekt: viewer.labelManager.addLabel(...) atd.");

    } catch (error) {
        // Zachycení a výpis případných chyb při inicializaci
        console.error("Chyba při inicializaci InteractiveViewer:", error);
        alert("Došlo k vážné chybě při inicializaci 3D scény.\nZkontrolujte konzoli prohlížeče (F12) pro více detailů.");
    }
});