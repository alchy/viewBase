/** Jediné zrcadlo stavu grafu na klientovi. */
export class GraphStore {
  constructor() {
    this.config = {};
    this.nodeTypes = {};
    this.nodes = new Map();   // id -> {id, type, label, meta}
    this.edges = new Map();   // edgeKey -> {source, target, meta}
    this.seq = -1;
    this.listeners = new Set();
  }

  static edgeKey(source, target) {
    return source <= target
      ? `${source}\u0000${target}`
      : `${target}\u0000${source}`;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(event) {
    for (const listener of this.listeners) listener(event);
  }

  applyInit(msg) {
    this.config = msg.config;
    this.nodeTypes = msg.node_types;
    this.nodes.clear();
    this.edges.clear();
    for (const node of msg.nodes) this.nodes.set(node.id, node);
    for (const edge of msg.edges) {
      this.edges.set(GraphStore.edgeKey(edge.source, edge.target), edge);
    }
    this.seq = msg.seq;
    this._emit({ kind: 'init' });
  }

  /** Aplikuje patch; false = mezera v seq (volající si vyžádá čerstvý init).
   *  Pevné pořadí: remove_edges, remove_nodes, add_nodes, update_nodes,
   *  add_edges. Adds/updates jsou upserty, remove neznámého je no-op. */
  applyPatch(msg) {
    if (msg.seq !== this.seq + 1) return false;
    for (const [source, target] of msg.remove_edges) {
      this.edges.delete(GraphStore.edgeKey(source, target));
    }
    for (const id of msg.remove_nodes) {
      this.nodes.delete(id);
      for (const [key, edge] of this.edges) {
        if (edge.source === id || edge.target === id) this.edges.delete(key);
      }
    }
    for (const node of msg.add_nodes) this.nodes.set(node.id, node);
    for (const node of msg.update_nodes) this.nodes.set(node.id, node);
    for (const edge of msg.add_edges) {
      if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
        console.warn('viewbase: hrana s neznámým koncem přeskočena',
          edge.source, edge.target);
        continue;
      }
      this.edges.set(GraphStore.edgeKey(edge.source, edge.target), edge);
    }
    this.seq = msg.seq;
    this._emit({ kind: 'patch', patch: msg });
    return true;
  }
}
