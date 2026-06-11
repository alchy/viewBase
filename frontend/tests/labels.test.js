import { describe, expect, it } from 'vitest';
import { selectLabelIds } from '../src/render/labels.js';

const cam = { x: 0, y: 0, z: 0 };

/** Uzly na ose x ve vzdálenostech 1, 2, 3, … od kamery. */
function line(ids) {
  const positions = new Float32Array(ids.length * 3);
  ids.forEach((id, i) => { positions[i * 3] = i + 1; });
  return positions;
}

describe('selectLabelIds', () => {
  it('bez zvýraznění vybere nejbližší ke kameře do rozpočtu', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const set = selectLabelIds(ids, line(ids), cam, null, 2);
    expect([...set].sort()).toEqual(['a', 'b']);
  });

  it('zvýrazněné mají přednost před bližšími', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const set = selectLabelIds(ids, line(ids), cam, new Set(['d']), 2);
    expect(set.has('d')).toBe(true);    // zvýrazněný, i když nejdál
    expect(set.has('a')).toBe(true);    // zbytek rozpočtu doplní nejbližší
    expect(set.size).toBe(2);
  });

  it('rozpočet je tvrdý strop i pro zvýrazněné', () => {
    const ids = ['a', 'b', 'c'];
    const set = selectLabelIds(ids, line(ids), cam, new Set(ids), 2);
    expect(set.size).toBe(2);
  });

  it('budget 0 → prázdná množina', () => {
    expect(selectLabelIds(['a'], line(['a']), cam, null, 0).size).toBe(0);
  });

  it('graf menší než rozpočet → labely všech uzlů', () => {
    const ids = ['a', 'b'];
    expect(selectLabelIds(ids, line(ids), cam, null, 200).size).toBe(2);
  });
});
