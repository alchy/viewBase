import { describe, expect, it } from 'vitest';
import { GraphStore } from '../src/core/store.js';
import { neighborhood } from '../src/interact/highlight.js';

function makeStore() {
  const store = new GraphStore();
  store.applyInit({
    type: 'init', protocol: 1, seq: 0, config: {}, node_types: {},
    nodes: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, label: id, meta: {} })),
    edges: [
      { source: 'a', target: 'b', meta: {} },
      { source: 'b', target: 'c', meta: {} },
      { source: 'c', target: 'd', meta: {} },
    ],
  });
  return store;
}

describe('neighborhood (BFS nad store.edges)', () => {
  it('hloubka 1 = uzel + přímí sousedé', () => {
    expect(neighborhood(makeStore(), 'b', 1)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('hloubka 2 jde po hranách dál', () => {
    expect(neighborhood(makeStore(), 'a', 2)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('hloubka 0 = jen samotný uzel', () => {
    expect(neighborhood(makeStore(), 'a', 0)).toEqual(new Set(['a']));
  });

  it('izolovaný uzel zůstane sám, neznámý start = prázdná množina', () => {
    expect(neighborhood(makeStore(), 'e', 3)).toEqual(new Set(['e']));
    expect(neighborhood(makeStore(), 'ghost', 1)).toEqual(new Set());
  });
});
