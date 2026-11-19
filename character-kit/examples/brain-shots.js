// YOUR BRAIN CAN'T FEEL PAIN (Body Glitch, host v2 + shape-shifting Blip)
// Blip is x-ray with his skull lid open; the host (surgeon) pokes his bare brain with a probe and he just smiles.
// Then: zero pain sensors, it feels the whole body (probe on the hand → signal up to the brain) but not itself, numb +
// open the skull, awake playing guitar, touch a spot → he stops talking → stay away, headaches come from the nerves around it.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Le, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host } from './core/host.js';
import { Shifter } from './core/shift.js';
import { studio } from './core/studio.js';
import { popIn, track, drag, alive, mouthFor, breathe as hostBreathe } from './core/motion.js';
import { pill, label } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const YEL = '#FFD43B', RED = '#FF4D4D', GRN = '#4BE38A', PINK = '#FF8FB8', DARK = 'rgba(12,14,20,0.82)';
const imp = (x, d = 7) => (x < 0 ? 0 : x < 0.03 ? x / 0.03 : Math.exp(-(x - 0.03) * d));

function bubble(text, x, y, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.font = '900 58px Inter'; const w = ctx.measureText(text).width + 70, h = 100;
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, 40); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 50, y - 4); ctx.lineTo(x - 90, y + 40); ctx.lineTo(x - 10, y - 4); ctx.fill();
  ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - h / 2 + 3); ctx.restore();
}

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.78, vignette: 0.45, warm: 0.04, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.3, BZ = 0.12;
  const HF = blip.forms.human, XF = blip.forms.xray, HH = HF.human, XH = XF.human;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_POKE = Wd('poke', 0), T_AWAKE = Wd('awake', 0), T_HURT = Wd('hurt', 0);
  const T_ZERO = Wd('zero', 1), T_SENS = Wd('sensors', 1);
  const T_EVERY = Wd('every', 2), T_BODY = Wd('body', 2), T_CANT = Wd("can't", 2), T_ITSELF = Wd('itself', 2);
  const T_NUMB = Wd('numb', 3), T_SKULL = Wd('skull', 3), T_OPEN = Wd('open', 3);
  const T_AWAKE2 = Wd('awake', 4), T_TALK = Wd('talking', 4), T_GUIT = Wd('guitar', 4);
  const T_TOUCH = Wd('touch', 5), T_STOPS = Wd('stops', 5), T_AWAY = Wd('away', 5);
  const T_HEAD = Wd('headaches', 6), T_NERV = Wd('nerves', 6), T_AROUND = Wd('around', 6), T_NOT = Wd('not', 6);
  const PLAN = [{ t: -5, form: 'xray' }, { t: L(6) - 0.08, form: 'human', charge: 0.02 }];
  Shifter.cues(PLAN.slice(1), cue);

  // ── a wrinkly brain, a skull lid, the probe ───────────────────────────────
  const BR = XF.brain; { const g = new THREE.SphereGeometry(1, 72, 54), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 0.045 * Math.sin(v.x * 17 + Math.sin(v.y * 9) * 2.2) * Math.sin(v.z * 15 + v.y * 7) + 0.03 * Math.sin(v.y * 23 + v.z * 5); const fiss = -0.09 * Math.exp(-(v.x * v.x) / 0.004) * Math.max(0, v.y + 0.2); v.multiplyScalar(1 + n + fiss); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); BR.geometry = g; }
  BR.material = new THREE.MeshPhysicalMaterial({ color: '#F48FB1', roughness: 0.45, clearcoat: 0.7, emissive: '#E85A8C', emissiveIntensity: 0.35 });
  BR.scale.multiplyScalar(1.18);
  const lid = new THREE.Group(); lid.position.set(0, 0.23, -0.1); XH.head.add(lid);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, 0.8), new THREE.MeshStandardMaterial({ color: '#E6F7FF', emissive: '#7FDDF2', emissiveIntensity: 0.35, roughness: 0.4, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  cap.scale.set(0.09, 0.105, 0.1); cap.position.set(0, -0.065, 0.092); cap.castShadow = false; lid.add(cap);
  const brainC = () => BR.getWorldPosition(V3(0, 0, 0));
  const brainP = (x, y, z) => XH.head.localToWorld(V3(0 + x, 0.19 + y, -0.012 + z));
  const SPOT = [0.035, 0.045, 0.055];
  const spotM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF3030').multiplyScalar(1.5), transparent: true }), spot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 14, 10), spotM); ST.scene.add(spot);
  const steel = new THREE.MeshStandardMaterial({ color: '#D9DEE6', metalness: 0.9, roughness: 0.25 });
  const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 1, 10), steel); ST.scene.add(probe);
  const tipM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#BFF6FF').multiplyScalar(1.6) }), tip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), tipM); ST.scene.add(tip);
  const setRod = (m, a, b) => { const d = b.clone().sub(a); m.scale.y = Math.max(0.001, d.length()); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); };
  // pain signal dots (hand → brain) + nerve ring (headache)
  const sigM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF5A3A').multiplyScalar(1.6), transparent: true }), sigs = [];
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), sigM); m.visible = false; ST.scene.add(m); sigs.push(m); }
  const nervM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF3B3B').multiplyScalar(1.4), transparent: true, depthWrite: false }), nerves = new THREE.Group();
  for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; pts.push(V3(Math.cos(a) * (0.13 + 0.012 * Math.sin(a * 9 + k)), 0.02 * Math.sin(a * 7 + k * 2) + (k - 1) * 0.035, Math.sin(a) * (0.13 + 0.012 * Math.cos(a * 8)))); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, 0.006, 6, true), nervM); nerves.add(tube); }
  nerves.position.set(0, 0.2, -0.01); nerves.scale.setScalar(1 / 0.6 * 0.82); HH.head.add(nerves); nerves.visible = false;
  // guitar on Blip
  const wood = new THREE.MeshStandardMaterial({ color: '#C97B3A', roughness: 0.45 }), darkW = new THREE.MeshStandardMaterial({ color: '#3A2416', roughness: 0.5 });
  const guitar = new THREE.Group(); { const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 28), wood); b1.rotation.x = Math.PI / 2; const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 28), wood); b2.rotation.x = Math.PI / 2; b2.position.x = -0.09; const hole = new THREE.Mesh(new THREE.CircleGeometry(0.025, 20), darkW); hole.position.set(-0.04, 0, 0.021); const neck = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.026, 0.02), darkW); neck.position.set(-0.27, 0, 0.01); guitar.add(b1, b2, hole, neck); }
  guitar.position.set(0.04, 0.15, 0.16); guitar.rotation.z = -0.45; guitar.visible = false; XH.spine.add(guitar);

  // ── the host (surgeon with a probe) ───────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const REACH = { ...REST, shR: [118, -14, 40], elR: 34, head: [6, 22, 0], smile: 0.7, brow: [0.6, 0] };
  const REACHLO = { ...REST, shR: [42, -10, 40], elR: 22, head: [14, 22, 0], smile: 0.6, brow: [0.6, 0] };
  const SHRUG = { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, smile: 0.8, brow: [0.8, 0], head: [-4, 18, 6] };
  const act = track([
    { t: 0, pose: REACH },
    { t: L(1) - 0.05, d: 0.35, pose: { ...REST, smile: 0.6, head: [0, 18, 0] } },
    { t: L(2) - 0.05, d: 0.35, pose: REACHLO },
    { t: T_CANT - 0.05, d: 0.35, pose: SHRUG },
    { t: L(3) - 0.05, d: 0.35, pose: REACH },
    { t: L(4) - 0.05, d: 0.35, pose: { ...SHRUG, smile: 1 } },
    { t: L(5) - 0.05, d: 0.35, pose: REACH },
    { t: L(6) - 0.05, d: 0.35, pose: { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], brow: [0.7, 0.2], smile: 0.2 } },
  ]);
  const handW = () => host.arm.R.el.localToWorld(V3(0, -0.25, 0.01));

  const lidOpen = (t) => (t < L(1) - 0.08 ? 1 : t < L(3) - 0.08 ? 0 : t < L(6) - 0.08 ? eio(seg(t, T_OPEN - 0.05, T_OPEN + 0.5)) : 0);
  /** probe target: [tip pos, contact 0..1] or null */
  function probeAt(t) {
    const hand = handW();
    if (t < L(1) - 0.08) { const k = seg(t, T_POKE - 0.25, T_POKE + 0.1) - seg(t, T_AWAKE + 0.2, T_AWAKE + 0.5) + seg(t, T_HURT - 0.1, T_HURT + 0.15); const tg = brainP(0.0, 0.06, 0.03); return { p: lerpV(lerpV(hand, tg, 0.55), tg, clamp(k)), c: clamp(k) }; }
    if (t > L(2) - 0.08 && t < T_CANT) { const tg = XH.arm.R.el.localToWorld(V3(0, -0.26, 0.03)), k = eio(seg(t, L(2), T_EVERY)); return { p: lerpV(lerpV(hand, tg, 0.5), tg, k), c: k }; }
    if (t > L(5) - 0.08 && t < L(6) - 0.08) { const tg = brainP(...SPOT), k = eio(seg(t, T_TOUCH - 0.3, T_TOUCH + 0.05)) * (1 - eio(seg(t, T_AWAY - 0.1, T_AWAY + 0.35))); return { p: lerpV(lerpV(hand, tg, 0.6), tg, k), c: k }; }
    return null;
  }

  /** one frame */
  function show(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.set(0, o.turn ?? -0.15, 0);
    const s = blip.update(t, PLAN, {}), f = blip.current, h = f.human;
    if (o.flashK != null) { blip.flash.visible = false; blip.ring.material.opacity *= 0.5; f.mats.forEach((m) => { if (!m.uniforms && m.emissive) m.emissiveIntensity *= 0.25 + 0.75 * o.flashK; if (m.uniforms?.uS) m.uniforms.uS.value = 1.15 + (m.uniforms.uS.value - 1.15) * o.flashK; }); blip.light.intensity *= o.flashK; }
    const w = Math.sin(t * 2.2);
    if (s.form === 'xray') {
      f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gas.forEach((g) => (g.visible = false)); f.kidneys.forEach((k) => (k.visible = false));
      let q = { spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [4, 0, 20], shR: [4, 0, 20], elL: 16, elR: 16 };
      if (t > L(4) - 0.08 && t < L(5) - 0.08) { const st = Math.sin(t * 16); q = { spine: [0, w * 3, 0], head: [-6 + 4 * Math.sin(t * 8), 0, w * 4], shL: [40, 0, 14], elL: 70, shR: [38, 0, 18], elR: 95 + 18 * st }; }
      if (t > L(2) - 0.08 && t < L(3) - 0.08) { const j = imp(t - T_EVERY, 4); q.shR = [20 + 30 * j, 0, 30]; q.elR = 30 + 40 * j; q.spine = [-6 * j, 0, 0]; }
      h.pose(q);
      const ouch = t > L(2) - 0.08 && t < T_CANT ? imp(t - T_EVERY, 3) : 0;
      f.face.set({ lid: ouch > 0.2 ? 0.6 : 0, look: t > L(5) - 0.08 && t < L(6) - 0.08 && t > T_STOPS ? [0.4, 0.3] : [0, 0] });
      lid.rotation.x = -1.9 * lidOpen(t); lid.position.y = 0.23 + 0.02 * lidOpen(t); cap.visible = true;
      // brain glow on touch
      BR.material.emissiveIntensity = 0.35 + 0.3 * Math.sin(t * 3) ** 2;
      guitar.visible = t > L(4) - 0.08 && t < L(5) - 0.08;
    }
    if (s.form === 'human') {
      const k = eio(seg(t, PLAN[1].t + 0.1, T_HEAD + 0.2));
      h.pose({ spine: [6 * k, w * 2, 0], head: [10 * k, 0, 6 * k * Math.sin(t * 6)], shL: [6 + 140 * k, 0, 12 + 30 * k], shR: [6 + 140 * k, 0, 12 + 30 * k], elL: 24 + 100 * k, elR: 24 + 100 * k });
      f.face.set({ lid: 0.5 * k, smile: lerp(0.8, -0.6, k) });
      nerves.visible = t > T_NERV - 0.1; nervM.opacity = 0.35 + 0.45 * Math.sin(t * 10) ** 2; nerves.rotation.y = t * 0.6;
    } else nerves.visible = false;
    blip.group.updateMatrixWorld(true);
    // host
    const p0 = drag(act, t), pz = alive(p0, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0); host.group.visible = !o.noHost; host.group.updateMatrixWorld(true);
    // probe
    const pr = s.form === 'xray' ? probeAt(t) : null; probe.visible = tip.visible = !!pr && !o.noHost;
    if (pr) { setRod(probe, handW(), pr.p); tip.position.copy(pr.p); tip.scale.setScalar(1 + 0.6 * pr.c * (0.5 + 0.5 * Math.sin(t * 30))); }
    // the speech spot
    const sOn = s.form === 'xray' && t > T_TOUCH - 0.05 && t < L(6) - 0.08; spot.visible = sOn; if (sOn) { spot.position.copy(brainP(...SPOT)); spot.scale.setScalar(1 + 0.25 * Math.sin(t * 9)); }
    // pain signal: hand → arm → shoulder → neck → brain
    const sk = seg(t, T_EVERY + 0.05, T_BODY + 0.4), sigOn = s.form === 'xray' && sk > 0 && sk < 1 && t < L(3);
    if (sigOn) { const path = [XH.arm.R.el.localToWorld(V3(0, -0.24, 0)), XH.arm.R.el.getWorldPosition(V3()), XH.arm.R.sh.getWorldPosition(V3()), XH.head.localToWorld(V3(0, 0.03, 0)), brainC()];
      sigs.forEach((m, i) => { const u = clamp(sk * 1.25 - i * 0.035), x = u * (path.length - 1), j = Math.min(path.length - 2, Math.floor(x)); m.visible = u > 0 && u < 1; m.position.copy(lerpV(path[j], path[j + 1], x - j)); }); }
    else sigs.forEach((m) => (m.visible = false));
    ST.setMood(Math.max(s.xray * (o.xk ?? 0.7), o.mood ?? 0.15));
    // camera
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + s.xray * 0.12, bloomThreshold: lerp(0.78, 0.55, s.xray), ...(o.look || {}) });
    return s;
  }
  const WIDE = (k) => ({ pos: lerpV(V3(0.03, 1.02, 4.45), V3(0.06, 1.0, 4.1), k), at: V3(0.04, 0.9, 0), focus: V3(0.04, 0.9, 0.05), look: { aperture: 0.0016 } });
  const TWO = (k) => ({ pos: lerpV(V3(0.1, 1.0, 3.5), V3(0.14, 0.98, 3.15), k), at: V3(0.08, 0.88, 0), focus: V3(0.12, 0.88, BZ), look: { aperture: 0.0016 } });
  const HEADCAM = (k, d0 = 1.05, d1 = 0.8, side = 0.22) => { const c = brainC(); return { pos: lerpV(c.clone().add(V3(side, 0.1, d0)), c.clone().add(V3(side * 0.8, 0.08, d1)), k), at: c.clone().add(V3(0, -0.03, 0)), focus: c, look: { aperture: 0.0012 } }; };
  const headScr = () => screen(brainC(), cam);

  // 1 · hook: poking an awake brain
  add({ id: 'S00', at: 0, note: 'close two-shot at head height: x-ray Blip with his skull lid flipped open, the host pokes his bare pink brain with a steel probe; Blip smiles; "PAIN: 0%"', draw(lt, d, t, blit) {
    const s = show(t, { aim: () => { const c = brainC(); return { pos: lerpV(c.clone().add(V3(-0.1, 0.02, 1.65)), c.clone().add(V3(-0.07, 0.0, 1.38)), eio(lt / d)), at: c.clone().add(V3(-0.13, -0.14, 0)), focus: c }; }, look: { aperture: 0.0013 }, flashK: 0.2 }); blit();
    pill('YOUR BRAIN CAN\'T FEEL PAIN', 540, 300, 1, '#FFFFFF', 'rgba(190,16,24,0.95)', 58);
    if (t > T_POKE) { const [x, y] = headScr(); label('BRAIN', 880, 470, x + 25, y - 15, eob(seg(t, T_POKE, T_POKE + 0.3))); }
    if (t > T_AWAKE - 0.1) bubble('Hi! 👋', 760, 900, popIn(t - T_AWAKE + 0.1));
    if (t > T_HURT - 0.15) pill('PAIN: 0%', 540, 1180, popIn(t - T_HURT + 0.15), '#111', GRN, 86);
  } });
  cue(T_POKE + 0.05, 'plop', { gain: 0.6 }); cue(T_HURT + 0.05, 'plop', { gain: 0.5 }); cue(T_HURT, 'pop');

  // 2 · zero pain sensors
  add({ id: 'S01', at: cut(1), note: 'x-ray head close-up: the wrinkly brain; a scanner line sweeps it; counter "PAIN SENSORS: 0"', draw(lt, d, t, blit) {
    const s = show(t, { ...HEADCAM(eio(lt / d)), noHost: true, flashK: 0.2 }); blit();
    const sw = seg(t, L(1) + 0.2, T_SENS + 0.3); if (sw > 0 && sw < 1) { const y = lerp(560, 1100, sw); ctx.save(); ctx.fillStyle = 'rgba(120,255,200,0.35)'; ctx.fillRect(0, y - 10, W, 20); ctx.fillStyle = 'rgba(120,255,200,0.9)'; ctx.fillRect(0, y - 2, W, 4); ctx.restore(); }
    if (t > T_ZERO - 0.1) pill('PAIN SENSORS: 0', 540, 300, popIn(t - T_ZERO + 0.1), '#FFFFFF', RED, 72);
    if (t > T_SENS + 0.2) pill('❌ NONE IN THE BRAIN', 540, 1180, popIn(t - T_SENS - 0.2), '#FFFFFF', DARK, 58);
  } });
  cue(L(1) + 0.2, 'zip', { gain: 0.5 }); cue(T_ZERO, 'pop'); cue(T_SENS + 0.2, 'tock');

  // 3 · it feels the body, not itself
  add({ id: 'S02', at: cut(2), note: 'two-shot: the host jabs Blip\'s hand with the probe, red pain dots race up his arm to the brain: "OUCH!"; then "BUT IT CAN\'T FEEL ITSELF"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), flashK: 0.2 }); blit();
    if (t > T_EVERY + 0.05 && t < T_CANT + 0.2) bubble('OUCH!', 780, 820, popIn(t - T_EVERY - 0.05) * (1 - seg(t, T_CANT, T_CANT + 0.2)));
    if (t > T_BODY - 0.1) pill('FEELS YOUR WHOLE BODY ✅', 540, 300, popIn(t - T_BODY + 0.1), '#111', GRN, 56);
    if (t > T_CANT - 0.1) pill('BUT NOT ITSELF ❌', 540, 1180, popIn(t - T_CANT + 0.1), '#FFFFFF', RED, 72);
  } });
  cue(T_EVERY + 0.03, 'tock', { gain: 0.8 }); cue(T_EVERY + 0.1, 'zip', { dur: 0.6, gain: 0.6 }); cue(T_CANT, 'pop');

  // 4 · numb and open
  add({ id: 'S03', at: cut(3), note: 'x-ray head close-up: "💉 NUMB THE SKIN + SKULL"; the host\'s probe away; on "open" the skull lid flips open showing the brain', draw(lt, d, t, blit) {
    const s = show(t, { ...HEADCAM(eio(lt / d), 1.1, 0.85, -0.18), flashK: 0.2 }); blit();
    if (t > T_NUMB - 0.1) pill('💉 NUMB THE SKIN + SKULL', 540, 300, popIn(t - T_NUMB + 0.1), '#111', YEL, 56);
    if (t > T_OPEN - 0.05) pill('OPEN IT UP', 540, 1180, popIn(t - T_OPEN + 0.05), '#FFFFFF', DARK, 76);
  } });
  cue(T_NUMB, 'pop'); cue(T_OPEN, 'slide', { dur: 0.5, gain: 0.7 }); cue(T_OPEN + 0.45, 'tock', { gain: 0.5 });

  // 5 · awake, talking, playing guitar
  add({ id: 'S04', at: cut(4), note: 'two-shot: Blip, brain open, strums a guitar and sings; music notes float; "STILL AWAKE"; the host shrugs', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), flashK: 0.2 }); blit();
    if (t > T_AWAKE2 - 0.1) pill('STILL AWAKE 👀', 540, 300, popIn(t - T_AWAKE2 + 0.1), '#111', YEL, 70);
    if (t > T_TALK - 0.1 && t < T_GUIT) bubble('Hey doc!', 780, 860, popIn(t - T_TALK + 0.1));
    if (t > T_GUIT - 0.2) { ctx.save(); ctx.font = '900 80px Inter'; ctx.fillStyle = '#FFFFFF'; for (let i = 0; i < 4; i++) { const ph = (t * 0.7 + i / 4) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.fillText(i % 2 ? '♪' : '♫', 700 + 120 * Math.sin(i * 2 + ph * 3), 1000 - ph * 380); } ctx.restore(); pill('🎸 PLAYING GUITAR', 540, 1180, popIn(t - T_GUIT + 0.2), '#FFFFFF', DARK, 64); }
  } });
  cue(T_GUIT, 'sparkle', { gain: 0.6 }); for (let i = 0; i < 4; i++) cue(T_GUIT + 0.1 + i * 0.3, 'pop', { gain: 0.25 });

  // 6 · touch a spot → stops talking → stay away
  add({ id: 'S05', at: cut(5), note: 'x-ray head close-up: Blip mid-sentence in a speech bubble; the probe touches one spot, it glows red and the bubble cuts off "and then I—"; "⛔ SPEECH SPOT: STAY AWAY"', draw(lt, d, t, blit) {
    const s = show(t, { ...HEADCAM(eio(lt / d), 1.25, 1.0, -0.26), flashK: 0.2 }); blit();
    if (t < T_STOPS + 0.05) bubble('…and then I', 760, 760, 1);
    else bubble('…', 760, 760, 1 - seg(t, T_AWAY, T_AWAY + 0.3));
    if (t > T_TOUCH) { const [x, y] = screen(brainP(...SPOT), cam); if (t > T_STOPS) label('SPEECH SPOT', 250, 640, x, y, eob(seg(t, T_STOPS, T_STOPS + 0.3))); }
    if (t > T_STOPS - 0.05) pill('🤐 STOPS TALKING', 540, 300, popIn(t - T_STOPS + 0.05), '#FFFFFF', RED, 64);
    if (t > T_AWAY - 0.1) pill('⛔ STAY AWAY', 540, 1180, popIn(t - T_AWAY + 0.1), '#111', YEL, 80);
  } });
  cue(T_TOUCH + 0.05, 'zip', { gain: 0.5 }); cue(T_STOPS, 'alarm', { dur: 0.5, gain: 0.35 }); cue(T_AWAY, 'pop');

  // 7 · headaches come from the nerves around it (loops into the hook)
  add({ id: 'S06', at: cut(6), note: 'wide two-shot: Blip back to normal, clutching his head; glowing red nerve rings pulse around his head; "🤕 HEADACHE?" "THE NERVES AROUND IT" "NOT THE BRAIN"', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), flashK: 0.2 }); blit();
    if (t > T_HEAD - 0.1) pill('🤕 HEADACHE?', 540, 300, popIn(t - T_HEAD + 0.1), '#FFFFFF', DARK, 76);
    if (t > T_NERV - 0.1) pill('THE NERVES AROUND IT ⚡', 540, 420, popIn(t - T_NERV + 0.1), '#111', YEL, 54);
    if (t > T_NOT - 0.1) pill('NOT THE BRAIN', 540, 1180, popIn(t - T_NOT + 0.1), '#FFFFFF', RED, 80);
  } });
  cue(T_NERV, 'zip', { dur: 0.8, gain: 0.5 }); cue(T_NOT, 'pop');

  return { shots: S, cues: CUES };
}
