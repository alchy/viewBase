import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const NODE_COLOR = 0x2f7fe8;
const EDGE_COLOR = 0x9aa3af;
const BACKGROUND = 0xf4f5f7;
const SMOOTHING = 8;   // 1/s – rychlost dobíhání zobrazené pozice k fyzice
const DIM_TOWARD_BG = 0.75;  // ztlumené uzly: 75 % cesty k barvě pozadí
const FOCUS_DURATION = 0.6;  // s – dolet kamery na uzel

/** Instancovaný renderer: jeden InstancedMesh pro uzly, jeden LineSegments
 *  pro hrany. Zobrazené pozice se vyhlazují exponenciálně mezi fyz. ticky. */
export class Renderer {
  constructor(container, store, engine) {
    this.store = store;
    this.engine = engine;
    this.display = new Map();   // id -> THREE.Vector3 (vyhlazená pozice)

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND);
    this.camera = new THREE.PerspectiveCamera(
      60, container.clientWidth / container.clientHeight, 1, 50000);
    this.camera.position.set(0, 0, 900);

    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    this.webgl.setSize(container.clientWidth, container.clientHeight);
    this.webgl.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.webgl.domElement);

    this.controls = new OrbitControls(this.camera, this.webgl.domElement);
    this.controls.enableDamping = true;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(1, 2, 3);
    this.scene.add(sun);

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
    this._fullColor = new THREE.Color(NODE_COLOR);
    this._dimColor = new THREE.Color(NODE_COLOR)
      .lerp(new THREE.Color(BACKGROUND), DIM_TOWARD_BG);
    this.focusId = null;        // id uzlu, ke kterému letí kamera
    this.focusElapsed = 0;
    this._focusFrom = new THREE.Vector3();

    window.addEventListener('resize', () => {
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.webgl.setSize(container.clientWidth, container.clientHeight);
    });
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
    const material = new THREE.MeshStandardMaterial(
      { color: 0xffffff, roughness: 0.4 });
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
      new THREE.LineBasicMaterial(
        { color: EDGE_COLOR, transparent: true, opacity: 0.5 }));
    this.edgeLines.frustumCulled = false;
    this.scene.add(this.edgeLines);
    this.edgeCapacity = capacity;
  }

  start() {
    this.webgl.setAnimationLoop(() => this._frame());
  }

  _frame() {
    const dt = this.clock.getDelta();
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
}
