import { clamp } from '../utils/math';
import type { Viseme } from '../expressions/presets';

export interface LipSyncFrame {
  /** 0..1 perceived loudness after gain + noise gate */
  level: number;
  /** smoothed viseme weights 0..1 */
  visemes: Record<Viseme, number>;
  /** voice activity (with hysteresis) */
  speaking: boolean;
}

/**
 * Real-time, analyser-based lip-sync.
 *
 * Loudness drives mouth openness; a coarse formant estimate (energy ratios in
 * F1/F2 bands) picks the vowel shape. This is a heuristic — it reads well on
 * stream but is not phoneme-accurate. For exact visemes, feed timestamps from
 * a TTS provider through {@link LipSync.setExternal}.
 */
export class LipSync {
  gain = 1.4;
  threshold = 0.12;
  private time = new Float32Array(1024);
  private freq = new Uint8Array(512);
  private smoothLevel = 0;
  private vis: Record<Viseme, number> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  private speaking = false;
  private holdTimer = 0;
  private attackTimer = 0;
  private external: { level: number; viseme?: Viseme } | null = null;

  setExternal(v: { level: number; viseme?: Viseme } | null) {
    this.external = v;
  }

  process(analyser: AnalyserNode | null, sampleRate: number, dt: number): LipSyncFrame {
    let rawLevel = 0;
    const scores: Record<Viseme, number> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };

    if (this.external) {
      rawLevel = this.external.level;
      scores[this.external.viseme ?? 'aa'] = 1;
    } else if (analyser) {
      if (this.time.length !== analyser.fftSize) this.time = new Float32Array(analyser.fftSize);
      if (this.freq.length !== analyser.frequencyBinCount) this.freq = new Uint8Array(analyser.frequencyBinCount);
      analyser.getFloatTimeDomainData(this.time);
      analyser.getByteFrequencyData(this.freq);

      let sum = 0;
      for (let i = 0; i < this.time.length; i++) sum += this.time[i] * this.time[i];
      const rms = Math.sqrt(sum / this.time.length);
      const db = 20 * Math.log10(rms + 1e-8);
      rawLevel = clamp(((db + 58) / 40) * this.gain);

      const binHz = sampleRate / analyser.fftSize;
      const band = (lo: number, hi: number) => {
        const a = Math.max(1, Math.floor(lo / binHz));
        const b = Math.min(this.freq.length - 1, Math.ceil(hi / binHz));
        let e = 0;
        for (let i = a; i <= b; i++) e += this.freq[i];
        return e / Math.max(1, b - a + 1);
      };
      const f1 = band(250, 900) + 1;
      const f2lo = band(900, 1600);
      const f2hi = band(1600, 3200);
      const hiRatio = f2hi / f1;
      const midRatio = f2lo / f1;

      scores.ee = clamp((hiRatio - 0.45) * 2.2);
      scores.ih = clamp((hiRatio - 0.3) * 2) * (1 - scores.ee) * 0.8;
      scores.ou = clamp((0.45 - midRatio) * 2.5) * (1 - scores.ee);
      scores.oh = clamp(1 - Math.abs(midRatio - 0.6) * 3) * (1 - scores.ee) * 0.8;
      scores.aa = clamp((midRatio - 0.55) * 1.8) + 0.25;
    }

    // Noise gate + VAD with hysteresis.
    const gated = rawLevel < this.threshold * 0.6 ? 0 : rawLevel;
    if (gated > this.threshold) {
      this.attackTimer += dt;
      this.holdTimer = 0.28;
      if (this.attackTimer > 0.04) this.speaking = true;
    } else {
      this.attackTimer = 0;
      this.holdTimer -= dt;
      if (this.holdTimer <= 0) this.speaking = false;
    }

    // Asymmetric smoothing: mouths open faster than they close.
    const up = 1 - Math.exp(-dt * 38);
    const down = 1 - Math.exp(-dt * 16);
    this.smoothLevel += (gated - this.smoothLevel) * (gated > this.smoothLevel ? up : down);

    let total = 0;
    for (const k in scores) total += scores[k as Viseme];
    total = Math.max(total, 1e-3);
    const open = clamp(this.smoothLevel * 1.15);
    for (const k of Object.keys(this.vis) as Viseme[]) {
      const target = (scores[k] / total) * open;
      this.vis[k] += (target - this.vis[k]) * (target > this.vis[k] ? up : down);
    }
    return { level: this.smoothLevel, visemes: this.vis, speaking: this.speaking };
  }
}
