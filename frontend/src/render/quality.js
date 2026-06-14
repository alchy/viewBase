const MAX_STEPS = 2;   // krok 1 = vypnout bloom, krok 2 = pixelRatio 1

/** Hlídač fps s injektovaným časem (čistě testovatelný – žádný
 *  performance.now). Drží klouzavý průměr fps; když je souvisle
 *  `holdSeconds` pod `threshold`, zavolá onDegrade(step).
 *  Degradace je jednosměrná a maximálně MAX_STEPS kroků. */
export class FpsWatchdog {
  constructor(onDegrade, { threshold = 30, holdSeconds = 3, smoothing = 2 } = {}) {
    this.onDegrade = onDegrade;
    this.threshold = threshold;
    this.holdSeconds = holdSeconds;
    this.smoothing = smoothing;   // 1/s – váha exponenciálního průměru
    this.avgFps = null;
    this.below = 0;               // souvislý čas pod prahem (s)
    this.steps = 0;               // počet provedených degradací
  }

  /** dt = délka snímku v sekundách. Volá render smyčka. */
  frame(dt) {
    if (dt <= 0 || this.steps >= MAX_STEPS) return;
    const fps = 1 / dt;
    this.avgFps = this.avgFps === null
      ? fps
      : this.avgFps + (fps - this.avgFps) * Math.min(1, dt * this.smoothing);
    if (this.avgFps < this.threshold) {
      this.below += dt;
      if (this.below >= this.holdSeconds) {
        this.below = 0;
        this.steps += 1;
        this.onDegrade(this.steps);
      }
    } else {
      this.below = 0;
    }
  }
}
