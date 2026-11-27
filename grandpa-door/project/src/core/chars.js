// The cast, drawn in riso boil: rubber-hose limbs, big heads, one loud signature each.
//   ARTHUR (Grandpa): giant white handlebar moustache, potato nose, yellow cardigan, blue bowler. Young (age 0): black quiff.
//   MABEL (Grandma): towering beehive (blonde → blue rinse), polka-dot pink dress, pearls, a handbag.
//   KID (the narrator, their grandson): blue hoodie, yellow mop, the family nose.
// draw*(x, y, scale, st): feet at (x, y). st = { f: 1 right / -1 left, age 0..1, mood, look:[dx,dy], blink, talk,
//   armL / armR: [angle° (0 down, 90 forward, 170 up), bend], legs: 'stand'|'walk'|'jog', ph, lean°, bob, sweat, hat }
import { ctx, clamp, lerp } from './lib.js';
import { INK, shape, ellipse, ellPts, curve, tube, inks, stroke, smooth, wob, hash, BOIL } from './riso.js';

const D = Math.PI / 180;
const SKIN = { pink: 0.26, yellow: 0.3 };
function limbEnd(sx, sy, ang, len) { return [sx + Math.sin(ang * D) * len, sy + Math.cos(ang * D) * len]; }
function arm(sx, sy, a, len, w, fill, seed, glove = true, mit = SKIN) {
  const [ang, bend] = a || [8, 10];
  const [hx, hy] = limbEnd(sx, sy, ang, len);
  const mx = (sx + hx) / 2 + Math.cos(ang * D) * bend, my = (sy + hy) / 2 - Math.sin(ang * D) * bend;
  tube([[sx, sy], [mx, my], [hx, hy]], w, fill, { seed });
  if (glove) { ellipse(hx, hy, 17, 15, { fill: { paper: 1 }, line: 4.5, seed: seed + 3 }); curve([[hx - 6, hy - 9], [hx - 3, hy + 2]], 3, { seed: seed + 5 }); }
  else ellipse(hx, hy, 11, 12, { fill: mit, line: 4, seed: seed + 3 });
  return [hx, hy];
}
function legs(st, hipY, hipW, len, w, fill, shoe, seed, shoeSize = 1) {
  const ph = st.ph ?? 0, mode = st.legs || 'stand';
  const amp = mode === 'jog' ? 1 : mode === 'walk' ? 0.6 : 0;
  [-1, 1].forEach((s, i) => {
    const p = ph + (i ? Math.PI : 0);
    const fx = s * hipW * 0.7 + Math.sin(p) * 46 * amp, fy = -Math.max(0, Math.cos(p)) * 34 * amp * (mode === 'jog' ? 1.4 : 1);
    const kx = (s * hipW + fx) / 2 + 14 * amp + 6, ky = hipY * 0.45 + fy * 0.5;
    tube([[s * hipW, hipY], [kx, ky], [fx, fy - 6]], w, fill, { seed: seed + i * 13 });
    ellipse(fx + 14 * shoeSize, fy - 4, 30 * shoeSize, 15 * shoeSize, { fill: shoe, line: 4.5, rot: -0.08, seed: seed + 40 + i });
  });
}
function eyes(cx, cy, st, gap = 28, rx = 15, ry = 19, seed = 50) {
  const lk = st.look || [0, 0], mood = st.mood || 'neutral';
  const big = mood === 'shock' ? 1.35 : 1, blink = st.blink || mood === 'tired' ? 1 : 0;
  [-1, 1].forEach((s, i) => {
    const x = cx + s * gap, y = cy;
    if (blink >= 1 || mood === 'happy') { curve(mood === 'happy' ? [[x - rx, y + 3], [x, y - 9], [x + rx, y + 3]] : [[x - rx, y + 2], [x, y + 5], [x + rx, y + 2]], 5, { seed: seed + i }); return; }
    ellipse(x, y, rx * big, ry * big, { fill: { paper: 1 }, line: 4.5, seed: seed + i });
    const pr = mood === 'shock' ? 5 : 7.5;
    ellipse(x + lk[0] * rx * 0.45, y + lk[1] * ry * 0.4 + 2, pr, pr * 1.15, { fill: { line: 0 }, line: 0, seed: seed + 5 + i, knock: false });
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = INK.line; ctx.beginPath(); ctx.ellipse(x + lk[0] * rx * 0.45, y + lk[1] * ry * 0.4 + 2, pr, pr * 1.15, 0, 0, 7); ctx.fill(); ctx.restore();
    if (mood === 'sly' || mood === 'smug') curve([[x - rx - 2, y - ry * 0.25], [x + rx + 2, y - ry * 0.35]], 5, { seed: seed + 9 + i });
  });
}
function sweat(x, y, st) { if (!st.sweat) return; const k = (BOIL % 4) * 4; shape([[x, y + k - 16], [x + 9, y + k + 4], [x, y + k + 12], [x - 9, y + k + 4]], { fill: { blue: 0.8 }, line: 3.5, seed: 91 }); }

