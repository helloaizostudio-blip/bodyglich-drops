import { decodePcm, ffmpeg, durationOf } from "./ffmpeg";
import type { WordTiming } from "../types";

const RATE = 16000;
const HOP = 0.01; // 10 ms analysis frames

/** RMS per 10 ms frame. */
function rmsFrames(pcm: Float32Array): Float32Array {
  const hop = Math.round(RATE * HOP);
  const n = Math.floor(pcm.length / hop);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * hop; j < (i + 1) * hop; j++) s += pcm[j] * pcm[j];
    out[i] = Math.sqrt(s / hop);
  }
  return out;
}

function percentile(a: ArrayLike<number>, p: number): number {
  const s = Array.from(a).sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
}

/** Voiced region of a clip (first/last frame above a relative threshold), in seconds. */
export async function voicedSpan(file: string): Promise<{ start: number; end: number; total: number }> {
  const pcm = await decodePcm(file, RATE);
  const r = rmsFrames(pcm);
  const thr = Math.max(0.006, percentile(r, 0.95) * 0.06);
  let a = 0,
    b = r.length - 1;
  while (a < r.length && r[a] < thr) a++;
  while (b > a && r[b] < thr) b--;
  return { start: a * HOP, end: (b + 1) * HOP, total: pcm.length / RATE };
}

export interface ProcessedVoice {
  duration: number;
  trimStart: number;
  tempo: number;
}

/**
 * Trim leading/trailing silence exactly (so word timestamps can be remapped), apply pitch-preserving
 * tempo, normalise loudness and write a 48 kHz mono WAV.
 */
export async function processVoice(raw: string, out: string, tempo = 1): Promise<ProcessedVoice> {
  const span = await voicedSpan(raw);
  const s = Math.max(0, span.start - 0.04);
  const e = Math.min(span.total, span.end + 0.08);
  const t = Math.min(1.25, Math.max(0.8, tempo));
  const filters = [
    `atrim=start=${s.toFixed(3)}:end=${e.toFixed(3)}`,
    "asetpts=PTS-STARTPTS",
    Math.abs(t - 1) > 0.001 ? `atempo=${t.toFixed(4)}` : "",
    "highpass=f=70",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    "aresample=48000",
    "afade=t=in:d=0.02",
  ].filter(Boolean);
  await ffmpeg(["-i", raw, "-af", filters.join(","), "-ac", "1", "-c:a", "pcm_s16le", out]);
  return { duration: await durationOf(out), trimStart: s, tempo: t };
}

/** Mouth-driving envelope at `fps`, normalised 0..1 with fast attack / slower release. */
export async function envelope(file: string, fps: number): Promise<number[]> {
  const pcm = await decodePcm(file, RATE);
  const hop = RATE / fps;
  const n = Math.ceil(pcm.length / hop);
  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    let s = 0,
      c = 0;
    for (let j = Math.floor(i * hop); j < Math.min(pcm.length, Math.floor((i + 1) * hop)); j++) {
      s += pcm[j] * pcm[j];
      c++;
    }
    raw.push(c ? Math.sqrt(s / c) : 0);
  }
  const ref = percentile(raw, 0.95) || 1;
  let prev = 0;
  return raw.map((v) => {
    const x = Math.min(1, v / ref);
    prev = x > prev ? x : prev * 0.55 + x * 0.45;
    return Math.round(prev * 1000) / 1000;
  });
}

// ---------------------------------------------------------------------------------------------
// Word timings
// ---------------------------------------------------------------------------------------------

/** Strip ElevenLabs v3 audio tags like "[excited]". */
export const stripTags = (s: string) => s.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();

export function tokenize(caption: string): string[] {
  return stripTags(caption).split(/\s+/).filter(Boolean);
}

/** Build word timings from ElevenLabs character alignment (tags removed). */
export function wordsFromAlignment(
  a: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] },
  remap: (t: number) => number,
): WordTiming[] {
  const words: WordTiming[] = [];
  let cur: WordTiming | null = null;
  let inTag = false;
  for (let i = 0; i < a.characters.length; i++) {
    const ch = a.characters[i];
    if (ch === "[") inTag = true;
    if (inTag) {
      if (ch === "]") inTag = false;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
      continue;
    }
    const st = remap(a.character_start_times_seconds[i]);
    const en = remap(a.character_end_times_seconds[i]);
    if (!cur) cur = { text: ch, start: st, end: en };
    else {
      cur.text += ch;
      cur.end = en;
    }
  }
  if (cur) words.push(cur);
  return words.map((w) => ({ ...w, start: Math.max(0, w.start), end: Math.max(w.start, w.end) }));
}

/**
 * Estimate word timings when no TTS alignment is available (e.g. imported audio).
 * Detects pauses in the audio and aligns punctuation breaks in the text to them with a monotonic
 * dynamic-programming match, then spreads words over voiced time by character weight.
 */
