/** Detailní okno (řádky klíč/hodnota nad uzlem) a správce oken. Chrome je v
 *  base_window.js; tady je tělo detailu + WindowManager (detail i control).
 *  Čisté funkce buildRows/windowsToRefresh jsou tu, clampToCanvas/dockLayout
 *  se re-exportují z base_window.js (zpětná kompatibilita testů). */
import { BaseWindow, clampToCanvas, dockLayout } from './base_window.js';
import { ControlWindow } from './control_window.js';

export { clampToCanvas, dockLayout };

const CONTROL_WIDTH_CHARS = 30;

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

/** Z patche a množiny otevřených (detailních) oken urči, co překreslit a co
 *  zavřít. remove má přednost před update (uzel v obou → jen close). */
export function windowsToRefresh(patch, openIds) {
  const open = openIds instanceof Set ? openIds : new Set(openIds);
  const close = (patch.remove_nodes ?? []).filter((id) => open.has(id));
  const closing = new Set(close);
  const refresh = (patch.update_nodes ?? [])
    .map((n) => n.id)
    .filter((id) => open.has(id) && !closing.has(id));
  return { refresh, close };
}

/** Detailní okno: tělo = tabulka řádků klíč/hodnota; klik na hodnotu kopíruje. */
export class DetailWindow extends BaseWindow {
  constructor({ nodeId, title, rows, widthChars, container, manager }) {
    super({ id: nodeId, title, widthChars, container, manager, kind: 'detail' });
    this.rows = rows;
    this._buildBody();
    this._mount();
  }

  _buildBody() {
    const body = document.createElement('div');
    body.dataset.role = 'detail-body';
    body.style.cssText = [
      'padding:6px 10px', `width:${this.widthChars}ch`, 'max-width:90vw',
      'font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace',
      'overflow:auto',
    ].join(';');
    this.body = body;
    this._renderBody();
    this.el.appendChild(body);
  }

  _renderBody() {
    this.body.replaceChildren();
    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;width:100%';
    for (const { label, value } of this.rows) {
      const tr = table.insertRow();
      const keyCell = tr.insertCell();
      keyCell.textContent = label;
      keyCell.style.cssText = [
        'padding:1px 12px 1px 0', 'vertical-align:top', 'white-space:nowrap',
        'color:var(--vb-window-key, #667788)',
      ].join(';');
      const valCell = tr.insertCell();
      valCell.dataset.role = 'detail-value';
      valCell.textContent = value;
      valCell.style.cssText = [
        'padding:1px 0', 'word-break:break-all', 'cursor:copy',
      ].join(';');
      valCell.addEventListener('click', (e) => {
        e.stopPropagation();
        this._copy(value, valCell);
      });
    }
    this.body.appendChild(table);
  }

  _copy(value, cell) {
    const flash = () => {
      cell.style.transition = 'background 0.15s';
      const prev = cell.style.background;
      cell.style.background = 'var(--vb-window-gadget, #8a93a3)';
      setTimeout(() => { cell.style.background = prev; }, 180);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(flash).catch(() => {
        this._execCopy(value); flash();
      });
    } else {
      this._execCopy(value); flash();
    }
  }

  _execCopy(value) {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      console.warn('viewbase: kopírování do schránky selhalo');
    }
  }

  update({ title, rows }) {
    if (title != null) {
      this.title = title;
      this.titleEl.textContent = title;
    }
    if (rows != null) {
      this.rows = rows;
      if (!this.isMinimized) this._renderBody();
    }
  }
}

/** Spravuje detailní i control okna nad app kontejnerem: otevírání, z-order,
 *  dok, živé patche (jen detailní okna). */
export class WindowManager {
  constructor(container, store, getTheme = () => null) {
    this.container = container;
    this.store = store;
    this.getTheme = getTheme;
    this.windows = new Map();        // id -> BaseWindow (nodeId | window_id)
    this.z = 900;
    this.dockSlots = [];
  }

  _config() {
    const dw = this.store.config?.detail_window;
    return dw ?? { rows: null, width_chars: 128, open_on_click: true };
  }

  openFor(nodeId) {
    const existing = this.windows.get(nodeId);
    if (existing) {
      if (existing.isMinimized) existing.restore();
      else existing.bringToFront();
      return existing;
    }
    const node = this.store.nodes.get(nodeId);
    if (!node) return null;
    const cfg = this._config();
    const win = new DetailWindow({
      nodeId,
      title: node.label,
      rows: buildRows(node, cfg.rows),
      widthChars: cfg.width_chars,
      container: this.container,
      manager: this,
    });
    this.windows.set(nodeId, win);
    win.bringToFront();
    return win;
  }

  openControl(spec, onSubmit) {
    const existing = this.windows.get(spec.window_id);
    if (existing) existing.close();          // nahrazení stejného window_id
    const win = new ControlWindow({
      id: spec.window_id,
      title: spec.title,
      fields: spec.fields,
      widthChars: CONTROL_WIDTH_CHARS,
      onSubmit,
      container: this.container,
      manager: this,
    });
    this.windows.set(spec.window_id, win);
    win.bringToFront();
    return win;
  }

  closeControl(windowId) {
    this.windows.get(windowId)?.close();
  }

  onPatch(patch) {
    const detailIds = new Set();
    for (const [id, win] of this.windows) {
      if (win.kind === 'detail') detailIds.add(id);
    }
    if (detailIds.size === 0) return;
    const { refresh, close } = windowsToRefresh(patch, detailIds);
    for (const id of close) this.windows.get(id)?.close();
    const cfg = this._config();
    for (const id of refresh) {
      const win = this.windows.get(id);
      const node = this.store.nodes.get(id);
      if (win && node) {
        win.update({ title: node.label, rows: buildRows(node, cfg.rows) });
      }
    }
  }

  applyTheme() {
    for (const win of this.windows.values()) win.applyTheme();
  }

  close(nodeId) {
    this.windows.get(nodeId)?.close();
  }

  _nextZ() {
    this.z += 1;
    return this.z;
  }

  _assignDockSlot(win) {
    let i = this.dockSlots.indexOf(null);
    if (i === -1) { i = this.dockSlots.length; this.dockSlots.push(win); }
    else this.dockSlots[i] = win;
    win._dockSlot = i;
    return i;
  }

  _releaseDockSlot(win) {
    const i = win._dockSlot;
    if (i != null && this.dockSlots[i] === win) this.dockSlots[i] = null;
    win._dockSlot = null;
  }

  _forget(id) {
    this.windows.delete(id);
  }
}
