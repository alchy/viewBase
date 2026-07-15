import { describe, expect, it } from 'vitest';
import {
  FlowController, interpolateAlongPath, resolveFlowColor,
} from '../src/render/flow.js';

function displayMap(entries) {
  const m = new Map();
  for (const [id, [x, y, z]] of entries) m.set(id, { x, y, z });
  return m;
}

describe('interpolateAlongPath', () => {
  const disp = displayMap([['a', [0, 0, 0]], ['b', [10, 0, 0]]]);

  it('t=0 je počátek, t=1 je konec', () => {
    expect(interpolateAlongPath(['a', 'b'], 0, disp)).toEqual({ x: 0, y: 0, z: 0 });
    expect(interpolateAlongPath(['a', 'b'], 1, disp)).toEqual({ x: 10, y: 0, z: 0 });
  });

  it('t=0.5 je střed hrany', () => {
    expect(interpolateAlongPath(['a', 'b'], 0.5, disp)).toEqual({ x: 5, y: 0, z: 0 });
  });

  it('multi-hop: výběr segmentu podle kumulativní délky', () => {
    // a-b délka 10, b-c délka 30, celkem 40; t=0.5 → 20 od začátku =
    // 10 (celé a-b) + 10 do b-c (třetina) → x = 10 + 10 = 20
    const d = displayMap([['a', [0, 0, 0]], ['b', [10, 0, 0]], ['c', [40, 0, 0]]]);
    const p = interpolateAlongPath(['a', 'b', 'c'], 0.5, d);
    expect(p.x).toBeCloseTo(20, 5);
  });

  it('chybějící koncová pozice → null (uzel ještě nemá pozici)', () => {
    expect(interpolateAlongPath(['a', 'x'], 0.5, disp)).toBeNull();
  });

  it('degenerovaná cesta (nulová délka) → počátek', () => {
    const d = displayMap([['a', [5, 5, 5]], ['b', [5, 5, 5]]]);
    expect(interpolateAlongPath(['a', 'b'], 0.7, d)).toEqual({ x: 5, y: 5, z: 5 });
  });
});

describe('resolveFlowColor', () => {
  const theme = { palette: ['#111111', '#222222', '#333333'], flow: { color: '#999999' } };

  it('explicitní per-flow barva má přednost', () => {
    expect(resolveFlowColor({ color: '#abcdef', type_index: 1 }, { color: '#000000' }, theme))
      .toBe('#abcdef');
  });

  it('barva typu (z define_flow_type) je druhá v pořadí', () => {
    expect(resolveFlowColor({ color: null, type_index: 1 }, { color: '#0f0f0f' }, theme))
      .toBe('#0f0f0f');
  });

  it('bez explicitní barvy → kategorická paleta podle indexu typu', () => {
    expect(resolveFlowColor({ color: null, type_index: 2 }, null, theme)).toBe('#333333');
  });

  it('index mimo rozsah se cyklí (modulo)', () => {
    expect(resolveFlowColor({ color: null, type_index: 4 }, null, theme)).toBe('#222222');
  });

  it('bez typu i barvy → default tématu', () => {
    expect(resolveFlowColor({ color: null, type_index: null }, null, theme)).toBe('#999999');
  });
});

describe('FlowController', () => {
  let t = 0;
  const now = () => t;
  const store = { flowTypes: { dns: { color: '#ffd166', size: 0.7, speed: 1.5 } } };

  function makeAction(extra = {}) {
    return {
      action: 'flow', path: ['a', 'b'], flow_type: null, type_index: null,
      count: 3, interval: 0.2, speed: 1.0, color: '#abcdef', size: null, ...extra,
    };
  }

  it('jednorázový tok vyemituje count částic po interval sekundách', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.applyFlow(makeAction({ count: 3, interval: 0.2 }));
    fc.update(0, null); expect(fc.particles().length).toBe(1);   // 1. částice hned
    t = 0.2; fc.update(0.2, null); expect(fc.particles().length).toBe(2);
    t = 0.4; fc.update(0.2, null); expect(fc.particles().length).toBe(3);
    t = 0.6; fc.update(0.2, null); expect(fc.particles().length).toBe(3); // už ne 4.
  });

  it('jednorázový tok se po doletu částic uklidí (activeCount → 0)', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.setDisplay(displayMap([['a', [0, 0, 0]], ['b', [10, 0, 0]]]));
    fc.applyFlow(makeAction({ count: 1, interval: 0.2, speed: 1.0 }));
    const theme = { flow: { baseSpeed: 1000 }, palette: [] };
    fc.update(0, theme);
    t = 5; fc.update(5, theme);          // 10 jednotek / 1000 = 0.01 s dolet
    expect(fc.activeCount()).toBe(0);
  });

  it('trvalý tok emituje dál a žije, dokud ho stopFlow nezastaví', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.applyFlow(makeAction({ count: null, interval: 0.2, flow_id: 'aa' }));
    t = 1.0; fc.update(1.0, null);
    expect(fc.activeCount()).toBe(1);
    fc.stopFlow('aa');
    expect(fc.activeCount()).toBe(0);
  });

  it('replayInit přehraje trvalé toky z init.flows', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.replayInit([makeAction({ count: null, flow_id: 'bb' })]);
    expect(fc.activeCount()).toBe(1);
  });

  it('applyFlow se stejným flow_id nahradí starý tok (init + akce se nesčítají)', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.applyFlow(makeAction({ count: null, flow_id: 'dup' }));
    fc.applyFlow(makeAction({ count: null, flow_id: 'dup' }));
    expect(fc.activeCount()).toBe(1);
    fc.stopFlow('dup');
    expect(fc.activeCount()).toBe(0);       // žádná osiřelá kopie
  });

  it('speed typu toku (define_flow_type) násobí rychlost částic', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.setDisplay(displayMap([['a', [0, 0, 0]], ['b', [10, 0, 0]]]));
    fc.applyFlow(makeAction({ count: 1, flow_type: 'dns' }));   // dns: speed 1.5
    const theme = { flow: { baseSpeed: 1 }, palette: [] };
    fc.update(0, theme);
    expect(fc.activeCount()).toBe(1);
    // dolet = 10 / (1 · 1.0 · 1.5) ≈ 6.67 s; bez zohlednění typu by byl 10 s
    t = 8; fc.update(8, theme);
    expect(fc.activeCount()).toBe(0);
  });

  it('tok se zahodí, když jeho uzel zmizí ze store (remove_node)', () => {
    t = 0;
    const graphStore = { flowTypes: {}, nodes: new Map([['a', {}], ['b', {}]]) };
    const fc = new FlowController(graphStore, { now });
    fc.applyFlow(makeAction({ count: null, flow_id: 'gone' }));
    fc.update(0, null);
    expect(fc.activeCount()).toBe(1);
    graphStore.nodes.delete('b');
    t = 1; fc.update(1, null);
    expect(fc.activeCount()).toBe(0);
  });

  it('replayInit nahradí předchozí trvalé toky (reconnect)', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.replayInit([makeAction({ count: null, flow_id: 'bb' })]);
    fc.replayInit([makeAction({ count: null, flow_id: 'cc' })]);
    expect(fc.activeCount()).toBe(1);   // jen 'cc'
  });
});
