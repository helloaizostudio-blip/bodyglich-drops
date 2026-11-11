// Motion kit: the difference between "posed" and "alive". Everything is a pure function of time, so frames stay
// deterministic for capture. Use it with Host / Buddy (and it works with Human too).
//   const act = track([{ t: 0, pose: {...} }, { t: 0.4, d: 0.5, ease: spring, pose: {...} }]);     keyframed acting
//   host.pose(alive(drag(act, lt), t, { talk: mouthFor(t, 2) }));                                   overlap + idle + lip flap
import { clamp, lerp, seg, eo, eio } from './lib.js';
import { T } from './timing.js';

// ---------- easings with character ----------
/** settles on 1 with one soft overshoot and a tiny wobble: use for anything that arrives (arms, heads, pops) */
export const spring = (k, bounce = 1) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.exp(-6.5 * k) * Math.cos(10.5 * k * bounce) * (1 - k * k * k));
/** dips back first, then goes: anticipation (a = how far back) */
export const antic = (k, a = 0.18) => { k = clamp(k); const w = 0.28; return k < w ? -a * Math.sin((k / w) * Math.PI) * 0.5 * (1 - k / w) - a * (k / w) * (1 - k / w) : lerp(0, 1, eio((k - w) / (1 - w))); };
/** a bump that rises and falls back to 0 (nods, takes, impacts) */
export const bump = (k) => (k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI) ** 2);
/** damped wobble that starts at 1 and dies to 0: jiggle after a landing, antenna follow-through */
export const wobble = (k, freq = 3, damp = 4) => (k <= 0 ? 0 : Math.exp(-damp * k) * Math.cos(k * freq * Math.PI * 2));
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** smooth wandering value in [-1, 1] (never repeats visibly): idle sway, eye drift */
export function drift(t, seed = 0, speed = 1) { const x = t * speed + seed * 17.3, i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 57), hash(i + 1 + seed * 57), u) * 2 - 1; }

// ---------- poses as data ----------
const DEF = { shL: [0, 0, 7], shR: [0, 0, 7], hipL: [0, 0, 2], hipR: [0, 0, 2], elL: 12, elR: 12, knL: 2, knR: 2, smile: 0.5 };
const dflt = (k) => DEF[k] ?? (['spine', 'head', 'tilt'].includes(k) ? [0, 0, 0] : ['look', 'brow'].includes(k) ? [0, 0] : 0);
/** blend two poses (missing joints count as the rest pose) */
export function mixPose(a, b, k) {
  const o = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key] ?? dflt(key), y = b[key] ?? dflt(key);
    o[key] = Array.isArray(x) || Array.isArray(y) ? Array.from({ length: Math.max(x.length || 0, y.length || 0) }, (_, i) => lerp(x[i] ?? 0, y[i] ?? 0, k)) : lerp(x, y, k);
  }
  return o;
}
/** add b's joints onto a (layering: idle on top of acting) */
export function addPose(a, b, w = 1) {
  const o = { ...a };
  for (const key of Object.keys(b)) { const x = a[key] ?? dflt(key), y = b[key]; o[key] = Array.isArray(y) ? y.map((v, i) => (x[i] ?? 0) + v * w) : x + y * w; }
  return o;
}
/**
 * Keyframed acting. keys = [{ t, d = 0.4, ease = spring, pose }], in time order. At time t each key that has started
 * pulls the pose toward its own over d seconds with its ease, so moves overlap and nothing ever snaps.
 */
export function track(keys) {
  return (t) => { let p = keys[0].pose; for (let i = 1; i < keys.length; i++) { const k = keys[i]; if (t <= k.t) break; p = mixPose(p, k.pose, (k.ease || spring)(clamp((t - k.t) / (k.d ?? 0.4)))); } return p; };
}
/**
 * Overlapping action: the body leads, the head, forearms and face arrive a few frames late. act = track(...) or any (t) => pose.
 */
export function drag(act, t, lag = { head: 0.07, elL: 0.06, elR: 0.06, brow: 0.03, look: -0.06 }) {
  const p = { ...act(t) };
  for (const key of Object.keys(lag)) { const late = act(t - lag[key]); if (late[key] !== undefined) p[key] = late[key]; }
  return p;
}

