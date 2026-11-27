import { Spring } from '../utils/math';

/**
 * Converts voice energy into conversational head motion: small nods on
 * syllable onsets plus gentle emphasis tilts, so speech feels embodied.
 */
export class TalkAnimator {
  enabled = true;
  private nod = new Spring(90, 12);
  private tilt = new Spring(25, 7);
  private prevLevel = 0;
  private t = 0;
  private emphasisDir = 1;

  update(dt: number, level: number, speaking: boolean) {
    this.t += dt;
    let nodTarget = 0;
    let tiltTarget = 0;
    if (this.enabled && speaking) {
      const onset = Math.max(0, level - this.prevLevel);
      if (onset > 0.25) this.emphasisDir = Math.random() < 0.5 ? -1 : 1;
      nodTarget = level * 0.06 + onset * 0.25;
      tiltTarget = Math.sin(this.t * 1.7) * 0.03 * this.emphasisDir;
    }
    this.prevLevel = level;
    return {
      x: this.nod.step(nodTarget, dt),
      y: Math.sin(this.t * 0.9) * (speaking ? 0.025 : 0),
      z: this.tilt.step(tiltTarget, dt),
    };
  }
}
