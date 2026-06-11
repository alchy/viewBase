import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { resolveTheme } from '../themes/manager.js';

const SMOOTHING = 8;            // 1/s – rychlost dobíhání zobrazené pozice k fyzice
const DIM_TOWARD_BG = 0.75;     // ztlumené uzly: 75 % cesty k barvě pozadí
const FOCUS_DURATION = 0.6;     // s – dolet kamery na uzel
const ORTHO_HALF_HEIGHT = 600;  // světové jednotky – polovina výšky 2D pohledu

/** Instancovaný renderer: jeden InstancedMesh pro uzly, jeden LineSegments
 *  pro hrany. Zobrazené pozice se vyhlazují exponenciálně mezi fyz. ticky.
 *  Kamera a controls vznikají lazy při prvním 'init' eventu ze store
 *  (config.dimensions: 3 = perspektivní orbit, 2 = ortografický pan/zoom);
 *  do té doby se nerendruje (guard v _frame). */
export class Renderer {
  constructor(container, store, engine, { onCameraReady = () => {} } = {}) {
    this.container = container;
    this.store = store;
    this.engine = engine;
    this.onCameraReady = onCameraReady;
    this.display = new Map();   // id -> THREE.Vector3 (vyhlazená pozice)

    this.theme = resolveTheme('modern');   // než dorazí init, jede základ

    this.scene = new THREE.Scene();
    this.camera = null;         // vznikne v _initCamera po initu
    this.controls = null;

    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    this.webgl.setSize(container.clientWidth, container.clientHeight);
    this.webgl.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.webgl.domElement);

    this.ambient = new THREE.AmbientLight();
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight();
    this.sun.position.set(1, 2, 3);
    this.scene.add(this.sun);

    this.nodeCapacity = 0;
    this.nodeMesh = null;
    this._ensureNodeCapacity(1024);

    this.edgeCapacity = 0;
    this.edgeLines = null;
    this._ensureEdgeCapacity(4096);

    this.clock = new THREE.Clock();
    this._matrix = new THREE.Matrix4();
    this.raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();

    this.highlightSet = null;   // Set id | null = bez zvýraznění
    this._fullColor = new THREE.Color();
    this._dimColor = new THREE.Color();
    this.applyTheme(this.theme);          // pozadí, světla, materiály, barvy
    this.focusId = null;        // id uzlu, ke kterému letí kamera
    this.focusElapsed = 0;
    this._focusFrom = new THREE.Vector3();

    store.subscribe((event) => {
      if (event.kind === 'init' && !this.camera) {
        this._initCamera(store.config.dimensions);
      }
    });

