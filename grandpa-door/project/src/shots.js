// GRANDPA HOLDS THE DOOR (riso boil). One shot ≈ one beat; every shot moves; characters animate "on twos" (12 fps).
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob, rnd } from './core/lib.js';
import { L, Le, Wd, T, lineWords } from './core/timing.js';
import { INK, text, shape, ellipse, rect, curve, inks, hash, BOIL } from './core/riso.js';
import * as S from './core/sets.js';
import { grandpa, grandma, kid, ghost } from './core/chars.js';

const q = (t) => Math.floor(t * 12) / 12;                       // on twos
const blink = (t, o = 0) => (((t + o) % 3.1) < 0.12 ? 1 : 0);
const talk = (t) => 0.3 + 0.7 * Math.abs(Math.sin(q(t) * 11));
const sway = (t, a = 1) => Math.sin(q(t) * 3) * a;
const nth = (word, line, n) => { const ws = lineWords(line).filter((w) => w.w.toLowerCase().replace(/[^a-z0-9]/g, '') === word); return ws[Math.min(n, ws.length - 1)].s; };

/** the 1961 look: a warm yellow wash, a darker vignette and a film-frame date */
function flashback(k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = k;
  inks(new Path2D(`M0 0H${W}V${H}H0Z`), { yellow: 0.3 });
  ctx.globalCompositeOperation = 'multiply'; const g = ctx.createRadialGradient(540, 960, 500, 540, 960, 1300); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(120,80,40,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = k; S.stamp('1961', 870, 1760, 64, 1, -0.08, 'blue'); ctx.restore();
}
/** comic sound-word, screen space */
function sfx(str, x, y, size, k, col = 'yellow', rot = -0.1) {
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const sc = lerp(0.4, 1, eob(clamp(k)));
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.font = `900 ${size}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = INK.pink; ctx.fillText(str, 12, 12);
  ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = size * 0.16; ctx.strokeStyle = INK.line; ctx.strokeText(str, 0, 0); ctx.fillStyle = INK[col] || col; ctx.fillText(str, 0, 0);
  ctx.restore();
}
const fullBg = (fill) => { ctx.setTransform(1, 0, 0, 1, 0, 0); inks(new Path2D(`M0 0H${W}V${H}H0Z`), fill); S.layer(1); };

export function buildShots() {
  const shots = [], CUES = [];
  const add = (id, at, note, draw) => shots.push({ id, at, note, draw });
  const cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const at = (w, i) => Wd(w, i) - 0.06;
  const D0 = S.doorOf(0);
  const camLerp = (a, b, k) => S.camera(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3] || 0, b[3] || 0, k));

  // ───────── HOOK: the old couple, frozen in politeness at a cobwebbed door ─────────
  const tableau = (t, o = {}) => {
    S.sky(); S.street(-1200, 1600, { doors: { 0: 1 }, bells: true, cobwebs: { 0: 1 }, t });
    const b = sway(t, 2);
    grandpa(D0.x - 100, 0, 0.66, { f: 1, age: 1, armR: [96 + b, 8], armL: [10, 10], lean: 9, mood: o.gm || 'happy', blink: blink(t) });
    grandma(D0.x + D0.w + 105, 0, 0.66, { f: -1, age: 1, armR: [96 - b, 8], lean: 9, mood: o.mm || 'happy', blink: blink(t, 1.3) });
    const sy = -D0.h + 40 + Math.sin(q(t) * 2) * 20; curve([[D0.x + D0.w / 2 + 50, -D0.h - 16], [D0.x + D0.w / 2 + 50, sy]], 2.5, { seed: 5 });
    ellipse(D0.x + D0.w / 2 + 50, sy + 8, 9, 8, { fill: { line: 1 }, line: 0, seed: 6 });
  };
  { const st = cut(0), w1 = at('each', 0), w2 = at('1961', 0);
    add('S01', st, 'hook: old couple bowing at an open cobwebbed door, push in', (lt, d, t) => {
      camLerp([D0.x + 95, -300, 1.05], [D0.x + 95, -295, 1.2], eio(clamp(lt / d))); tableau(t);
    });
    add('S02', w1, 'close: the doorway between them, spider and cobwebs', (lt, d, t) => {
      camLerp([D0.x + 95, -330, 1.75], [D0.x + 95, -335, 1.95], eio(clamp(lt / d))); tableau(t);
    });
    add('S03', w2, 'SINCE 1961 stamp slams on the tableau', (lt, d, t) => {
      camLerp([D0.x + 95, -300, 1.2], [D0.x + 95, -300, 1.28], eio(clamp(lt / d))); tableau(t);
      ctx.setTransform(1, 0, 0, 1, 0, 0); S.stamp('SINCE 1961', 540, 1240, 96, eo(clamp(lt / 0.18)), -0.1, 'pink');
    });
    cue(st, 'whoosh', { gain: 0.5 }); cue(w1, 'whoosh', { gain: 0.4 }); cue(w2, 'stamp'); }

  // ───────── "Neither of them has ever gone through." ─────────
  { const st = cut(1), we = at('ever', 1);
    add('S04', st, 'two-shot: a tumbleweed rolls out of the doorway between them; punch on EVER', (lt, d, t) => {
      const p = t > we ? 1.22 : 1;
      camLerp([D0.x + 95, -300, 1.25 * p], [D0.x + 95, -300, 1.32 * p], eio(clamp(lt / d)));
      tableau(t, { gm: t > we ? 'tired' : 'happy', mm: t > we ? 'tired' : 'happy' });
      const k = clamp(lt / d); S.tumbleweed(D0.x + D0.w / 2 - 120 + k * 260, -40 - Math.abs(Math.sin(q(t) * 7)) * 30, 36, q(t) * 6);
    });
    cue(st, 'whoosh', { gain: 0.4 }); cue(we, 'boing', { gain: 0.5 }); }

  // ───────── FLASHBACK 1961: young Grandpa opens a door ─────────
  const young = (t, o = {}) => ({ f: 1, age: 0, armR: o.hold ? [94, 8] : [10, 10], armL: [8, 8], mood: 'happy', blink: blink(t), ...o });
  { const st = cut(2), wh = at('held', 2);
    add('S05', st, '1961: young Grandpa swings the bakery door open on "held", the bell rings', (lt, d, t) => {
      camLerp([D0.x + 60, -300, 1.25], [D0.x + 40, -300, 1.4], eio(clamp(lt / d)));
      const o = eob(clamp((t - wh + 0.1) / 0.3));
      S.sky(); S.street(-1200, 1600, { doors: { 0: o }, bells: true, ring: { 0: o > 0.2 && t - wh < 1.2 ? 1 : 0 }, t });
      grandpa(D0.x + D0.w + 70, 0, 0.75, young(t, { f: -1, hold: o > 0.3, mood: o > 0.3 ? 'happy' : 'neutral' }));
      flashback(1);
    });
    cue(st, 'whoosh', { gain: 0.5 }); cue(st + 0.05, 'sparkle', { gain: 0.5 }); cue(wh + 0.05, 'ding', { gain: 1.2 }); }

  // ───────── "who was still way, WAY too far away." ─────────
  const FAR = 8600;
  { const st = cut(3), w1 = nth('way', 3, 0) - 0.06, w2 = nth('way', 3, 1) - 0.06;
    add('S06', st, 'pull back down the street; on WAY it keeps going; a tiny lady at the far end, HER stamp', (lt, d, t) => {
      const k1 = eio(clamp((t - w1 + 0.2) / 0.5)), k2 = eio(clamp((t - w2 + 0.1) / 0.6));
      const z = lerp(lerp(1.1, 0.3, k1), 0.118, k2), cx = lerp(lerp(D0.x + 260, 1900, k1), FAR * 0.52, k2);
      S.camera(cx, lerp(-300, -500, k1), z);
      S.sky(); S.street(cx - 540 / z, cx + 540 / z, { doors: { 0: 1 }, bells: true, t });
      grandpa(D0.x + D0.w + 70, 0, 0.75, young(t, { f: 1, hold: true }));
      grandma(FAR, 0, 0.75, { f: -1, age: 0, legs: 'walk', ph: q(t) * 6, armR: [20, 10], mood: 'neutral' });
      if (k2 > 0.6) { ctx.setTransform(1, 0, 0, 1, 0, 0); const a = (k2 - 0.6) / 0.4; const gx = 540 + (FAR - cx) * z, gy = 960 - (-500 + lerp(-300, -500, k1) * 0) * 0 + 500 * z; S.stamp('HER', gx - 10, gy - 190, 54, a, 0.08, 'pink'); curve([[gx - 6, gy - 150], [gx, gy - 90]], 7, { col: INK.pink, seed: 8 }); }
      flashback(1);
    });
    cue(st, 'whoosh', { gain: 0.4 }); cue(w1, 'slide', { dur: 0.6, gain: 0.5 }); cue(w2, 'slide', { dur: 0.8, gain: 0.7 }); }

  // ───────── "Most people let it close. Not Grandpa." ─────────
  { const st = cut(4), wc = at('close', 4), wn = at('not', 4);
    add('S07', st, '"most people": a blue ghost lets the door slam', (lt, d, t) => {
      camLerp([D0.x + 120, -300, 1.2], [D0.x + 120, -300, 1.3], eio(clamp(lt / d)));
      const o = 1 - eo(clamp((t - wc + 0.15) / 0.18));
      S.sky(); S.street(-1200, 1600, { doors: { 0: o }, bells: true, ring: { 0: o < 0.5 ? 1 : 0 }, t });
      ghost(D0.x + D0.w + 120, 0, 0.75, { f: 1, legs: 'walk', ph: q(t) * 7, armR: [lerp(90, 20, 1 - o), 10] });
      flashback(1);
      sfx('SLAM!', 540, 1120, 150, clamp((t - wc) / 0.15), 'yellow', 0.12);
    });
    add('S08', wn, 'close: young Grandpa, jaw set, holding the door like his life depends on it', (lt, d, t) => {
      camLerp([D0.x + D0.w + 60, -330, 2.0], [D0.x + D0.w + 60, -335, 2.25], eio(clamp(lt / d)));
      S.sky(); S.street(-600, 1200, { doors: { 0: 1 }, bells: true, t });
      grandpa(D0.x + D0.w + 70, 0, 0.75, young(t, { f: -1, hold: true, mood: 'sly', sweat: 1, armR: [94 + Math.sin(q(t) * 20) * 2, 8] }));
      flashback(1);
    });
    cue(st, 'whoosh', { gain: 0.4 }); cue(wc, 'slam'); cue(wn, 'whoosh', { gain: 0.5 }); cue(wn + 0.1, 'tock'); }

  // ───────── "She saw him. So she did the polite little jog." ─────────
  { const st = cut(5), ws = at('so', 5);
    add('S09', st, 'far end of the street: the lady freezes, eyes wide — she has been SEEN', (lt, d, t) => {
      camLerp([FAR - 20, -370, 1.9], [FAR - 20, -375, 2.2], eio(clamp(lt / d)));
      S.sky(); S.street(FAR - 800, FAR + 800, { t });
      grandma(FAR, 0, 0.75, { f: -1, age: 0, mood: lt > 0.2 ? 'shock' : 'neutral', armR: [20, 10] });
      S.burst(FAR + 130, -560, 60, eob(clamp((lt - 0.2) / 0.2)), { yellow: 1 }); if (lt > 0.25) text('!', FAR + 130, -556, 80, { col: 'line' });
      flashback(1);
    });
    add('S10', ws, 'the polite little jog: elbows in, handbag bouncing, tracking shot', (lt, d, t) => {
      const x = FAR - lt * 260;
      camLerp([x - 60, -340, 1.25], [x - 60, -340, 1.3], eio(clamp(lt / d)));
      S.sky(); S.street(x - 900, x + 900, { t });
      grandma(x, 0, 0.75, { f: -1, age: 0, legs: 'jog', ph: q(t) * 14, armR: [40, -60], armL: [40, -60], mood: 'worried', bob: -Math.abs(Math.sin(q(t) * 14)) * 10, sweat: 1 });
      S.speedLines(x + 160, -440, 340, 300, -1, 6);
      flashback(1);
    });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + 0.25, 'pop'); cue(ws, 'boing', { gain: 0.6 }); }

  // ───────── "So he jogged too. Towards her." ─────────
  { const st = cut(6), wt = at('towards', 6);
    add('S11', st, 'Grandpa lets go and jogs too — the door slams behind him', (lt, d, t) => {
      const x = D0.x + D0.w + 70 + eio(clamp(lt / d)) * 400;
      camLerp([D0.x + 260, -330, 1.05], [D0.x + 420, -330, 1.1], eio(clamp(lt / d)));
      const o = 1 - eo(clamp((lt - 0.25) / 0.2));
      S.sky(); S.street(-1200, 1800, { doors: { 0: o }, bells: true, ring: { 0: o < 0.6 ? 1 : 0 }, t });
      grandpa(x, 0, 0.75, young(t, { f: 1, legs: 'jog', ph: q(t) * 14, armR: [40, -60], armL: [40, -60], bob: -Math.abs(Math.sin(q(t) * 14)) * 10 }));
      S.speedLines(x - 160, -440, 300, 300, 1, 6);
      flashback(1);
    });
    add('S12', wt, 'wide: both jog toward each other, very politely, across the whole street', (lt, d, t) => {
      const k = clamp(lt / d), cx = 2400;
      S.camera(cx, -300, 0.78);
      S.sky(); S.street(cx - 1400, cx + 1400, { t });
      grandpa(cx - 600 + k * 260, 0, 0.75, young(t, { f: 1, legs: 'jog', ph: q(t) * 14, armR: [40, -60], armL: [40, -60] }));
      grandma(cx + 600 - k * 260, 0, 0.75, { f: -1, age: 0, legs: 'jog', ph: q(t) * 14 + 1, armR: [40, -60], armL: [40, -60], mood: 'happy' });
      flashback(1);
    });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + 0.35, 'slam', { gain: 0.6 }); cue(wt, 'whoosh', { gain: 0.5 }); }

  // ───────── "They met in the middle of the road. Nowhere near the door." ─────────
  { const st = cut(7), wn = at('nowhere', 7);
    add('S13', st, 'they meet mid-road and shake hands; a car brakes and honks', (lt, d, t) => {
      const cx = 2400;
      camLerp([cx, -200, 0.9], [cx, -190, 1.0], eio(clamp(lt / d)));
      S.sky(); S.street(cx - 1000, cx + 1000, { t });
      const shake = Math.sin(q(t) * 30) * 6;
      S.car(cx - 640 + eo(clamp(lt / 0.5)) * 160, 340, 0.75, 0, { pink: 1 });
      grandpa(cx - 90, 230, 0.75, young(t, { f: 1, armR: [80, 10], armL: [10, 8], mood: 'happy', bob: shake }));
      grandma(cx + 90, 230, 0.75, { f: -1, age: 0, armR: [80, 10], mood: 'happy', bob: -shake, bag: false });
      sfx('HONK!', 260, 1120, 110, clamp((lt - 0.4) / 0.15), 'pink', -0.15);
      flashback(1);
    });
    add('S14', wn, 'meanwhile the bakery door, far away, swings shut. A tumbleweed.', (lt, d, t) => {
      camLerp([D0.x + 95, -260, 1.1], [D0.x + 95, -260, 1.0], eio(clamp(lt / d)));
      S.sky(); S.street(-1200, 1600, { doors: { 0: 0 }, bells: true, ring: { 0: 0.4 }, t });
      S.tumbleweed(D0.x - 300 + lt * 420, -40 - Math.abs(Math.sin(q(t) * 7)) * 26, 34, q(t) * 6);
      flashback(1);
    });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + 0.35, 'alarm', { dur: 0.35, gain: 0.5 }); cue(wn, 'whoosh', { gain: 0.4 }); cue(wn + 0.1, 'ding', { gain: 0.4 }); }

  // ───────── "So she held the next one. Out of respect." ─────────
  { const st = cut(8), wr = at('respect', 8);
    add('S15', st, 'she holds the next door for him; he tips his hat; a heart', (lt, d, t) => {
      const D = S.doorOf(3);
      camLerp([D.x + 140, -330, 1.15], [D.x + 140, -330, 1.25], eio(clamp(lt / d)));
      const o = eob(clamp(lt / 0.3));
      S.sky(); S.street(D.x - 1200, D.x + 1200, { doors: { 3: o }, bells: true, ring: { 3: lt < 1 ? 1 : 0 }, t });
      grandma(D.x + D.w + 80, 0, 0.75, { f: -1, age: 0, armR: [94, 8], mood: 'happy', blink: blink(t) });
      grandpa(D.x - 180, 0, 0.75, young(t, { f: 1, armR: [lerp(10, 150, eo(clamp((t - wr + 0.2) / 0.3))), 20], mood: 'happy', lean: t > wr ? 10 : 0 }));
      if (t > wr) S.heart(D.x + D.w / 2, -560 - (t - wr) * 120, 1.2);
      flashback(1);
    });
    cue(st, 'ding', { gain: 0.9 }); cue(wr, 'sparkle', { gain: 0.6 }); }

  // ───────── "64 years. 900,000 doors." ─────────
  { const st = cut(9), wn = at('900000', 9);
    add('S16', st, '64 YEARS: calendar pages fly, they age from 1961 to now while holding doors', (lt, d, t) => {
      const k = clamp(lt / d), age = eio(k);
      const cx = 1700 + q(t) * 300;
      S.camera(cx, -330, 1.0);
      S.sky(); S.street(cx - 900, cx + 900, { doors: { 2: 1, 3: 1, 4: 1 }, t });
      grandpa(cx - 150, 0, 0.75, { f: 1, age, armR: [94, 8], mood: 'happy', blink: blink(t) });
      grandma(cx + 150, 0, 0.75, { f: -1, age, armR: [94, 8], mood: 'happy', blink: blink(t, 0.7) });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const yr = 1961 + Math.floor(k * 64);
      for (let i = 0; i < 9; i++) { const ph = (lt * 1.6 + i / 9) % 1; const x = 120 + hash(i, 3) * 840, y = 1900 - ph * 1900; ctx.save(); ctx.translate(x, y); ctx.rotate((hash(i, 4) - 0.5) * 1.2 + ph * 2); rect(-70, -80, 140, 160, { fill: { paper: 1 }, line: 5, seed: 800 + i }); rect(-70, -80, 140, 40, { fill: { pink: 1 }, line: 5, seed: 810 + i }); text(String(Math.max(1961, yr - i * 3)), 0, 30, 40, { col: 'line' }); ctx.restore(); }
      S.stamp('64 YEARS', 540, 1240, 110, eo(clamp(lt / 0.2)), -0.08, 'blue');
      flashback(1 - k);
    });
    add('S17', wn, '900,000: a counter spins up over a wall of doors opening and closing', (lt, d, t) => {
      const cx = 3000 + lt * 2600;
      S.camera(cx, -420, 0.55);
      const doors = {}; for (let i = 0; i < 30; i++) doors[i] = 0.5 + 0.5 * Math.sin(q(t) * 9 + i * 1.3);
      S.sky(); S.street(cx - 2900, cx + 2900, { doors, t });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const n = Math.floor(900000 * eo(clamp(lt / Math.max(0.5, d * 0.8))));
      rect(110, 1080, 860, 230, { fill: { line: 0.95 }, line: 6, seed: 820 });
      text(n.toLocaleString('en-US'), 540, 1200, 150, { col: 'yellow', shadow: 'pink' });
      text('DOORS HELD', 540, 1370, 60, { col: 'line' });
    });
    cue(st, 'whoosh', { gain: 0.5 }); cue(st, 'slide', { dur: 1.6, gain: 0.4 }); cue(st + 0.1, 'stamp');
    for (let k = 0; k < 10; k++) cue(wn + k * 0.12, 'tock', { gain: 0.5 }); }

  // ───────── "Car doors. Fridge doors. Their own front door." ─────────
  { const st = cut(10), wf = at('fridge', 10), wt = at('their', 10);
    add('S18', st, 'car door: Grandpa holds it, Grandma gestures "after you"', (lt, d, t) => {
      camLerp([380, -300, 1.15], [360, -300, 1.25], eio(clamp(lt / d)));
      S.sky(); S.street(-900, 1500, { t });
      const o = eob(clamp(lt / 0.25));
      grandma(-80, 200, 0.75, { f: 1, age: 1, armR: [96, 8], mood: 'happy', lean: 8 });
      S.car(560, 300, 0.85, o, { pink: 1 });
      grandpa(150, 200, 0.75, { f: 1, age: 1, armR: [94, 8], mood: 'happy' });
    });
    add('S19', wf, 'kitchen: Grandma holds the fridge door; Grandpa bows', (lt, d, t) => {
      camLerp([60, -330, 1.25], [60, -330, 1.35], eio(clamp(lt / d)));
      fullBg({ blue: 0.18, yellow: 0.15 });
      for (let r = 0; r < 6; r++) for (let c = -4; c < 6; c++) rect(c * 120 - 60, -900 + r * 120, 116, 116, { fill: { paper: 1, blue: (r + c) % 2 ? 0.25 : 0.1 }, line: 3, seed: 830 + r * 10 + c });
      rect(-900, 0, 2000, 400, { fill: { pink: 0.4, yellow: 0.3 }, line: 5, seed: 840 });
      S.fridge(-60, 0, 0.9, eob(clamp(lt / 0.25)), t);
      grandma(-330, 0, 0.75, { f: 1, age: 1, armR: [90, 8], mood: 'happy' });
      grandpa(270, 0, 0.75, { f: -1, age: 1, armR: [70, 30], lean: 14, mood: 'happy', hat: false });
    });
    add('S20', wt, 'their own front door: both holding it for each other, forever', (lt, d, t) => {
      camLerp([0, -360, 0.95], [0, -360, 1.05], eio(clamp(lt / d)));
      S.sky(); S.layer(1); rect(-1600, 0, 3200, 600, { fill: { yellow: 0.55, blue: 0.4 }, line: 5, seed: 850 });
      S.house(0, 0, 1, 1);
      grandpa(-230, 30, 0.75, { f: 1, age: 1, armR: [96, 8], lean: 8, mood: 'happy', blink: blink(t) });
      grandma(240, 30, 0.75, { f: -1, age: 1, armR: [96, 8], lean: 8, mood: 'happy', blink: blink(t, 1) });
    });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + 0.1, 'pop'); cue(wf, 'whoosh', { gain: 0.4 }); cue(wf + 0.1, 'pop'); cue(wt, 'whoosh', { gain: 0.4 }); cue(wt + 0.15, 'ding', { gain: 0.8 }); }

  // ───────── "They got married in a revolving door. The ceremony took 11 hours." ─────────
  { const st = cut(11), wc = at('ceremony', 11), w11 = at('11', 11);
    const wedding = (t, spin, o = {}) => {
      fullBg({ pink: 0.25 });
      rect(-1400, -1400, 2800, 1400, { fill: { pink: 0.5, yellow: 0.2 }, line: 0, seed: 860 });
      rect(-1400, 0, 2800, 600, { fill: { yellow: 0.5, pink: 0.3 }, line: 5, seed: 861 });
      shape([[-420, -820], [-380, -900], [380, -900], [420, -820], [380, -760], [-380, -760]], { fill: { paper: 1 }, line: 5, seed: 862 });
      text('JUST MARRIED', 0, -830, 64, { col: 'pink' });
      S.revolving(0, 0, 1, spin);
      [0, Math.PI].forEach((off, i) => {
        const th = spin + off + Math.PI / 4, x = Math.sin(th) * 160, z = Math.cos(th);
        ctx.save(); ctx.globalAlpha = z > 0 ? 1 : 0.6;
        if (i === 0) grandpa(x, -10, 0.7, { f: z > 0 ? 1 : -1, age: 1, armR: [94, 8], mood: o.mood || 'happy', legs: 'walk', ph: q(t) * 8 });
        else grandma(x, -10, 0.7, { f: z > 0 ? 1 : -1, age: 1, armR: [94, 8], mood: o.mood || 'happy', legs: 'walk', ph: q(t) * 8 + 2 });
        ctx.restore();
      });
      S.revolvingFrame(0, 0, 1);
      ghost(-560, 30, 0.75, { f: 1, armR: [70, 40] });
      rect(-610, -330, 70, 52, { fill: { pink: 1 }, line: 4, seed: 870 });
      if (o.sleep) { text('Z', -470, -560 - (q(t) * 60) % 90, 60, { col: 'blue' }); text('z', -430, -620 - (q(t) * 60 + 40) % 90, 44, { col: 'blue' }); }
      for (let i = 0; i < 14; i++) { const ph = (q(t) * 0.5 + i / 14) % 1; ellipse(-500 + hash(i, 1) * 1000, -1100 + ph * 1300, 10, 7, { fill: { [['pink', 'yellow', 'blue'][i % 3]]: 1 }, line: 0, rot: ph * 6, seed: 880 + i }); }
    };
    add('S21', st, 'wedding: bride and groom keep circling in a revolving door, the vicar waits', (lt, d, t) => {
      camLerp([-120, -380, 0.9], [-80, -380, 1.0], eio(clamp(lt / d)));
      wedding(t, q(t) * 2.2);
    });
    add('S22', wc, 'hours pass: the clock spins, the vicar falls asleep; 11 HOURS stamp', (lt, d, t) => {
      camLerp([-100, -420, 0.82], [-100, -420, 0.88], eio(clamp(lt / d)));
      wedding(t, q(t) * 3, { sleep: true, mood: 'tired' });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      S.clock(860, 1230, 120, lt * 40);
      S.stamp('11 HOURS', 420, 1300, 96, eo(clamp((t - w11) / 0.18)), -0.12, 'blue');
    });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st, 'sparkle', { gain: 0.6 }); cue(wc, 'slide', { dur: 1.2, gain: 0.4 }); cue(w11, 'stamp'); }

  // ───────── "Then, last Tuesday... came the elevator." ─────────
  { const st = cut(12), we = at('elevator', 12);
    add('S23', st, 'dramatic slow push on elevator doors; TUESDAY card; DING on "elevator"', (lt, d, t) => {
      camLerp([0, -380, 0.7], [0, -400, 0.95], eio(clamp(lt / d)), [0, 0, -0.03]);
      fullBg({ blue: 0.55, pink: 0.25 });
      rect(-1200, 0, 2400, 700, { fill: { blue: 0.7, pink: 0.4 }, line: 5, seed: 890 });
      const gap = eo(clamp((t - we) / 0.6));
      S.elevator(0, 0, 1, gap, '1', 1, () => { inks(new Path2D('M-240 -620H240V0H-240Z'), { yellow: 1 }); });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (lt < 1.4) S.stamp('TUESDAY', 540, 1250, 90, eo(clamp(lt / 0.2)), -0.06, 'yellow');
      sfx('DING!', 540, 1180, 170, clamp((t - we) / 0.15), 'yellow', 0.08);
    });
    cue(st, 'heartbeat', { gain: 0.5 }); cue(st + 0.6, 'heartbeat', { gain: 0.5 }); cue(we, 'ding', { gain: 1.4 }); }

  // ───────── "After you. No, no. After YOU." ─────────
  { const st = cut(13), wn = at('no', 13), wy = nth('after', 13, 1) - 0.06;
    const lift = (t, gap, o = {}) => {
      fullBg({ blue: 0.5, pink: 0.2 });
      rect(-1200, 0, 2400, 700, { fill: { blue: 0.7, pink: 0.4 }, line: 5, seed: 890 });
      S.elevator(0, 0, 1, gap, '1', 0, () => { inks(new Path2D('M-240 -620H240V0H-240Z'), { yellow: 0.9 }); });
      grandpa(-150, 20, 0.75, { f: 1, age: 1, armR: o.pa || [94, 8], mood: o.pm || 'happy', talk: o.pt || 0, blink: blink(t) });
      grandma(170, 20, 0.75, { f: -1, age: 1, armR: o.ma || [80, 20], mood: o.mm || 'happy', talk: o.mt || 0, blink: blink(t, 1) });
    };
    add('S24', st, 'Grandpa blocks the closing doors with his arm: "After you."', (lt, d, t) => {
      camLerp([-60, -430, 1.0], [-80, -440, 1.15], eio(clamp(lt / d)));
      lift(t, 0.55 + 0.12 * Math.abs(Math.sin(q(t) * 6)), { pt: talk(t) });
    });
    add('S25', wn, 'Grandma, scandalised: "No, no." The doors bonk Grandpa.', (lt, d, t) => {
      camLerp([120, -480, 1.35], [140, -490, 1.5], eio(clamp(lt / d)));
      lift(t, 0.5 + 0.15 * Math.abs(Math.sin(q(t) * 7)), { mm: 'shock', mt: talk(t), ma: [110, -30], pm: 'worried' });
      sfx('BONK', 300, 1150, 110, lt > 0.3 ? clamp((lt % 0.6) / 0.12) : 0, 'pink', -0.2);
    });
    add('S26', wy, 'both insist, pointing at each other; the doors shut on them; screen shake', (lt, d, t) => {
      S.camera(0, -420, 0.92, 0, lt < 0.4 ? 16 : 0, t);
      lift(t, 1 - eo(clamp((lt - 0.2) / 0.5)) * 0.95, { pa: [100, -10], ma: [100, -10], pm: 'angry', mm: 'angry' });
    });
    cue(st, 'whoosh', { gain: 0.4 }); for (let k = 0; k < 3; k++) cue(wn + 0.3 + k * 0.6, 'thud', { gain: 0.5 }); cue(wy + 0.25, 'slam'); }

  // ───────── "They've been riding to floor 9 for a week." ─────────
  { const st = cut(14), ww = at('week', 14);
    add('S27', st, 'cross-section: the lift bobs between floors 8 and 9; DAY counter ticks up', (lt, d, t) => {
      camLerp([0, -2250, 0.5], [0, -2250, 0.55], eio(clamp(lt / d)));
      fullBg({ blue: 0.3 });
      for (let f = 0; f < 10; f++) { rect(-620, -f * 320 - 320, 1240, 320, { fill: { paper: 1, yellow: f % 2 ? 0.3 : 0.18 }, line: 5, seed: 900 + f }); text(String(f + 1), -540, -f * 320 - 160, 70, { col: f === 8 ? 'pink' : 'line' }); }
      rect(-170, -3200, 340, 3200, { fill: { line: 0.85, blue: 0.4 }, line: 6, seed: 920 });
      const cyc = (q(t) * 0.9) % 1, y = -7 * 320 - (0.5 - 0.5 * Math.cos(cyc * Math.PI * 2)) * 320;
      rect(-150, y - 300, 300, 300, { fill: { yellow: 1 }, line: 6, seed: 921 });
      grandpa(-50, y, 0.42, { f: 1, age: 1, armR: [94, 8], mood: 'tired' }); grandma(60, y, 0.42, { f: -1, age: 1, armR: [94, 8], mood: 'tired' });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const day = 1 + Math.floor(clamp(lt / d) * 6.99);
      rect(700, 1080, 300, 200, { fill: { paper: 1 }, line: 6, seed: 930 }); rect(700, 1080, 300, 60, { fill: { pink: 1 }, line: 6, seed: 931 }); text('DAY', 850, 1110, 40, { col: 'paper' }); text(String(day), 850, 1210, 100, { col: 'line' });
      if (cyc < 0.15 || (cyc > 0.5 && cyc < 0.65)) sfx('DING', 230, 1180, 100, 1, 'yellow', -0.12);
    });
    cue(st, 'whoosh', { gain: 0.4 }); for (let k = 0; k < 4; k++) cue(st + 0.2 + k * 0.55, 'ding', { gain: 0.45 }); cue(ww, 'tock'); }

  // ───────── "Anyway. That's why I never hold doors." ─────────
  const D7 = S.doorOf(7);
  { const st = cut(15), wn = at('never', 15);
    add('S28', st, 'the grandson walks out of a cafe and lets the door slam behind him, unbothered', (lt, d, t) => {
      camLerp([D7.x + 200, -330, 1.1], [D7.x + 260, -330, 1.18], eio(clamp(lt / d)));
      const o = lt < 0.5 ? 1 : 1 - eo(clamp((lt - 0.5) / 0.18));
      S.sky(); S.street(D7.x - 1200, D7.x + 1200, { doors: { 7: o }, bells: true, ring: { 7: o < 0.6 ? 1 : 0 }, t });
      kid(D7.x + D7.w + 40 + clamp(lt / 1.2) * 160, 0, 0.75, { f: 1, legs: lt < 1.2 ? 'walk' : 'stand', ph: q(t) * 7, mood: 'neutral', armR: [16, 10], blink: blink(t) });
    });
    add('S29', wn, 'close: the grandson, smug. He has learned.', (lt, d, t) => {
      camLerp([D7.x + D7.w + 190, -320, 2.1], [D7.x + D7.w + 190, -325, 2.3], eio(clamp(lt / d)));
      S.sky(); S.street(D7.x - 600, D7.x + 1200, { doors: { 7: 0 }, t });
      kid(D7.x + D7.w + 200, 0, 0.75, { f: 1, mood: 'smug', armR: [16, 10] });
    });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + 0.6, 'slam'); cue(wn, 'tock'); }

  // ───────── "Oh no. Someone's waving." ─────────
  { const st = cut(16), wv = at('waving', 16);
    add('S30', st, 'his face drops', (lt, d, t) => {
      camLerp([D7.x + D7.w + 190, -325, 2.3], [D7.x + D7.w + 190, -330, 2.6], eio(clamp(lt / d)));
      S.sky(); S.street(D7.x - 600, D7.x + 1200, { doors: { 7: 0 }, t });
      kid(D7.x + D7.w + 200, 0, 0.75, { f: 1, mood: 'shock', armR: [16, 10], sweat: 1, look: [1, -0.2] });
    });
    add('S31', wv, 'way down the street a tiny figure waves; his hand drifts back to the door', (lt, d, t) => {
      const z = lerp(1.1, 0.66, eio(clamp(lt / 0.6))), kx = D7.x + D7.w + 60;
      S.camera(lerp(kx + 200, kx + 640, eio(clamp(lt / 0.6))), -330, z);
      S.sky(); S.street(D7.x - 3000, D7.x + 6000, { doors: { 7: eo(clamp((lt - 0.5) / 0.4)) * 0.8 }, t });
      kid(kx, 0, 0.75, { f: -1, mood: 'worried', armR: [lerp(16, 94, eo(clamp((lt - 0.4) / 0.4))), 8], sweat: 1 });
      S.burst(kx + 1280, -330, 190, eob(clamp((lt - 0.3) / 0.25)), { yellow: 1, pink: 0.3 });
      ghost(kx + 1280, 0, 0.75, { f: -1, armR: [160 + Math.sin(q(t) * 14) * 15, 10] });
      if (lt > 0.45) { shape([[kx + 1140, -640], [kx + 1460, -640], [kx + 1460, -500], [kx + 1340, -500], [kx + 1300, -450], [kx + 1296, -500], [kx + 1140, -500]], { fill: { paper: 1 }, line: 6, sharp: true, seed: 960 }); text('HI!!', kx + 1300, -570, 96, { col: 'pink' }); }
    });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + 0.1, 'boing', { gain: 0.5 }); cue(wv, 'slide', { dur: 0.6, gain: 0.5 }); cue(wv + 0.7, 'ding', { gain: 0.9 }); }

  return { shots, cues: CUES };
}
