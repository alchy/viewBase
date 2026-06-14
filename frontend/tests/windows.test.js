import { describe, expect, it } from 'vitest';
import {
  buildRows, clampToCanvas, dockLayout, windowsToRefresh,
} from '../src/render/windows.js';

const patch = (over = {}) => ({
  add_nodes: [], update_nodes: [], remove_nodes: [],
  add_edges: [], remove_edges: [], ...over,
});

describe('buildRows', () => {
  it('šablona → řádky podle dvojic, chybějící klíč = prázdná hodnota', () => {
    const node = { meta: { fqdn: 'dns.google', ip: '8.8.8.8' } };
    expect(buildRows(node, [['FQDN', 'fqdn'], ['IP', 'ip'], ['MAC', 'mac']]))
      .toEqual([
        { label: 'FQDN', value: 'dns.google' },
        { label: 'IP', value: '8.8.8.8' },
        { label: 'MAC', value: '' },
      ]);
  });

  it('hodnota se stringuje (číslo → string)', () => {
    const node = { meta: { port: 443 } };
    expect(buildRows(node, [['Port', 'port']]))
      .toEqual([{ label: 'Port', value: '443' }]);
  });

  it('null šablona → jeden řádek na každý meta záznam, label = klíč', () => {
    const node = { meta: { fqdn: 'dns.google', ip: '8.8.8.8' } };
    expect(buildRows(node, null)).toEqual([
      { label: 'fqdn', value: 'dns.google' },
      { label: 'ip', value: '8.8.8.8' },
    ]);
  });

  it('prázdná meta + null šablona → prázdné pole', () => {
    expect(buildRows({ meta: {} }, null)).toEqual([]);
  });
});

describe('clampToCanvas', () => {
  it('okno uvnitř canvasu → beze změny', () => {
    expect(clampToCanvas(50, 60, 100, 40, { width: 800, height: 600 }))
      .toEqual({ x: 50, y: 60 });
  });

  it('záporné souřadnice → clamp na 0', () => {
    expect(clampToCanvas(-20, -5, 100, 40, { width: 800, height: 600 }))
      .toEqual({ x: 0, y: 0 });
  });

  it('za pravým/dolním okrajem → clamp tak, aby okno zůstalo uvnitř', () => {
    expect(clampToCanvas(900, 700, 100, 40, { width: 800, height: 600 }))
      .toEqual({ x: 700, y: 560 });
  });

  it('okno širší než canvas → x clamp na 0 (nikdy záporné)', () => {
    expect(clampToCanvas(50, 50, 1000, 40, { width: 800, height: 600 }))
      .toEqual({ x: 0, y: 50 });
  });
});

describe('dockLayout', () => {
  it('index 0 → vlevo dole', () => {
    expect(dockLayout(0, 160, 8, 600, 28)).toEqual({ x: 0, y: 572 });
  });

  it('index 2 → posun doprava o 2 sloty s mezerou', () => {
    expect(dockLayout(2, 160, 8, 600, 28)).toEqual({ x: 336, y: 572 });
  });
});

describe('windowsToRefresh', () => {
  it('update otevřeného uzlu → refresh; remove otevřeného → close', () => {
    const open = new Set(['a', 'b']);
    const p = patch({
      update_nodes: [{ id: 'a' }, { id: 'x' }],
      remove_nodes: ['b', 'y'],
    });
    expect(windowsToRefresh(p, open)).toEqual({ refresh: ['a'], close: ['b'] });
  });

  it('openIds jako pole funguje stejně', () => {
    const p = patch({ update_nodes: [{ id: 'a' }], remove_nodes: ['c'] });
    expect(windowsToRefresh(p, ['a', 'c'])).toEqual({
      refresh: ['a'], close: ['c'],
    });
  });

  it('nic otevřeného → prázdné seznamy', () => {
    const p = patch({ update_nodes: [{ id: 'a' }], remove_nodes: ['b'] });
    expect(windowsToRefresh(p, [])).toEqual({ refresh: [], close: [] });
  });

  it('remove má přednost: uzel v update i remove → jen close', () => {
    const p = patch({ update_nodes: [{ id: 'a' }], remove_nodes: ['a'] });
    expect(windowsToRefresh(p, ['a'])).toEqual({ refresh: [], close: ['a'] });
  });
});
