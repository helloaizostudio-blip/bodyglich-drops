// Channel branding in the same riso-boil engine: ?a=avatar | banner | watermark
import { setCtx, ctx } from './core/lib.js';
import { INK, setBoil, paper, finish, shape, ellipse, text, inks, curve } from './core/riso.js';
import { grandpa, grandma, kid } from './core/chars.js';
import * as S from './core/sets.js';
const a = new URLSearchParams(location.search).get('a') || 'avatar';
const SIZE = { avatar: [1080, 1080], banner: [2560, 1440], watermark: [300, 300], thumb: [1080, 1920] }[a];
const cv = document.getElementById('cv'); cv.width = SIZE[0]; cv.height = SIZE[1]; setCtx(cv.getContext('2d'));
function title(str, x, y, size, rot = -0.04) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `900 ${size}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = `${size * 0.02}px`;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = INK.blue; ctx.fillText(str, size * 0.07, size * 0.06);
  ctx.fillStyle = INK.pink; ctx.fillText(str, -size * 0.03, -size * 0.02);
  ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.07; ctx.strokeStyle = INK.line; ctx.strokeText(str, 0, 0);
  ctx.fillStyle = INK.yellow; ctx.fillText(str, 0, 0); ctx.restore();
}
function burst(x, y, r, fill, n = 28) { const p = []; for (let i = 0; i < n; i++) { const t = i * Math.PI * 2 / n, rr = (i % 2 ? 0.7 : 1) * r; p.push([x + Math.cos(t) * rr, y + Math.sin(t) * rr]); } shape(p, { fill, line: 7, sharp: true, seed: 3 }); }
(async () => {
  await document.fonts.load('900 100px Inter');
  setBoil(1.3); paper();
  if (a === 'avatar' || a === 'watermark') {
    const k = SIZE[0] / 1080;
    ctx.save(); ctx.scale(k, k);
    burst(540, 540, 620, { pink: 1 }, 32); ellipse(540, 540, 360, 360, { fill: { yellow: 1 }, line: 8, n: 30, seed: 4 });
    grandpa(520, 560 + 420 * 3.1, 3.1, { f: 1, age: 1, mood: 'happy', armR: [10, 10], armL: [10, 10] });
    ctx.restore();
  } else if (a === 'banner') {
    // YouTube banner: everything important inside the centre 1546 x 423 safe area
    ctx.save(); inks(new Path2D('M0 0H2560V1440H0Z'), { yellow: 0.22 }); ctx.restore();
    Object.assign(S.CAM, { x: 0, y: 0, z: 0.7, r: 0, sx: 740, sy: 100 });
    S.street(-2200, 2200, { doors: { '-2': 1, 1: 1 }, bells: true });
    grandpa(-880, 0, 0.95, { f: 1, age: 1, mood: 'happy', armR: [96, 8] });
    grandma(880, 0, 0.95, { f: -1, age: 1, mood: 'happy', armR: [96, 8] });
    kid(1480, 0, 0.85, { f: -1, mood: 'smug' });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    burst(1280, 700, 340, { pink: 1, yellow: 0.3 }, 30);
    title('MISPRINT', 1280, 660, 210);
    ctx.save(); ctx.translate(1280, 800); ctx.rotate(-0.04); ctx.fillStyle = INK.paper; ctx.strokeStyle = INK.line; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(-450, -46, 900, 92, 12); ctx.fill(); ctx.stroke(); ctx.restore();
    text('my family is a little misprinted', 1280, 800, 54, { col: 'line', rot: -0.04 });
  }
  finish();
  window.DONE = cv.toDataURL('image/png');
})().catch((e) => { window.ERR = String(e.stack || e); });
