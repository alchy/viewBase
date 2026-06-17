/** Sdílené chrome okno (Amiga Workbench): záhlaví s gadgety zavřít/
 *  minimalizovat/obnovit, tažení za záhlaví, dok vlevo dole, z-order.
 *  Tělo dodává podtřída: nastaví this.body v _buildBody() a (volitelně)
 *  překresluje v _renderBody(). Podtřída v konstruktoru po super() nastaví
 *  svá pole, pak zavolá this._buildBody() a this._mount(). Čisté funkce
 *  clampToCanvas/dockLayout jsou tu; windows.js je re-exportuje. */

export function clampToCanvas(x, y, w, h, bounds) {
  const maxX = Math.max(0, bounds.width - w);
  const maxY = Math.max(0, bounds.height - h);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  };
}

export function dockLayout(index, slotWidth, gap, canvasHeight, slotHeight) {
  return { x: index * (slotWidth + gap), y: canvasHeight - slotHeight };
}

const DOCK_SLOT_WIDTH = 160;
const DOCK_GAP = 8;
const DOCK_SLOT_HEIGHT = 28;

export class BaseWindow {
  constructor({ id, title, widthChars, container, manager, kind }) {
    this.id = id;
    this.title = title;
    this.widthChars = widthChars;
    this.container = container;
    this.manager = manager;
    this.kind = kind;            // 'detail' | 'control'
    this.isMinimized = false;
    this.saved = null;
    this.dragOffset = null;
    this.body = null;            // nastaví _buildBody podtřídy

    this.el = document.createElement('div');
    this.el.dataset.role = 'vb-window';
    this.el.dataset.windowId = String(id);
    this.el.style.cssText = [
      'position:absolute', 'left:0', 'top:0', 'box-sizing:border-box',
      'background:var(--vb-window-body-bg, rgba(255,255,255,0.97))',
      'color:var(--vb-window-body-fg, #1f2430)',
      'box-shadow:var(--vb-window-shadow, 0 6px 20px rgba(0,0,0,0.22))',
      'border-radius:6px', 'overflow:hidden', 'user-select:none',
      'font:13px/1.5 system-ui,sans-serif', 'z-index:900',
    ].join(';');
    this._buildHeader();
  }

  // -- hooky podtřídy --
  // Pozn.: konstruktor BaseWindow _buildBody NEVOLÁ – podtřída ho zavolá sama
  // až po nastavení svých polí (jinak by četl pole před super()).
  _buildBody() { /* podtřída: vytvoř this.body a připoj do this.el */ }
  _renderBody() { /* podtřída: refresh při tématu / obnově */ }

  // -- po nastavení polí podtřídy --
  _mount() {
    this.container.appendChild(this.el);
    const bounds = this._bounds();
    const offset = (this.manager.windows.size % 8) * 24;
    const start = clampToCanvas(40 + offset, 40 + offset,
      this._width(), 200, bounds);
    this._place(start.x, start.y);
    this.el.addEventListener('pointerdown', () => this.bringToFront());
  }

  _width() { return this.widthChars * 8 + 24; }

  _bounds() {
    return {
      width: this.container.clientWidth || 800,
      height: this.container.clientHeight || 600,
    };
  }

  _buildHeader() {
    const bar = document.createElement('div');
    bar.dataset.role = 'vb-titlebar';
    bar.style.cssText = [
      'display:flex', 'align-items:center', 'gap:6px',
      'padding:4px 6px', 'cursor:move',
      'background:var(--vb-window-header-bg, #d8dde6)',
      'color:var(--vb-window-header-fg, #1f2430)',
    ].join(';');

    this.closeGadget = this._gadget('close', '×');
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

    this.minGadget = this._gadget('minimize', '–');
    this.minGadget.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimize();
    });

    this.restoreGadget = this._gadget('restore', '▢');
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

  _dragFromHeader(bar) {
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.dataset.gadget) return;
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

  _headerH() { return this.bar.offsetHeight || DOCK_SLOT_HEIGHT; }

  _place(x, y) {
    this.x = x;
    this.y = y;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  minimize() {
    if (this.isMinimized) return;
    this.isMinimized = true;
    this.saved = { x: this.x, y: this.y };
    this.body.style.display = 'none';
    this.minGadget.style.display = 'none';
    this.restoreGadget.style.display = '';
    this.el.dataset.role = 'vb-dock-strip';
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
    this.el.dataset.role = 'vb-window';
    this.el.style.background = 'var(--vb-window-body-bg, rgba(255,255,255,0.97))';
    this.el.style.width = '';
    this.titleEl.style.fontSize = '';
    this.body.style.display = '';
    this.minGadget.style.display = '';
    this.restoreGadget.style.display = 'none';
    this._renderBody();
    const pos = this.saved ?? { x: 40, y: 40 };
    this._place(pos.x, pos.y);
    this.bringToFront();
  }

  bringToFront() { this.setZ(this.manager._nextZ()); }

  setZ(z) { this.el.style.zIndex = String(z); }

  applyTheme() {
    if (!this.isMinimized) this._renderBody();
  }

  close() {
    if (this.isMinimized) this.manager._releaseDockSlot(this);
    this.el.remove();
    this.manager._forget(this.id);
  }
}
