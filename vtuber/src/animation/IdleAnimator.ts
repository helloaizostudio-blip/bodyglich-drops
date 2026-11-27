import { fbm, rand } from '../utils/math';

export interface Euler3 {
  x: number;
  y: number;
  z: number;
}

export interface BodyPose {
  head: Euler3;
  neck: Euler3;
  spine: Euler3;
  chest: Euler3;
  /** 0..1 breathing cycle amplitude */
  breath: number;
  /** vertical offset in metres (bounce/laugh) */
  bob: number;
  /** arm sway radians */
  armSway: number;
}

export const zeroPose = (): BodyPose => ({
  head: { x: 0, y: 0, z: 0 },
  neck: { x: 0, y: 0, z: 0 },
  spine: { x: 0, y: 0, z: 0 },
  chest: { x: 0, y: 0, z: 0 },
  breath: 0,
  bob: 0,
  armSway: 0,
});

/**
 * Layered procedural idle motion: breathing, organic head drift, weight
 * shifting and eye saccades. All motion is noise-based so it never loops
 * visibly.
 */
export class IdleAnimator {
  enabled = true;
  breathing = true;
  intensity = 1;
  private t = rand(0, 100);
  private saccadeTimer = 0;
  readonly eyeOffset = { x: 0, y: 0 };
  private eyeTarget = { x: 0, y: 0 };

  update(dt: number, pose: BodyPose, talking: number) {
    this.t += dt;
    const t = this.t;
    const k = this.enabled ? this.intensity : 0;

    // Breathing ~ 15 breaths/min, slightly irregular.
    const breathPhase = t * 1.55 + fbm(t * 0.1, 3) * 0.8;
    pose.breath = this.breathing ? (Math.sin(breathPhase) * 0.5 + 0.5) : 0;
    const b = this.breathing ? Math.sin(breathPhase) : 0;
    pose.chest.x += b * 0.012;
    pose.spine.x += b * 0.006;

    // Head drift — slow organic wander, livelier when talking.
    const live = 1 + talking * 1.6;
    pose.head.x += fbm(t * 0.23, 1) * 0.05 * k * live;
    pose.head.y += fbm(t * 0.17, 2) * 0.09 * k * live;
    pose.head.z += fbm(t * 0.19, 4) * 0.045 * k;
    pose.neck.y += fbm(t * 0.11, 5) * 0.04 * k;

    // Weight shift through the torso.
    pose.spine.z += fbm(t * 0.07, 6) * 0.025 * k;
    pose.spine.y += fbm(t * 0.09, 7) * 0.03 * k;
    pose.armSway += fbm(t * 0.15, 8) * 0.04 * k + b * 0.01;

    // Eye saccades — quick jumps between fixation points.
    this.saccadeTimer -= dt;
    if (this.saccadeTimer <= 0) {
      const wide = Math.random() < 0.2;
      this.eyeTarget.x = rand(-1, 1) * (wide ? 0.6 : 0.18);
      this.eyeTarget.y = rand(-1, 1) * (wide ? 0.35 : 0.1);
      this.saccadeTimer = rand(0.4, 2.4);
    }
    const s = 1 - Math.exp(-dt * 30);
    this.eyeOffset.x += (this.eyeTarget.x - this.eyeOffset.x) * s;
    this.eyeOffset.y += (this.eyeTarget.y - this.eyeOffset.y) * s;
  }
}
