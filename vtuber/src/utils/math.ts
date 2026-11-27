export const clamp = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent exponential smoothing factor. */
export const damp = (speed: number, dt: number) => 1 - Math.exp(-speed * dt);

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Cheap smooth 1D value noise in [-1, 1], deterministic per seed. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    const s = Math.sin((n + seed * 57.31) * 127.1) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

/** Layered noise for organic motion. */
export const fbm = (x: number, seed = 0) =>
  noise1(x, seed) * 0.6 + noise1(x * 2.13, seed + 11) * 0.28 + noise1(x * 4.7, seed + 23) * 0.12;

/** Critically damped spring, useful for secondary motion. */
export class Spring {
  value = 0;
  velocity = 0;
  constructor(public stiffness = 60, public damping = 9) {}
  step(target: number, dt: number) {
    const h = Math.min(dt, 1 / 30);
    const force = (target - this.value) * this.stiffness - this.velocity * this.damping;
    this.velocity += force * h;
    this.value += this.velocity * h;
    return this.value;
  }
}
