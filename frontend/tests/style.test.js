import { describe, expect, it } from 'vitest';
import { nodeStyle } from '../src/render/style.js';

const theme = { node: { color: '#111111', size: 1, shape: 'sphere' } };
const types = { server: { shape: 'box', color: '#222222', size: 1.4 } };

describe('nodeStyle', () => {
  it('bez typu a meta bere vše z tématu', () => {
    expect(nodeStyle({ id: 'a', type: null, meta: {} }, types, theme))
      .toEqual({ shape: 'sphere', color: '#111111', size: 1 });
  });

  it('typ přebíjí téma', () => {
    expect(nodeStyle({ id: 'a', type: 'server', meta: {} }, types, theme))
      .toEqual({ shape: 'box', color: '#222222', size: 1.4 });
  });

  it('meta.color a meta.size přebíjí typ', () => {
    expect(nodeStyle(
      { id: 'a', type: 'server', meta: { color: '#ff0000', size: 3 } },
      types, theme))
      .toEqual({ shape: 'box', color: '#ff0000', size: 3 });
  });

  it('typ bez tvaru/velikosti doplní téma', () => {
    const partial = { db: { color: '#333333' } };
    expect(nodeStyle({ id: 'a', type: 'db', meta: {} }, partial, theme))
      .toEqual({ shape: 'sphere', color: '#333333', size: 1 });
  });

  it('neznámý typ spadne celý na téma (store může být o patch pozadu)', () => {
    expect(nodeStyle({ id: 'a', type: 'ghost', meta: {} }, types, theme))
      .toEqual({ shape: 'sphere', color: '#111111', size: 1 });
  });
});
