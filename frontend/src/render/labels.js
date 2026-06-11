import { Text } from 'troika-three-text';
import { nodeStyle } from './style.js';

const FADE_SPEED = 6;     // 1/s – rychlost náběhu/zhasnutí opacity
const BASE_OFFSET = 5;    // světové jednotky nad uzlem při size = 1

/** Čistá funkce výběru labelů: všechny zvýrazněné (do rozpočtu),
 *  zbytek rozpočtu doplní uzly nejblíž kameře. ids+positions jsou
 *  z PhysicsEngine (stejné indexování), cameraPos je {x,y,z}. */
export function selectLabelIds(ids, positions, cameraPos, highlightSet, budget) {
  const selected = new Set();
  const candidates = [];
  const count = Math.min(ids.length, positions.length / 3);
  for (let i = 0; i < count; i += 1) {
    const id = ids[i];
    if (highlightSet !== null && highlightSet.has(id)) {
      if (selected.size < budget) selected.add(id);
      continue;
    }
    const dx = positions[i * 3] - cameraPos.x;
    const dy = positions[i * 3 + 1] - cameraPos.y;
    const dz = positions[i * 3 + 2] - cameraPos.z;
    candidates.push({ id, d2: dx * dx + dy * dy + dz * dz });
  }
  candidates.sort((a, b) => a.d2 - b.d2);
  for (const candidate of candidates) {
    if (selected.size >= budget) break;
    selected.add(candidate.id);
  }
  return selected;
}

/** Pool troika Textů: aktivní labely plynule fadují, text.sync() se volá
 *  jen při změně textu/stylu (layout je drahý). Billboard ke kameře
 *  funguje shodně v 2D (ortho) i 3D. */
export class LabelLayer {
  constructor(scene, store, engine) {
    this.scene = scene;
    this.store = store;
    this.engine = engine;
    this.active = new Map();   // id -> Text
    this.pool = [];            // volné Texty k recyklaci
    this.theme = null;         // nastaví applyTheme (volá Renderer)
    this.styleStamp = 0;       // verze stylu – změna tématu přestyluje aktivní
  }

  applyTheme(theme) {
    this.theme = theme;
    this.styleStamp += 1;
  }

  _styleText(text) {
    const { label } = this.theme;
    text.fontSize = label.size;
    text.color = label.color;
    text.outlineColor = label.halo;
    text.outlineWidth = label.size * 0.12;   // halo pro čitelnost nad hranami
    text.anchorX = 'center';
    text.anchorY = 'bottom';
    text.userData.styleStamp = this.styleStamp;
  }

  _acquire(id) {
    const text = this.pool.pop() ?? new Text();
    if (!text.parent) this.scene.add(text);
    text.visible = true;
    text.userData.opacity = 0;
    text.userData.text = null;     // vynutí sync při prvním přiřazení textu
    this.active.set(id, text);
    return text;
  }

  _release(id, text) {
    text.visible = false;
    this.active.delete(id);
    this.pool.push(text);
  }

  /** Volá Renderer každý snímek po _syncNodes.
   *  display = Map id -> THREE.Vector3 vyhlazených pozic. */
  update(dt, camera, highlightSet, display) {
    if (!this.theme) return;
    const budget = this.theme.label.budget ?? 200;
    const wanted = selectLabelIds(this.engine.ids, this.engine.positions,
      camera.position, highlightSet, budget);

    for (const id of wanted) {
      if (!this.active.has(id) && this.store.nodes.has(id)) this._acquire(id);
    }

    const fade = Math.min(1, dt * FADE_SPEED);
    for (const [id, text] of this.active) {
      const node = this.store.nodes.get(id);
      const pos = display.get(id);
      if (!node || !pos) {           // uzel zmizel – okamžitě uvolnit
        this._release(id, text);
        continue;
      }
      const target = wanted.has(id) ? 1 : 0;
      text.userData.opacity += (target - text.userData.opacity) * fade;
      if (target === 0 && text.userData.opacity < 0.02) {
        this._release(id, text);
        continue;
      }
      text.fillOpacity = text.userData.opacity;
      text.outlineOpacity = text.userData.opacity;

      const style = nodeStyle(node, this.store.nodeTypes, this.theme);
      text.position.set(pos.x, pos.y + BASE_OFFSET * style.size, pos.z);
      text.quaternion.copy(camera.quaternion);   // billboard – 2D i 3D

      const styleChanged = text.userData.styleStamp !== this.styleStamp;
      if (text.userData.text !== node.label || styleChanged) {
        if (styleChanged) this._styleText(text);
        text.text = node.label;
        text.userData.text = node.label;
        text.sync();                 // jen při změně textu/stylu
      }
    }
  }
}
