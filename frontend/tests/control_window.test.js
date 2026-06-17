import { describe, expect, it } from 'vitest';
import { clampValue, readValues } from '../src/render/control_window.js';

const intField = { key: 'n', type: 'int', value: 30, min: 0, max: 100, step: 1 };
const strField = { key: 's', type: 'string', value: 'ab', maxlength: 4 };
const enumField = {
  key: 'e', type: 'enum', value: 'line',
  options: [{ value: 'line', label: 'Čáry' }, { value: 'spline', label: 'Splajny' }],
};

describe('clampValue', () => {
  it('int clamp do rozmezí a na celé číslo', () => {
    expect(clampValue(intField, '250')).toBe(100);
    expect(clampValue(intField, -5)).toBe(0);
    expect(clampValue(intField, '42')).toBe(42);
    expect(clampValue(intField, 7.8)).toBe(8);
  });

  it('int nečíselný → ponech stávající value', () => {
    expect(clampValue(intField, 'x')).toBe(30);
  });

  it('string ořez na maxlength', () => {
    expect(clampValue(strField, 'abcdefg')).toBe('abcd');
  });

  it('enum platná hodnota projde, neplatná → stávající value', () => {
    expect(clampValue(enumField, 'spline')).toBe('spline');
    expect(clampValue(enumField, 'ghost')).toBe('line');
  });

  it('enum s ne-string hodnotou matchne nativní hodnotu', () => {
    const f = {
      key: 'm', type: 'enum', value: 0,
      options: [{ value: 0, label: 'A' }, { value: 1, label: 'B' }],
    };
    expect(clampValue(f, 1)).toBe(1);       // nativní číslo projde
    expect(clampValue(f, '1')).toBe(0);     // string nematchne → fallback value
  });

  it('string null/undefined → prázdný řetězec', () => {
    expect(clampValue(strField, null)).toBe('');
    expect(clampValue(strField, undefined)).toBe('');
  });

  it('neznámý typ pole → stávající value', () => {
    expect(clampValue({ type: 'bool', value: true }, 'x')).toBe(true);
  });
});

describe('readValues', () => {
  it('z rawMap udělá čisté hodnoty jen pro známé klíče', () => {
    const fields = [intField, enumField];
    const out = readValues(fields, { n: '250', e: 'spline', zzz: 1 });
    expect(out).toEqual({ n: 100, e: 'spline' });
  });
});
