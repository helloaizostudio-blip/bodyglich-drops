// THE FASTEST THING IN YOUR BODY (Body Glitch, host v2 + shape-shifting Blip)
// A speed countdown. Cold open: three payoff moments under "270 MPH INSIDE YOUR BODY", then "can you guess what?".
// #4 blood leaves the heart (3 mph), #3 a sneeze (10, not 100), #2 a cough (50), #1 nerve signals (270).
// Twist: aching pain rides slow nerves (2 mph), so a stubbed toe hurts a second late. No outro: it loops to the hook.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Le, Wd } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host } from './core/host.js';
import { Shifter } from './core/shift.js';
import { studio } from './core/studio.js';
import { track, drag, alive, addPose, breathe, mouthFor, spring, bump, wobble, blink, popIn } from './core/motion.js';
import { pill, label } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const YEL = '#FFD43B', RED = '#FF4D4D', GRN = '#4BE38A', DARK = 'rgba(12,14,20,0.82)';
const along = (pts, k) => { const x = clamp(k) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x)); return pts[i].clone().lerp(pts[i + 1], x - i); };

/** pulsing red ring with a "?" */
function mystery(x, y, k, t) {
  if (k <= 0.01) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); const p = 1 + 0.08 * Math.sin(t * 9);
  ctx.beginPath(); ctx.arc(0, 0, 90 * p, 0, 7); ctx.lineWidth = 14; ctx.strokeStyle = RED; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 125 * p + 12 * ((t * 1.6) % 1), 0, 7); ctx.lineWidth = 6; ctx.globalAlpha = 1 - ((t * 1.6) % 1); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.font = '900 124px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 22; ctx.strokeStyle = '#111'; ctx.strokeText('?', 0, 6); ctx.fillStyle = RED; ctx.fillText('?', 0, 6); ctx.restore();
}
/** speed readout: a bar that fills to the speed (so each one can be compared with 270) and a counting number */
function speedo(t, mph, t0, col = '#FFFFFF') {
  if (t < t0) return; const k = eo(seg(t, t0, t0 + 0.45)), n = Math.max(1, Math.round(mph * k)), x0 = 150, w = 780, y = 1080, a = Math.min(1, (t - t0) * 8);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(12,14,20,0.8)'; ctx.beginPath(); ctx.roundRect(x0 - 8, y - 20, w + 16, 40, 20); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x0, y - 12, Math.max(24, w * Math.sqrt(mph / 270) * k), 24, 12); ctx.fill(); ctx.restore();
  pill(`${n} MPH`, 540, 1185, popIn(t - t0) * (1 + 0.05 * bump(seg(t, t0 + 0.4, t0 + 0.75))), col, DARK, 88);
}
/** big comic word */
function comic(text, x, y, k, col = YEL, rot = -0.1, size = 170) {
  if (k <= 0.01) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); ctx.globalAlpha = Math.min(1, k * 2.2);
  ctx.font = `900 ${size}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 36; ctx.strokeStyle = '#111'; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0); ctx.restore();
}

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.8, vignette: 0.4, warm: 0.015, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.33, BZ = 0.12;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_270 = Wd('two', 0), T_3 = Wd('three', 2), T_SNZ = Wd('sneeze', 3), T_100 = Wd('hundred', 3), T_10 = Wd('ten', 3);
  const T_B = Wd('blasts', 4), T_50 = Wd('fifty', 4), T_N = Wd('nerve', 5), T_N270 = Wd('two', 5), T_SLOW = Wd('slow', 6), T_2 = Wd('two', 6);
  const T_STUB = Wd('stub', 7) + 0.12, T_ARR = Wd('second', 7);
  const PLAN = [
    { t: -5, form: 'xray' },                                         // already x-ray on frame one
    { t: L(3) - 0.08, form: 'human', charge: 0.12 },
    { t: L(4) - 0.08, form: 'xray', charge: 0.12 },
  ];
  Shifter.cues(PLAN.slice(1), cue);

  // the countdown strip: the #1 slot stays "???" until it is revealed
  const RANK = [{ n: 4, name: 'BLOOD', t: L(2) }, { n: 3, name: 'SNEEZE', t: L(3) }, { n: 2, name: 'COUGH', t: L(4) }, { n: 1, name: 'NERVES', t: T_N - 0.05 }];
  let QUIET = false;                                                // true while the cold open replays other shots
  function ladder(t) {
    if (QUIET) return;
    const w = 244, h = 80, gap = 10, x0 = (W - (4 * w + 3 * gap)) / 2, y = 150;
    RANK.forEach((r, i) => {
      const on = t >= r.t - 0.04, last = i === 3, active = on && (last || t < RANK[i + 1].t - 0.04), k = on ? popIn(t - r.t + 0.04) : 1;
      ctx.save(); ctx.translate(x0 + i * (w + gap) + w / 2, y); ctx.scale(k, k);
      ctx.fillStyle = active ? YEL : on ? 'rgba(12,14,20,0.86)' : last ? 'rgba(60,8,12,0.85)' : 'rgba(12,14,20,0.55)';
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 24); ctx.fill();
      if (last && !on) { ctx.lineWidth = 5; ctx.strokeStyle = `rgba(255,77,77,${0.55 + 0.45 * Math.sin(t * 7)})`; ctx.stroke(); }
      ctx.font = '900 36px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = active ? '#111' : on ? '#FFFFFF' : 'rgba(255,255,255,0.8)';
      ctx.fillText(on ? r.name : last ? '#1  ???' : `#${r.n}`, 0, 2); ctx.restore();
    });
  }
  const rankNo = (t, n, at) => QUIET ? 0 : pill(`#${n}`, 150, 330, popIn(t - at) * (1 + 0.06 * bump(seg(t, at, at + 0.35))), '#111', YEL, 96);
  RANK.forEach((r) => cue(r.t - 0.02, 'pop', { gain: 0.8 }));

  // ── the host (seen in the sneeze two-shot) ────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.6 };
  const act = track([
    { t: 0, pose: REST },
    { t: T_SNZ - 0.1, d: 0.3, pose: { ...REST, shL: [50, 0, 30], elL: 110, shR: [50, 0, 30], elR: 110, brow: [0.9, 0.3], lid: -0.3, smile: -0.4, mouth: 0.4, spine: [-8, 0, 0] } },   // hands up, flinches
    { t: T_100 + 0.3, d: 0.5, pose: REST },
  ]);

  // ── x-ray extras ──────────────────────────────────────────────────────────
  const FX = blip.forms.xray, XH = FX.human, HF = blip.forms.human;
  const airM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#BFF3FF').multiplyScalar(1.4) }), redM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#E0141E').multiplyScalar(1.15) }), painM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF3B3B').multiplyScalar(1.6) });
  const XW = (v) => XH.spine.localToWorld(v.clone());
  const BLOOD = [V3(0.025, 0.4, 0.07), V3(0.03, 0.47, 0.09), V3(0, 0.5, 0.1), V3(-0.02, 0.42, 0.1), V3(-0.01, 0.22, 0.1), V3(0, 0.02, 0.09)];
  const AIRUP = (sd, sp) => [V3(sd * 0.07, 0.38, 0.01), V3(0, 0.47, 0.02), V3(0, 0.545, 0.03), V3(0, 0.62, 0.06), V3(0, 0.665, 0.13), V3(sd * 0.05 * sp, 0.66 + 0.04 * sp, 0.5), V3(sd * 0.14 * sp, 0.6 + 0.1 * sp, 0.95)];
  const TRUNK = [V3(0, 0.75, -0.02), V3(0, 0.6, -0.06), V3(0, 0.43, -0.08)];
  const ARM = (s) => [...TRUNK, V3(s * 0.2, 0.43, -0.02), V3(s * 0.3, 0.15, 0), V3(s * 0.4, -0.13, 0.02)];
  const LEG = (s) => [...TRUNK, V3(0, 0.2, -0.08), V3(0, 0.0, -0.07), V3(s * 0.09, -0.05, 0), V3(s * 0.1, -0.5, 0.01), V3(s * 0.1, -0.95, 0.03)];
  const NERVES = [LEG(-1), LEG(1), ARM(-1), ARM(1)], PAINPATH = LEG(1).slice().reverse();
  const COUGHS = [T_B, T_B + 0.8];
  cue(T_B - 0.5, 'inhale', { dur: 0.45, gain: 0.7 }); COUGHS.forEach((c, i) => { cue(c, 'slam', { gain: 0.7 - 0.2 * i }); cue(c + 0.02, 'whoosh', { gain: 0.9 }); });

  function blood(t, f) {
    f.gas.forEach((b, i) => { if (i >= 32) { b.visible = false; return; } const k = (t * 0.6 + i / 32) % 1; b.visible = true; b.material = redM; const p = along(BLOOD, k); p.x += (hash(i) - 0.5) * 0.014; p.z += (hash(i + 7) - 0.5) * 0.014; b.position.copy(p); b.scale.setScalar(1.5 * Math.sin(Math.min(1, k * 8) * 1.57) * (1 - seg(k, 0.9, 1))); });
  }
  function cough(t, f) {
    const pre = eo(seg(t, T_B - 0.5, T_B - 0.05)), sq = COUGHS.reduce((m, c) => Math.max(m, t > c ? Math.exp(-(t - c) * 5) : 0), 0);
    f.lungs.forEach((l) => l.scale.setScalar(1 + 0.14 * pre * (t < T_B ? 1 : 0) - 0.16 * sq));
    f.gas.forEach((b, i) => { const c = COUGHS[i % 2], age = t - c - (i >> 1) * 0.012, k = age * 2.4; b.visible = age > 0 && k < 1; if (!b.visible) return; b.material = airM; b.position.copy(along(AIRUP(i % 4 < 2 ? 1 : -1, hash(i) * 2 - 0.6), k)); b.scale.setScalar((1 + hash(i + 3)) * (1 - seg(k, 0.8, 1))); });
    return sq;
  }
  function nerve(t, f, t0, skip = -1) {
    const on = t > t0; let pulse = 0;
    f.gas.forEach((b, i) => { const path = i % 4, k = ((t - t0) * 2.8 - (i >> 2) * 0.022 + path * 0.13) % 1; b.visible = on && path !== skip && (t - t0) * 2.8 + path * 0.13 > (i >> 2) * 0.022; if (!b.visible) return; b.material = f.sigM; b.position.copy(along(NERVES[path], k)); b.scale.setScalar((3.4 - (i >> 2) * 0.22) * (1 - seg(k, 0.93, 1))); if (k < 0.1) pulse = 1; });
    f.brain.material.emissive.set('#FFE680'); f.brain.material.emissiveIntensity = 0.3 + (on ? 1.2 + 0.5 * Math.sin(t * 40) : 0);
  }
  /** the slow pain dot: k 0 = at the toe, 1 = at the brain */
  function painDot(f, k, vis) {
    for (let j = 0; j < 6; j++) { const b = f.gas[1 + j * 4]; b.visible = vis; if (!vis) continue; b.material = painM; b.position.copy(along(PAINPATH, k - j * 0.012)); b.scale.setScalar(2.6 - j * 0.35); }
  }
  const painK = (t) => (t < L(7) - 0.1 ? 0.16 * eio(seg(t, T_SLOW - 0.2, L(7) - 0.2)) : t < T_STUB ? 0 : eio(seg(t, T_STUB, T_ARR)) * 0.985);

  // a block to stub the toe on
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: '#FFB020', emissive: '#FF8A00', emissiveIntensity: 0.5, roughness: 0.5 })); block.position.set(BX + 0.075, 0.06, BZ + 0.3); block.castShadow = true; ST.scene.add(block);
  // sneeze droplets
  const dropM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#E6FBFF').multiplyScalar(1.25), transparent: true }), drops = [];
  for (let i = 0; i < 44; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.011 + 0.01 * hash(i), 10, 8), dropM); d.visible = false; ST.scene.add(d); drops.push(d); }
  cue(T_SNZ - 0.45, 'inhale', { dur: 0.4, gain: 0.8 }); cue(T_SNZ, 'whoosh', { gain: 1.0 }); cue(T_SNZ + 0.02, 'slam', { gain: 0.6 });

  /** one frame: Blip + effect, extras, the host, mood, camera, render */
  function show(t, o) {
    const pre = blip.state(t, PLAN);
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = o.turn ?? 0;
    const s = blip.update(t, PLAN, {}), f = blip.current;
    blip.flash.material.opacity *= o.flashK ?? 1; blip.light.intensity *= o.flashK ?? 1;
    if (o.flashK != null) { blip.flash.visible = false; blip.ring.material.opacity *= 0.5; f.mats.forEach((m) => { if (!m.uniforms && m.emissive) m.emissiveIntensity *= 0.25 + 0.75 * o.flashK; }); }
    block.visible = o.fx === 'stub'; drops.forEach((d) => (d.visible = false));
    let shake = 0;
    if (s.form === 'xray') {
      f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gut.visible = false; f.kidneys.forEach((k) => (k.visible = false));
      f.lungs.forEach((l) => l.scale.setScalar(1 + Math.sin(t * 1.9) * 0.05)); f.brain.material.emissive.set('#F2A3C0'); f.xm.uniforms.uS.value *= o.dim ?? 1;
      if (o.fx === 'blood') blood(t, f);
      else if (o.fx === 'cough') shake = 0.6 * cough(t, f);
      else if (o.fx === 'nerve') { nerve(t, f, T_N); shake = t > T_N ? 0.25 + 0.5 * Math.exp(-(t - T_N) * 3) : 0; }
      else if (o.fx === 'pain') { nerve(t, f, L(6) - 1, 1); painDot(f, painK(t), t > T_SLOW - 0.25); f.brain.material.emissiveIntensity = 0.5; }
      else if (o.fx === 'stub') {
        const k1 = eo(seg(t, T_STUB - 0.22, T_STUB)), back = eo(seg(t, T_STUB + 0.05, T_STUB + 0.5)), hip = 30 * k1 * (1 - back), arr = t > T_ARR ? Math.exp(-(t - T_ARR) * 2.2) : 0;
        f.human.pose({ spine: [-6 * arr, 0, 0], head: [-3 - 14 * arr, 0, 0], shL: [4, 0, 20 + 30 * arr], shR: [4, 0, 20 + 30 * arr], elL: 16 + 40 * arr, elR: 16 + 40 * arr, hipR: [hip, 0, 2], knR: 4 + 10 * k1 * (1 - back) });
        f.gas.forEach((b) => (b.visible = false)); painDot(f, painK(t), t >= T_STUB);
        f.brain.material.emissive.set('#FF3030'); f.brain.material.emissiveIntensity = 0.3 + 2.2 * arr; f.face.set({ lid: t > T_ARR ? -0.35 : 0, look: [0, t > T_STUB && t < T_ARR ? -0.5 : 0] });
        shake = (t > T_STUB ? 0.7 * Math.exp(-(t - T_STUB) * 7) : 0) + 0.9 * arr * (t - T_ARR < 0.5 ? 1 : 0);
      } else f.gas.forEach((b) => (b.visible = false));
      blip.group.updateMatrixWorld(true);
    }
    if (s.form === 'human') {                                                                              // the sneeze
      const wind = eio(seg(t, T_SNZ - 0.5, T_SNZ - 0.06)) * (t < T_SNZ ? 1 : 0), snap = t > T_SNZ ? Math.exp(-(t - T_SNZ) * 3.2) * (1 - Math.exp(-(t - T_SNZ) * 40)) : 0, w = Math.sin(t * 2.2);
      f.human.pose({ spine: [-10 * wind + 24 * snap, w * 2, 0], head: [-26 * wind + 30 * snap - 3, 0, 0], shL: [6 + 30 * wind, 0, 12 + 30 * wind], shR: [6 + 30 * wind, 0, 12 + 30 * wind], elL: 24 + 60 * wind, elR: 24 + 60 * wind, knL: 14 * snap, knR: 14 * snap });
      f.face.set({ lid: wind > 0.3 || snap > 0.2 ? 0.9 : Math.max(0, blink(t, 3)), smile: snap > 0.1 ? -0.5 : 1 });
      blip.group.updateMatrixWorld(true);
      const ry = blip.group.rotation.y, fw = V3(Math.sin(ry), 0, Math.cos(ry)), side = V3(Math.cos(ry), 0, -Math.sin(ry)), m0 = f.human.head.localToWorld(V3(0, 0.06, 0.13));
      drops.forEach((d, i) => { const age = t - T_SNZ - hash(i) * 0.1; d.visible = age > 0 && age < 1.3; if (!d.visible) return; const v = 0.7 + 1.1 * hash(i + 3), dist = v * (1 - Math.exp(-age * 3.2)), sx = (hash(i + 5) - 0.5) * 0.9, sy = (hash(i + 9) - 0.45) * 0.7;
        d.position.copy(m0).addScaledVector(fw, dist).addScaledVector(side, sx * dist); d.position.y += sy * dist - 0.3 * age * age - 0.1 * snap; d.scale.setScalar(Math.min(1, age * 20) * (1 - seg(age, 0.8, 1.3))); });
      shake = 0.6 * snap;
    }
    ST.setMood(s.xray);
    // the host
    const watch = s.n >= 1 ? Math.max(pre.charge, 1 - eio(seg(s.since, 0.5, 1.0))) : 0, flinch = bump(seg(t, T_SNZ, T_SNZ + 1.1));
    let p = drag(act, t);
    p = addPose(p, { spine: [0, 12 * watch, 0], head: [3 * watch, 26 * watch + 14 * flinch, 0], look: [0.7 * watch, -0.3 * watch], squash: 0.04 * flinch });
    const pz = alive(p, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); breathe(host, t); host.belly(0); host.group.position.set(HX - 0.08 * flinch, 0, 0);
    // camera (aim(): placed after posing, so it can target a body part)
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), tgt = V3(BX, f.cy * 1.25, BZ); shake += s.kick + (o.shake || 0);
    pos.lerp(tgt, s.kick * 0.08); at.lerp(tgt, s.kick * 0.3);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + s.flash * 0.2 + s.xray * 0.2, bloomThreshold: lerp(0.8, 0.5, s.xray), ...(o.look || {}) });
    return s;
  }
  const FULL = (k) => ({ pos: lerpV(V3(BX + 0.12, 0.92, BZ + 3.05), V3(BX + 0.08, 0.9, BZ + 2.7), k), at: V3(BX, 0.76, BZ) });

  // 1 · cold open: nerve lightning, the sneeze, the cough blast, under the promise; then the question
  const M_END = L(1) - 0.12, MONT = [['S05', T_N + 0.1, 5], ['S03', T_SNZ - 0.1, 3], ['S04', T_B - 0.06, 4], ['S07', T_STUB - 0.25, 7], ['S05', T_N + 1.0, 5]], NM = MONT.length;
  function banner(t, k = 1) { pill('270 MPH', 540, 300, k * (1 + 0.03 * Math.sin(t * 9)), '#111', YEL, 104); pill('INSIDE YOUR BODY', 540, 445, k, '#FFFFFF', 'rgba(190,16,24,0.95)', 70); }
  add({ id: 'S00', at: 0, note: 'cold open montage: nerve sparks race through the x-ray body, the sneeze, the cough blast; banner "270 MPH INSIDE YOUR BODY" from frame one', draw(lt, d, t, blit) {
    const step = M_END / NM, n = Math.min(NM - 1, Math.floor(t / step)), [id, t0, li] = MONT[n], sh = S.find((x) => x.id === id), tt = t0 + (t - n * step);
    QUIET = true; sh.draw(tt - sh.at, (li < 7 ? cut(li + 1) : Le(7) + 0.35) - cut(li), tt, blit); QUIET = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ladder(t); banner(t);
  } });
  add({ id: 'S01', at: M_END, note: 'x-ray body dims, a red "?" pulses on the chest; "CAN YOU GUESS?"', draw(lt, d, t, blit) {
    show(t, { pos: lerpV(V3(BX + 0.1, 0.98, BZ + 2.5), V3(BX + 0.06, 0.98, BZ + 2.1), eio(lt / d)), at: V3(BX, 0.84, BZ), dim: 0.6 }); blit();
    const [x, y] = screen(XW(V3(0, 0.3, 0.1)), cam); mystery(x, y, eob(seg(t, M_END, M_END + 0.3)), t);
    pill('CAN YOU GUESS?', 540, 1185, popIn(t - Wd('guess', 1)), '#111', YEL, 66);
    ladder(t); banner(t);
  } });
  cue(0.02, 'zip', { gain: 0.9 }); cue(0.05, 'sparkle', { dur: 0.5, gain: 0.7 }); cue(M_END / NM, 'whoosh'); cue(M_END / NM + 0.1, 'slam', { gain: 0.6 }); cue(M_END * 2 / NM, 'whoosh'); cue(M_END * 2 / NM + 0.06, 'slam', { gain: 0.6 }); cue(M_END * 3 / NM, 'whoosh'); cue(M_END * 3 / NM + 0.25, 'thud', { gain: 0.9 }); cue(M_END * 4 / NM, 'zip', { gain: 0.8 });
  cue(M_END, 'thud', { gain: 0.8 }); cue(Wd('guess', 1), 'pop');

  // 2 · #4 blood
  add({ id: 'S02', at: cut(2), note: 'x-ray chest close: the heart beats, red blood cells stream out and down the aorta; "3 MPH"', draw(lt, d, t, blit) {
    const k = eio(lt / d); show(t, { fx: 'blood', aim: () => { const c0 = XW(V3(0.01, 0.33, 0.0)); return { pos: lerpV(c0.clone().add(V3(0.24, 0.12, 0.98)), c0.clone().add(V3(0.16, 0.08, 0.76)), k), at: c0, focus: c0 }; }, look: { aperture: 0.0016 } }); blit();
    rankNo(t, 4, RANK[0].t);
    const [x, y] = screen(XW(V3(0.03, 0.41, 0.06)), cam); label('HEART', 800, 520, x, y, eob(seg(t, Wd('heart', 2) - 0.15, Wd('heart', 2) + 0.15)));
    speedo(t, 3, T_3, RED); ladder(t);
  } });
  cue(cut(2), 'whoosh'); cue(L(2) + 0.4, 'heartbeat', { dur: 3.8, gain: 0.8 }); cue(T_3, 'pop', { gain: 0.6 });

  // 3 · #3 sneeze
  add({ id: 'S03', at: cut(3), note: 'lights up, two-shot: Blip is a person, winds up and sneezes a spray of droplets; host flinches; "100 MPH" struck out, then "10 MPH"', draw(lt, d, t, blit) {
    show(t, { pos: lerpV(V3(0.16, 0.98, 3.5), V3(0.24, 0.98, 3.2), eio(lt / d)), at: V3(0.2, 0.8, 0), focus: V3(BX, 0.8, BZ), turn: 0.75, flashK: 0.35 }); blit();
    rankNo(t, 3, RANK[1].t);
    if (t > T_SNZ && t < T_SNZ + 0.7) comic('ACHOO!', 620, 560, 1 - seg(t, T_SNZ + 0.45, T_SNZ + 0.7), '#FFFFFF', 0.08, 130);
    if (t > T_100 && t < T_10) { const k = popIn(t - T_100); pill('100 MPH', 540, 1185, k, '#FFFFFF', DARK, 88); const sk = eo(seg(t, T_100 + 0.25, T_100 + 0.5)); if (sk > 0) { ctx.strokeStyle = RED; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(310, 1215); ctx.lineTo(310 + 460 * sk, 1155); ctx.stroke(); } }
    speedo(t, 10, T_10, '#BFF3FF'); ladder(t);
  } });
  cue(T_100 + 0.25, 'slide', { gain: 0.6 }); cue(T_10, 'pop', { gain: 0.6 });

  // 4 · #2 cough
  add({ id: 'S04', at: cut(4), note: 'x-ray head and chest from the side: lungs fill, then squeeze and air blasts up the windpipe and out of the mouth, twice; "50 MPH"', draw(lt, d, t, blit) {
    const c = V3(BX + 0.1, 1.1, BZ + 0.1); show(t, { fx: 'cough', pos: lerpV(V3(BX + 1.25, 1.14, BZ + 1.5), V3(BX + 1.05, 1.12, BZ + 1.25), eio(lt / d)), at: c, focus: V3(BX, 1.1, BZ), turn: -0.55, flashK: 0.25, look: { aperture: 0.0016 } }); blit();
    rankNo(t, 2, RANK[2].t);
    speedo(t, 50, T_50, '#BFF3FF'); ladder(t);
  } });
  cue(cut(4), 'whoosh'); cue(T_50, 'pop', { gain: 0.6 });

  // 5 · #1 nerve signals
  add({ id: 'S05', at: cut(5), note: 'x-ray full body: on "nerve" the brain lights up and yellow sparks race down the spine to both hands and feet, again and again; "270 MPH"', draw(lt, d, t, blit) {
    show(t, { fx: 'nerve', ...FULL(eio(lt / d)) }); blit();
    rankNo(t, 1, RANK[3].t);
    speedo(t, 270, T_N270, YEL); ladder(t);
  } });
  cue(cut(5), 'whoosh'); cue(T_N, 'zip', { gain: 0.9 }); cue(T_N + 0.03, 'sparkle', { dur: 2.5, gain: 0.7 }); cue(T_N270, 'slam', { gain: 0.7 }); cue(T_N + 0.4, 'zip', { gain: 0.6 }); cue(T_N + 0.8, 'zip', { gain: 0.6 });

  // 6 · the twist: pain is slow
  add({ id: 'S06', at: cut(6), note: 'x-ray legs and torso: yellow sparks keep racing, but one red dot crawls up the right leg; "PAIN SIGNAL", "2 MPH"', draw(lt, d, t, blit) {
    show(t, { fx: 'pain', pos: lerpV(V3(BX + 0.3, 0.5, BZ + 2.3), V3(BX + 0.22, 0.46, BZ + 2.0), eio(lt / d)), at: V3(BX + 0.02, 0.44, BZ) }); blit();
    const [x, y] = screen(XW(along(PAINPATH, painK(t))), cam); label('PAIN SIGNAL', 760, 560, x, y, eob(seg(t, T_SLOW - 0.1, T_SLOW + 0.2)));
    speedo(t, 2, T_2, RED); ladder(t);
  } });
  cue(cut(6), 'whoosh'); cue(T_SLOW, 'pop', { gain: 0.6 }); cue(T_2, 'pop', { gain: 0.6 });

  // 7 · stub your toe: the hurt arrives late
  add({ id: 'S07', at: cut(7), note: 'on "stub" the x-ray foot kicks a block; the camera rides up the body with the slow red dot; it reaches the brain on "later": brain flashes red, "OW!"', draw(lt, d, t, blit) {
    show(t, { fx: 'stub', aim: () => { const y = clamp(XW(along(PAINPATH, painK(t))).y, 0.3, 1.12), yy = t < T_STUB ? 0.3 : y; return { pos: V3(BX + 0.34, yy + 0.06, BZ + 2.05), at: V3(BX + 0.03, yy, BZ) }; } }); blit();
    if (t > T_STUB && t < T_STUB + 0.7) comic('THUD', 760, 1000, 1 - seg(t, T_STUB + 0.4, T_STUB + 0.7), '#FFFFFF', 0.1, 120);
    if (t > T_STUB + 0.3 && t < T_ARR) pill('NO PAIN YET…', 540, 1185, popIn(t - T_STUB - 0.3), '#FFFFFF', DARK, 64);
    if (t > T_ARR) { comic('OW!', 540, 620, Math.min(1, (t - T_ARR) * 6), RED, -0.08, 230); pill('PAIN ARRIVES LATE', 540, 1185, popIn(t - T_ARR), '#FFFFFF', 'rgba(170,16,24,0.92)', 64); }
    ladder(t);
  } });
  cue(cut(7), 'whoosh'); cue(T_STUB, 'thud', { gain: 1.0 }); cue(T_STUB + 0.02, 'tock', { gain: 0.8 }); cue(T_ARR, 'slam', { gain: 0.9 }); cue(T_ARR + 0.02, 'alarm', { dur: 0.35, gain: 0.35 });

  return { shots: S, cues: CUES };
}
