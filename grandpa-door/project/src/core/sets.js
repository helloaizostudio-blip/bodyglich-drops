// Sets and props in riso boil. World units = px at zoom 1. Ground line y = 0 (people stand on it).
import { ctx, W, H, clamp, lerp, rnd } from './lib.js';
import { INK, shape, ellipse, ellPts, rect, rectPts, curve, tube, inks, stroke, smooth, wob, text, hash, BOIL } from './riso.js';

// ---------- camera ----------
export const CAM = { x: 0, y: -300, z: 1, r: 0 };
/** set the camera: world point (x, y) at screen centre, zoom z, roll r (rad), shake px */
export function camera(x, y, z = 1, r = 0, shake = 0, t = 0) {
  Object.assign(CAM, { x, y, z, r });
  const sx = shake ? (hash(Math.floor(t * 24), 1) - 0.5) * shake : 0, sy = shake ? (hash(Math.floor(t * 24), 2) - 0.5) * shake : 0;
  CAM.sx = sx; CAM.sy = sy; layer(1);
}
/** parallax layer: p = 1 world, p < 1 moves slower (distant), p = 0 fixed to screen */
export function layer(p = 1) {
  const z = lerp(1, CAM.z, p) * (p === 1 ? 1 : 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(540 + CAM.sx, 960 + CAM.sy); ctx.rotate(CAM.r); ctx.scale(z, z); ctx.translate(-CAM.x * p, -CAM.y * p);
}
export function screenReset() { ctx.setTransform(1, 0, 0, 1, 0, 0); }

// ---------- sky ----------
export function sky({ dusk = false, sun = true } = {}) {
  ctx.save(); screenReset();
  inks(new Path2D(`M0 0 H${W} V${H} H0Z`), dusk ? { pink: 0.35, blue: 0.2 } : { yellow: 0.22 });
  ctx.restore();
  layer(0.08);
  if (sun) { ellipse(260, -1100, 170, 170, { fill: dusk ? { pink: 1, yellow: 0.6 } : { pink: 1 }, line: 0, n: 22, seed: 1 }); }
  layer(0.2);
  for (let i = -3; i < 6; i++) { const x = i * 900 + 200, y = -1250 + (i % 2) * 180; shape([[x - 160, y + 30], [x - 120, y - 30], [x - 40, y - 60], [x + 40, y - 50], [x + 100, y - 80], [x + 170, y - 20], [x + 180, y + 30]], { fill: { paper: 1 }, line: 5, seed: 20 + i }); }
  layer(0.45);
  for (let i = -6; i < 12; i++) { const x = i * 300, h = 300 + rnd(i + 40) * 380; rect(x, -h - 260, 290, h + 300, { fill: { blue: 0.32 }, line: 0, seed: 40 + i }); for (let k = 0; k < 4; k++) rect(x + 40 + (k % 2) * 120, -h - 200 + Math.floor(k / 2) * 110, 60, 70, { fill: { paper: 1, yellow: 0.3 }, line: 0, seed: 60 + i * 4 + k }); }
  layer(1);
}

// ---------- the street ----------
const SHOPS = [
  ['BAKERY', { pink: 0.55 }, ['pink', 'paper']], ['HATS', { yellow: 1 }, ['blue', 'paper']], ['TEA ROOM', { blue: 0.55 }, ['yellow', 'paper']],
  ['BOOKS', { pink: 0.3, yellow: 0.7 }, ['pink', 'yellow']], ['FLOWERS', { yellow: 0.45, blue: 0.3 }, ['pink', 'paper']], ['BARBER', { pink: 1, yellow: 0.15 }, ['blue', 'paper']],
  ['SHOES', { blue: 0.35, pink: 0.25 }, ['yellow', 'paper']], ['CAFE', { yellow: 0.6, pink: 0.4 }, ['blue', 'yellow']],
];
export const BW = 560;
export const doorOf = (i) => ({ x: i * BW + 70, w: 190, h: 400 });
/** a door on a hinge (left edge at x), opening toward the camera: o 0 closed → 1 wide open */
export function door(x, w, h, o = 0, fill = { blue: 1 }, seed = 0, y = 0) {
  rect(x - 16, y - h - 16, w + 32, h + 16, { fill: { paper: 1 }, line: 5, seed: seed + 1 });
  rect(x, y - h, w, h, { fill: { line: 0.9, pink: 0.4 }, line: 4, seed: seed + 2 });
  const a = o * 1.45, c = Math.cos(a), sn = Math.sin(a), fw = w * c, grow = sn * 26;
  const pts = [[x, y - h], [x + fw, y - h - grow], [x + fw, y + grow * 0.6], [x, y]];
  shape(pts, { fill, line: 5, sharp: true, seed: seed + 3 });
  if (c > 0.25) {
    rect(x + fw * 0.18, y - h * 0.88, fw * 0.64, h * 0.38, { fill: { paper: 1, blue: 0.3 }, line: 4, seed: seed + 4 });
    ellipse(x + fw * 0.84, y - h * 0.47, 9 * c + 3, 9, { fill: { yellow: 1 }, line: 3.5, seed: seed + 5 });
  } else curve([[x + fw + 4, y - h * 0.5], [x + fw + 14, y - h * 0.48]], 6, { seed: seed + 6 });
  return { x, w, h, edge: x + fw };
}
/** the little shop bell over a door (swings with ring 0..1) */
export function bell(x, y, ring = 0, t = 0) {
  const a = Math.sin(t * 28) * 0.5 * ring;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  curve([[0, 0], [0, 22]], 4, { seed: 80 });
  shape([[-18, 50], [-14, 30], [0, 20], [14, 30], [18, 50]], { fill: { yellow: 1 }, line: 4, seed: 81 }); ellipse(0, 54, 5, 5, { fill: { line: 1 }, line: 0, seed: 82 });
  ctx.restore();
  if (ring > 0.2) { curve([[x + 30, y + 20], [x + 46, y + 10]], 4, { seed: 83 }); curve([[x - 30, y + 20], [x - 46, y + 10]], 4, { seed: 84 }); }
}
function building(i, o = {}) {
  const k = ((i % SHOPS.length) + SHOPS.length) % SHOPS.length, [name, wall, aw] = SHOPS[k];
  const x = i * BW, w = BW - 14, h = 980 + rnd(i * 3 + 1) * 320;
  rect(x, -h, w, h, { fill: wall, line: 6, seed: 100 + i * 7 });
  rect(x - 12, -h - 30, w + 24, 46, { fill: { paper: 1 }, line: 5, seed: 101 + i * 7 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const wx = x + 60 + c * 160, wy = -h + 90 + r * 190; if (wy > -560) continue; rect(wx, wy, 104, 130, { fill: { paper: 1, blue: 0.4 }, line: 5, seed: 110 + i * 9 + r * 3 + c }); curve([[wx + 20, wy + 30], [wx + 50, wy + 8]], 4, { col: INK.paper, seed: 111 }); curve([[wx + 52, wy], [wx + 52, wy + 130]], 4, { seed: 112 }); }
  // sign
  rect(x + 40, -560, w - 80, 86, { fill: { line: 0.9, blue: 0.3 }, line: 5, seed: 130 + i });
  text(name, x + w / 2, -515, 58, { col: 'paper', ls: '4px' });
  // awning
  const ax = x + 290, aw2 = 236;
  for (let s = 0; s < 6; s++) shape([[ax + s * aw2 / 6, -470], [ax + (s + 1) * aw2 / 6, -470], [ax + (s + 1) * aw2 / 6 + 8, -400], [ax + s * aw2 / 6 + 8, -400]], { fill: { [aw[s % 2]]: 1 }, line: 4, sharp: true, seed: 140 + i * 6 + s });
  // shop window
  rect(ax, -390, aw2, 300, { fill: { paper: 1, yellow: 0.45 }, line: 5, seed: 150 + i });
  for (let g = 0; g < 3; g++) ellipse(ax + 46 + g * 72, -128, 30, 22, { fill: { pink: 0.7, yellow: 0.6 }, line: 4, seed: 160 + i * 3 + g });
  // door
  const d = doorOf(i), open = (o.doors && o.doors[i]) || 0;
  const r = door(d.x, d.w, d.h, open, (o.doorFill && o.doorFill[i]) || { blue: 1 }, 170 + i * 10);
  if (o.bells) bell(d.x + d.w / 2, -d.h - 16, (o.ring && o.ring[i]) || 0, o.t || 0);
  if (o.cobwebs && o.cobwebs[i]) { cobweb(d.x - 16, -d.h - 16, 1); cobweb(d.x + d.w + 16, -d.h - 16, -1); }
  return r;
}
/** draw shops from x0 to x1 (world) plus the pavement and road */
export function street(x0, x1, o = {}) {
  layer(1);
  const i0 = Math.floor(x0 / BW) - 1, i1 = Math.ceil(x1 / BW) + 1;
  for (let i = i0; i <= i1; i++) building(i, o);
  ground(x0 - BW, x1 + BW, o);
}
export function ground(x0, x1, o = {}) {
  rect(x0, 0, x1 - x0, 70, { fill: { yellow: 0.3, pink: 0.12 }, line: 5, seed: 200, n: 4 });
  for (let x = Math.floor(x0 / 160) * 160; x < x1; x += 160) curve([[x, 4], [x - 10, 66]], 3, { seed: 201 + (x / 160 | 0) % 9 });
  rect(x0, 70, x1 - x0, 520, { fill: { blue: 0.55, pink: 0.1 }, line: 5, seed: 210, n: 4 });
  for (let x = Math.floor(x0 / 260) * 260; x < x1; x += 260) rect(x, 290, 140, 18, { fill: { paper: 1 }, line: 0, seed: 211 + (x / 260 | 0) % 9 });
  rect(x0, 590, x1 - x0, 2600, { fill: { yellow: 0.32, pink: 0.14 }, line: 5, seed: 212, n: 4 });
  rect(x0, 590, x1 - x0, 40, { fill: { paper: 1, blue: 0.2 }, line: 5, seed: 213, n: 4 });
  for (let x = Math.floor(x0 / 200) * 200; x < x1; x += 200) curve([[x, 630], [x - 40, 1400]], 3, { seed: 214 + (x / 200 | 0) % 9 });
  for (let x = Math.floor(x0 / 1400) * 1400 + 300; x < x1; x += 1400) { tube([[x, 640], [x, 120]], 14, { blue: 1 }, { seed: 215 }); ellipse(x, 100, 34, 40, { fill: { yellow: 1, paper: 1 }, line: 5, seed: 216 }); }
}
export function cobweb(x, y, s = 1, k = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * k, k);
  for (let a = 0; a < 5; a++) curve([[0, 0], [Math.cos(a * 0.36) * 120, Math.sin(a * 0.36) * 120]], 2.5, { seed: 220 + a });
  for (let r = 1; r < 4; r++) { const pts = []; for (let a = 0; a < 5; a++) pts.push([Math.cos(a * 0.36) * r * 34, Math.sin(a * 0.36) * r * 34 + 6]); curve(pts, 2.5, { seed: 230 + r }); }
  ctx.restore();
}
export function tumbleweed(x, y, r, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ellipse(0, 0, r, r, { fill: { yellow: 0.55, pink: 0.2 }, line: 4, seed: 240 });
  for (let i = 0; i < 7; i++) curve([[Math.cos(i) * r * 0.9, Math.sin(i) * r * 0.9], [Math.cos(i + 2.4) * r * 0.7, Math.sin(i + 2.4) * r * 0.7], [Math.cos(i + 4) * r * 0.4, Math.sin(i + 4) * r * 0.4]], 3, { seed: 241 + i });
  ctx.restore();
}

// ---------- props ----------
export function car(x, y, s = 1, doorOpen = 0, fill = { pink: 1 }) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape([[-300, -60], [-290, -150], [-170, -170], [-110, -290], [120, -290], [190, -170], [290, -150], [300, -60]], { fill, line: 6, seed: 300 });
  shape([[-90, -270], [-140, -178], [-6, -178], [-6, -270]], { fill: { paper: 1, blue: 0.35 }, line: 5, seed: 301 });
  shape([[10, -270], [10, -178], [160, -178], [106, -270]], { fill: { paper: 1, blue: 0.35 }, line: 5, seed: 302 });
  rect(-300, -90, 600, 26, { fill: { paper: 1, yellow: 0.3 }, line: 4, seed: 303 });
  [-180, 180].forEach((wx, i) => { ellipse(wx, -50, 62, 62, { fill: { line: 1 }, line: 5, seed: 304 + i }); ellipse(wx, -50, 26, 26, { fill: { paper: 1 }, line: 4, seed: 306 + i }); });
  ellipse(286, -130, 18, 22, { fill: { yellow: 1 }, line: 4, seed: 308 });
  // the door (hinged at its front edge, swings toward the camera)
  const a = doorOpen * 1.2, c = Math.cos(a), dw = 150 * c;
  shape([[10, -270], [10 - dw, -280 - Math.sin(a) * 20], [10 - dw, -70 + Math.sin(a) * 14], [10, -70]], { fill: doorOpen > 0.05 ? fill : {}, line: 5, sharp: true, seed: 309, knock: doorOpen > 0.05 });
  if (doorOpen > 0.05) rect(-150, -170, 156, 98, { fill: { line: 0.85 }, line: 4, seed: 310 });
  ctx.restore();
}
export function fridge(x, y, s = 1, open = 0, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rect(-130, -620, 260, 620, { fill: { paper: 1, blue: 0.15 }, line: 6, seed: 320 });
  if (open > 0.05) {
    rect(-112, -600, 224, 580, { fill: { yellow: 0.55, paper: 1 }, line: 4, seed: 321 });
    for (let k = 0; k < 3; k++) { curve([[-110, -460 + k * 150], [110, -460 + k * 150]], 4, { seed: 322 + k }); ellipse(-50 + k * 40, -490 + k * 150, 28, 24, { fill: [{ pink: 1 }, { blue: 0.6, yellow: 0.6 }, { yellow: 1 }][k], line: 4, seed: 325 + k }); }
    ctx.save(); ctx.globalAlpha = 0.35 * open; inks(new Path2D('M-112 -600 L-260 0 L260 0 L112 -600Z'), { yellow: 0.5 }); ctx.restore();
  }
  const a = open * 1.4, c = Math.cos(a), dw = 260 * c;
  shape([[-130, -620], [-130 + dw, -630 - Math.sin(a) * 30], [-130 + dw, 10 + Math.sin(a) * 30], [-130, 0]], { fill: { paper: 1, pink: 0.18 }, line: 6, sharp: true, seed: 330 });
  if (c > 0.3) { rect(-130 + dw - 46, -440, 18, 140, { fill: { blue: 1 }, line: 4, seed: 331 }); ellipse(-130 + dw * 0.4, -540, 22, 22, { fill: { pink: 1 }, line: 4, seed: 332 }); ellipse(-130 + dw * 0.6, -510, 18, 18, { fill: { yellow: 1 }, line: 4, seed: 333 }); }
  ctx.restore();
}
export function house(x, y, s = 1, doorOpen = 0, name = 'ARTHUR & MABEL') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rect(-420, -620, 840, 620, { fill: { pink: 0.4, yellow: 0.25 }, line: 6, seed: 340 });
  shape([[-480, -600], [0, -960], [480, -600]], { fill: { blue: 1 }, line: 6, sharp: true, seed: 341 });
  [-280, 280].forEach((wx, i) => { rect(wx - 90, -500, 180, 170, { fill: { paper: 1, blue: 0.35 }, line: 5, seed: 342 + i }); curve([[wx, -500], [wx, -330]], 4, { seed: 344 }); curve([[wx - 90, -415], [wx + 90, -415]], 4, { seed: 345 }); });
  door(-95, 190, 400, doorOpen, { yellow: 1 }, 350);
  rect(-190, 0, 380, 30, { fill: { paper: 1, yellow: 0.3 }, line: 5, seed: 360 });
  // mailbox
  rect(470, -260, 26, 260, { fill: { line: 0.8 }, line: 4, seed: 361 });
  shape([[410, -360], [560, -360], [560, -260], [410, -260]], { fill: { pink: 1 }, line: 5, sharp: true, seed: 362 });
  text(name, 485, -310, 22, { col: 'paper' });
  ctx.restore();
}
/** revolving door, seen from the front: four glass wings rotating (angle a) inside a drum */
export function revolving(x, y, s = 1, a = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rect(-300, -620, 600, 620, { fill: { line: 0.85, blue: 0.3 }, line: 6, seed: 370 });
  shape([[-330, -620], [-300, -700], [300, -700], [330, -620]], { fill: { yellow: 1 }, line: 6, sharp: true, seed: 371 });
  const wings = [];
  for (let k = 0; k < 4; k++) { const th = a + k * Math.PI / 2; wings.push({ x: Math.sin(th) * 280, z: Math.cos(th) }); }
  wings.sort((p, q) => p.z - q.z).forEach((wg, k) => {
    const alpha = wg.z > 0 ? 1 : 0.5;
    ctx.save(); ctx.globalAlpha = alpha; shape([[0, -610], [wg.x, -600], [wg.x, -10], [0, -10]], { fill: { paper: 0.6, blue: 0.35 }, line: 5, sharp: true, seed: 372 + k }); ctx.restore();
  });
  curve([[0, -620], [0, 0]], 7, { seed: 377 });
  ctx.restore();
}
export function revolvingFrame(x, y, s = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); rect(-330, -620, 30, 620, { fill: { yellow: 1 }, line: 5, seed: 378 }); rect(300, -620, 30, 620, { fill: { yellow: 1 }, line: 5, seed: 379 }); ctx.restore(); }
/** elevator doors in a wall: gap 0 shut → 1 open; floor number on top */
export function elevator(x, y, s = 1, gap = 1, floor = '9', arrow = 0, inside = null) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rect(-260, -640, 520, 640, { fill: { line: 0.85, yellow: 0.3 }, line: 6, seed: 380 });
  if (inside) { ctx.save(); const p = new Path2D(); p.rect(-240, -620, 480, 620); ctx.clip(p); inside(); ctx.restore(); }
  const half = 240 * (1 - gap);
  rect(-240, -620, half, 620, { fill: { paper: 1, blue: 0.45 }, line: 6, seed: 381 });
  rect(240 - half, -620, half, 620, { fill: { paper: 1, blue: 0.45 }, line: 6, seed: 382 });
  rect(-300, -660, 600, 40, { fill: { paper: 1, pink: 0.3 }, line: 6, seed: 383 });
  rect(-80, -790, 160, 110, { fill: { line: 1 }, line: 6, seed: 384 });
  text(floor, -10, -735, 82, { col: 'pink' });
  if (arrow) shape([[52, -760 + (arrow > 0 ? 0 : 50)], [70, -760 + (arrow > 0 ? 40 : 10)], [34, -760 + (arrow > 0 ? 40 : 10)]], { fill: { yellow: 1 }, line: 0, sharp: true, seed: 385 });
  ctx.restore();
}
export function clock(x, y, r, a) {
  ellipse(x, y, r, r, { fill: { paper: 1, yellow: 0.3 }, line: 6, seed: 390 });
  for (let k = 0; k < 12; k++) curve([[x + Math.sin(k * 0.524) * r * 0.82, y - Math.cos(k * 0.524) * r * 0.82], [x + Math.sin(k * 0.524) * r * 0.92, y - Math.cos(k * 0.524) * r * 0.92]], 4, { seed: 391 });
  curve([[x, y], [x + Math.sin(a) * r * 0.75, y - Math.cos(a) * r * 0.75]], 7, { seed: 392 });
  curve([[x, y], [x + Math.sin(a / 12) * r * 0.5, y - Math.cos(a / 12) * r * 0.5]], 9, { seed: 393 });
}
/** a rubber stamp hit: big tilted text in a box */
export function stamp(str, x, y, size, k = 1, rot = -0.12, ink = 'pink') {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); const sc = lerp(2.2, 1, clamp(k)); ctx.scale(sc, sc); ctx.globalAlpha = clamp(k * 2);
  ctx.font = `900 ${size}px Inter`; const w = ctx.measureText(str).width;
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = INK[ink]; ctx.lineWidth = size * 0.09; ctx.strokeRect(-w / 2 - size * 0.3, -size * 0.75, w + size * 0.6, size * 1.5);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = clamp(k * 2); text(str, x, y + size * 0.04, size * lerp(2.2, 1, clamp(k)), { col: ink, rot }); ctx.restore();
}
export function speedLines(x, y, w, h, dir = 1, n = 7, t = 0) {
  for (let i = 0; i < n; i++) { const yy = y + (i + 0.5) * h / n, l = w * (0.4 + hash(i, BOIL) * 0.6), xx = x + hash(i + 3, BOIL) * w * 0.3 * dir; curve([[xx, yy], [xx - l * dir, yy]], 5, { seed: 400 + i }); }
}
export function burst(x, y, r, k = 1, fill = { yellow: 1 }) {
  const pts = []; for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, rr = (i % 2 ? 0.62 : 1) * r * k; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  shape(pts, { fill, line: 6, sharp: true, seed: 410 });
}
export function heart(x, y, s, fill = { pink: 1 }) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); shape([[0, 30], [-40, -6], [-34, -34], [-12, -38], [0, -20], [12, -38], [34, -34], [40, -6]], { fill, line: 5, seed: 420 }); ctx.restore(); }
export function dust(x, y, k, seed = 0) { for (let i = 0; i < 4; i++) { const r = 18 + i * 6; ellipse(x - i * 26 * k - 10, y - 10 - hash(i, seed) * 20, r * (1 - k * 0.4), r * (1 - k * 0.4), { fill: { paper: 1, yellow: 0.2 }, line: 4, seed: 430 + i }); } }
