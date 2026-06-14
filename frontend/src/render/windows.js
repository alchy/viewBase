/** Window manager ve stylu Amiga Workbench: tažitelná okna s řádky
 *  klíč/hodnota nad canvasem. Tento soubor obsahuje čisté funkce (testované
 *  vitestem) a DOM třídy DetailWindow + WindowManager (manuální/E2E ověření). */

/** node + šablona řádků → pole {label, value}.
 *  rowsTemplate = pole dvojic [label, metaKey]; null = jeden řádek na meta. */
export function buildRows(node, rowsTemplate) {
  const meta = node?.meta ?? {};
  if (rowsTemplate == null) {
    return Object.entries(meta).map(([key, value]) => ({
      label: key, value: String(value ?? ''),
    }));
  }
  return rowsTemplate.map(([label, key]) => ({
    label, value: String(meta[key] ?? ''),
  }));
}

/** Clampne pozici okna tak, aby zůstalo uvnitř [0, bounds].
 *  Titulek/záhlaví zůstane viditelné; minimum je vždy 0. */
export function clampToCanvas(x, y, w, h, bounds) {
  const maxX = Math.max(0, bounds.width - w);
  const maxY = Math.max(0, bounds.height - h);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  };
}

/** Pozice minimalizovaného proužku v doku vlevo dole pro daný index. */
export function dockLayout(index, slotWidth, gap, canvasHeight, slotHeight) {
  return {
    x: index * (slotWidth + gap),
    y: canvasHeight - slotHeight,
  };
}

/** Z patche a množiny otevřených oken urči, co překreslit a co zavřít.
 *  remove má přednost před update (uzel v obou → jen close). */
export function windowsToRefresh(patch, openIds) {
  const open = openIds instanceof Set ? openIds : new Set(openIds);
  const close = (patch.remove_nodes ?? []).filter((id) => open.has(id));
  const closing = new Set(close);
  const refresh = (patch.update_nodes ?? [])
    .map((n) => n.id)
    .filter((id) => open.has(id) && !closing.has(id));
  return { refresh, close };
}
