import { describe, expect, it } from 'vitest';
import { FpsWatchdog } from '../src/render/quality.js';

/** Simuluj `seconds` sekund snímků s konstantním dt (injektovaný čas). */
function run(watchdog, dt, seconds) {
  for (let t = 0; t < seconds; t += dt) watchdog.frame(dt);
}

describe('FpsWatchdog', () => {
  it('60 fps nikdy nedegraduje', () => {
    const steps = [];
    const dog = new FpsWatchdog((s) => steps.push(s));
    run(dog, 1 / 60, 10);
    expect(steps).toEqual([]);
  });

  it('20 fps: degrade po 3 s, druhý krok po dalších 3 s, víc kroků není', () => {
    const steps = [];
    const dog = new FpsWatchdog((s) => steps.push(s));
    run(dog, 1 / 20, 2.5);
    expect(steps).toEqual([]);          // ještě neuběhly 3 s pod prahem
    run(dog, 1 / 20, 1);
    expect(steps).toEqual([1]);
    run(dog, 1 / 20, 3.5);
    expect(steps).toEqual([1, 2]);
    run(dog, 1 / 20, 10);
    expect(steps).toEqual([1, 2]);      // max 2 kroky, jen jedním směrem
  });

  it('krátké propady proložené zotavením nedegradují', () => {
    const steps = [];
    const dog = new FpsWatchdog((s) => steps.push(s));
    run(dog, 1 / 20, 2);    // 2 s pod prahem
    run(dog, 1 / 60, 5);    // zotavení – průměr i čítač se resetují
    run(dog, 1 / 20, 2);    // další 2 s – souvisle to nikdy nebyly 3 s
    expect(steps).toEqual([]);
  });

  it('dt <= 0 je no-op (první snímek po pauze)', () => {
    const steps = [];
    const dog = new FpsWatchdog((s) => steps.push(s));
    dog.frame(0);
    expect(steps).toEqual([]);
  });
});