// ═══════════════════════════ ARTHUR ═══════════════════════════
export function grandpa(x, y, s, st = {}) {
  const f = st.f ?? 1, age = st.age ?? 1, mood = st.mood || 'neutral';
  ctx.save(); ctx.translate(x, y + (st.bob || 0)); ctx.scale(s * f, s);
  ctx.rotate((st.lean || 0) * D);
  // legs + shoes (purple = blue over pink)
  legs(st, -165, 24, 165, 22, { blue: 1 }, { blue: 1, pink: 0.7 }, 300, 1.05);
  const hunch = age * 8;
  ctx.save(); ctx.rotate(hunch * D * 0.4);
  // back arm
  arm(-46, -300, st.armL, 125, 17, { yellow: 1, pink: 0.25 }, 330);
  // body: a pear of yellow cardigan, pink halftone shade on the back half
  const body = [[0, -338], [44, -320], [70, -262], [80, -205], [66, -168], [0, -158], [-66, -168], [-80, -205], [-70, -262], [-44, -320]];
  const bp = shape(body, { fill: { yellow: 1 }, line: 5.5, seed: 310 });
  ctx.save(); ctx.clip(bp); inks(smooth(wob([[-90, -340], [-10, -340], [-28, -150], [-90, -150]], 2, 9)), { pink: 0.45 }); ctx.restore();
  stroke(bp, 5.5);
  for (let i = 0; i < 3; i++) ellipse(18, -292 + i * 40, 6, 6, { fill: { blue: 1 }, line: 3, seed: 320 + i });
  curve([[8, -335], [14, -250], [6, -160]], 4, { seed: 325 });
  // bow tie
  shape([[0, -334], [-26, -350], [-28, -318]], { fill: { pink: 1 }, line: 4, seed: 340 }); shape([[0, -334], [26, -350], [28, -318]], { fill: { pink: 1 }, line: 4, seed: 341 });
  ellipse(0, -334, 8, 8, { fill: { pink: 1, blue: 0.5 }, line: 3.5, seed: 342 });
  // head
  const hy = -420, hx = 4;
  ellipse(hx - 76, hy + 4, 15, 22, { fill: SKIN, line: 4.5, seed: 350 });
  const head = ellPts(hx, hy, 82, 88, 18);
  const hp = shape(head, { fill: SKIN, line: 5.5, seed: 351 });
  if (age > 0.5) { ctx.save(); ctx.globalAlpha = clamp((age - 0.5) * 2); curve([[hx - 40, hy - 62], [hx - 10, hy - 68], [hx + 20, hy - 62]], 3, { seed: 352 }); curve([[hx - 34, hy - 50], [hx - 6, hy - 55], [hx + 16, hy - 50]], 3, { seed: 353 }); ctx.restore(); }
  // hair: young black quiff → old white tufts
  if (age < 0.5) {
    shape([[hx - 78, hy - 20], [hx - 82, hy - 70], [hx - 40, hy - 112], [hx + 30, hy - 120], [hx + 92, hy - 96], [hx + 70, hy - 70], [hx + 20, hy - 82], [hx - 40, hy - 66], [hx - 62, hy - 30]], { fill: { line: 0, blue: 1, pink: 0.6 }, line: 5, seed: 355 });
  } else {
    [-1].forEach(() => { shape([[hx - 84, hy - 30], [hx - 104, hy - 46], [hx - 96, hy - 12], [hx - 108, hy + 2], [hx - 84, hy + 10]], { fill: { paper: 1 }, line: 4.5, seed: 356 }); });
  }
  // cheek blush
  ellipse(hx + 52, hy + 26, 20, 13, { fill: { pink: 0.55 }, line: 0, knock: false, seed: 357 });
  eyes(hx + 22, hy - 12, st, 27, 15, 19, 360);
  // brows
  const bb = mood === 'shock' ? -18 : mood === 'worried' ? -6 : mood === 'angry' ? 6 : 0, tilt = mood === 'worried' ? 1 : mood === 'angry' ? -1 : 0;
  [-1, 1].forEach((sg, i) => {
    const bx = hx + 22 + sg * 27, by = hy - 42 + bb;
    if (age < 0.5) curve([[bx - 16, by + 2 - sg * tilt * 5], [bx, by - 4], [bx + 16, by + 2 + sg * tilt * 5]], 8, { seed: 370 + i });
    else shape([[bx - 24, by + 6 - sg * tilt * 6], [bx - 18, by - 10], [bx - 4, by - 16], [bx + 10, by - 12], [bx + 24, by - 4 + sg * tilt * 6], [bx + 12, by + 2], [bx - 6, by + 4]], { fill: { paper: 1 }, line: 4, seed: 372 + i });
  });
  // glasses (old)
  if (age > 0.6) { [-1, 1].forEach((sg, i) => ellipse(hx + 22 + sg * 27, hy - 12, 25, 25, { fill: {}, knock: false, line: 5, seed: 380 + i })); curve([[hx + 20, hy - 14], [hx + 24, hy - 18]], 5, { seed: 383 }); }
  // nose: the family potato
  ellipse(hx + 52, hy + 14, 30, 27, { fill: { pink: 1, yellow: 0.3 }, line: 5, seed: 390 });
  ellipse(hx + 60, hy + 4, 7, 5, { fill: { paper: 1 }, line: 0, seed: 391 });
  // mouth (shows under the moustache when talking or shocked)
  const open = mood === 'shock' ? 1 : clamp(st.talk || 0);
  if (open > 0.15) ellipse(hx + 28, hy + 66, 16, 6 + open * 12, { fill: { line: 1 }, line: 4.5, seed: 395 });
  else if (mood === 'happy' || mood === 'proud') curve([[hx + 10, hy + 62], [hx + 30, hy + 70], [hx + 48, hy + 60]], 4.5, { seed: 396 });
  // moustache: young pencil → old giant handlebar
  const my = hy + 44 - (st.talk || 0) * 4;
  if (age < 0.5) shape([[hx + 4, my], [hx + 30, my - 8], [hx + 56, my], [hx + 30, my + 4]], { fill: { line: 0, blue: 1 }, line: 4, seed: 397 });
  else {
    const W = lerp(70, 104, clamp((age - 0.5) * 2)), cx = hx + 30;
    shape([[cx, my - 14], [cx + W * 0.4, my - 20], [cx + W * 0.8, my - 8], [cx + W, my - 26], [cx + W * 1.08, my - 44], [cx + W * 0.96, my - 50], [cx + W * 1.02, my - 34], [cx + W * 0.86, my + 6], [cx + W * 0.4, my + 14], [cx, my + 4],
      [cx - W * 0.4, my + 14], [cx - W * 0.86, my + 6], [cx - W * 1.02, my - 34], [cx - W * 0.96, my - 50], [cx - W * 1.08, my - 44], [cx - W, my - 26], [cx - W * 0.8, my - 8], [cx - W * 0.4, my - 20]], { fill: { paper: 1, yellow: 0.12 }, line: 5, seed: 398 });
    curve([[cx - W * 0.5, my - 2], [cx - W * 0.2, my + 2]], 3, { seed: 399 }); curve([[cx + W * 0.2, my + 2], [cx + W * 0.5, my - 2]], 3, { seed: 400 });
  }
  // hat (old): blue bowler with a pink band
  if (st.hat ?? age > 0.5) {
    const tip = st.tip || 0;
    ctx.save(); ctx.translate(hx + 4, hy - 78); ctx.rotate(-tip * 0.5); ctx.translate(0, -tip * 40);
    shape([[-60, 6], [-48, -40], [-20, -66], [20, -66], [48, -40], [60, 6]], { fill: { blue: 1 }, line: 5, seed: 410 });
    shape([[-58, -4], [58, -4], [58, 10], [-58, 10]], { fill: { pink: 1 }, line: 4, sharp: true, seed: 411 });
    shape([[-96, 8], [96, 8], [90, 22], [-90, 22]], { fill: { blue: 1 }, line: 5, seed: 412 });
    ctx.restore();
  }
  sweat(hx - 50, hy - 50, st);
  ctx.restore();
  // front arm on top
  ctx.save(); ctx.rotate(hunch * D * 0.4); const hand = arm(46, -300, st.armR, 125, 17, { yellow: 1 }, 430); ctx.restore();
  ctx.restore();
  return hand;
}

