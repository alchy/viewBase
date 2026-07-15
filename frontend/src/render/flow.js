import * as THREE from 'three';

const PARTICLE_SEGMENTS = 8;        // detail koule glow částice (lacině)
const PARTICLE_BASE_RADIUS = 1;     // geometrie má r=1, velikost řídí scale

/** Lineárně interpoluj bod na cestě (≥2 uzly) v parametru t∈[0,1] podle
 *  KUMULATIVNÍ délky segmentů (delší hrana = pomalejší průchod v t).
 *  `display` je Map id → {x,y,z} (Živé pozice z rendereru). Vrátí
 *  {x,y,z} nebo null, když nějaký koncový uzel ještě nemá pozici. */
export function interpolateAlongPath(path, t, display) {
  const pts = [];
  for (const id of path) {
    const p = display.get(id);
    if (!p) return null;
    pts.push(p);
  }
  const lengths = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const dz = pts[i + 1].z - pts[i].z;
    const len = Math.hypot(dx, dy, dz);
    lengths.push(len);
    total += len;
  }
  if (total === 0) return { x: pts[0].x, y: pts[0].y, z: pts[0].z };
  const clamped = Math.max(0, Math.min(1, t));
  let dist = clamped * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (dist <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] === 0 ? 0 : dist / lengths[i];
      const a = pts[i];
      const b = pts[i + 1];
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        z: a.z + (b.z - a.z) * f,
      };
    }
    dist -= lengths[i];
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, z: last.z };
}

/** Celková délka cesty ve světových jednotkách (0 když chybí pozice).
 *  Slouží k přepočtu rychlosti (jednotky/s) na rychlost v parametru t. */
export function pathLength(path, display) {
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = display.get(path[i]);
    const b = display.get(path[i + 1]);
    if (!a || !b) return 0;
    total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
  return total;
}

/** Výsledná barva toku (hex). Priorita: explicitní per-flow > barva typu >
 *  kategorická paleta podle indexu typu > default tématu. */
export function resolveFlowColor(flow, flowTypeStyle, theme) {
  if (flow.color) return flow.color;
  if (flowTypeStyle && flowTypeStyle.color) return flowTypeStyle.color;
  const palette = theme.palette ?? [];
  if (flow.type_index != null && palette.length > 0) {
    return palette[flow.type_index % palette.length];
  }
  return theme.flow.color;
}

/** Jeden aktivní tok: drží svůj parametr emise a žijicí částice.
 *  Čistá logika nad časem (now v sekundách) – render řeší FlowLayer. */
class Flow {
  constructor(action, now) {
    this.path = action.path;
    this.flowType = action.flow_type ?? null;
    this.typeIndex = action.type_index ?? null;
    this.color = action.color ?? null;
    this.size = action.size ?? null;
    this.count = action.count;               // int | null (trvalý)
    this.interval = Math.max(0.001, action.interval ?? 0.2);
    this.speed = action.speed ?? 1.0;
    this.flowId = action.flow_id ?? null;
    this.emitted = 0;                         // počet vyemitovaných částic
    this.nextEmit = now;                      // čas příští emise
    this.particles = [];                      // [{ born }]
    this.done = false;                        // true = vše doletělo, lze uklidit
  }

  /** Vyemituj částice splatné do času `now`, zestárni a uklid doletělé.
   *  travelTime = délka cesty / (theme.flow.baseSpeed * speed). */
  step(now, travelTime) {
    while (this.nextEmit <= now
        && (this.count === null || this.emitted < this.count)) {
      this.particles.push({ born: this.nextEmit });
      this.emitted += 1;
      this.nextEmit += this.interval;
    }
    if (travelTime > 0) {
      this.particles = this.particles.filter((p) => now - p.born < travelTime);
    }
    if (this.count !== null && this.emitted >= this.count
        && this.particles.length === 0) {
      this.done = true;
    }
  }
}

/** Spravuje aktivní toky: aplikuje akce, přehrává init.flows, eviduje čas.
 *  `now` je injektovatený (testy); ve hře renderer předává akumulovaný čas. */
export class FlowController {
  constructor(store, { now = () => performance.now() / 1000 } = {}) {
    this.store = store;
    this.now = now;
    this.flows = [];               // jednorázové + trvalé dohromady
    this.persistent = new Map();   // flow_id -> Flow (pro stopFlow / replay)
  }

  /** Idempotentní podle flow_id: server může tentýž trvalý tok doručit
   *  v initu i následnou akcí (connect uprostřed broadcast okna) – starý
   *  tok se nahradí, nikdy neběží dvakrát. */
  applyFlow(action) {
    const flow = new Flow(action, this.now());
    if (flow.flowId !== null) {
      const prev = this.persistent.get(flow.flowId);
      if (prev) this.flows = this.flows.filter((f) => f !== prev);
      this.persistent.set(flow.flowId, flow);
    }
    this.flows.push(flow);
  }

  stopFlow(flowId) {
    const flow = this.persistent.get(flowId);
    if (!flow) return;
    this.persistent.delete(flowId);
    this.flows = this.flows.filter((f) => f !== flow);
  }

