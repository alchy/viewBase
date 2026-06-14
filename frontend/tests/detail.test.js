import { describe, expect, it } from 'vitest';
import { detailPatchAction } from '../src/interact/detail.js';

const patch = (over = {}) => ({
  add_nodes: [], update_nodes: [], remove_nodes: [],
  add_edges: [], remove_edges: [], ...over,
});

describe('detailPatchAction', () => {
  it('nic není zobrazeno → null', () => {
    expect(detailPatchAction(patch({ remove_nodes: ['a'] }), null)).toBe(null);
  });

  it('update zobrazeného uzlu → refresh', () => {
    expect(detailPatchAction(patch({ update_nodes: [{ id: 'a' }] }), 'a'))
      .toBe('refresh');
  });

  it('remove zobrazeného uzlu → hide (má přednost před update)', () => {
    expect(detailPatchAction(
      patch({ update_nodes: [{ id: 'a' }], remove_nodes: ['a'] }), 'a'))
      .toBe('hide');
  });

  it('patch jiných uzlů → null', () => {
    expect(detailPatchAction(
      patch({ update_nodes: [{ id: 'b' }], remove_nodes: ['c'] }), 'a'))
      .toBe(null);
  });
});
