import { describe, expect, it } from 'vitest';
import { Picker, buildEvent, isClick } from '../src/interact/picking.js';

class FakeElement {
  constructor() { this.handlers = {}; }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  fire(type, event) { this.handlers[type](event); }
}

describe('buildEvent', () => {
  it('staví zprávu protokolu', () => {
    expect(buildEvent('node_click', { node_id: 'a' }))
      .toEqual({ type: 'event', event: 'node_click', payload: { node_id: 'a' } });
    expect(buildEvent('background_click'))
      .toEqual({ type: 'event', event: 'background_click', payload: {} });
  });
});

describe('isClick', () => {
  it('pohyb pod 5 px je klik, víc je drag', () => {
    expect(isClick(10, 10, 12, 12)).toBe(true);
    expect(isClick(10, 10, 15, 10)).toBe(false);   // přesně 5 px už je drag
  });
});

describe('Picker hover', () => {
  function setup(pickFn) {
    const el = new FakeElement();
    const sent = [];
    const frames = [];
    new Picker(el, pickFn, (m) => sent.push(m),
      { requestFrame: (cb) => frames.push(cb) });
    return { el, sent, flushFrames: () => { for (const cb of frames.splice(0)) cb(); } };
  }

  it('posílá node_hover jen při změně (enter/leave)', () => {
    const { el, sent, flushFrames } = setup((x) => (x < 100 ? 'a' : null));
    el.fire('pointermove', { clientX: 50, clientY: 0 });
    flushFrames();
    el.fire('pointermove', { clientX: 60, clientY: 0 });   // pořád 'a'
    flushFrames();
    el.fire('pointermove', { clientX: 200, clientY: 0 });  // leave
    flushFrames();
    expect(sent).toEqual([
      { type: 'event', event: 'node_hover', payload: { node_id: 'a' } },
      { type: 'event', event: 'node_hover', payload: { node_id: null } },
    ]);
  });

  it('víc pointermove mezi snímky = jeden pick na poslední pozici', () => {
    const picks = [];
    const { el, flushFrames } = setup((x) => { picks.push(x); return null; });
    el.fire('pointermove', { clientX: 10, clientY: 0 });
    el.fire('pointermove', { clientX: 20, clientY: 0 });
    el.fire('pointermove', { clientX: 30, clientY: 0 });
    flushFrames();
    expect(picks).toEqual([30]);
  });
});

describe('Picker klik', () => {
  it('klik na uzel pošle node_click a zavolá onNodeClick', () => {
    const el = new FakeElement();
    const sent = [];
    const clicks = [];
    new Picker(el, () => 'a', (m) => sent.push(m), {
      requestFrame: () => {},
      onNodeClick: (id) => clicks.push(id),
    });
    el.fire('pointerdown', { clientX: 10, clientY: 10 });
    el.fire('pointerup', { clientX: 11, clientY: 12 });
    expect(sent).toEqual([
      { type: 'event', event: 'node_click', payload: { node_id: 'a' } }]);
    expect(clicks).toEqual(['a']);
  });

  it('drag (pohyb 5 px a víc) klik nevyvolá', () => {
    const el = new FakeElement();
    const sent = [];
    new Picker(el, () => 'a', (m) => sent.push(m), { requestFrame: () => {} });
    el.fire('pointerdown', { clientX: 10, clientY: 10 });
    el.fire('pointerup', { clientX: 60, clientY: 40 });
    expect(sent).toEqual([]);
  });

  it('klik mimo uzel pošle background_click a zavolá onBackgroundClick', () => {
    const el = new FakeElement();
    const sent = [];
    let bg = 0;
    new Picker(el, () => null, (m) => sent.push(m), {
      requestFrame: () => {},
      onBackgroundClick: () => { bg += 1; },
    });
    el.fire('pointerdown', { clientX: 10, clientY: 10 });
    el.fire('pointerup', { clientX: 10, clientY: 10 });
    expect(sent).toEqual([
      { type: 'event', event: 'background_click', payload: {} }]);
    expect(bg).toBe(1);
  });
});