  replayInit(flowsArray) {
    // reconnect: zahodť staré trvalé toky, nahradť je tím, co nese init
    this.flows = this.flows.filter((f) => f.flowId === null);
    this.persistent.clear();
    for (const action of flowsArray) this.applyFlow(action);
  }

  activeCount() {
    return this.flows.length;
  }

  /** Efektivní násobek rychlosti: per-flow speed × speed typu toku. */
  _speedOf(flow) {
    const style = this.store.flowTypes?.[flow.flowType] ?? null;
    return flow.speed * (style?.speed ?? 1);
  }

  /** Posuň simulaci o dt, splatné částice vyemituj, doletělé jednorázové
   *  toky uklid. `theme` může být null (testy bez doletu) – pak travelTime=0
   *  a částice nestárnou (drží se kvůli kontrole emise). Toky, jejichž uzel
   *  zmizel ze store (remove_node), se zahodí – jinak by s travelTime=0
   *  hromadily částice donekonečna. */
  update(dt, theme) {
    const now = this.now();
    const baseSpeed = theme?.flow?.baseSpeed ?? 0;
    const display = this._display;
    for (const flow of this.flows) {
      let travelTime = 0;
      if (baseSpeed > 0 && display) {
        const len = pathLength(flow.path, display);
        const v = baseSpeed * this._speedOf(flow);
        travelTime = (len > 0 && v > 0) ? len / v : 0;
      }
      flow.step(now, travelTime);
    }
    const nodes = this.store.nodes;   // undefined v čistě logických testech
    this.flows = this.flows.filter((f) => {
      if (f.flowId === null && f.done) return false;
      if (nodes && f.path.some((id) => !nodes.has(id))) {
        if (f.flowId !== null) this.persistent.delete(f.flowId);
        return false;
      }
      return true;
    });
  }

  /** Nastav živou mapu pozic (renderer ji předá před update). */
  setDisplay(display) {
    this._display = display;
  }

  /** Body všech žijicích částic + jejich barvy (pro FlowLayer / E2E). */
  particles() {
    const display = this._display;
    const theme = this._theme;
    const out = [];
    if (!display || !theme) {
      // čistě logický režim (testy bez tématu): vrať jen počet jako placeholdery
      for (const flow of this.flows) {
        for (const p of flow.particles) out.push({ x: 0, y: 0, z: 0, color: '#ffffff' });
      }
      return out;
    }
    const now = this.now();
    for (const flow of this.flows) {
      const len = pathLength(flow.path, display);
      const v = (theme.flow.baseSpeed ?? 0) * this._speedOf(flow);
      const travelTime = (len > 0 && v > 0) ? len / v : 0;
      const style = this.store.flowTypes?.[flow.flowType] ?? null;
      const color = resolveFlowColor(flow, style, theme);
      const size = flow.size ?? style?.size ?? theme.flow.size;
      for (const p of flow.particles) {
        const t = travelTime > 0 ? (now - p.born) / travelTime : 0;
        const pos = interpolateAlongPath(flow.path, t, display);
        if (pos) out.push({ x: pos.x, y: pos.y, z: pos.z, color, size });
      }
    }
    return out;
  }

  /** Renderer před particles() předá živé pozice i téma. */
  prepare(display, theme) {
    this._display = display;
    this._theme = theme;
  }
}

/** Vykreslovací vrstva: InstancedMesh glow částic s aditivním blendingem.
 *  Per-frame přepočte pozice z FlowController.particles() a barvy per-instance. */
export class FlowLayer {
  constructor(scene, store, controller) {
    this.scene = scene;
    this.store = store;
    this.controller = controller;
    this.theme = null;
    this.capacity = 0;
    this.mesh = null;
    this._matrix = new THREE.Matrix4();
    this._color = new THREE.Color();
    this._ensureCapacity(1024);
  }

  _ensureCapacity(count) {
    if (this.mesh && count <= this.capacity) return;
    const capacity = Math.max(1024, 2 ** Math.ceil(Math.log2(Math.max(1, count))));
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh.dispose();
    }
    const geometry = new THREE.SphereGeometry(
      PARTICLE_BASE_RADIUS, PARTICLE_SEGMENTS, PARTICLE_SEGMENTS);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: this.theme?.flow.opacity ?? 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.capacity = capacity;
  }

  applyTheme(theme) {
    this.theme = theme;
    if (this.mesh) this.mesh.material.opacity = theme.flow.opacity;
  }

  /** Per-frame: posuň controller a vykresli částice na živé pozice. */
  update(dt, theme, display) {
    this.theme = theme;
    this.controller.prepare(display, theme);
    this.controller.update(dt, theme);
    const parts = this.controller.particles();
    this._ensureCapacity(parts.length);
    const mesh = this.mesh;
    for (let i = 0; i < parts.length; i += 1) {
      const p = parts[i];
      const s = p.size ?? theme.flow.size;
      this._matrix.makeScale(s, s, s);
      this._matrix.setPosition(p.x, p.y, p.z);
      mesh.setMatrixAt(i, this._matrix);
      this._color.set(p.color);
      mesh.setColorAt(i, this._color);
    }
    mesh.count = parts.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  /** Počet vykreslených částic (E2E / kontrola). */
  particleCount() {
    return this.mesh ? this.mesh.count : 0;
  }

  dispose() {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
    this.mesh = null;
  }
}
