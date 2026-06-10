import { describe, expect, it } from 'vitest';
import { GraphStore } from '../src/core/store.js';

const initMsg = (over = {}) => ({
  type: 'init', protocol: 1, seq: 0,
  config: { dimensions: 3 }, node_types: {},
  nodes: [{ id: 'a', label: 'a', meta: {} }, { id: 'b', label: 'b', meta: {} }],
  edges: [{ source: 'a', target: 'b', meta: {} }],
  ...over,
});

const patchMsg = (seq, over = {}) => ({
  type: 'patch', seq,
  add_nodes: [], update_nodes: [], remove_nodes: [],
  add_edges: [], remove_edges: [],
  ...over,
});

describe('GraphStore', () => {
  it('applyInit naplní stav a nastaví seq', () => {
    const store = new GraphStore();
    store.applyInit(initMsg());
    expect(store.nodes.size).toBe(2);
    expect(store.edges.size).toBe(1);
    expect(store.seq).toBe(0);
    expect(store.config.dimensions).toBe(3);
  });

  it('patch přidá uzel s hranou a odebere uzel kaskádově', () => {
    const store = new GraphStore();
    store.applyInit(initMsg());
    const ok = store.applyPatch(patchMsg(1, {
      add_nodes: [{ id: 'c', label: 'c', meta: {} }],
      add_edges: [{ source: 'b', target: 'c', meta: {} }],
      remove_nodes: ['a'],
    }));
    expect(ok).toBe(true);
    expect(store.nodes.has('a')).toBe(false);
    expect(store.edges.has(GraphStore.edgeKey('a', 'b'))).toBe(false); // kaskáda
    expect(store.edges.has(GraphStore.edgeKey('b', 'c'))).toBe(true);
    expect(store.seq).toBe(1);
  });

  it('mezera v seq vrátí false a nic nezmění', () => {
    const store = new GraphStore();
    store.applyInit(initMsg());
    const ok = store.applyPatch(patchMsg(5, { remove_nodes: ['a'] }));
    expect(ok).toBe(false);
    expect(store.nodes.has('a')).toBe(true);
    expect(store.seq).toBe(0);
  });

  it('add existujícího uzlu je upsert, remove neznámého je no-op', () => {
    const store = new GraphStore();
    store.applyInit(initMsg());
    const ok = store.applyPatch(patchMsg(1, {
      add_nodes: [{ id: 'a', label: 'Nové A', meta: { x: 1 } }],
      remove_nodes: ['ghost'],
    }));
    expect(ok).toBe(true);
    expect(store.nodes.get('a').label).toBe('Nové A');
  });

  it('notifikuje odběratele o init i patchi', () => {
    const store = new GraphStore();
    const events = [];
    store.subscribe((e) => events.push(e.kind));
    store.applyInit(initMsg());
    store.applyPatch(patchMsg(1));
    expect(events).toEqual(['init', 'patch']);
  });
});
