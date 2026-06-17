/** Control okno: formulářové tělo (int slider+číslo, string text, enum select)
 *  + tlačítko Použít, které pošle všechny hodnoty zpět. Chrome dědí z
 *  BaseWindow. Čisté helpery clampValue/readValues zrcadlí backend validaci. */
import { BaseWindow } from './base_window.js';

/** Zvaliduj jednu hodnotu podle field descriptoru (zrcadlo backendu).
 *  Při nepoužitelné hodnotě ponech field.value. */
export function clampValue(field, raw) {
  if (field.type === 'int') {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return field.value;
    return Math.max(field.min, Math.min(field.max, n));
  }
  if (field.type === 'string') {
    return String(raw ?? '').slice(0, field.maxlength);
  }
  if (field.type === 'enum') {
    return field.options.some((o) => o.value === raw) ? raw : field.value;
  }
  return field.value;
}

/** rawMap {key: hodnota z widgetu} → {key: clampValue(...)} jen pro známé klíče. */
export function readValues(fields, rawMap) {
  const out = {};
  for (const field of fields) {
    if (field.key in rawMap) out[field.key] = clampValue(field, rawMap[field.key]);
  }
  return out;
}

export class ControlWindow extends BaseWindow {
  constructor({ id, title, fields, widthChars, onSubmit, container, manager }) {
    super({ id, title, widthChars, container, manager, kind: 'control' });
    this.fields = fields;
    this.onSubmit = onSubmit;
    this.inputs = new Map();        // key -> () => rawValue
    this._buildBody();
    this._mount();
  }

  _buildBody() {
    const body = document.createElement('div');
    body.dataset.role = 'control-body';
    body.style.cssText = [
      'padding:8px 10px', `width:${this.widthChars}ch`, 'max-width:90vw',
      'font:13px/1.5 system-ui,sans-serif',
    ].join(';');
    this.body = body;

    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;width:100%';
    for (const field of this.fields) {
      const tr = table.insertRow();
      const keyCell = tr.insertCell();
      keyCell.textContent = field.label;
      keyCell.style.cssText = [
        'padding:3px 10px 3px 0', 'white-space:nowrap',
        'color:var(--vb-window-key, #667788)',
      ].join(';');
      const valCell = tr.insertCell();
      valCell.style.cssText = 'padding:3px 0';
      this.inputs.set(field.key, this._buildWidget(field, valCell));
    }
    body.appendChild(table);

    const apply = document.createElement('button');
    apply.dataset.role = 'control-apply';
    apply.textContent = 'Použít';
    apply.style.cssText = [
      'margin-top:8px', 'padding:3px 12px', 'cursor:pointer',
      'border:1px solid var(--vb-window-gadget, #8a93a3)', 'border-radius:4px',
      'background:transparent', 'color:inherit',
    ].join(';');
    apply.addEventListener('click', (e) => {
      e.stopPropagation();
      this._submit();
    });
    body.appendChild(apply);
    this.el.appendChild(body);
  }

  _buildWidget(field, cell) {
    if (field.type === 'enum') {
      const sel = document.createElement('select');
      for (const opt of field.options) {
        const o = document.createElement('option');
        o.value = String(opt.value);
        o.textContent = opt.label;
        if (String(opt.value) === String(field.value)) o.selected = true;
        sel.appendChild(o);
      }
      cell.appendChild(sel);
      // getter vrací NATIVNÍ hodnotu option (sel.value je vždy string), aby
      // clampValue (o.value === raw) matchnul i ne-string enum hodnoty.
      return () => field.options.find(
        (opt) => String(opt.value) === sel.value)?.value ?? field.value;
    }
    if (field.type === 'int') {
      const range = document.createElement('input');
      range.type = 'range';
      range.min = field.min; range.max = field.max;
      range.step = field.step ?? 1; range.value = field.value;
      const num = document.createElement('input');
      num.type = 'number';
      num.min = field.min; num.max = field.max;
      num.step = field.step ?? 1; num.value = field.value;
      num.style.cssText = 'width:5em;margin-left:6px';
      range.addEventListener('input', () => { num.value = range.value; });
      num.addEventListener('input', () => { range.value = num.value; });
      cell.append(range, num);
      return () => num.value;
    }
    // string
    const text = document.createElement('input');
    text.type = 'text';
    text.maxLength = field.maxlength;
    text.value = field.value;
    cell.appendChild(text);
    return () => text.value;
  }

  _submit() {
    const rawMap = {};
    for (const [key, get] of this.inputs) rawMap[key] = get();
    const values = readValues(this.fields, rawMap);
    if (this.onSubmit) this.onSubmit({ window_id: this.id, values });
  }

  _renderBody() {
    // formulář persistuje v DOM; téma ani obnova nevyžadují rebuild
  }
}
