import { describe, expect, it } from 'vitest';
import { throttle } from '../src/interact/throttle.js';

function makeClock() {
  let t = 0;
  let timers = [];
  return {
    now: () => t,
    schedule: (cb, delay) => timers.push({ at: t + delay, cb }),
    advance(ms) {
      t += ms;
      const due = timers.filter((x) => x.at <= t);
      timers = timers.filter((x) => x.at > t);
      for (const timer of due) timer.cb();
    },
  };
}

describe('throttle (trailing edge)', () => {
  it('první volání projde okamžitě', () => {
    const clock = makeClock();
    const calls = [];
    const fn = throttle((v) => calls.push(v), 100, clock);
    fn('a');
    expect(calls).toEqual(['a']);
  });

  it('volání v intervalu se slijí a po uplynutí odejde poslední', () => {
    const clock = makeClock();
    const calls = [];
    const fn = throttle((v) => calls.push(v), 100, clock);
    fn('a');
    clock.advance(30); fn('b');
    clock.advance(30); fn('c');
    expect(calls).toEqual(['a']);
    clock.advance(40);                  // 100 ms od 'a'
    expect(calls).toEqual(['a', 'c']);  // 'b' přepsáno, odešlo poslední
  });

  it('po vyprázdnění jde další volání zase hned', () => {
    const clock = makeClock();
    const calls = [];
    const fn = throttle((v) => calls.push(v), 100, clock);
    fn('a');
    clock.advance(50); fn('b');
    clock.advance(50);                  // trailing 'b' odejde
    clock.advance(200);
    fn('c');
    expect(calls).toEqual(['a', 'b', 'c']);
  });
});
