import { describe, expect, it } from 'vitest';
import { PhysicsCore } from '../src/physics/core.js';

describe('PhysicsCore', () => {
  it('init rozmístí uzly a tick vrací Float32Array pozic', () => {
    const core = new PhysicsCore({ dimensions: 3 });
    core.applyInit({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [{ source: 'a', target: 'b' }],
    });
    const buf = core.tick();
    expect(core.ids()).toEqual(['a', 'b']);
    expect(buf).toBeInstanceOf(Float32Array);
    expect(buf).toHaveLength(6);
  });

  it('patch přidá uzel u souseda a odebere uzel i s hranami', () => {
    const core = new PhysicsCore({ dimensions: 3 });
    core.applyInit({ nodes: [{ id: 'a' }, { id: 'b' }], links: [] });
    const a = core.nodes.find((n) => n.id === 'a');
    core.applyPatch({
      addNodes: [{ id: 'c' }],
      addLinks: [{ source: 'c', target: 'a' }],
    });
    const c = core.nodes.find((n) => n.id === 'c');
    const dist = Math.hypot(c.x - a.x, c.y - a.y, c.z - a.z);
    expect(dist).toBeLessThan(30);          // zrodil se poblíž souseda

    core.applyPatch({ removeNodes: ['a'] });
    expect(core.ids()).toEqual(['b', 'c']);
    expect(core.links).toHaveLength(0);     // kaskáda hran
  });

  it('simulace po vychladnutí přestane tikat a patch ji ohřeje', () => {
    const core = new PhysicsCore({ dimensions: 3 });
    core.applyInit({ nodes: [{ id: 'a' }], links: [] });
    let last = null;
    for (let i = 0; i < 2000 && (last = core.tick()) !== null; i += 1);
    expect(last).toBeNull();                // vychladla
    core.applyPatch({ addNodes: [{ id: 'b' }] });
    expect(core.tick()).not.toBeNull();     // ohřátá
  });

  it('ve 2D drží z = 0', () => {
    const core = new PhysicsCore({ dimensions: 2 });
    core.applyInit({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [{ source: 'a', target: 'b' }],
    });
    const buf = core.tick();
    expect(buf[2]).toBe(0);
    expect(buf[5]).toBe(0);
  });
});
