// RISO BOIL: a risograph-print look in canvas 2D.
// Three inks (fluorescent pink, blue, sunflower yellow) + a dark line ink, overprinted (multiply) on cream paper,
// each ink slightly mis-registered, tints as halftone dots, and every outline "boils" (re-drawn with a new wobble 8×/s).
//   setBoil(t) once per frame · shape(pts, { fill: { pink: 1, yellow: 0.4 }, line: 5 }) · ellipse/circle/rect helpers
//   paper() (background) · finish() (grain + speckle on top)
import { ctx, W, H, clamp } from './lib.js';

export const INK = { pink: '#FF4F9A', blue: '#3157D5', yellow: '#FFC230', line: '#241F3A', paper: '#F4EAD3' };
const REG = { pink: [2.6, -1.8], blue: [-2.2, 1.6], yellow: [1.2, 2.6], line: [0, 0] };
const ANG = { pink: 0.26, blue: 0.79, yellow: 0.0, line: 0.5 };
export let BOIL = 0, TIME = 0;
export function setBoil(t) { TIME = t; BOIL = Math.floor(t * 8); }
export const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + 17.3) * 43758.5453; return x - Math.floor(x); };

// ---------- halftone patterns (one per ink × density step) ----------
const PAT = {};
function pattern(ink, d) {
  const k = Math.round(clamp(d) * 10); const key = ink + k;
  if (PAT[key]) return PAT[key];
  const s = 9, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d');
  const r = Math.sqrt(k / 10) * s * 0.62; g.fillStyle = INK[ink]; g.beginPath(); g.arc(s / 2, s / 2, r, 0, 7); g.fill();
  if (k >= 6) { [[0, 0], [s, 0], [0, s], [s, s]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, r * 0.55, 0, 7); g.fill(); }); }
  const p = ctx.createPattern(c, 'repeat'); p.setTransform(new DOMMatrix().rotate(ANG[ink] * 57.3));
  return (PAT[key] = p);
}

// ---------- boiling paths ----------
/** jitter points: each vertex moves a little, differently on every boil frame */
export function wob(pts, amp = 2, seed = 0) { return pts.map(([x, y], i) => [x + (hash(seed + i * 1.7, BOIL) - 0.5) * 2 * amp, y + (hash(seed + i * 2.3 + 9, BOIL) - 0.5) * 2 * amp]); }
/** smooth (Catmull-Rom) path through points */
export function smooth(pts, closed = true, tension = 1) {
  const p = new Path2D(), n = pts.length; if (n < 2) return p;
  const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  p.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), k = tension / 6;
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (closed) p.closePath(); return p;
}
/** polygon path (sharp corners, still boiling) */
export function poly(pts, closed = true) { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); if (closed) p.closePath(); return p; }