    window.addEventListener('resize', () => this._onResize());
  }

  /** Přepne aktivní téma za běhu: pozadí, světla, hrany, materiály uzlů. */
  applyTheme(theme) {
    this.theme = theme;
    this.scene.background = new THREE.Color(theme.background);
    this.ambient.color.set(theme.lights.ambient.color);
    this.ambient.intensity = theme.lights.ambient.intensity;
    this.sun.color.set(theme.lights.directional.color);
    this.sun.intensity = theme.lights.directional.intensity;
    this.edgeLines.material.color.set(theme.edge.color);
    this.edgeLines.material.opacity = theme.edge.opacity;
    this.nodeMesh.material.emissive.set(theme.node.emissive);
    this.nodeMesh.material.emissiveIntensity = theme.node.emissiveIntensity;
    this._fullColor.set(theme.node.color);
    this._dimColor.copy(this._fullColor)
      .lerp(new THREE.Color(theme.background), DIM_TOWARD_BG);
  }

  /** Kamera + controls podle config.dimensions. Volá se jen jednou – změna
   *  dimenzí za běhu serveru vyžaduje obnovení stránky. */
  _initCamera(dimensions) {
    if (this.camera) return;   // idempotence – reconnect nesmí duplikovat controls/listenery
    const aspect = this.container.clientWidth / this.container.clientHeight;
    if (dimensions === 2) {
      this.camera = new THREE.OrthographicCamera(
        -ORTHO_HALF_HEIGHT * aspect, ORTHO_HALF_HEIGHT * aspect,
        ORTHO_HALF_HEIGHT, -ORTHO_HALF_HEIGHT, -10000, 10000);
      this.camera.position.set(0, 0, 1000);
      this.controls = new OrbitControls(this.camera, this.webgl.domElement);
      this.controls.enableDamping = true;
      this.controls.enableRotate = false;
      this.controls.screenSpacePanning = true;
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN,
      };
      this.controls.touches = {
        ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN,
      };
    } else {
      this.camera = new THREE.PerspectiveCamera(60, aspect, 1, 50000);
      this.camera.position.set(0, 0, 900);
      this.controls = new OrbitControls(this.camera, this.webgl.domElement);
      this.controls.enableDamping = true;
      this.controls.minDistance = 20;
      this.controls.maxDistance = 20000;   // bezpečně před far plane (50000)
    }
    this.onCameraReady();
  }

  _onResize() {
    this.webgl.setSize(this.container.clientWidth, this.container.clientHeight);
    if (!this.camera) return;
    const aspect = this.container.clientWidth / this.container.clientHeight;
    if (this.camera.isOrthographicCamera) {
      this.camera.left = -ORTHO_HALF_HEIGHT * aspect;
      this.camera.right = ORTHO_HALF_HEIGHT * aspect;
    } else {
      this.camera.aspect = aspect;
    }
    this.camera.updateProjectionMatrix();
  }

  _ensureNodeCapacity(count) {
    if (count <= this.nodeCapacity) return;
    const capacity = Math.max(1024, 2 ** Math.ceil(Math.log2(count)));
    if (this.nodeMesh) {
      this.scene.remove(this.nodeMesh);
      this.nodeMesh.geometry.dispose();
      this.nodeMesh.material.dispose();
      this.nodeMesh.dispose();
    }
    const geometry = new THREE.SphereGeometry(3, 12, 8);
    // Barvu nese per-instance atribut (highlight) – materiál je bílý,
    // shader násobí material.color * instanceColor.
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      emissive: new THREE.Color(this.theme.node.emissive),
      emissiveIntensity: this.theme.node.emissiveIntensity,
    });
    this.nodeMesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.nodeMesh.count = 0;
    this.scene.add(this.nodeMesh);
    this.nodeCapacity = capacity;
  }

  _ensureEdgeCapacity(count) {
    if (count <= this.edgeCapacity) return;
    const capacity = Math.max(4096, 2 ** Math.ceil(Math.log2(count)));
    if (this.edgeLines) {
      this.scene.remove(this.edgeLines);
      this.edgeLines.geometry.dispose();
      this.edgeLines.material.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',
      new THREE.BufferAttribute(new Float32Array(capacity * 6), 3));
    geometry.setDrawRange(0, 0);
    this.edgeLines = new THREE.LineSegments(geometry,
      new THREE.LineBasicMaterial({
        color: this.theme.edge.color,
        transparent: true,
        opacity: this.theme.edge.opacity,
      }));
    this.edgeLines.frustumCulled = false;
    this.scene.add(this.edgeLines);
    this.edgeCapacity = capacity;
  }

  start() {
    this.webgl.setAnimationLoop(() => this._frame());
  }

  _frame() {
    const dt = this.clock.getDelta();
    if (!this.camera) return;       // čekáme na init (config.dimensions)
    this._syncNodes(dt);
    this._syncEdges();
    this._stepFocus(dt);
    this.controls.update();
    this.webgl.render(this.scene, this.camera);
  }

  _syncNodes(dt) {
    const { ids, positions } = this.engine;
    const count = Math.min(ids.length, positions.length / 3);
    this._ensureNodeCapacity(count);
    const k = Math.min(1, dt * SMOOTHING);
    const seen = new Set();
    for (let i = 0; i < count; i += 1) {
      const id = ids[i];
      seen.add(id);
      const tx = positions[i * 3];
      const ty = positions[i * 3 + 1];
      const tz = positions[i * 3 + 2];
      let pos = this.display.get(id);
      if (!pos) {
        pos = new THREE.Vector3(tx, ty, tz);
        this.display.set(id, pos);
      }
      pos.x += (tx - pos.x) * k;
      pos.y += (ty - pos.y) * k;
      pos.z += (tz - pos.z) * k;
      this._matrix.makeTranslation(pos.x, pos.y, pos.z);
      this.nodeMesh.setMatrixAt(i, this._matrix);
      const color = (this.highlightSet === null || this.highlightSet.has(id))
        ? this._fullColor : this._dimColor;
      this.nodeMesh.setColorAt(i, color);
    }
    for (const id of this.display.keys()) {
      if (!seen.has(id)) this.display.delete(id);
    }
    this.nodeMesh.count = count;
    this.nodeMesh.instanceMatrix.needsUpdate = true;
    if (this.nodeMesh.instanceColor) this.nodeMesh.instanceColor.needsUpdate = true;
  }

  _syncEdges() {
    const { edges } = this.store;
    this._ensureEdgeCapacity(edges.size);
    const attr = this.edgeLines.geometry.getAttribute('position');
    let i = 0;
    for (const edge of edges.values()) {
      const a = this.display.get(edge.source);
      const b = this.display.get(edge.target);
      if (!a || !b) continue;
      attr.setXYZ(i * 2, a.x, a.y, a.z);
      attr.setXYZ(i * 2 + 1, b.x, b.y, b.z);
      i += 1;
    }
    this.edgeLines.geometry.setDrawRange(0, i * 2);
    attr.needsUpdate = true;
  }

  /** Vrátí id uzlu pod souřadnicemi obrazovky, nebo null.
   *  instanceId odpovídá pořadí v engine.ids – stejné jako v _syncNodes. */
  pick(clientX, clientY) {
    if (!this.camera || !this.nodeMesh || this.nodeMesh.count === 0) return null;
    const rect = this.webgl.domElement.getBoundingClientRect();
    this._pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    // Bounding sphere se po pohybu instancí sama neinvaliduje – bez přepočtu
    // by uzly mimo původní kouli byly nepickovatelné (mrtvé zóny).
    this.nodeMesh.computeBoundingSphere();
    this.raycaster.setFromCamera(this._pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.nodeMesh)[0];
    if (!hit || hit.instanceId === undefined) return null;
    return this.engine.ids[hit.instanceId] ?? null;
  }

  /** Stav pohledu pro view_change event; null dokud kamera neexistuje. */
  viewState() {
    if (!this.camera || !this.controls) return null;
    const p = this.camera.position;
    const t = this.controls.target;
    return {
      position: { x: p.x, y: p.y, z: p.z },
      target: { x: t.x, y: t.y, z: t.z },
      zoom: this.camera.zoom,
    };
  }

  /** Zvýrazni množinu uzlů (Set id); ostatní se ztlumí. null = reset. */
  setHighlight(ids) {
    this.highlightSet = ids;
  }

  /** Plynulý dolet kamery: tween controls.target k display pozici uzlu. */
  focusOn(nodeId) {
    if (!this.controls) return;
    this.focusId = nodeId;
    this.focusElapsed = 0;
    this._focusFrom.copy(this.controls.target);
  }

  _stepFocus(dt) {
    if (this.focusId === null) return;
    if (!this.store.nodes.has(this.focusId)) {   // uzel mezitím zmizel
      this.focusId = null;
      return;
    }
    const pos = this.display.get(this.focusId);
    if (!pos) return;                            // čeká na první pozici z fyziky
    this.focusElapsed = Math.min(this.focusElapsed + dt, FOCUS_DURATION);
    const t = this.focusElapsed / FOCUS_DURATION;
    const eased = 1 - (1 - t) ** 3;              // easeOutCubic
    this.controls.target.lerpVectors(this._focusFrom, pos, eased);
    if (t >= 1) this.focusId = null;
  }
}
