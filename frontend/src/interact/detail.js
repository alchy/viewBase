/** Jediný HTML overlay s tabulkou metadat uzlu a zavíracím křížkem. */
export class DetailBox {
  constructor(container = document.body) {
    this.el = document.createElement('div');
    this.el.dataset.role = 'detail-box';
    this.el.style.cssText = [
      'position:fixed', 'top:16px', 'right:16px', 'min-width:220px',
      'max-width:320px', 'padding:12px 14px', 'border-radius:8px',
      'background:rgba(255,255,255,0.95)', 'color:#1f2430',
      'font:13px/1.5 system-ui,sans-serif',
      'box-shadow:0 4px 16px rgba(0,0,0,0.18)', 'z-index:900', 'display:none',
    ].join(';');
    container.appendChild(this.el);
  }

  show({ label, meta }) {
    this.el.replaceChildren();

    const close = document.createElement('button');
    close.textContent = '×';
    close.style.cssText = 'position:absolute;top:6px;right:8px;border:0;'
      + 'background:none;font-size:16px;cursor:pointer;color:#666';
    close.addEventListener('click', () => this.hide());
    this.el.appendChild(close);

    const title = document.createElement('div');
    title.textContent = label;
    title.style.cssText = 'font-weight:600;margin:0 18px 8px 0';
    this.el.appendChild(title);

    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;width:100%';
    for (const [key, value] of Object.entries(meta)) {
      const row = table.insertRow();
      const keyCell = row.insertCell();
      keyCell.textContent = key;
      keyCell.style.cssText = 'padding:2px 10px 2px 0;color:#667;vertical-align:top';
      row.insertCell().textContent = String(value);
    }
    this.el.appendChild(table);
    this.el.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
  }
}
