/** Terminálové (konzolové) okno: scrollovatelný append-only výstup + řádek se
 *  vstupem. Enter pošle event terminal_input; server připisuje výstup akcí
 *  terminal_append (viz WindowManager.terminalAppend → this.append). Chrome dědí
 *  z BaseWindow. Vstup je <input>, takže KeyboardControls (isEditableFocused)
 *  při psaní neovládá kameru. */
import { BaseWindow } from './base_window.js';

const PX_PER_CH = 8;            // hrubý převod šířky v px na znaky (BaseWindow._width)
const OUTPUT_HEIGHT_PX = 220;   // výška výstupní plochy

/** px šířku ze spec.width přepočti na znaky pro BaseWindow layout. */
export function widthToChars(width) {
  const px = Number(width);
  if (!Number.isFinite(px) || px <= 0) return 60;
  return Math.max(20, Math.round(px / PX_PER_CH));
}

export class TerminalWindow extends BaseWindow {
  constructor({ id, title, prompt, width, onInput, container, manager }) {
    super({
      id, title, widthChars: widthToChars(width),
      container, manager, kind: 'terminal',
    });
    this.prompt = prompt ?? '> ';
    this.onInput = onInput;
    this._buildBody();
    this._mount();
  }

  _buildBody() {
    const body = document.createElement('div');
    body.dataset.role = 'terminal-body';
    body.style.cssText = [
      'padding:6px 8px', `width:${this.widthChars}ch`, 'max-width:92vw',
      'font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace',
      'display:flex', 'flex-direction:column', 'gap:6px',
    ].join(';');

    const output = document.createElement('div');
    output.dataset.role = 'terminal-output';
    output.style.cssText = [
      `height:${OUTPUT_HEIGHT_PX}px`, 'overflow-y:auto', 'white-space:pre-wrap',
      'word-break:break-word',
      'background:var(--vb-window-output-bg, rgba(0,0,0,0.06))',
      'border-radius:4px', 'padding:6px 8px',
    ].join(';');
    this.output = output;

    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;align-items:center;gap:4px';
    const promptEl = document.createElement('span');
    promptEl.textContent = this.prompt;
    promptEl.style.cssText = 'color:var(--vb-window-key, #667788);flex:0 0 auto';
    // Obyčejný viditelný <input> jako v ControlWindow — na přímý klik se nativně
    // zafokusuje a KeyboardControls (isEditableFocused) přestane ovládat kameru.
    const input = document.createElement('input');
    input.type = 'text';
    input.dataset.role = 'terminal-input';
    input.style.cssText = 'flex:1 1 auto;min-width:0;font:inherit';
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.stopPropagation();
      const line = input.value.trim();
      input.value = '';
      if (line) this._submit(line);
    });
    this.input = input;
    inputRow.append(promptEl, input);

    body.append(output, inputRow);
    this.body = body;
    this.el.appendChild(body);
  }

  _submit(line) {
    if (this.onInput) this.onInput({ window_id: this.id, line });
  }

  /** Připiš řádek výstupu (z akce terminal_append) a odscrolluj dolů. */
  append(text) {
    const line = document.createElement('div');
    line.textContent = String(text ?? '');
    this.output.appendChild(line);
    this.output.scrollTop = this.output.scrollHeight;
  }

  _renderBody() {
    // výstup i vstup persistují v DOM; téma/obnova nevyžadují rebuild
  }
}