// ═══════════════════════════ MABEL ═══════════════════════════
export function grandma(x, y, s, st = {}) {
  const f = st.f ?? 1, age = st.age ?? 1, mood = st.mood || 'neutral';
  ctx.save(); ctx.translate(x, y + (st.bob || 0)); ctx.scale(s * f, s); ctx.rotate((st.lean || 0) * D);
  legs(st, -150, 14, 150, 12, { yellow: 0.15, pink: 0.15 }, { pink: 1 }, 500, 0.75);
  arm(-34, -320, st.armL, 120, 11, SKIN, 520, false);
  // dress: pink A-line with yellow polka dots (they print orange)
  const dress = [[0, -350], [34, -336], [46, -280], [58, -210], [84, -138], [0, -128], [-84, -138], [-58, -210], [-46, -280], [-34, -336]];
  const dp = shape(dress, { fill: { pink: 1 }, line: 5.5, seed: 530 });
  ctx.save(); ctx.clip(dp);
  for (let i = 0; i < 14; i++) { const dx = -70 + (i % 5) * 34 + (Math.floor(i / 5) % 2) * 17, dy = -330 + Math.floor(i / 5) * 70 + (i % 2) * 12; ellipse(dx, dy, 9, 9, { fill: { yellow: 1 }, line: 0, knock: false, seed: 540 + i }); }
  inks(smooth(wob([[-100, -360], [-12, -360], [-30, -120], [-100, -120]], 2, 4)), { blue: 0.35 });
  ctx.restore(); stroke(dp, 5.5);
  curve([[-40, -230], [0, -222], [40, -230]], 4, { seed: 545 });
  // pearls
  for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + 0.7 * i / 6); ellipse(Math.cos(a) * 30, -350 + Math.sin(a) * 20, 6, 6, { fill: { paper: 1 }, line: 3, seed: 550 + i }); }
  // head
  const hy = -440, hx = 2;
  // beehive: blonde (young) → blue rinse (old), towering
  const hair = age < 0.5 ? { yellow: 1 } : { blue: 0.55, pink: 0.2 };
  const H = 170 + age * 30;
  shape([[hx - 70, hy + 10], [hx - 84, hy - 50], [hx - 76, hy - H * 0.6], [hx - 50, hy - H * 0.9], [hx - 6, hy - H], [hx + 40, hy - H * 0.92], [hx + 68, hy - H * 0.62], [hx + 82, hy - 50], [hx + 72, hy + 10]], { fill: hair, line: 5.5, seed: 560 });
  for (let i = 0; i < 3; i++) curve([[hx - 50 + i * 10, hy - 40 - i * 30], [hx, hy - 60 - i * 32], [hx + 50 - i * 10, hy - 40 - i * 30]], 3.5, { seed: 565 + i });
  ellipse(hx - 66, hy + 6, 11, 16, { fill: SKIN, line: 4, seed: 568 });
  shape(ellPts(hx, hy + 8, 66, 72, 16), { fill: SKIN, line: 5.5, seed: 569 });
  // fringe
  shape([[hx - 66, hy - 18], [hx - 40, hy - 56], [hx + 10, hy - 66], [hx + 62, hy - 48], [hx + 70, hy - 14], [hx + 30, hy - 34], [hx - 20, hy - 30]], { fill: hair, line: 5, seed: 570 });
  ellipse(hx + 46, hy + 34, 15, 10, { fill: { pink: 0.6 }, line: 0, knock: false, seed: 571 });
  eyes(hx + 18, hy + 6, st, 22, 12, 16, 575);
  // lashes
  if (!(st.blink || mood === 'happy')) [-1, 1].forEach((sg, i) => { const ex = hx + 18 + sg * 22; curve([[ex + 8, hy - 9], [ex + 16, hy - 18]], 3, { seed: 578 + i }); });
  // cat-eye glasses (old)
  if (age > 0.6) [-1, 1].forEach((sg, i) => { const ex = hx + 18 + sg * 22; shape([[ex - 18, hy - 4], [ex - 14, hy - 14], [ex + 16, hy - 20], [ex + 22, hy - 4], [ex + 14, hy + 16], [ex - 12, hy + 16]], { fill: {}, knock: false, line: 4.5, lineCol: INK.line, seed: 580 + i }); });
  // nose + lipstick
  ellipse(hx + 40, hy + 24, 13, 11, { fill: { pink: 0.8, yellow: 0.3 }, line: 4, seed: 585 });
  const open = mood === 'shock' ? 1 : clamp(st.talk || 0);
  if (open > 0.15) ellipse(hx + 24, hy + 52, 11, 5 + open * 9, { fill: { line: 1 }, line: 4, seed: 586 });
  else shape([[hx + 10, hy + 50], [hx + 24, hy + 46], [hx + 36, hy + 50], [hx + 24, hy + 58]], { fill: { pink: 1, blue: 0.2 }, line: 3.5, seed: 587 });
  const bb = mood === 'shock' ? -12 : 0; [-1, 1].forEach((sg, i) => curve([[hx + 18 + sg * 22 - 12, hy - 22 + bb], [hx + 18 + sg * 22 + 12, hy - 26 + bb]], 4.5, { seed: 590 + i }));
  sweat(hx - 40, hy - 30, st);
  const hand = arm(34, -320, st.armR, 120, 11, SKIN, 600, false);
  // handbag on the front arm
  if (st.bag !== false) { const [bx, by] = hand; const sw = Math.sin((st.ph || 0) * 1) * 8; shape([[bx - 30 + sw, by + 18], [bx + 30 + sw, by + 18], [bx + 26 + sw, by + 68], [bx - 26 + sw, by + 68]], { fill: { yellow: 1, pink: 0.6 }, line: 5, seed: 610 }); curve([[bx - 16 + sw, by + 18], [bx, by - 2], [bx + 16 + sw, by + 18]], 4, { seed: 611 }); }
  ctx.restore();
  return hand;
}

