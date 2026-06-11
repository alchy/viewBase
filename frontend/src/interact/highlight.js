/** BFS nad store.edges od startId do hloubky depth (0 = jen samotný uzel).
 *  Vrací Set id uzlů ke zvýraznění; neznámý start = prázdná množina. */
export function neighborhood(store, startId, depth) {
  const result = new Set();
  if (!store.nodes.has(startId)) return result;
  result.add(startId);
  if (depth <= 0) return result;

  const adjacency = new Map();
  const link = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a).push(b);
  };
  for (const edge of store.edges.values()) {
    link(edge.source, edge.target);
    link(edge.target, edge.source);
  }

  let frontier = [startId];
  for (let level = 0; level < depth && frontier.length > 0; level += 1) {
    const next = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (!result.has(neighbor)) {
          result.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }
  return result;
}