export async function estimateWordTimings(file: string, caption: string): Promise<WordTiming[]> {
  const words = tokenize(caption);
  if (!words.length) return [];
  const pcm = await decodePcm(file, RATE);
  const r = rmsFrames(pcm);
  const thr = Math.max(0.004, percentile(r, 0.95) * 0.1);
  const voiced = Array.from(r, (v) => v >= thr);
  let first = voiced.indexOf(true);
  let last = voiced.lastIndexOf(true);
  if (first < 0) {
    first = 0;
    last = r.length - 1;
  }

  // pauses ≥ 90 ms inside the voiced span
  const pauses: { a: number; b: number }[] = [];
  for (let i = first; i <= last; i++) {
    if (voiced[i]) continue;
    let j = i;
    while (j <= last && !voiced[j]) j++;
    if (j - i >= 9) pauses.push({ a: i, b: j });
    i = j;
  }

  const weight = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1.5;
  const breaks: { after: number; strong: boolean }[] = [];
  words.forEach((w, i) => {
    if (i === words.length - 1) return;
    if (/[.!?…]["')\]]*$|\.\.\.$/.test(w)) breaks.push({ after: i, strong: true });
    else if (/[,;:—–-]["')\]]*$/.test(w)) breaks.push({ after: i, strong: false });
  });

  // expected time of each break if speech were uniform over voiced frames
  const cumW: number[] = [];
  let acc = 0;
  for (const w of words) cumW.push((acc += weight(w)));
  const total = acc;
  const voicedIdx: number[] = [];
  for (let i = first; i <= last; i++) if (voiced[i]) voicedIdx.push(i);
  const timeAtFrac = (f: number) => voicedIdx[Math.min(voicedIdx.length - 1, Math.floor(f * voicedIdx.length))] ?? first;
  const exp = breaks.map((b) => timeAtFrac(cumW[b.after] / total));

  // DP: match breaks (in order) to pauses (in order)
  const B = breaks.length,
    P = pauses.length;
  const skipBreak = (j: number) => (breaks[j].strong ? 40 : 12);
  const skipPause = (k: number) => Math.min(60, (pauses[k].b - pauses[k].a) * 1.5);
  const D = Array.from({ length: B + 1 }, () => new Float64Array(P + 1).fill(Infinity));
  const M = Array.from({ length: B + 1 }, () => new Int8Array(P + 1));
  D[0][0] = 0;
  for (let j = 0; j <= B; j++)
    for (let k = 0; k <= P; k++) {
      if (j === 0 && k === 0) continue;
      let best = Infinity,
        mv = 0;
      if (j > 0 && D[j - 1][k] + skipBreak(j - 1) < best) {
        best = D[j - 1][k] + skipBreak(j - 1);
        mv = 1;
      }
      if (k > 0 && D[j][k - 1] + skipPause(k - 1) < best) {
        best = D[j][k - 1] + skipPause(k - 1);
        mv = 2;
      }
      if (j > 0 && k > 0) {
        const mid = (pauses[k - 1].a + pauses[k - 1].b) / 2;
        const c = D[j - 1][k - 1] + Math.abs(exp[j - 1] - mid) * 0.35;
        if (c < best) {
          best = c;
          mv = 3;
        }
      }
      D[j][k] = best;
      M[j][k] = mv;
    }
  const matched: { after: number; pause: { a: number; b: number } }[] = [];
  for (let j = B, k = P; j > 0 || k > 0; ) {
    const mv = M[j][k];
    if (mv === 3) {
      matched.unshift({ after: breaks[j - 1].after, pause: pauses[k - 1] });
      j--;
      k--;
    } else if (mv === 1) j--;
    else k--;
  }

  // segments of words between matched pauses
  const out: WordTiming[] = [];
  let wStart = 0;
  let fStart = first;
  const segs = [...matched, { after: words.length - 1, pause: { a: last + 1, b: last + 1 } }];
  for (const s of segs) {
    const segWords = words.slice(wStart, s.after + 1);
    const frames: number[] = [];
    for (let i = fStart; i < s.pause.a; i++) if (voiced[i]) frames.push(i);
    if (!frames.length) for (let i = fStart; i < Math.max(fStart + 1, s.pause.a); i++) frames.push(i);
    const tw = segWords.reduce((a, w) => a + weight(w), 0);
    let c = 0;
    for (const w of segWords) {
      const f0 = frames[Math.min(frames.length - 1, Math.floor((c / tw) * frames.length))];
      c += weight(w);
      const f1 = frames[Math.min(frames.length - 1, Math.ceil((c / tw) * frames.length) - 1)];
      out.push({ text: w, start: f0 * HOP, end: (f1 + 1) * HOP });
    }
    wStart = s.after + 1;
    fStart = s.pause.b;
  }
  return out;
}
