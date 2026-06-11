import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { resolveTheme } from '../themes/manager.js';
import { nodeStyle } from './style.js';

const SMOOTHING = 8;            // 1/s – rychlost dobíhání zobrazené pozice k fyzice
const DIM_TOWARD_BG = 0.75;     // ztlumené uzly: 75 % cesty k barvě pozadí
const FOCUS_DURATION = 0.6;     // s – dolet kamery na uzel
const ORTHO_HALF_HEIGHT = 600;  // světové jednotky – polovina výšky 2D pohledu
const DEFAULT_TYPE = '__default';  // klíč meshe pro uzly bez typu

// Geometrie tvarů – rozměry voleny na zhruba stejný vizuální objem.
const GEOMETRIES = {
  sphere: () => new THREE.SphereGeometry(3, 12, 8),
  box: () => new THREE.BoxGeometry(4.8, 4.8, 4.8),
  octahedron: () => new THREE.OctahedronGeometry(3.6),
  tetrahedron: () => new THREE.TetrahedronGeometry(4.2),
};

/** Instancovaný renderer: InstancedMesh per typ uzlu (tvar z typu/tématu),
 *  jeden LineSegments pro hrany. Instance se každý snímek přerozdělují
 *  stateless rebuildem; mapování slot → id žije v mesh.userData.ids.
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

    this.meshes = new Map();    // klíč (DEFAULT_TYPE | název typu) -> InstancedMesh
    this._counts = new Map();   // pracovní mapa snímku: klíč -> počet instancí

    this.edgeCapacity = 0;
    this.edgeLines = null;
    this._ensureEdgeCapacity(4096);

    this.clock = new THREE.Clock();
    this._matrix = new THREE.Matrix4();
    this.raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._tmpColor = new THREE.Color();
    this._bgColor = new THREE.Color();
    this.frameIndex = 0;        // memoizace computeBoundingSphere v pick()
    this._boundsStamp = -1;

    this.highlightSet = null;   // Set id | null = bez zvýraznění
    this.focusId = null;        // id uzlu, ke kterému letí kamera
    this.focusElapsed = 0;
    this._focusFrom = new THREE.Vector3();

    this.applyTheme(this.theme);

    store.subscribe((event) => {
      if (event.kind === 'init' && !this.camera) {
        this._initCamera(store.config.dimensions);
      }
    });

    window.addEventListener('resize', () => this._onResize());
  }

  /** Přepne aktivní téma za běhu: pozadí, světla, hrany, materiály uzlů.
   *  Změnu výchozího tvaru (theme.node.shape) dořeší _ensureMesh při
   *  příštím snímku (mesh s jiným tvarem se vymění). */
  applyTheme(theme) {
    this.theme = theme;
    this._bgColor.set(theme.background);
    this.scene.background = new THREE.Color(theme.background);
    this.ambient.color.set(theme.lights.ambient.color);
    this.ambient.intensity = theme.lights.ambient.intensity;
    this.sun.color.set(theme.lights.directional.color);
    this.sun.intensity = theme.lights.directional.intensity;
    this.edgeLines.material.color.set(theme.edge.color);
    this.edgeLines.material.opacity = theme.edge.opacity;
    for (const mesh of this.meshes.values()) {
      mesh.material.emissive.set(theme.node.emissive);
      mesh.material.emissiveIntensity = theme.node.emissiveIntensity;
    }
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

  /** InstancedMesh pro klíč typu: vytvoří nový, zvětší (kapacitní regrow
   *  per mesh, mocniny dvou) nebo vymění při změně tvaru.
   *  mesh.userData: { shape, capacity, ids, cursor }. */
  _ensureMesh(key, shape, count) {
    let mesh = this.meshes.get(key);
    if (mesh && mesh.userData.shape === shape
        && count <= mesh.userData.capacity) {
      return mesh;
    }
    const capacity = Math.max(256,
      2 ** Math.ceil(Math.log2(Math.max(1, count))));
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.dispose();
    }
    const geometry = (GEOMETRIES[shape] ?? GEOMETRIES.sphere)();
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,            // shader násobí material.color * instanceColor
      roughness: 0.4,
      emissive: new THREE.Color(this.theme.node.emissive),
      emissiveIntensity: this.theme.node.emissiveIntensity,
    });
    mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.count = 0;
    mesh.userData = { shape, capacity, ids: [], cursor: 0 };
    this.scene.add(mesh);
    this.meshes.set(key, mesh);
    return mesh;
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
    this.frameIndex += 1;           // invalidace memoizace bounding sphere
    this._syncNodes(dt);
    this._syncEdges();
    this._stepFocus(dt);
    this.controls.update();
    this.webgl.render(this.scene, this.camera);
  }

  /** Klíč meshe pro uzel: název typu, pokud ho store zná, jinak default. */
  _meshKey(node) {
    return (node && node.type != null && this.store.nodeTypes[node.type])
      ? node.type : DEFAULT_TYPE;
  }

  _syncNodes(dt) {
    const { ids, positions } = this.engine;
    const count = Math.min(ids.length, positions.length / 3);
    const k = Math.min(1, dt * SMOOTHING);
    const seen = new Set();

    // 1. vyhlazení zobrazených pozic (exponenciální dobíhání k fyzice)
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
    }
    for (const id of this.display.keys()) {
      if (!seen.has(id)) this.display.delete(id);
    }

    // 2. rozpočítej uzly podle typů a zajisti kapacity PŘED plněním
    //    (regrow likviduje starý mesh – nesmí přijít uprostřed zápisu)
    this._counts.clear();
    for (let i = 0; i < count; i += 1) {
      const key = this._meshKey(this.store.nodes.get(ids[i]));
      this._counts.set(key, (this._counts.get(key) ?? 0) + 1);
    }
    for (const [key, needed] of this._counts) {
      const shape = key === DEFAULT_TYPE
        ? this.theme.node.shape
        : (this.store.nodeTypes[key].shape ?? this.theme.node.shape);
      const mesh = this._ensureMesh(key, shape, needed);
      mesh.userData.cursor = 0;
      mesh.userData.ids.length = needed;
    }
    for (const [key, mesh] of this.meshes) {
      if (!this._counts.has(key)) {       // typ z grafu zmizel
        mesh.count = 0;
        mesh.userData.ids.length = 0;
      }
    }

    // 3. stateless rebuild instancí (index mapy per mesh per frame)
    for (let i = 0; i < count; i += 1) {
      const id = ids[i];
      const node = this.store.nodes.get(id) ?? { id, type: null, meta: {} };
      const mesh = this.meshes.get(this._meshKey(node));
      const slot = mesh.userData.cursor;
      mesh.userData.cursor += 1;
      mesh.userData.ids[slot] = id;

      const style = nodeStyle(node, this.store.nodeTypes, this.theme);
      const pos = this.display.get(id);
      this._matrix.makeScale(style.size, style.size, style.size);
      this._matrix.setPosition(pos.x, pos.y, pos.z);
      mesh.setMatrixAt(slot, this._matrix);

      this._tmpColor.set(style.color);
      if (this.highlightSet !== null && !this.highlightSet.has(id)) {
        this._tmpColor.lerp(this._bgColor, DIM_TOWARD_BG);   // ztlumení
      }
      mesh.setColorAt(slot, this._tmpColor);
    }
    for (const [key, mesh] of this.meshes) {
      if (!this._counts.has(key)) continue;
      mesh.count = mesh.userData.cursor;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
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

  /** Počet vykreslených instancí napříč všemi typy (testy, E2E). */
  nodeCount() {
    let total = 0;
    for (const mesh of this.meshes.values()) total += mesh.count;
    return total;
  }

  /** Vrátí id uzlu pod souřadnicemi obrazovky, nebo null. Raycast jde přes
   *  pole všech meshů; zpět na id se mapuje přes mesh.userData.ids. */
  pick(clientX, clientY) {
    if (!this.camera || this.meshes.size === 0) return null;
    const rect = this.webgl.domElement.getBoundingClientRect();
    this._pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    // Bounding sphere se po pohybu instancí sama neinvaliduje – bez přepočtu
    // by uzly mimo původní kouli byly nepickovatelné. Přepočet je memoizovaný
    // per frame (hover i klik ve stejném snímku ho sdílí).
    if (this._boundsStamp !== this.frameIndex) {
      for (const mesh of this.meshes.values()) {
        if (mesh.count > 0) mesh.computeBoundingSphere();
      }
      this._boundsStamp = this.frameIndex;
    }
    this.raycaster.setFromCamera(this._pointer, this.camera);
    const targets = [...this.meshes.values()].filter((m) => m.count > 0);
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit || hit.instanceId === undefined) return null;
    return hit.object.userData.ids[hit.instanceId] ?? null;
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
