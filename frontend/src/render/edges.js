/** Křivková hrana: body kvadratického bezieru a→b s prohnutím (elasticita).
 *  Vrací segments+1 bodů {x,y,z}. elasticity 0 → kolineární (rovná čára, bezier
 *  s řídicím bodem ve středu degeneruje na úsečku). Řídicí bod = střed +
 *  kolmice·(elasticity·délka·MAX_BOW); kolmice v 3D = dir × osa Y (fallback
 *  osa X při rovnoběžnosti). */
export const EDGE_SEGMENTS = 12;
export const EDGE_MAX_BOW = 0.5;

export function bezierEdgePoints(a, b, elasticity, segments = EDGE_SEGMENTS) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const mz = (a.z + b.z) / 2;
  let cx = mx;
  let cy = my;
  let cz = mz;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz);
  if (elasticity > 0 && len > 0) {
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;
    let px = -uz;            // dir × (0,1,0) = (-uz, 0, ux)
    let py = 0;
    let pz = ux;
    if (Math.hypot(px, py, pz) < 1e-6) {   // dir ‖ osa Y → fallback ref X
      px = 0; py = uz; pz = -uy;           // dir × (1,0,0) = (0, uz, -uy)
    }
    const pl = Math.hypot(px, py, pz) || 1;
    const offset = elasticity * len * EDGE_MAX_BOW;
    cx = mx + (px / pl) * offset;
    cy = my + (py / pl) * offset;
    cz = mz + (pz / pl) * offset;
  }
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const it = 1 - t;
    const w0 = it * it;
    const w1 = 2 * it * t;
    const w2 = t * t;
    points.push({
      x: w0 * a.x + w1 * cx + w2 * b.x,
      y: w0 * a.y + w1 * cy + w2 * b.y,
      z: w0 * a.z + w1 * cz + w2 * b.z,
    });
  }
  return points;
}
