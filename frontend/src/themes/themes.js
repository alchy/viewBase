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
  window: {
    headerBg: '#d8dde6', headerFg: '#1f2430', gadget: '#5a6573',
    bodyBg: 'rgba(255,255,255,0.97)', bodyFg: '#1f2430', key: '#667788',
    dockBg: '#c2c9d4', shadow: '0 6px 20px rgba(0,0,0,0.22)',
  },
  flow: { size: 2.4, baseSpeed: 220, color: '#2f7fe8', opacity: 0.85 },
};

export const cyber = {
  background: '#0a0e1a',
  palette: ['#28d7fe', '#ff2a6d', '#05ffa1', '#b967ff', '#ffd166',
    '#01c8ee', '#ff6e27', '#e8f8ff'],
  node: {
    color: '#28d7fe', size: 1.0, shape: 'sphere',
    emissive: '#1b3a5c', emissiveIntensity: 1.2,   // jádro glow pro bloom
  },
  edge: { color: '#1f4f6e', opacity: 0.65 },
  lights: {
    ambient: { color: '#314466', intensity: 0.9 },
    directional: { color: '#9fd8ff', intensity: 1.4 },
  },
  label: { color: '#d7f4ff', size: 6, halo: '#0a0e1a', budget: 200 },
  detailBox: {
    '--vb-detail-bg': 'rgba(10,16,28,0.92)',
    '--vb-detail-fg': '#d7f4ff',
    '--vb-detail-key': '#5a7d9e',
    '--vb-detail-shadow': '0 0 18px rgba(40,215,254,0.35)',
    '--vb-status-bg': 'rgba(40,215,254,0.15)',
    '--vb-status-fg': '#d7f4ff',
  },
  bloom: { enabled: true, strength: 0.9, radius: 0.7, threshold: 0.15 },
  window: {
    headerBg: 'rgba(40,215,254,0.18)', headerFg: '#d7f4ff', gadget: '#28d7fe',
    bodyBg: 'rgba(10,16,28,0.94)', bodyFg: '#d7f4ff', key: '#5a7d9e',
    dockBg: 'rgba(40,215,254,0.12)', shadow: '0 0 22px rgba(40,215,254,0.45)',
  },
  flow: { size: 3.0, baseSpeed: 260, color: '#28d7fe', opacity: 1.0 },
};

export const THEMES = { modern, cyber };
