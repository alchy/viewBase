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

const DOCK_SLOT_WIDTH = 160;
const DOCK_GAP = 8;
const DOCK_SLOT_HEIGHT = 28;

/** Jedno okno: záhlaví (zavřít vlevo, titulek uprostřed, minimalizovat vpravo)
 *  + tělo s řádky klíč/hodnota. Minimalizace ho smrskne do proužku v doku. */
export class DetailWindow {
  constructor({ nodeId, title, rows, widthChars, container, manager }) {
    this.nodeId = nodeId;
    this.title = title;
    this.rows = rows;
    this.widthChars = widthChars;
    this.container = container;
    this.manager = manager;
    this.isMinimized = false;
    this.saved = null;          // {x, y} před minimalizací
    this.dragOffset = null;

    this.el = document.createElement('div');
    this.el.dataset.role = 'detail-window';
    this.el.dataset.nodeId = nodeId;
    this.el.style.cssText = [
      'position:absolute', 'left:0', 'top:0', 'box-sizing:border-box',
      'background:var(--vb-window-body-bg, rgba(255,255,255,0.97))',
      'color:var(--vb-window-body-fg, #1f2430)',
      'box-shadow:var(--vb-window-shadow, 0 6px 20px rgba(0,0,0,0.22))',
      'border-radius:6px', 'overflow:hidden', 'user-select:none',
      'font:13px/1.5 system-ui,sans-serif', 'z-index:900',
    ].join(';');

    this._buildHeader();
    this._buildBody();
    container.appendChild(this.el);

    // počáteční pozice: lehce odsazená kaskáda podle počtu oken
    const bounds = this._bounds();
    const offset = (manager.windows.size % 8) * 24;
    const start = clampToCanvas(40 + offset, 40 + offset,
      this._width(), 200, bounds);
    this._place(start.x, start.y);

    this.el.addEventListener('pointerdown', () => this.bringToFront());
  }

  _width() {
    // šířka těla v ch + padding/border; ch ~ 8px monospace
    return this.widthChars * 8 + 24;
  }

  _bounds() {
    return {
      width: this.container.clientWidth || 800,
      height: this.container.clientHeight || 600,
    };
  }

