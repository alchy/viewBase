/** Jediný stavový overlay aplikace (výpadek spojení, mismatch, chybějící WebGL). */
export class StatusOverlay {
  constructor(container = document.body) {
    this.el = document.createElement('div');
    this.el.dataset.role = 'status-overlay';
    this.el.style.cssText = [
      'position:fixed', 'top:16px', 'left:50%', 'transform:translateX(-50%)',
      'max-width:70%', 'padding:10px 18px', 'border-radius:6px',
      'background:rgba(20,23,28,0.85)', 'color:#fff',
      'font:14px/1.4 system-ui,sans-serif', 'z-index:1000',
      'display:none', 'pointer-events:none', 'text-align:center',
    ].join(';');
    container.appendChild(this.el);
  }

  show(message) {
    this.el.textContent = message;
    this.el.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
  }
}
