/** Most mezi GraphStore a fyzikálním workerem. Drží poslední ids + pozice
 *  pro renderer (ids a buffer se mohou krátce lišit délkou – renderer bere
 *  min(ids.length, positions.length / 3)). */
export class PhysicsEngine {
  constructor(store) {
    this.ids = [];
    this.positions = new Float32Array(0);
    this.worker = new Worker(new URL('./worker.js', import.meta.url),
      { type: 'module' });
    this.worker.onmessage = ({ data }) => {
      if (data.type === 'index') this.ids = data.ids;
      else if (data.type === 'tick') this.positions = data.positions;
    };
    store.subscribe((event) => this._onStoreEvent(store, event));
  }

  _onStoreEvent(store, event) {
    if (event.kind === 'init') {
      this.worker.postMessage({
        type: 'init',
        dimensions: store.config.dimensions,
        nodes: [...store.nodes.values()].map((n) => ({ id: n.id })),
        links: [...store.edges.values()]
          .map((e) => ({ source: e.source, target: e.target })),
      });
    } else if (event.kind === 'patch') {
      const p = event.patch;
      this.worker.postMessage({
        type: 'patch',
        addNodes: p.add_nodes.map((n) => ({ id: n.id })),
        removeNodes: p.remove_nodes,
        addLinks: p.add_edges.map((e) => ({ source: e.source, target: e.target })),
        removeLinks: p.remove_edges,
      });
    }
  }
}
