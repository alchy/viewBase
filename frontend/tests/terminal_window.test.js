import { describe, expect, it } from 'vitest';
import { widthToChars } from '../src/render/terminal_window.js';

describe('widthToChars', () => {
  it('px šířku přepočte na znaky (÷8)', () => {
    expect(widthToChars(560)).toBe(70);
    expect(widthToChars(240)).toBe(30);
  });

  it('drží spodní mez 20 znaků', () => {
    expect(widthToChars(40)).toBe(20);
  });

  it('nevalidní vstup → rozumný default', () => {
    expect(widthToChars(undefined)).toBe(60);
    expect(widthToChars(0)).toBe(60);
    expect(widthToChars('x')).toBe(60);
  });
});
