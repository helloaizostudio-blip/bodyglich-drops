// WHAT YOUR BODY DOES 200 BILLION TIMES A DAY (Body Glitch, host v2 + shape-shifting Blip)
// A count-per-day countdown. Cold open: the racing heart, Blip blinking at time-lapse speed and the bone marrow
// pouring out red cells, under "200 BILLION TIMES A DAY". #4 swallow (600), #3 blink (15,000), #2 breathe (20,000),
// #1 heartbeat (100,000). Twist: the bone marrow makes 200 billion red blood cells a day, and a live counter shows
// how many you've made since the video started. No outro: it loops to the hook.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Le, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host } from './core/host.js';
import { Shifter } from './core/shift.js';
import { studio } from './core/studio.js';
import { bump, popIn } from './core/motion.js';
import { pill, label } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const YEL = '#FFD43B', RED = '#FF4D4D', DARK = 'rgba(12,14,20,0.82)';
const along = (pts, k) => { const x = clamp(k) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x)); return pts[i].clone().lerp(pts[i + 1], x - i); };
const fmt = (n) => Math.round(n).toLocaleString('en-US');

/** pulsing red ring with a "?" */
function mystery(x, y, k, t) {
  if (k <= 0.01) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); const p = 1 + 0.08 * Math.sin(t * 9);
  ctx.beginPath(); ctx.arc(0, 0, 90 * p, 0, 7); ctx.lineWidth = 14; ctx.strokeStyle = RED; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 125 * p + 12 * ((t * 1.6) % 1), 0, 7); ctx.lineWidth = 6; ctx.globalAlpha = 1 - ((t * 1.6) % 1); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.font = '900 124px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 22; ctx.strokeStyle = '#111'; ctx.strokeText('?', 0, 6); ctx.fillStyle = RED; ctx.fillText('?', 0, 6); ctx.restore();
}
/** odometer: a big number that rolls up to n between t0 and t1, with "/ DAY" under it */
function counter(t, n, t0, t1, col = '#FFFFFF', unit = 'TIMES A DAY', y = 1150) {
  if (t < t0) return; const k = eio(seg(t, t0, t1)), v = n * k, pk = popIn(t - t0), done = t > t1 ? bump(seg(t, t1, t1 + 0.35)) : 0;
  pill(fmt(v), 540, y, pk * (1 + 0.07 * done), col, DARK, 104);
  pill(unit, 540, y + 120, pk, '#111', YEL, 40);
}

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.8, vignette: 0.4, warm: 0.015, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['xray'] });
  ST.scene.add(host.group, blip.group); host.group.position.set(-0.25, 0, 0);
  const BX = 0.33, BZ = 0.12, END = T.dur;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_SW = Wd('swallow', 2), T_BL = Wd('blink', 3), T_15 = Wd('fifteen', 3), T_BR = Wd('breathe', 4), T_20 = Wd('twenty', 4);
  const T_HT = Wd('heart', 5), T_100 = Wd('hundred', 5), T_MAR = Wd('bone', 6), T_200 = Wd('two', 6), T_RBC = Wd('red', 6), T_2M = Wd('million', 6), T_SEC = Wd('second', 6), T_50 = Wd('fifty', 7);
  const PLAN = [
    { t: -5, form: 'xray' },
    { t: L(3) - 0.08, form: 'blip', charge: 0.12 },
    { t: L(4) - 0.08, form: 'xray', charge: 0.12 },
  ];
  Shifter.cues(PLAN.slice(1), cue);

  // the countdown strip: the last slot stays "???" until the twist
  const RANK = [{ n: 4, name: 'SWALLOW', t: L(2) }, { n: 3, name: 'BLINK', t: L(3) }, { n: 2, name: 'BREATHE', t: L(4) }, { n: 1, name: 'HEARTBEAT', t: L(5) }, { n: 0, name: 'BLOOD CELLS', t: T_RBC }];
  let QUIET = false;
  function ladder(t) {
    if (QUIET) return;
    const w = 200, h = 76, gap = 8, x0 = (W - (5 * w + 4 * gap)) / 2, y = 150;
    RANK.forEach((r, i) => {
      const on = t >= r.t - 0.04, last = r.n === 0, active = on && (i === 4 || t < RANK[i + 1].t - 0.04), k = on ? popIn(t - r.t + 0.04) : 1;
      ctx.save(); ctx.translate(x0 + i * (w + gap) + w / 2, y); ctx.scale(k, k);
      ctx.fillStyle = last ? (on ? RED : 'rgba(60,8,12,0.85)') : active ? YEL : on ? 'rgba(12,14,20,0.86)' : 'rgba(12,14,20,0.55)';
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 22); ctx.fill();
      if (last && !on) { ctx.lineWidth = 5; ctx.strokeStyle = `rgba(255,77,77,${0.55 + 0.45 * Math.sin(t * 7)})`; ctx.stroke(); }
      ctx.font = on ? '900 26px Inter' : '900 34px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = last ? '#FFFFFF' : active ? '#111' : on ? '#FFFFFF' : 'rgba(255,255,255,0.8)';
      ctx.fillText(on ? r.name : last ? '???' : `#${r.n}`, 0, 2); ctx.restore();
    });
  }
  const rankNo = (t, n, at) => QUIET ? 0 : pill(`#${n}`, 150, 330, popIn(t - at) * (1 + 0.06 * bump(seg(t, at, at + 0.35))), '#111', YEL, 96);
  RANK.slice(0, 4).forEach((r) => cue(r.t - 0.02, 'pop', { gain: 0.8 }));

  // ── x-ray extras ──────────────────────────────────────────────────────────
  const FX = blip.forms.xray, XH = FX.human, XW = (v) => XH.spine.localToWorld(v.clone());
  const airM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#BFF3FF').multiplyScalar(1.4) });
  const foodM = new THREE.MeshPhysicalMaterial({ color: '#F2B045', emissive: '#F29A20', emissiveIntensity: 1.3, roughness: 0.4, clearcoat: 0.6 });
  const bolus = new THREE.Mesh(new THREE.SphereGeometry(0.034, 20, 14), foodM); bolus.castShadow = false; bolus.renderOrder = 10; foodM.depthTest = false; XH.spine.add(bolus);
  const GULLET = [V3(0, 0.66, 0.11), V3(0, 0.6, 0.02), V3(0, 0.52, -0.03), V3(0, 0.44, -0.03), V3(0, 0.39, 0.0), V3(0.02, 0.33, 0.03), V3(0.03, 0.22, 0.04)];
  const AIRIN = (sd) => [V3(0, 0.665, 0.13), V3(0, 0.62, 0.06), V3(0, 0.545, 0.03), V3(0, 0.47, 0.02), V3(sd * 0.07, 0.38, 0.01)];
  // bone marrow: a glowing red core inside the right thigh bone
  const HIP = XH.leg.R.hip, femur = HIP.children.find((m) => m.geometry?.type === 'CapsuleGeometry');
  const marrowM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF2A3A').multiplyScalar(1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const marrow = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.3, 6, 10), marrowM); marrow.position.copy(femur.position); HIP.add(marrow);
  // red blood cells: little discs in world space so they can flow out of the leg and all through the body
  const cellM = new THREE.MeshStandardMaterial({ color: '#E3202E', emissive: '#C0101C', emissiveIntensity: 0.9, roughness: 0.4 }), cellG = new THREE.CylinderGeometry(1, 1, 0.42, 16), cells = [];
  for (let i = 0; i < 90; i++) { const c = new THREE.Mesh(cellG, cellM); c.scale.setScalar(0.011 + 0.005 * hash(i)); c.castShadow = false; c.visible = false; ST.scene.add(c); cells.push(c); }
  const loops = () => {                                                                                // blood loops around the body, in world space
    const H = XW(V3(0.025, 0.36, 0.06)), up = (x) => [H, XW(V3(x * 0.2, 0.43, 0.03)), XH.arm[x < 0 ? 'L' : 'R'].el.localToWorld(V3(0, -0.02, 0.02)), XH.arm[x < 0 ? 'L' : 'R'].el.localToWorld(V3(0, -0.3, 0.02))];
    const dn = (s) => [H, XW(V3(0, 0.1, 0.07)), XH.leg[s < 0 ? 'L' : 'R'].hip.localToWorld(V3(0, -0.2, 0.03)), XH.leg[s < 0 ? 'L' : 'R'].kn.localToWorld(V3(0, -0.3, 0.03))];
    return [up(-1), up(1), dn(-1), dn(1), [H, XH.head.localToWorld(V3(0, 0.05, 0.06)), XH.head.localToWorld(V3(0, 0.18, 0.02))]];
  };
  const fromMarrow = () => [HIP.localToWorld(V3(0, -0.28, 0.0)), HIP.localToWorld(V3(0, -0.15, 0.0)), HIP.localToWorld(V3(0, -0.02, 0.02)), XW(V3(0, 0.05, 0.08)), XW(V3(0.01, 0.2, 0.08)), XW(V3(0.025, 0.36, 0.06))];

  // per-shot animation of the x-ray body
  const ph = (u, f0, f1, d) => 2 * Math.PI * (f0 * u + (f1 - f0) * u * u / (2 * d));               // phase of a rhythm that speeds up from f0 to f1 Hz over d s
  function swallow(t, f) {
    const gulps = [T_SW - 0.05, T_SW + 0.85, T_SW + 1.6, Le(2) - 0.35].filter((g) => g < cut(3) + 0.3); let vis = false;
    for (const g of gulps) { const k = (t - g) / 0.8; if (k > 0 && k < 1) { vis = true; bolus.position.copy(along(GULLET, eio(k))); bolus.scale.set(1 - 0.2 * bump(k), 1 + 0.35 * bump(k), 1 - 0.2 * bump(k)); } }
    bolus.visible = vis;
  }
  function breathe(t, f) {
    const u = Math.max(0, t - T_BR + 0.3), p = ph(u, 0.6, 3.2, Le(4) - T_BR + 0.3), b = 0.5 + 0.5 * Math.sin(p - 1.57);
    f.lungs.forEach((l) => l.scale.setScalar(1 + 0.24 * b));
    const dir = Math.cos(p - 1.57) > 0 ? 1 : -1;                                                        // inhaling: air flows in; exhaling: out
    f.gas.forEach((g, i) => { if (i >= 30) { g.visible = false; return; } const k = (((t * (1.2 + u * 0.5)) + i / 30) % 1), kk = dir > 0 ? k : 1 - k; g.visible = t > T_BR - 0.3; g.material = airM; g.position.copy(along(AIRIN(i % 2 ? 1 : -1), kk)); g.scale.setScalar(1.1 * Math.sin(k * Math.PI)); });
  }
  function heart(t, f, t0, f0 = 1.2, f1 = 6, d = 3) {
    const u = Math.max(0, t - t0), p = ph(Math.min(u, d), f0, f1, d) + (u > d ? 2 * Math.PI * f1 * (u - d) : 0), beat = Math.pow(Math.max(0, Math.sin(p)), 5) + 0.5 * Math.pow(Math.max(0, Math.sin(p - 0.8)), 5);
    f.heart.scale.setScalar(1.15 + beat * 0.38); f.heart.material.emissiveIntensity = 0.4 + beat * 0.9;
    return beat;
  }
  function cellsFlow(t, mode) {
    cells.forEach((c, i) => {
      if (mode === 'marrow') { const k = ((t - T_MAR) * (0.5 + 0.5 * eo(seg(t, T_200, T_SEC))) * 0.9 + hash(i) ) % 1, on = t > T_MAR - 0.1 && (t - T_MAR) * 0.9 > hash(i) * 0.6; c.visible = on; if (!on) return; const p = along(fromMarrow(), k); p.x += (hash(i + 3) - 0.5) * 0.03; p.z += (hash(i + 5) - 0.5) * 0.03; c.position.copy(p); }
      else if (mode === 'body') { const ls = loops(), path = ls[i % ls.length], k = (t * 0.55 + hash(i)) % 1; c.visible = true; const p = along(path, k); p.x += (hash(i + 3) - 0.5) * 0.025; p.z += (hash(i + 5) - 0.5) * 0.025; c.position.copy(p); }
      else c.visible = false;
      c.rotation.set(t * 3 + i, t * 2 + i * 0.7, 0);
    });
  }

  /** one frame */
  function show(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = o.turn ?? 0;
    const lidF = o.blink ? (() => { const u = Math.max(0, t - T_BL + 0.2), p = ph(u, 1.2, 9, Le(3) - T_BL + 0.2); return clamp((Math.sin(p) - 0.2) * 2.2); })() : 0;
    const s = blip.update(t, PLAN, { blip: { y: 0, squash: Math.sin(t * 2.4) * 0.02, tilt: [0, 0], armL: 14, armR: 14, lean: 0, lid: lidF, look: [0, 0.15], smile: 0.9, mouth: 0, glow: 1.6 } }), f = blip.current;
    blip.flash.material.opacity *= o.flashK ?? 1; blip.light.intensity *= o.flashK ?? 1;
    if (o.flashK != null) { blip.flash.visible = false; blip.ring.material.opacity *= 0.5; f.mats.forEach((m) => { if (!m.uniforms && m.emissive) m.emissiveIntensity *= 0.25 + 0.75 * o.flashK; }); }
    bolus.visible = false; marrow.visible = false; cellsFlow(t, s.form === 'xray' ? o.cells : null);
    if (s.form === 'xray') {
      f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gut.visible = false; f.kidneys.forEach((k) => (k.visible = false));
      f.gas.forEach((g) => (g.visible = false)); f.xm.uniforms.uS.value *= o.dim ?? 1;
      if (o.fx === 'swallow') swallow(t, f);
      if (o.fx === 'breathe') breathe(t, f);
      if (o.fx === 'heart') heart(t, f, L(5) - 0.1, 1.2, 6.5, 2.6);
      if (o.fx === 'marrow' || o.fx === 'body') { marrow.visible = true; marrowM.opacity = 0.6 + 0.35 * Math.sin(t * 9); heart(t, f, 0, 1.4, 1.4, 1); }
      blip.group.updateMatrixWorld(true);
    }
    ST.setMood(s.xray);
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), tgt = V3(BX, f.cy * 1.25, BZ), shake = s.kick + (o.shake || 0);
    pos.lerp(tgt, s.kick * 0.08); at.lerp(tgt, s.kick * 0.3);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + s.flash * 0.2 + s.xray * 0.2, bloomThreshold: lerp(0.8, 0.5, s.xray), ...(o.look || {}) });
    return s;
  }
  const FULL = (k) => ({ pos: lerpV(V3(BX + 0.12, 0.92, BZ + 3.05), V3(BX + 0.08, 0.9, BZ + 2.7), k), at: V3(BX, 0.76, BZ) });

  // 1 · cold open: the racing heart, a blink storm, the marrow pouring cells, under the promise; then the question
  const M_END = L(1) - 0.12, MONT = [['S05', T_100 + 0.2, 5], ['S03', T_15, 3], ['S06', T_2M, 6]], NM = MONT.length;
  function banner(t) { pill('200 BILLION', 540, 300, 1 + 0.03 * Math.sin(t * 9), '#111', YEL, 104); pill('TIMES A DAY', 540, 445, 1, '#FFFFFF', 'rgba(190,16,24,0.95)', 70); }
  add({ id: 'S00', at: 0, note: 'cold open: heart racing, Blip blinking at time-lapse speed, marrow pouring red cells; banner "200 BILLION TIMES A DAY" from frame one', draw(lt, d, t, blit) {
    const step = M_END / NM, n = Math.min(NM - 1, Math.floor(t / step)), [id, t0, li] = MONT[n], sh = S.find((x) => x.id === id), tt = t0 + (t - n * step);
    QUIET = true; sh.draw(tt - sh.at, cut(li + 1) - cut(li), tt, blit); QUIET = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ladder(t); banner(t);
  } });
  add({ id: 'S01', at: M_END, note: 'x-ray body dims, red "?" over the chest; "CAN YOU GUESS?"', draw(lt, d, t, blit) {
    show(t, { pos: lerpV(V3(BX + 0.1, 0.98, BZ + 2.5), V3(BX + 0.06, 0.98, BZ + 2.1), eio(lt / d)), at: V3(BX, 0.84, BZ), dim: 0.6 }); blit();
    const [x, y] = screen(XW(V3(0, 0.3, 0.1)), cam); mystery(x, y, eob(seg(t, M_END, M_END + 0.3)), t);
    pill('CAN YOU GUESS?', 540, 1185, popIn(t - Wd('guess', 1)), '#111', YEL, 66);
    ladder(t); banner(t);
  } });
  cue(0.02, 'heartbeat', { dur: M_END / NM, gain: 0.9 }); cue(M_END / NM, 'whoosh'); cue(M_END / NM + 0.05, 'tock', { gain: 0.5 }); cue(M_END * 2 / NM, 'whoosh'); cue(M_END * 2 / NM + 0.05, 'bubbles', { dur: M_END / NM, gain: 0.6 });
  cue(M_END, 'thud', { gain: 0.8 }); cue(Wd('guess', 1), 'pop');

  // 2 · #4 swallow
  add({ id: 'S02', at: cut(2), note: 'x-ray head and chest from the side: a glowing bite slides down the throat into the stomach, again and again; counter to 600', draw(lt, d, t, blit) {
    show(t, { fx: 'swallow', pos: lerpV(V3(BX + 0.8, 1.16, BZ + 1.05), V3(BX + 0.64, 1.14, BZ + 0.88), eio(lt / d)), at: V3(BX + 0.04, 1.08, BZ + 0.04), focus: V3(BX, 1.0, BZ), turn: 0.75, flashK: 0.3, look: { aperture: 0.0016 } }); blit();
    rankNo(t, 4, RANK[0].t); counter(t, 600, T_SW, Le(2) - 0.1); ladder(t);
  } });
  cue(cut(2), 'whoosh'); [T_SW - 0.05, T_SW + 0.85, T_SW + 1.6, Le(2) - 0.35].forEach((g) => cue(g + 0.05, 'gulp', { gain: 0.9 }));

  // 3 · #3 blink
  add({ id: 'S03', at: cut(3), note: 'Blip himself, close: he blinks faster and faster (time-lapse), counter rolls to 15,000', draw(lt, d, t, blit) {
    show(t, { blink: true, pos: lerpV(V3(BX + 0.1, 0.42, BZ + 1.35), V3(BX + 0.06, 0.4, BZ + 1.1), eio(lt / d)), at: V3(BX, 0.33, BZ), focus: V3(BX, 0.33, BZ + 0.2), flashK: 0.15, look: { aperture: 0.0035 } }); blit();
    rankNo(t, 3, RANK[1].t); counter(t, 15000, T_BL, Le(3) - 0.1); ladder(t);
  } });
  for (let i = 0; i < 9; i++) cue(Wd('blink', 3) + i * (0.22 - i * 0.015), 'tock', { gain: 0.35 });

  // 4 · #2 breathe
  add({ id: 'S04', at: cut(4), note: 'x-ray chest: the lungs fill and empty faster and faster, air streams in and out; counter to 20,000', draw(lt, d, t, blit) {
    const k = eio(lt / d); show(t, { fx: 'breathe', flashK: 0.25, aim: () => { const c0 = XW(V3(0, 0.4, 0.0)); return { pos: lerpV(c0.clone().add(V3(0.2, 0.12, 1.15)), c0.clone().add(V3(0.13, 0.08, 0.92)), k), at: c0, focus: c0 }; }, look: { aperture: 0.0016 } }); blit();
    rankNo(t, 2, RANK[2].t); counter(t, 20000, T_BR, Le(4) - 0.1); ladder(t);
  } });
  cue(cut(4), 'whoosh'); cue(T_BR - 0.1, 'inhale', { dur: 1.0, gain: 0.7 }); cue(T_BR + 1.1, 'inhale', { dur: 0.6, gain: 0.5 });

  // 5 · #1 heartbeat
  add({ id: 'S05', at: cut(5), note: 'x-ray chest close on the heart: it beats faster and faster, counter to 100,000', draw(lt, d, t, blit) {
    const k = eio(lt / d); show(t, { fx: 'heart', aim: () => { const c0 = XW(V3(0.025, 0.36, 0.03)); return { pos: lerpV(c0.clone().add(V3(0.18, 0.08, 0.85)), c0.clone().add(V3(0.1, 0.05, 0.62)), k), at: c0, focus: c0 }; }, look: { aperture: 0.0016 } }); blit();
    rankNo(t, 1, RANK[3].t);
    const [x, y] = screen(XW(V3(0.03, 0.38, 0.07)), cam); label('HEART', 800, 520, x, y, eob(seg(t, T_HT - 0.15, T_HT + 0.15)));
    counter(t, 100000, T_HT, Le(5) - 0.1, YEL); ladder(t);
  } });
  cue(cut(5), 'whoosh'); cue(L(5), 'heartbeat', { dur: Le(5) - L(5) + 0.1, gain: 1.0 });

  // 6 · the twist: bone marrow
  add({ id: 'S06', at: cut(6), note: 'x-ray thigh and belly: the marrow glows red inside the thigh bone and pours a stream of red cells up to the heart; counter to 200 billion, then "2 MILLION / SECOND"', draw(lt, d, t, blit) {
    const k = eio(lt / d); show(t, { fx: 'marrow', cells: 'marrow', aim: () => { const c0 = HIP.localToWorld(V3(0, -0.06, 0)).lerp(XW(V3(0, 0.18, 0)), 0.35); return { pos: lerpV(c0.clone().add(V3(0.3, 0.1, 1.4)), c0.clone().add(V3(0.2, 0.06, 1.1)), k), at: c0, focus: c0 }; } }); blit();
    const [x, y] = screen(HIP.localToWorld(V3(0, -0.2, 0.02)), cam); label('BONE MARROW', 780, 1000, x, y, eob(seg(t, T_MAR - 0.1, T_MAR + 0.2)));
    if (t < T_2M - 0.1) counter(t, 200e9, T_200, T_RBC + 0.4, RED, 'RED BLOOD CELLS A DAY');
    else { pill('2,000,000', 540, 1150, popIn(t - T_2M + 0.1), RED, DARK, 104); pill('EVERY SECOND', 540, 1270, popIn(t - T_2M + 0.1), '#111', YEL, 40); }
    ladder(t);
  } });
  cue(cut(6), 'whoosh'); cue(T_MAR, 'sparkle', { dur: 1.2, gain: 0.6 }); cue(T_200, 'bubbles', { dur: Le(6) - T_200, gain: 0.6 }); cue(T_RBC, 'slam', { gain: 0.7 }); cue(T_2M, 'pop');

  // 7 · the live counter: how many you've made since the video started (loops into the hook)
  add({ id: 'S07', at: cut(7), note: 'x-ray full body: red cells stream everywhere; a live counter of cells made since the video started (2 million per second of runtime)', draw(lt, d, t, blit) {
    show(t, { fx: 'body', cells: 'body', ...FULL(eio(lt / d)) }); blit();
    pill('MADE SINCE YOU STARTED WATCHING', 540, 1040, popIn(t - L(7)), '#111', YEL, 38);
    pill(fmt(2e6 * t), 540, 1150, popIn(t - L(7)) * (1 + 0.04 * bump(seg(t, T_50, T_50 + 0.35))), RED, DARK, 104);
    ladder(t);
  } });
  cue(cut(7), 'whoosh'); cue(T_50, 'pop');

  return { shots: S, cues: CUES };
}