// ---------- life ----------
/** eyelid for natural blinking: 0 open … 1 closed. Blinks every 2-4.5 s, sometimes a double */
export function blink(t, seed = 0) {
  const P = 3.1; let v = 0;
  for (const n of [Math.floor(t / P), Math.floor(t / P) - 1]) { const at = n * P + hash(n + seed * 9.1) * 1.9; const dbl = hash(n * 3 + seed) > 0.72; for (const o of dbl ? [0, 0.26] : [0]) { const k = (t - at - o) / 0.17; if (k > 0 && k < 1) v = Math.max(v, k < 0.35 ? eo(k / 0.35) : 1 - eio((k - 0.35) / 0.65)); } }
  return v;
}
/** mouth open 0..1 from the narration's word timings for line i (or all lines): quick syllable flaps, shut between words */
export function mouthFor(t, line = null) {
  for (const w of T.words) { if (line != null && w.line !== line) continue; if (t < w.s - 0.04 || t > w.e + 0.05) continue;
    const d = w.e - w.s, k = clamp((t - w.s) / d), syl = Math.max(1, Math.round(d / 0.17)), env = Math.min(1, seg(t, w.s - 0.04, w.s + 0.03), 1 - seg(t, w.e - 0.03, w.e + 0.05));
    return env * (0.35 + 0.55 * Math.abs(Math.sin(k * syl * Math.PI)) * (0.7 + 0.3 * hash(Math.round(w.s * 31)))); }
  return 0;
}
/**
 * Layer life onto a pose: breathing, weight shift, head drift, eye darts, blinks, and (optional) talking.
 * o = { seed, amt = 1, talk (0..1 mouth), energy = 1 (how bouncy the talking head is) }
 */
export function alive(pose, t, o = {}) {
  const s = o.seed ?? 0, a = o.amt ?? 1, talk = o.talk ?? 0, br = Math.sin(t * 1.9 + s);
  const p = addPose(pose, { spine: [br * 0.9 * a + talk * 1.2, drift(t, s + 1, 0.35) * 1.6 * a, drift(t, s + 2, 0.3) * 1.1 * a], head: [drift(t, s + 3, 0.55) * 1.8 * a - talk * 3.2 * (o.energy ?? 1), drift(t, s + 4, 0.4) * 2.6 * a, drift(t, s + 5, 0.33) * 1.6 * a],
    shL: [0, 0, br * 0.8 * a], shR: [0, 0, br * 0.8 * a], elL: br * 1.2 * a, elR: -br * 1.2 * a, look: [drift(t, s + 6, 0.8) * 0.16 * a, drift(t, s + 7, 0.7) * 0.1 * a] });
  p.lid = Math.max(pose.lid ?? 0, blink(t, s)) + Math.min(0, pose.lid ?? 0);
  if (o.talk != null) { p.mouth = Math.max(pose.mouth ?? 0, talk); p.brow = Array.isArray(p.brow ?? [0, 0]) ? [(p.brow?.[0] ?? 0) + talk * 0.25, p.brow?.[1] ?? 0] : p.brow; }
  return p;
}
/** chest breathing for a Host/Human torso mesh */
export const breathe = (h, t, amt = 1, seed = 0) => { const k = (Math.sin(t * 1.9 + seed) * 0.5 + 0.5) * amt; h.parts[0].scale.set(1 + 0.012 * k, 1 + 0.006 * k, 1 + 0.03 * k); };

// ---------- squash & stretch moves (return values to feed Buddy.set / Host.pose) ----------
/**
 * A hop from x0 to x1: crouch (anticipation), stretch in the air, squash on landing, jiggle out.
 * Returns { x, y, squash, air (0..1), land (seconds since landing, <0 before) }. lt = time since the hop starts.
 */
export function hop(lt, { d = 0.55, h = 0.3, x0 = 0, x1 = 0, pre = 0.16 } = {}) {
  if (lt <= 0) return { x: x0, y: 0, squash: 0, air: 0, land: -1 };
  if (lt < pre) { const k = lt / pre; return { x: x0, y: 0, squash: -0.22 * Math.sin(k * Math.PI * 0.5), air: 0, land: -1 }; }
  const k = (lt - pre) / d;
  if (k < 1) { const y = 4 * h * k * (1 - k), v = Math.abs(1 - 2 * k); return { x: lerp(x0, x1, k), y, squash: lerp(-0.22, 0.2, clamp(k * 6)) * (0.35 + 0.65 * v), air: 1, land: -1 }; }
  const a = lt - pre - d; return { x: x1, y: 0, squash: -0.19 * wobble(a / 0.6, 2.2, 5), air: 0, land: a };
}
/** a pop-in scale with overshoot (0 → 1): things that appear never just fade */
export const popIn = (lt, d = 0.35) => (lt <= 0 ? 0 : spring(clamp(lt / d)));
