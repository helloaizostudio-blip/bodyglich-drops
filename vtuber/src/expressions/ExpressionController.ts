import { EXPRESSIONS, type ExpressionName } from './presets';
import { damp } from '../utils/math';

/**
 * Smoothly cross-fades between emotion presets. Produces a weight map over
 * VRM expression names every frame. Unsupported names are remapped to the
 * preset's fallback or dropped, so models with partial expression sets
 * degrade gracefully instead of throwing.
 */
export class ExpressionController {
  private current: Record<string, number> = {};
  private target: Record<string, number> = {};
  private active: ExpressionName = 'neutral';
  private activeSince = 0;
  private time = 0;
  /** 0..1 how strongly the active preset is applied (for head pose blending). */
  readonly headOffset = { x: 0, y: 0, z: 0 };
  motionAmount = 0;
  intensity = 1;
  speed = 6;

  constructor(private supports: (name: string) => boolean = () => true) {}

  setSupportCheck(fn: (name: string) => boolean) {
    this.supports = fn;
    this.rebuildTarget();
  }

  get expression() {
    return this.active;
  }

  set(name: ExpressionName) {
    if (name === this.active && this.activeSince > 0) return;
    this.active = name;
    this.activeSince = this.time;
    this.rebuildTarget();
  }

  setIntensity(v: number) {
    this.intensity = v;
    this.rebuildTarget();
  }

  private rebuildTarget() {
    const preset = EXPRESSIONS[this.active];
    const target: Record<string, number> = {};
    // Prefer a model-provided custom clip with the same name.
    if (this.active !== 'neutral' && this.supports(this.active)) {
      target[this.active] = 1;
    } else {
      let anySupported = false;
      for (const [k, v] of Object.entries(preset.weights)) {
        if (this.supports(k)) {
          target[k] = v;
          anySupported = true;
        }
      }
      if (!anySupported && preset.fallback) {
        for (const [k, v] of Object.entries(preset.fallback)) if (this.supports(k)) target[k] = v;
      }
    }
    for (const k in target) target[k] *= this.intensity;
    this.target = target;
  }

  /** Returns smoothed emotion weights (excluding visemes driven by lip-sync). */
  update(dt: number): Record<string, number> {
    this.time += dt;
    const k = damp(this.speed, dt);
    const keys = new Set([...Object.keys(this.current), ...Object.keys(this.target)]);
    for (const key of keys) {
      const cur = this.current[key] ?? 0;
      const next = cur + ((this.target[key] ?? 0) - cur) * k;
      if (next < 0.001 && !(key in this.target)) delete this.current[key];
      else this.current[key] = next;
    }
    const preset = EXPRESSIONS[this.active];
    const h = preset.head ?? {};
    const hi = this.intensity;
    this.headOffset.x += ((h.x ?? 0) * hi - this.headOffset.x) * k;
    this.headOffset.y += ((h.y ?? 0) * hi - this.headOffset.y) * k;
    this.headOffset.z += ((h.z ?? 0) * hi - this.headOffset.z) * k;
    this.motionAmount += ((preset.motion ? hi : 0) - this.motionAmount) * k;
    return this.current;
  }

  /** Procedural motion for the active expression (radians / meters). */
  motion(t: number): { x: number; y: number; z: number; bob: number } {
    const m = this.motionAmount;
    if (m < 0.001) return { x: 0, y: 0, z: 0, bob: 0 };
    switch (EXPRESSIONS[this.active].motion) {
      case 'laugh':
        return { x: Math.sin(t * 14) * 0.035 * m, y: 0, z: Math.sin(t * 7) * 0.02 * m, bob: Math.abs(Math.sin(t * 14)) * 0.006 * m };
      case 'bounce':
        return { x: Math.sin(t * 9) * 0.02 * m, y: Math.sin(t * 4.5) * 0.03 * m, z: 0, bob: Math.abs(Math.sin(t * 9)) * 0.008 * m };
      case 'tilt':
        return { x: 0, y: 0, z: Math.sin(t * 1.3) * 0.03 * m, bob: 0 };
      case 'droop':
        return { x: Math.sin(t * 0.8) * 0.015 * m, y: 0, z: 0, bob: -0.004 * m };
      case 'shake':
        return { x: 0, y: Math.sin(t * 2.2) * 0.02 * m, z: 0, bob: 0 };
      default:
        return { x: 0, y: 0, z: 0, bob: 0 };
    }
  }
}