/** print a path in inks: fill = { pink: 1, blue: .5, yellow: .3, paper: 1 } (density 1 = solid, < 1 = halftone dots) */
export function inks(path, fill = {}) {
  for (const k of ['paper', 'yellow', 'pink', 'blue', 'line']) {
    const d = fill[k]; if (!d) continue;
    ctx.save();
    if (k === 'paper') { ctx.fillStyle = INK.paper; ctx.fill(path); ctx.restore(); continue; }
    ctx.globalCompositeOperation = 'multiply'; ctx.translate(REG[k][0], REG[k][1]);
    ctx.fillStyle = d >= 0.95 ? INK[k] : pattern(k, d); ctx.fill(path); ctx.restore();
  }
}
export function stroke(path, w = 5, col = INK.line, dash = null) {
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash); ctx.stroke(path); ctx.restore();
}
/** the workhorse: boiling closed shape. o = { fill, line (width, 0 = none), amp, seed, sharp, paper (knock out first) } */
export function shape(pts, o = {}) {
  const q = wob(pts, o.amp ?? 1.8, o.seed ?? pts.length * 3.1);
  const p = o.sharp ? poly(q, o.closed ?? true) : smooth(q, o.closed ?? true);
  if (o.knock !== false && (o.closed ?? true)) inks(p, { paper: 1 });
  inks(p, o.fill || {});
  if ((o.line ?? 5) > 0) stroke(p, o.line ?? 5, o.lineCol);
  return p;
}
/** points around an ellipse */
export function ellPts(cx, cy, rx, ry, n = 14, rot = 0, a0 = 0, a1 = Math.PI * 2) {
  const out = [], full = Math.abs(a1 - a0) >= 6.28;
  for (let i = 0; i < (full ? n : n + 1); i++) { const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return out;
}
export const ellipse = (cx, cy, rx, ry, o = {}) => shape(ellPts(cx, cy, rx, ry, o.n ?? Math.max(10, Math.round((rx + ry) / 9)), o.rot ?? 0), o);
export const rectPts = (x, y, w, h, n = 2) => { const o = []; for (let i = 0; i < n; i++) o.push([x + w * i / n, y]); for (let i = 0; i < n; i++) o.push([x + w, y + h * i / n]); for (let i = 0; i < n; i++) o.push([x + w - w * i / n, y + h]); for (let i = 0; i < n; i++) o.push([x, y + h - h * i / n]); return o; };
export const rect = (x, y, w, h, o = {}) => shape(rectPts(x, y, w, h, o.n ?? 2), { sharp: true, ...o });
/** a boiling open line (hose limb, crease, motion line) */
export function curve(pts, w = 5, o = {}) { const q = wob(pts, o.amp ?? 1.4, o.seed ?? 7); const p = smooth(q, false); stroke(p, w, o.col ?? INK.line, o.dash); return p; }
/** a tube: dark outline + ink core (rubber-hose limbs) */
export function tube(pts, w, fill, o = {}) {
  const q = wob(pts, o.amp ?? 1.2, o.seed ?? 11), p = smooth(q, false);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK.line; ctx.lineWidth = w + 9; ctx.globalCompositeOperation = 'multiply'; ctx.stroke(p);
  ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = INK.paper; ctx.lineWidth = w; ctx.stroke(p);
  for (const k of ['yellow', 'pink', 'blue']) { const d = fill[k]; if (!d) continue; ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.translate(REG[k][0], REG[k][1]); ctx.strokeStyle = d >= 0.95 ? INK[k] : pattern(k, d); ctx.lineWidth = w; ctx.stroke(p); ctx.restore(); }
  ctx.restore();
}
/** printed text in an ink, mis-registered shadow in another */
export function text(str, x, y, size, o = {}) {
  ctx.save(); ctx.font = `${o.weight ?? 900} ${size}px ${o.font ?? 'Inter'}`; ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = 'middle'; ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
  if (o.ls) ctx.letterSpacing = o.ls;
  ctx.globalCompositeOperation = 'multiply';
  if (o.shadow) { ctx.fillStyle = INK[o.shadow]; ctx.fillText(str, size * 0.06, size * 0.06); }
  ctx.fillStyle = o.col ? (INK[o.col] || o.col) : INK.line; ctx.fillText(str, 0, 0);
  ctx.restore();
}

// ---------- paper and finish ----------
let PAPER = null, GRAIN = [], SPECK = [];
function noiseCanvas(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const im = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const [r, gg, b, a] = fn(i % w, (i / w) | 0); im.data.set([r, gg, b, a], i * 4); } g.putImageData(im, 0, 0); return c; }
function build() {
  const W = ctx.canvas.width, H = ctx.canvas.height; GRAIN = []; SPECK = [];
  PAPER = document.createElement('canvas'); PAPER.width = W; PAPER.height = H; const g = PAPER.getContext('2d');
  g.fillStyle = INK.paper; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(150,120,80,${0.04 + Math.random() * 0.05})`; g.lineWidth = 0.6 + Math.random(); g.beginPath(); const x = Math.random() * W, y = Math.random() * H, a = Math.random() * 6.28, l = 6 + Math.random() * 26; g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l / 2, y + Math.sin(a + 0.6) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(90,60,30,0.16)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 3; k++) {
    GRAIN.push(noiseCanvas(360, 640, () => { const v = 200 + Math.random() * 55; return [v, v - 4, v - 12, Math.random() < 0.5 ? 255 : 0]; }));
    SPECK.push(noiseCanvas(360, 640, () => (Math.random() < 0.012 ? [250, 246, 236, 255] : [0, 0, 0, 0])));
  }
}
export function paper() { if (!PAPER || PAPER.width !== ctx.canvas.width || PAPER.height !== ctx.canvas.height) build(); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(PAPER, 0, 0); ctx.restore(); }
/** grain (multiply) + ink drop-outs (paper-coloured specks) + a tiny global registration shiver */
export function finish() {
  if (!PAPER || PAPER.width !== ctx.canvas.width) build(); const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.22; ctx.drawImage(GRAIN[BOIL % 3], 0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.55; ctx.drawImage(SPECK[(BOIL + 1) % 3], 0, 0, W, H);
  ctx.restore();
}
