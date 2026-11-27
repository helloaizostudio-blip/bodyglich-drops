/**
 * Procedural music + sound effects. Everything is synthesised locally, so the generator never
 * depends on (or accidentally inserts) third-party audio.
 */
import type { Hazard } from "../types";

export const SR = 48000;

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Light, playful 2-channel background loop for `seconds`. */
export function synthMusic(seconds: number, opts: { seed: number; hazard: Hazard }): [Float32Array, Float32Array] {
  const n = Math.ceil(seconds * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const tense = opts.hazard !== "none" && opts.hazard !== "snow";
  const bpm = tense ? 104 : 96;
  const beat = 60 / bpm;
  // chord roots (midi) and qualities; one chord per bar
  const prog: [number, number[]][] = tense
    ? [
        [57, [0, 3, 7]],
        [53, [0, 4, 7]],
        [48, [0, 4, 7]],
        [55, [0, 4, 7]],
      ]
    : [
        [48, [0, 4, 7]],
        [55, [0, 4, 7]],
        [57, [0, 3, 7]],
        [53, [0, 4, 7]],
      ];
  const rand = rng(opts.seed);
  const add = (buf: Float32Array, i: number, v: number) => {
    if (i >= 0 && i < n) buf[i] += v;
  };

  const bars = Math.ceil(seconds / (beat * 4)) + 1;
  for (let bar = 0; bar < bars; bar++) {
    const [root, q] = prog[bar % prog.length];
    const t0 = bar * beat * 4;
    // pad: soft detuned sines, whole bar
    for (const iv of q) {
      const f = midi(root + 12 + iv);
      const len = Math.floor(beat * 4 * SR);
      const start = Math.floor(t0 * SR);
      for (let k = 0; k < len; k++) {
        const t = k / SR;
        const env = Math.min(1, t / 0.35) * Math.min(1, (beat * 4 - t) / 0.3);
        const v = 0.018 * env * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t));
        add(L, start + k, v);
        add(R, start + k, v * 0.9);
      }
    }
    // bass on beats 1 and 3
    for (const b of [0, 2]) {
      const f = midi(root - 12);
      const start = Math.floor((t0 + b * beat) * SR);
      const len = Math.floor(beat * 1.6 * SR);
      for (let k = 0; k < len; k++) {
        const t = k / SR;
        const env = Math.exp(-t * 3.2) * Math.min(1, t / 0.01);
        const v = 0.09 * env * Math.sin(2 * Math.PI * f * t);
        add(L, start + k, v);
        add(R, start + k, v);
      }
    }
    // marimba-ish pluck arpeggio, eighth notes
    const pattern = [0, 1, 2, 1, 2, 0, 1, 2];
    for (let e = 0; e < 8; e++) {
      if (rand() < 0.12) continue;
      const iv = q[pattern[e]] + (e >= 4 && rand() < 0.3 ? 12 : 0);
      const f = midi(root + 24 + iv);
      const start = Math.floor((t0 + (e * beat) / 2) * SR);
      const len = Math.floor(0.5 * SR);
      const pan = 0.5 + (rand() - 0.5) * 0.5;
      for (let k = 0; k < len; k++) {
        const t = k / SR;
        const env = Math.exp(-t * 9) * Math.min(1, t / 0.003);
        const v = 0.05 * env * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 4 * t) * Math.exp(-t * 30));
        add(L, start + k, v * (1 - pan) * 2);
        add(R, start + k, v * pan * 2);
      }
    }
    // soft shaker on off-beats
    for (let e = 0; e < 4; e++) {
      const start = Math.floor((t0 + e * beat + beat / 2) * SR);
      const len = Math.floor(0.06 * SR);
      for (let k = 0; k < len; k++) {
        const env = Math.exp((-k / SR) * 60);
        const v = 0.012 * env * (rand() * 2 - 1);
        add(L, start + k, v);
        add(R, start + k, v);
      }
    }
  }
  // fade in/out
  const fi = Math.floor(0.4 * SR),
    fo = Math.floor(1.2 * SR);
  for (let i = 0; i < n; i++) {
    const g = Math.min(1, i / fi, (n - i) / fo);
    L[i] *= g;
    R[i] *= g;
  }
  return [L, R];
}

/** Air whoosh used on scene transitions. */
export function sfxWhoosh(seed: number, dur = 0.45): [Float32Array, Float32Array] {
  const n = Math.floor(dur * SR);
  const L = new Float32Array(n),
    R = new Float32Array(n);
  const rand = rng(seed);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const cutoff = 0.02 + 0.25 * Math.sin(Math.PI * t);
    lp += cutoff * (rand() * 2 - 1 - lp);
    const env = Math.sin(Math.PI * Math.pow(t, 0.7)) ** 2;
    const v = lp * env * 0.9;
    L[i] = v * (1 - t);
    R[i] = v * t;
  }
  return [L, R];
}

/** Cartoon pop for the character card. */
export function sfxPop(): [Float32Array, Float32Array] {
  const n = Math.floor(0.14 * SR);
  const o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 300 + 700 * Math.exp(-t * 40);
    ph += (2 * Math.PI * f) / SR;
    o[i] = 0.5 * Math.sin(ph) * Math.exp(-t * 28) * Math.min(1, t / 0.002);
  }
  return [o, Float32Array.from(o)];
}

/** Two-note chime for the ending card. */
export function sfxChime(): [Float32Array, Float32Array] {
  const n = Math.floor(1.6 * SR);
  const o = new Float32Array(n);
  for (const [at, note] of [
    [0, 88],
    [0.16, 93],
  ] as const) {
    const f = midi(note);
    for (let k = Math.floor(at * SR); k < n; k++) {
      const t = k / SR - at;
      const env = Math.exp(-t * 3.5) * Math.min(1, t / 0.003);
      o[k] += 0.16 * env * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 6));
    }
  }
  return [o, Float32Array.from(o)];
}

/** Environment ambience bed (bubbles for water, crackle for fire, low wind otherwise). */
export function sfxAmbience(seconds: number, hazard: Hazard, seed: number): [Float32Array, Float32Array] {
  const n = Math.ceil(seconds * SR);
  const L = new Float32Array(n),
    R = new Float32Array(n);
  const rand = rng(seed + 99);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp += 0.01 * (rand() * 2 - 1 - lp);
    const v = lp * (hazard === "water" ? 0.25 : 0.18);
    L[i] = v;
    R[i] = v;
  }
  if (hazard === "water") {
    // bubbles: short rising sine chirps
    const count = Math.floor(seconds * 2.2);
    for (let b = 0; b < count; b++) {
      const start = Math.floor(rand() * n);
      const f0 = 500 + rand() * 900;
      const len = Math.floor((0.03 + rand() * 0.05) * SR);
      const pan = rand();
      let ph = 0;
      for (let k = 0; k < len && start + k < n; k++) {
        const t = k / SR;
        ph += (2 * Math.PI * f0 * (1 + t * 14)) / SR;
        const v = 0.05 * Math.sin(ph) * Math.sin((Math.PI * k) / len);
        L[start + k] += v * (1 - pan);
        R[start + k] += v * pan;
      }
    }
  } else if (hazard === "fire") {
    const count = Math.floor(seconds * 14);
    for (let b = 0; b < count; b++) {
      const start = Math.floor(rand() * n);
      const len = Math.floor(0.004 * SR);
      for (let k = 0; k < len && start + k < n; k++) {
        const v = 0.15 * (rand() * 2 - 1) * (1 - k / len);
        L[start + k] += v;
        R[start + k] += v;
      }
    }
  }
  return [L, R];
}
