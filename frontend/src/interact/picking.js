const CLICK_MAX_DISTANCE = 5;   // px – víc už je drag (ovládání kamery)

/** Zpráva protokolu pro odchozí event. */
export function buildEvent(event, payload = {}) {
  return { type: 'event', event, payload };
}

/** Čistá rozhodovací logika: klik vs. drag. */
export function isClick(downX, downY, upX, upY,
  maxDistance = CLICK_MAX_DISTANCE) {
  return Math.hypot(upX - downX, upY - downY) < maxDistance;
}

/** Převádí ukazatel na eventy protokolu.
 *  pickFn(clientX, clientY) -> nodeId | null; sendFn(message) je odeslání.
 *  Hover se vyhodnocuje max 1x za snímek (throttle na requestAnimationFrame)
 *  a posílá se jen změna (enter/leave). Klik = down+up s pohybem < 5 px. */
export class Picker {
  constructor(canvasElement, pickFn, sendFn, {
    requestFrame = (cb) => requestAnimationFrame(cb),
    onNodeClick = () => {},
    onBackgroundClick = () => {},
  } = {}) {
    this.pickFn = pickFn;
    this.sendFn = sendFn;
    this.requestFrame = requestFrame;
    this.onNodeClick = onNodeClick;
    this.onBackgroundClick = onBackgroundClick;
    this.hoverId = null;
    this.pointerDown = null;
    this.pendingMove = null;

    canvasElement.addEventListener('pointermove', (e) => this._onMove(e));
    canvasElement.addEventListener('pointerdown', (e) => {
      this.pointerDown = { x: e.clientX, y: e.clientY };
    });
    canvasElement.addEventListener('pointerup', (e) => this._onUp(e));
  }

  _onMove(e) {
    const firstThisFrame = this.pendingMove === null;
    this.pendingMove = { x: e.clientX, y: e.clientY };
    if (firstThisFrame) {
      this.requestFrame(() => {
        const move = this.pendingMove;
        this.pendingMove = null;
        this._hover(move.x, move.y);
      });
    }
  }

  _hover(x, y) {
    const id = this.pickFn(x, y);
    if (id === this.hoverId) return;
    this.hoverId = id;
    this.sendFn(buildEvent('node_hover', { node_id: id }));
  }

  _onUp(e) {
    if (!this.pointerDown) return;
    const { x, y } = this.pointerDown;
    this.pointerDown = null;
    if (!isClick(x, y, e.clientX, e.clientY)) return;
    const id = this.pickFn(e.clientX, e.clientY);
    if (id !== null) {
      this.sendFn(buildEvent('node_click', { node_id: id }));
      this.onNodeClick(id);
    } else {
      this.sendFn(buildEvent('background_click'));
      this.onBackgroundClick();
    }
  }
}
