import { rand } from '../utils/math';

/**
 * Natural blinking: randomized intervals (2–6 s), occasional double-blinks,
 * and an asymmetric close/open curve (fast close, slower open).
 */
export class BlinkController {
  enabled = true;
  private timer = rand(1, 3);
  private phase = -1; // -1 idle, else 0..1 progress through a blink
  private duration = 0.16;
  private queuedDouble = false;
  value = 0;

  trigger() {
    if (this.phase < 0) {
      this.phase = 0;
      this.duration = rand(0.13, 0.2);
    }
  }

  update(dt: number, suppress = 0): number {
    if (this.enabled) {
      this.timer -= dt;
      if (this.timer <= 0 && this.phase < 0) {
        this.trigger();
        this.queuedDouble = Math.random() < 0.15;
        this.timer = rand(2.2, 6);
      }
    }
    if (this.phase >= 0) {
      this.phase += dt / this.duration;
      const p = this.phase;
      // close in first 40%, hold briefly, open slower
      this.value = p < 0.4 ? p / 0.4 : p < 0.5 ? 1 : Math.max(0, 1 - (p - 0.5) / 0.5);
      if (this.phase >= 1) {
        this.phase = -1;
        this.value = 0;
        if (this.queuedDouble) {
          this.queuedDouble = false;
          this.timer = 0.12;
        }
      }
    }
    return this.value * (1 - suppress);
  }
}
