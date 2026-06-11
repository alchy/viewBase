import { THEMES } from './themes.js';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Rekurzivní merge: objekty se slévají, pole a skaláry přepisují celé. */
export function deepMerge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = (isPlainObject(out[key]) && isPlainObject(value))
      ? deepMerge(out[key], value)
      : value;
  }
  return out;
}

/** Název vestavěného tématu, nebo dict (deep merge přes `modern`).
 *  Neznámé jméno → console.error + fallback na modern (klient nesmí
 *  spadnout; Python validuje vestavěná jména už v Canvasu). */
export function resolveTheme(nameOrDict) {
  if (typeof nameOrDict === 'string') {
    if (THEMES[nameOrDict]) return THEMES[nameOrDict];
    console.error(`viewbase: neznámé téma '${nameOrDict}' – používám 'modern'`);
    return THEMES.modern;
  }
  if (isPlainObject(nameOrDict)) return deepMerge(THEMES.modern, nameOrDict);
  if (nameOrDict != null) {
    console.error('viewbase: theme musí být string nebo objekt – používám modern');
  }
  return THEMES.modern;
}

/** Zapíše CSS custom properties tématu (--vb-*) na :root. */
export function applyCssVars(theme, root = document.documentElement) {
  for (const [name, value] of Object.entries(theme.detailBox)) {
    root.style.setProperty(name, value);
  }
}
