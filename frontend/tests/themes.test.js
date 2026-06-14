import { describe, expect, it, vi } from 'vitest';
import { deepMerge, resolveTheme } from '../src/themes/manager.js';
import { THEMES } from '../src/themes/themes.js';

describe('resolveTheme', () => {
  it('vrátí vestavěné téma podle jména', () => {
    expect(resolveTheme('modern')).toBe(THEMES.modern);
  });

  it('neznámé jméno → console.error + fallback na modern', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(resolveTheme('vaporwave')).toBe(THEMES.modern);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('dict se deep-merguje přes modern', () => {
    const theme = resolveTheme({ background: '#000000', node: { size: 2 } });
    expect(theme.background).toBe('#000000');
    expect(theme.node.size).toBe(2);
    expect(theme.node.color).toBe(THEMES.modern.node.color);  // ze základu
    expect(theme.edge).toEqual(THEMES.modern.edge);
  });

  it('merge nemutuje vestavěný základ', () => {
    resolveTheme({ node: { size: 9 } });
    expect(THEMES.modern.node.size).toBe(1.0);
  });

  it('pole (paleta) se přepisuje celé, nemerguje po prvcích', () => {
    const theme = deepMerge(THEMES.modern, { palette: ['#111111'] });
    expect(theme.palette).toEqual(['#111111']);
  });

  it('cyber je vestavěné: tmavé pozadí a zapnutý bloom', () => {
    const theme = resolveTheme('cyber');
    expect(theme.background).toBe('#0a0e1a');
    expect(theme.bloom.enabled).toBe(true);
    expect(theme.palette.length).toBeGreaterThanOrEqual(8);
  });
});