// ═══════════════════════════ THE KID (narrator) ═══════════════════════════
export function kid(x, y, s, st = {}) {
  const f = st.f ?? 1, mood = st.mood || 'neutral';
  ctx.save(); ctx.translate(x, y + (st.bob || 0)); ctx.scale(s * f, s); ctx.rotate((st.lean || 0) * D);
  legs(st, -150, 20, 150, 18, { blue: 0.5 }, { pink: 1, yellow: 0.5 }, 700);
  arm(-44, -290, st.armL, 120, 18, { blue: 1 }, 720, false);
  const hood = [[0, -330], [46, -312], [62, -250], [60, -160], [0, -150], [-60, -160], [-62, -250], [-46, -312]];
  const hp = shape(hood, { fill: { blue: 1 }, line: 5.5, seed: 730 });
  ctx.save(); ctx.clip(hp); inks(smooth(wob([[-80, -340], [-6, -340], [-22, -140], [-80, -140]], 2, 3)), { pink: 0.5 }); ctx.restore(); stroke(hp, 5.5);
  shape([[-36, -212], [36, -212], [32, -176], [-32, -176]], { fill: { blue: 1, pink: 0.4 }, line: 4, seed: 735 });
  curve([[-10, -320], [-14, -280]], 4, { seed: 736 }); curve([[10, -320], [14, -280]], 4, { seed: 737 });
  const hy = -405, hx = 4;
  shape(ellPts(hx, hy, 76, 80, 16), { fill: SKIN, line: 5.5, seed: 740 });
  // yellow mop
  const mop = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.05 + 0.9 * i / 10); const r = i % 2 ? 84 : 102; mop.push([hx + Math.cos(a) * r, hy - 10 + Math.sin(a) * r * 0.95]); }
  mop.push([hx + 70, hy - 30], [hx + 20, hy - 52], [hx - 30, hy - 40], [hx - 70, hy - 10]);
  shape(mop, { fill: { yellow: 1 }, line: 5, seed: 745 });
  for (let i = 0; i < 4; i++) ellipse(hx + 30 + (i % 2) * 22, hy + 22 + (i > 1 ? 10 : 0), 3, 3, { fill: { pink: 1 }, line: 0, knock: false, seed: 750 + i });
  eyes(hx + 22, hy - 4, st, 25, 14, 18, 760);
  [-1, 1].forEach((sg, i) => ellipse(hx + 22 + sg * 25, hy - 4, 23, 23, { fill: {}, knock: false, line: 5, seed: 765 + i }));
  ellipse(hx + 50, hy + 22, 26, 23, { fill: { pink: 1, yellow: 0.3 }, line: 5, seed: 770 });
  const open = mood === 'shock' ? 1 : clamp(st.talk || 0);
  if (open > 0.15) ellipse(hx + 26, hy + 56, 14, 5 + open * 11, { fill: { line: 1 }, line: 4.5, seed: 775 });
  else if (mood === 'smug' || mood === 'sly') curve([[hx + 6, hy + 54], [hx + 26, hy + 56], [hx + 42, hy + 46]], 4.5, { seed: 776 });
  else curve([[hx + 10, hy + 54], [hx + 36, hy + 54]], 4.5, { seed: 777 });
  const bb = mood === 'shock' ? -14 : mood === 'worried' ? -4 : 0; [-1, 1].forEach((sg, i) => curve([[hx + 22 + sg * 25 - 14, hy - 34 + bb + (mood === 'worried' ? sg * 4 : 0)], [hx + 22 + sg * 25 + 14, hy - 34 + bb - (mood === 'worried' ? sg * 4 : 0)]], 6, { seed: 780 + i }));
  sweat(hx - 46, hy - 40, st);
  const hand = arm(44, -290, st.armR, 120, 18, { blue: 1 }, 790, false);
  ctx.restore(); return hand;
}

/** a faceless "most people" silhouette in blue halftone */
export function ghost(x, y, s, st = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (st.f ?? 1), s);
  legs(st, -150, 18, 150, 16, { blue: 0.5 }, { blue: 0.6 }, 900);
  shape([[0, -330], [50, -310], [64, -200], [52, -150], [-52, -150], [-64, -200], [-50, -310]], { fill: { blue: 0.5 }, line: 4, seed: 910 });
  shape(ellPts(0, -400, 66, 72, 14), { fill: { blue: 0.5 }, line: 4, seed: 911 });
  const h = arm(40, -290, st.armR, 115, 15, { blue: 0.5 }, 920, false, { blue: 0.5 });
  ctx.restore(); return h;
}
