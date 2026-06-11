/** Vestavěná témata. Téma je čistě deklarativní objekt – žádná logika.
 *  Klíče v `detailBox` jsou CSS custom properties pro HTML overlaye
 *  (detail box + status overlay), zapisuje je applyCssVars na :root. */
export const modern = {
  background: '#f4f5f7',
  palette: ['#2f7fe8', '#e8553a', '#2fa84f', '#8a4fe8', '#e8a02f',
    '#1fb3c4', '#d44f9e', '#5b6472'],
  node: {
    color: '#2f7fe8', size: 1.0, shape: 'sphere',
    emissive: '#000000', emissiveIntensity: 0,
  },
  edge: { color: '#9aa3af', opacity: 0.5 },
  lights: {
    ambient: { color: '#ffffff', intensity: 0.7 },
    directional: { color: '#ffffff', intensity: 1.2 },
  },
  label: { color: '#1f2430', size: 6, halo: '#f4f5f7', budget: 200 },
  detailBox: {
    '--vb-detail-bg': 'rgba(255,255,255,0.95)',
    '--vb-detail-fg': '#1f2430',
    '--vb-detail-key': '#667788',
    '--vb-detail-shadow': '0 4px 16px rgba(0,0,0,0.18)',
    '--vb-status-bg': 'rgba(20,23,28,0.85)',
    '--vb-status-fg': '#ffffff',
  },
  bloom: { enabled: false, strength: 0.8, radius: 0.6, threshold: 0.15 },
};

export const THEMES = { modern };   // 'cyber' přibude v Tasku 4