  _buildHeader() {
    const bar = document.createElement('div');
    bar.dataset.role = 'detail-titlebar';
    bar.style.cssText = [
      'display:flex', 'align-items:center', 'gap:6px',
      'padding:4px 6px', 'cursor:move',
      'background:var(--vb-window-header-bg, #d8dde6)',
      'color:var(--vb-window-header-fg, #1f2430)',
    ].join(';');

    this.closeGadget = this._gadget('close', '×');   // ×
    this.closeGadget.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    this.titleEl = document.createElement('div');
    this.titleEl.textContent = this.title;
    this.titleEl.style.cssText = [
      'flex:1', 'text-align:center', 'font-weight:600',
      'white-space:nowrap', 'overflow:hidden', 'text-overflow:ellipsis',
    ].join(';');

    this.minGadget = this._gadget('minimize', '–');   // –
    this.minGadget.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimize();
    });

    this.restoreGadget = this._gadget('restore', '▢'); // ▢
    this.restoreGadget.addEventListener('click', (e) => {
      e.stopPropagation();
      this.restore();
    });
    this.restoreGadget.style.display = 'none';

    bar.append(this.closeGadget, this.titleEl,
      this.minGadget, this.restoreGadget);
    this._dragFromHeader(bar);
    this.bar = bar;
    this.el.appendChild(bar);
  }

  _gadget(name, glyph) {
    const g = document.createElement('button');
    g.dataset.gadget = name;
    g.textContent = glyph;
    g.style.cssText = [
      'flex:0 0 auto', 'width:18px', 'height:18px', 'line-height:16px',
      'padding:0', 'border:1px solid var(--vb-window-gadget, #8a93a3)',
      'border-radius:3px', 'background:transparent', 'cursor:pointer',
      'color:var(--vb-window-gadget, #5a6573)', 'font-size:13px',
    ].join(';');
    return g;
  }

  _buildBody() {
    const body = document.createElement('div');
    body.dataset.role = 'detail-body';
    body.style.cssText = [
      'padding:6px 10px',
      `width:${this.widthChars}ch`,
      'max-width:90vw',
      'font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace',
      'overflow:auto',
    ].join(';');
    this.body = body;
    this._renderRows();
    this.el.appendChild(body);
  }

  _renderRows() {
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

  _dragFromHeader(bar) {
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.dataset.gadget) return;   // klik na gadget netáhne
      this.bringToFront();
      const rect = this.el.getBoundingClientRect();
      const cont = this.container.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left, y: e.clientY - rect.top,
        contLeft: cont.left, contTop: cont.top,
      };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!this.dragOffset || this.isMinimized) return;
      const x = e.clientX - this.dragOffset.contLeft - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.contTop - this.dragOffset.y;
      const pos = clampToCanvas(x, y, this._width(), this._headerH(),
        this._bounds());
      this._place(pos.x, pos.y);
    });
    const end = (e) => {
      if (this.dragOffset) {
        this.dragOffset = null;
        try { bar.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      }
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  _headerH() {
    return this.bar.offsetHeight || DOCK_SLOT_HEIGHT;
  }

  _place(x, y) {
    this.x = x;
    this.y = y;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  update({ title, rows }) {
    if (title != null) {
      this.title = title;
      this.titleEl.textContent = title;
    }
    if (rows != null) {
      this.rows = rows;
      if (!this.isMinimized) this._renderRows();
    }
  }

  minimize() {
    if (this.isMinimized) return;
    this.isMinimized = true;
    this.saved = { x: this.x, y: this.y };
    this.body.style.display = 'none';
    this.minGadget.style.display = 'none';
    this.restoreGadget.style.display = '';
    this.el.dataset.role = 'detail-dock-strip';
    this.el.style.background = 'var(--vb-window-dock-bg, #c2c9d4)';
    this.el.style.width = `${DOCK_SLOT_WIDTH}px`;
    this.titleEl.style.fontSize = '11px';
    const slot = this.manager._assignDockSlot(this);
    const bounds = this._bounds();
    const pos = dockLayout(slot, DOCK_SLOT_WIDTH, DOCK_GAP,
      bounds.height, DOCK_SLOT_HEIGHT);
    this._place(pos.x, pos.y);
  }

  restore() {
    if (!this.isMinimized) return;
    this.isMinimized = false;
    this.manager._releaseDockSlot(this);
    this.el.dataset.role = 'detail-window';
    this.el.style.background = 'var(--vb-window-body-bg, rgba(255,255,255,0.97))';
    this.el.style.width = '';
    this.titleEl.style.fontSize = '';
    this.body.style.display = '';
    this.minGadget.style.display = '';
    this.restoreGadget.style.display = 'none';
    this._renderRows();
    const pos = this.saved ?? { x: 40, y: 40 };
    this._place(pos.x, pos.y);
    this.bringToFront();
  }

  bringToFront() {
    this.setZ(this.manager._nextZ());
  }

  setZ(z) {
    this.el.style.zIndex = String(z);
  }

  applyTheme() {
    // chrome čte živé CSS proměnné z :root – stačí překreslit řádky kvůli
    // inline pozadí value buněk, zbytek se přepočte sám.
    if (!this.isMinimized) this._renderRows();
  }

  close() {
    if (this.isMinimized) this.manager._releaseDockSlot(this);
    this.el.remove();
    this.manager._forget(this.nodeId);
  }
}

/** Spravuje kolekci DetailWindow nad app kontejnerem: otevírání podle uzlu,
 *  z-order, dok slots, živé patche, téma. Generický – nezná doménu. */
export class WindowManager {
  constructor(container, store, getTheme = () => null) {
    this.container = container;
    this.store = store;
    this.getTheme = getTheme;
    this.windows = new Map();        // nodeId -> DetailWindow
    this.z = 900;
    this.dockSlots = [];             // index -> DetailWindow | null
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
    if (!node) return null;          // neexistující uzel → no-op
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

  onPatch(patch) {
    if (this.windows.size === 0) return;
    const { refresh, close } = windowsToRefresh(
      patch, new Set(this.windows.keys()));
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

  _forget(nodeId) {
    this.windows.delete(nodeId);
  }
}
