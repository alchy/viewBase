// @vitest-environment happy-dom
/** DOM integrace BaseWindow: perzistence pozice (localStorage) a closable.
 *  localStorage stubujeme (Map) — happy-dom má Storage neúplný; prohlížeče
 *  reálné Storage API mají. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseWindow } from '../src/render/base_window.js';

const store = new Map();
const fakeStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

function makeWindow(id, { closable } = {}) {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 1600 });
  Object.defineProperty(container, 'clientHeight', { value: 900 });
  document.body.appendChild(container);
  const manager = { windows: new Map(), _nextZ: () => 1000 };
  const win = new BaseWindow({
    id, title: 'Aktivační okno', widthChars: 40,
    container, manager, kind: 'control', closable,
  });
  win.body = document.createElement('div');   // podtřídy staví tělo samy
  win.el.appendChild(win.body);
  win._mount();
  return win;
}

describe('BaseWindow — perzistence pozice', () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', fakeStorage);
  });

  it('uložená pozice přežije znovuvytvoření okna (reload stránky)', () => {
    const first = makeWindow('aktivace');
    first._place(321, 111);
    first._savePos();                       // = konec tažení myší
    const reborn = makeWindow('aktivace');  // po reloadu se okno staví znovu
    expect(reborn.x).toBe(321);
    expect(reborn.y).toBe(111);
  });

  it('bez uloženého záznamu platí výchozí kaskáda', () => {
    const win = makeWindow('nove-okno');
    expect(win.x).toBe(40);
    expect(win.y).toBe(40);
  });

  it('pozice mimo plátno se přichytí (menší okno prohlížeče)', () => {
    fakeStorage.setItem('vb-pos:aktivace',
      JSON.stringify({ x: 5000, y: 5000 }));
    const win = makeWindow('aktivace');
    expect(win.x).toBeLessThanOrEqual(1600);
    expect(win.y).toBeLessThanOrEqual(900);
  });

  it('drag konec ukládá do localStorage (pointer eventy)', () => {
    const win = makeWindow('aktivace');
    win.bar.setPointerCapture = () => {};
    win.bar.releasePointerCapture = () => {};
    win.bar.dispatchEvent(new PointerEvent('pointerdown',
      { clientX: 50, clientY: 50, pointerId: 1, bubbles: true }));
    win.bar.dispatchEvent(new PointerEvent('pointermove',
      { clientX: 250, clientY: 180, pointerId: 1, bubbles: true }));
    win.bar.dispatchEvent(new PointerEvent('pointerup',
      { pointerId: 1, bubbles: true }));
    const saved = JSON.parse(fakeStorage.getItem('vb-pos:aktivace'));
    expect(saved.x).toBe(win.x);
    expect(saved.y).toBe(win.y);
    expect(saved.x).not.toBe(40);           // opravdu se hnulo z kaskády
  });
});

describe('BaseWindow — closable', () => {
  it('closable=false nemá gadget [x]', () => {
    const win = makeWindow('aktivace', { closable: false });
    expect(win.el.querySelector('[data-gadget="close"]')).toBeNull();
  });

  it('výchozí okno gadget [x] má', () => {
    const win = makeWindow('detail');
    expect(win.el.querySelector('[data-gadget="close"]')).not.toBeNull();
  });
});
