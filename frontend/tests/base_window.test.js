import { describe, expect, it } from 'vitest';
import { posKey } from '../src/render/base_window.js';

describe('posKey (perzistence pozic oken)', () => {
  it('klíč z id okna', () => {
    expect(posKey('konzole', 'Dotaz')).toBe('vb-pos:konzole');
  });

  it('bez id poslouží název okna', () => {
    expect(posKey(undefined, 'Aktivační okno')).toBe('vb-pos:Aktivační okno');
  });

  it('bez id i názvu se neukládá (null)', () => {
    expect(posKey(undefined, '')).toBe(null);
    expect(posKey(null, undefined)).toBe(null);
  });
});
