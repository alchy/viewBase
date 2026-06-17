import { describe, expect, it } from 'vitest';
import { bezierEdgePoints, EDGE_SEGMENTS } from '../src/render/edges.js';

const a = { x: 0, y: 0, z: 0 };
const b = { x: 10, y: 0, z: 0 };

describe('bezierEdgePoints', () => {
  it('vrátí segments+1 bodů', () => {
    expect(bezierEdgePoints(a, b, 0.5, 8).length).toBe(9);
    expect(bezierEdgePoints(a, b, 0.5).length).toBe(EDGE_SEGMENTS + 1);
  });

  it('koncové body jsou a a b', () => {
    const p = bezierEdgePoints(a, b, 0.5, 8);
    expect(p[0]).toEqual({ x: 0, y: 0, z: 0 });
    expect(p[8].x).toBeCloseTo(10);
    expect(p[8].y).toBeCloseTo(0);
    expect(p[8].z).toBeCloseTo(0);
  });

  it('elasticita 0 → kolineární (střed na úsečce)', () => {
    const p = bezierEdgePoints(a, b, 0, 8);
    expect(p[4].x).toBeCloseTo(5);
    expect(p[4].y).toBeCloseTo(0);
    expect(p[4].z).toBeCloseTo(0);
  });

  it('elasticita > 0 → prohnutí ve středu roste s elasticitou', () => {
    const mid1 = bezierEdgePoints(a, b, 0.3, 8)[4];
    const mid2 = bezierEdgePoints(a, b, 0.8, 8)[4];
    const bow1 = Math.hypot(mid1.y, mid1.z);
    const bow2 = Math.hypot(mid2.y, mid2.z);
    expect(bow1).toBeGreaterThan(0);
    expect(bow2).toBeGreaterThan(bow1);
  });

  it('hrana rovnoběžná s osou Y má platnou kolmici (prohnutí v X/Z)', () => {
    const p = bezierEdgePoints({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 },
      0.5, 8)[4];
    expect(Math.hypot(p.x, p.z)).toBeGreaterThan(0);
  });
});
