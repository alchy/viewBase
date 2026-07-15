import {
  forceCenter, forceLink, forceManyBody, forceSimulation,
} from 'd3-force-3d';

const SPAWN_JITTER = 10;

function endId(end) {
  return typeof end === 'object' && end !== null ? end.id : end;
}

function linkKey(s, t) {
  return s <= t ? `${s}\u0000${t}` : `${t}\u0000${s}`;
}

/** Fyzikální jádro – čistá logika bez Workeru (testovatelné ve vitestu). */
export class PhysicsCore {
  constructor({ dimensions = 3 } = {}) {
    this.dimensions = dimensions;
    this.nodes = [];
    this.links = [];
    this.byId = new Map();
    this.sim = forceSimulation([], dimensions)
      .force('link', forceLink([]).id((d) => d.id).distance(60))
      .force('charge', forceManyBody().strength(-120).theta(0.9))
      .force('center', forceCenter())
      .stop();
  }

  applyInit({ nodes, links }) {
    this.nodes = nodes.map((n) => ({ id: n.id }));
    this.byId = new Map(this.nodes.map((n) => [n.id, n]));
    this.links = links.map((l) => ({ source: l.source, target: l.target }));
    this._rebuild();
    this.sim.alpha(1);
  }

  applyPatch({ addNodes = [], removeNodes = [], addLinks = [], removeLinks = [] }) {
    const removed = new Set(removeNodes);
    if (removed.size) {
      this.nodes = this.nodes.filter((n) => !removed.has(n.id));
      this.links = this.links.filter(
        (l) => !removed.has(endId(l.source)) && !removed.has(endId(l.target)));
      for (const id of removed) this.byId.delete(id);
    }
    const removedLinks = new Set(removeLinks.map(([s, t]) => linkKey(s, t)));
    if (removedLinks.size) {
      this.links = this.links.filter(
        (l) => !removedLinks.has(linkKey(endId(l.source), endId(l.target))));
    }
    const neighborOf = new Map();
    for (const { source, target } of addLinks) {
      if (!neighborOf.has(source)) neighborOf.set(source, target);
      if (!neighborOf.has(target)) neighborOf.set(target, source);
    }
    for (const { id } of addNodes) {
      if (this.byId.has(id)) continue;                      // idempotence
      const node = { id, ...this._spawnPosition(neighborOf.get(id)) };
      this.nodes.push(node);
      this.byId.set(id, node);
    }
    // Idempotence i pro linky: po (re)connectu s pending deltami přijdou
    // add_edges, které init už obsahoval – duplicitní pružina by hranu
    // tahala dvojnásobnou silou.
    const known = new Set(
      this.links.map((l) => linkKey(endId(l.source), endId(l.target))));
    for (const { source, target } of addLinks) {
      const key = linkKey(source, target);
      if (known.has(key)) continue;
      if (this.byId.has(source) && this.byId.has(target)) {
        known.add(key);
        this.links.push({ source, target });
      }
    }
    this._rebuild();
    this.sim.alpha(Math.max(this.sim.alpha(), 0.5));        // lokální ohřátí
  }

  /** Nový uzel se rodí poblíž prvního existujícího souseda, ne náhodně. */
  _spawnPosition(neighborId) {
    const near = neighborId ? this.byId.get(neighborId) : null;
    if (!near || near.x === undefined) return {};           // d3 rozmístí samo
    const jitter = () => (Math.random() - 0.5) * 2 * SPAWN_JITTER;
    return {
      x: near.x + jitter(),
      y: near.y + jitter(),
      z: this.dimensions === 3 ? near.z + jitter() : 0,
    };
  }

  _rebuild() {
    this.sim.nodes(this.nodes);
    this.sim.force('link').links(this.links);
  }

  /** Jeden krok simulace; null = vychladlá (není co počítat). */
  tick() {
    if (this.sim.alpha() < this.sim.alphaMin()) return null;
    this.sim.tick();
    return this.positions();
  }

  positions() {
    const buf = new Float32Array(this.nodes.length * 3);
    this.nodes.forEach((n, i) => {
      buf[i * 3] = n.x;
      buf[i * 3 + 1] = n.y;
      buf[i * 3 + 2] = this.dimensions === 3 ? n.z : 0;
    });
    return buf;
  }

  ids() {
    return this.nodes.map((n) => n.id);
  }
}
