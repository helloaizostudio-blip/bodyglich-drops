// THE MAN WITH A HOLE IN HIS STOMACH (Body Glitch, host v2 + shape-shifting Blip)
// Blip is Alexis St. Martin; the host plays Dr. Beaumont with food on a string. Hook: the food goes straight into
// the hole. Then: the 1822 gunshot, the hole that never closed (x-ray: it goes right into the stomach), food lowered
// in, pulled out half digested, acid not squeezing, 238 experiments, and the twist: he outlived his doctor by 27 years.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Le, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host } from './core/host.js';
import { Shifter } from './core/shift.js';
import { studio } from './core/studio.js';
import { popIn, track, drag, alive, addPose, mouthFor, breathe as hostBreathe } from './core/motion.js';
import { pill, label } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const YEL = '#FFD43B', RED = '#FF4D4D', GRN = '#4BE38A', ACID = '#B6FF3B', DARK = 'rgba(12,14,20,0.82)';
const imp = (x, d = 7) => (x < 0 ? 0 : x < 0.03 ? x / 0.03 : Math.exp(-(x - 0.03) * d));

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.78, vignette: 0.45, warm: 0.04, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.33, BZ = 0.12;
  const HF = blip.forms.human, XF = blip.forms.xray, HH = HF.human, XH = XF.human;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_DROP = Wd('dropped', 0), T_YEAR = Wd('eighteen', 1), T_NAME = Wd('Alexis', 1), T_SHOT = Wd('shot', 1), T_ACC = Wd('accident', 1);
  const T_SURV = Wd('survived', 2), T_NEVER = Wd('never', 2), T_HOLE = Wd('hole', 2), T_DOC = Wd('Beaumont', 3), T_STR = Wd('string', 3), T_LOW = Wd('lowered', 3);
  const T_HRS = Wd('Hours', 4), T_PULL = Wd('pulled', 4), T_DIG = Wd('digested', 4), T_MELT = Wd('melts', 5), T_ACID = Wd('acid', 5), T_SQ = Wd('squeezing', 5);
  const T_200 = Wd('two', 6), T_EXP = Wd('experiments', 6), T_OUT = Wd('outlived', 7), T_27 = Wd('twenty', 7);
  const PLAN = [
    { t: -5, form: 'human' },
    { t: T_HOLE - 0.3, form: 'xray', charge: 0.02 },
    { t: L(3) - 0.08, form: 'human', charge: 0.12 },
    { t: L(4) - 0.5, form: 'xray', charge: 0.12 },
    { t: L(6) - 0.08, form: 'human', charge: 0.12 },
  ];
  Shifter.cues(PLAN.slice(1), cue);

  // ── find the belly surface over the stomach and put a hole there (human skin + x-ray glass) ──
  blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = -0.15; HH.pose({}); XH.pose({}); blip.group.updateMatrixWorld(true);
  const surf = (h) => { const from = h.spine.localToWorld(V3(0.065, 0.2, 0.6)), to = h.spine.localToWorld(V3(0.065, 0.2, 0)), rc = new THREE.Raycaster(from, to.clone().sub(from).normalize(), 0, 1);
    const meshes = []; h.group.traverse((m) => { if (m.isMesh) meshes.push(m); }); const hit = rc.intersectObjects(meshes, false).find((x) => x.object.parent === h.spine || x.object.parent?.parent === h.spine) || rc.intersectObjects(meshes, false)[0];
    return hit ? h.spine.worldToLocal(hit.point.clone()) : V3(0.065, 0.2, 0.14); };
  const holeM = new THREE.MeshBasicMaterial({ color: '#1A0508' }), rimM = new THREE.MeshStandardMaterial({ color: '#E06C80', roughness: 0.5, emissive: '#5A1020', emissiveIntensity: 0.4 });
  const makeHole = (h) => { const p = surf(h), g = new THREE.Group(); g.position.copy(p).add(V3(0, 0, 0.003)); const d = new THREE.Mesh(new THREE.CircleGeometry(0.026, 24), holeM), r = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 10, 28), rimM); g.add(d, r); g.rotation.y = 0.15; h.spine.add(g); return { g, p }; };
  const HHOLE = makeHole(HH), XHOLE = makeHole(XH);
  const stomachW = () => XF.stomach.getWorldPosition(V3(0, 0, 0)).add(V3(0.0, -0.01, 0.02));
  const XST = XH.spine.worldToLocal(stomachW()), tunM = new THREE.MeshStandardMaterial({ color: '#E06C80', emissive: '#FF4D6A', emissiveIntensity: 0.6, transparent: true, opacity: 0.7, depthWrite: false });
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1, 14), tunM); { const d = XHOLE.p.clone().sub(XST); tunnel.scale.y = d.length(); tunnel.position.copy(XHOLE.p.clone().add(XST).multiplyScalar(0.5)); tunnel.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); } tunnel.renderOrder = 3; XH.spine.add(tunnel);
  // the stomach goes see-through so the food inside reads; acid pool + bubbles
  const stM = XF.stomach.material; stM.transparent = true; stM.opacity = 0.62; stM.depthWrite = false;
  const acidM = new THREE.MeshStandardMaterial({ color: '#7BD62A', emissive: '#9BFF3A', emissiveIntensity: 0.45, transparent: true, opacity: 0, depthWrite: false });
  const acid = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), acidM); acid.scale.set(0.055, 0.03, 0.04); ST.scene.add(acid);
  const bubM = new THREE.MeshBasicMaterial({ color: new THREE.Color(ACID).multiplyScalar(1.4), transparent: true, opacity: 0.9, depthWrite: false }), bubs = [];
  for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.004 + 0.004 * hash(i), 8, 6), bubM); b.visible = false; ST.scene.add(b); bubs.push(b); }

  // ── the food on a string ──────────────────────────────────────────────────
  const meatM = new THREE.MeshStandardMaterial({ color: '#D86A4C', roughness: 0.5, emissive: '#5A1A10', emissiveIntensity: 0.5 }), fatM = new THREE.MeshStandardMaterial({ color: '#F2DCC8', roughness: 0.7 });
  const food = new THREE.Group(), meat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.042, 0.042), meatM), fat = new THREE.Mesh(new THREE.BoxGeometry(0.051, 0.011, 0.043), fatM); fat.position.y = 0.017; food.add(meat, fat); ST.scene.add(food);
  const strM = new THREE.MeshBasicMaterial({ color: '#F5F0E6' }), str = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1, 6), strM); ST.scene.add(str);
  const setString = (a, b) => { const d = b.clone().sub(a); str.scale.y = Math.max(0.001, d.length()); str.position.copy(a).add(b).multiplyScalar(0.5); str.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); };
  // gunshot: flash + smoke at the belly
  const boomL = new THREE.PointLight('#FFC070', 0, 5, 1.4); ST.scene.add(boomL);
  const smokeM = new THREE.MeshStandardMaterial({ color: '#9A958E', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 }), smoke = [];
  for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.03 + 0.03 * hash(i), 10, 8), smokeM); s.visible = false; s.castShadow = false; ST.scene.add(s); smoke.push(s); }
  const bangM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE3A0').multiplyScalar(2.5), transparent: true, depthWrite: false }), bang = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), bangM); bang.visible = false; ST.scene.add(bang);

  // ── the host (Dr. Beaumont) ───────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const HOLD = { ...REST, shR: [72, -18, 26], elR: 26, head: [6, 22, 0], smile: 0.7, brow: [0.6, 0] };   // arm out, dangling the food over the hole
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.4, spine: [-6, 0, 0], head: [0, 18, 0] };
  const act = track([
    { t: 0, pose: HOLD },
    { t: L(1) - 0.05, d: 0.35, pose: POINT },
    { t: T_SHOT - 0.05, d: 0.15, pose: SHOCK },
    { t: L(2) - 0.05, d: 0.35, pose: { ...POINT, smile: 0.2, brow: [0.9, 0.3] } },
    { t: L(3) - 0.05, d: 0.35, pose: { ...HOLD, smile: 0.9 } },
    { t: L(4) + 0.4, d: 0.35, pose: { ...HOLD, shR: [96, -18, 26], elR: 40, smile: 0.8 } },                           // pulling it back out
    { t: L(5) - 0.05, d: 0.35, pose: { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, smile: 0.8, brow: [0.8, 0], head: [-4, 18, 6] } },
    { t: L(6) - 0.05, d: 0.3, pose: HOLD },
    { t: L(7) - 0.05, d: 0.35, pose: { ...POINT, smile: 0.3 } },
    { t: T_OUT - 0.05, d: 0.3, pose: SHOCK },
  ]);
  const handW = () => host.arm.R.el.localToWorld(V3(0, -0.25, 0.01));

  /** where the food is: [position, scale, inside?] */
  function foodAt(t) {
    const hW = handW(), dang = hW.clone().add(V3(0.01 + Math.sin(t * 2.4) * 0.008, -0.2, 0)), hole = (blip.current.isXray ? XH : HH).spine.localToWorld((blip.current.isXray ? XHOLE : HHOLE).p.clone()), st = stomachW();
    const into = (k) => (k < 0.5 ? lerpV(dang, hole, eio(k * 2)) : lerpV(hole, st, eio((k - 0.5) * 2)));
    if (t < L(1) - 0.08) return { p: into(seg(t, T_DROP - 0.05, T_DROP + 0.7)), s: 1, show: true };
    if (t < L(3) - 0.08) return { show: false };
    if (t < L(4) - 0.08) return { p: into(seg(t, T_LOW - 0.05, T_LOW + 0.75)), s: 1, show: true };
    if (t < L(5) - 0.08) { const sh = lerp(1, 0.45, eio(seg(t, T_HRS + 0.1, T_PULL))); const out = seg(t, T_PULL, T_DIG + 0.2); return { p: out <= 0 ? st.clone().add(V3(0, Math.sin(t * 3) * 0.004, 0)) : into(1 - out), s: sh, show: true, acid: 1 }; }
    if (t < L(6) - 0.08) return { p: st.clone().add(V3(0.004, -0.002, 0)), s: lerp(1, 0.25, eio(seg(t, T_MELT - 0.1, Le(5)))), show: true, acid: 1, noString: true };
    if (t < L(7) - 0.08) { const k = ((t - L(6)) * 1.6) % 1, kk = k < 0.5 ? k * 2 : 2 - k * 2; return { p: into(kk * 0.55), s: 1, show: true }; }
    return { show: false };
  }

  const smugK = (t) => clamp((t - T_OUT) * 3);

  /** one frame */
  function show(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = o.turn ?? -0.15;
    const s = blip.update(t, PLAN, {}), f = blip.current, h = f.human, shot = imp(t - T_SHOT, 5);
    if (o.flashK != null) { blip.flash.visible = false; blip.ring.material.opacity *= 0.5; f.mats.forEach((m) => { if (!m.uniforms && m.emissive) m.emissiveIntensity *= 0.25 + 0.75 * o.flashK; if (m.uniforms?.uS) m.uniforms.uS.value = 1.15 + (m.uniforms.uS.value - 1.15) * o.flashK; }); blip.light.intensity *= o.flashK; }
    const w = Math.sin(t * 2.2);
    HHOLE.g.visible = !(t > L(1) - 0.08 && t < T_SHOT);
    if (s.form === 'human') {
      let q = { spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24 }, face = { lid: 0, smile: 0.8 };
      if (t < L(1) - 0.08) { const k = seg(t, T_DROP, T_DROP + 0.5); q = { spine: [4, w * 2, 0], head: [16, -6, 0], shL: [6, 0, 14], shR: [6, 0, 14], elL: 24, elR: 24 }; face = { lid: 0.1, smile: lerp(0.3, 1, k), look: [0, -0.6] }; }
      else if (t < L(2) - 0.08) { const j = shot; q = { spine: [-14 * j + 10 * clamp((t - T_SHOT) * 2), 0, 6 * j], head: [-14 * j, 0, 0], shL: [10 + 40 * j, 0, 14 + 30 * j], shR: [10 + 40 * j, 0, 14 + 30 * j], elL: 30 + 50 * clamp((t - T_SHOT) * 2), elR: 30 + 50 * clamp((t - T_SHOT) * 2), knL: 8 * j, knR: 8 * j }; face = { lid: t > T_SHOT ? 0.5 : 0, smile: t > T_SHOT ? -0.6 : 0.8 }; }
      else if (t > L(7) - 0.08) { const m = smugK(t); q = { spine: [-4 * m, w * 2, 0], head: [-6 * m, -10 * m, 6 * m], shL: [6, 0, 12 + 50 * m], shR: [6, 0, 12 + 50 * m], elL: 24 + 90 * m, elR: 24 + 90 * m }; face = { lid: 0.3 * m, smile: 0.8 + 0.4 * m }; }
      else if (t > L(3) - 0.08) { q = { spine: [4, w * 2, 0], head: [14, -6, 0], shL: [6, 0, 14], shR: [6, 0, 14], elL: 24, elR: 24 }; face = { lid: 0.1, smile: 0.9, look: [0, -0.6] }; }
      h.pose(q); f.face.set(face);
    }
    if (s.form === 'xray') {
      f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gas.forEach((g) => (g.visible = false)); f.kidneys.forEach((k) => (k.visible = false));
      h.pose({ spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [4, 0, 20], shR: [4, 0, 20], elL: 16, elR: 16 });
    }
    blip.group.updateMatrixWorld(true);
    // host
    const p0 = drag(act, t), pz = alive(addPose(p0, { spine: [-5 * shot, 0, 0], lid: -0.4 * shot }), t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0); host.group.updateMatrixWorld(true);
    // food + string
    const fd = foodAt(t);
    food.visible = !!fd.show; str.visible = !!fd.show && !fd.noString;
    if (fd.show) { food.position.copy(fd.p); food.scale.setScalar(fd.s); food.rotation.set(0.3, t * 0.6, 0.2); if (str.visible) setString(handW(), fd.p.clone().add(V3(0, 0.018 * fd.s, 0))); }
    // acid + bubbles inside the stomach
    const ac = s.form === 'xray' && fd.acid ? 1 : 0, st = stomachW(); acid.visible = ac > 0; acidM.opacity = 0.38 * ac; acid.position.copy(st).add(V3(0, -0.022, 0));
    bubs.forEach((b, i) => { b.visible = ac > 0; if (!b.visible) return; const ph = (t * 0.7 + hash(i)) % 1; b.position.copy(st).add(V3((hash(i + 1) - 0.5) * 0.08, -0.03 + ph * 0.06, (hash(i + 2) - 0.5) * 0.05)); b.scale.setScalar(1 - ph * 0.6); });
    // gunshot
    const hp = HH.spine.localToWorld(HHOLE.p.clone()); bang.visible = shot > 0.15 && s.form === 'human'; bang.position.copy(hp); bang.scale.setScalar(0.3 + 0.6 * (1 - shot)); bangM.opacity = 0.8 * shot; boomL.position.copy(hp).add(V3(0, 0, 0.3)); boomL.intensity = 4 * shot;
    smoke.forEach((m, i) => { const age = t - T_SHOT - hash(i) * 0.1; m.visible = age > 0 && age < 1.2 && t < L(2); if (!m.visible) return; m.position.copy(hp).add(V3((hash(i + 3) - 0.5) * 0.12 + age * 0.1 * (hash(i) - 0.3), age * 0.25, 0.05 + age * 0.06)); m.scale.setScalar(0.6 + age * 1.0); });
    ST.setMood(Math.max(s.xray * (o.xk ?? 1), o.mood ?? 0.15) - 0.1 * shot);
    // camera
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0) + 1.2 * shot;
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + 0.12 * shot + s.xray * 0.15, bloomThreshold: lerp(0.78, 0.5, s.xray), exposure: 1.02 + 0.1 * shot, ...(o.look || {}) });
    return { ...s, shot, h, fd };
  }
  const flash2d = (k) => { if (k > 0.02) { ctx.fillStyle = `rgba(255,236,214,${Math.min(0.2, k * 0.2)})`; ctx.fillRect(0, 0, W, H); } };
  const WIDE = (k) => ({ pos: lerpV(V3(0.03, 1.02, 4.45), V3(0.06, 1.0, 4.1), k), at: V3(0.04, 0.9, 0), focus: V3(0.04, 0.9, 0.05), look: { aperture: 0.0016 } });
  const TWO = (k) => ({ pos: lerpV(V3(0.1, 1.0, 3.5), V3(0.14, 0.98, 3.15), k), at: V3(0.08, 0.88, 0), focus: V3(0.12, 0.88, BZ), look: { aperture: 0.0016 } });
  const BELLY = (h, p, k, d0 = 0.9, d1 = 0.62) => { const c = h.spine.localToWorld(p.clone()); return { pos: lerpV(c.clone().add(V3(0.26, 0.06, d0)), c.clone().add(V3(0.16, 0.04, d1)), k), at: c, focus: c }; };

  // 1 · hook: food on a string goes straight into the hole
  add({ id: 'S00', at: 0, note: 'closer two-shot: Blip has a hole in his belly; the host (doctor) dangles a chunk of meat on a string and drops it straight in on "dropped"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.17, 0.98, 2.95), V3(0.2, 0.96, 2.65), eio(lt / d)), at: V3(0.14, 0.86, 0), focus: V3(BX, 0.86, BZ), look: { aperture: 0.0016 } }); blit();
    pill('A HOLE IN HIS STOMACH', 540, 300, 1, '#FFFFFF', 'rgba(190,16,24,0.95)', 62);
    if (t > T_DROP + 0.15) pill('FOOD GOES STRAIGHT IN', 540, 1150, popIn(t - T_DROP - 0.15), '#111', YEL, 66);
    if (t < T_DROP + 0.4) { const [x, y] = screen(HH.spine.localToWorld(HHOLE.p.clone()), cam); label('HOLE', 840, 1000, x, y, eob(seg(t, 0.2, 0.5))); }
  } });
  cue(T_DROP + 0.25, 'plop', { gain: 0.8 }); cue(T_DROP + 0.5, 'gulp', { gain: 0.6 });

  // 2 · 1822: shot in the gut by accident
  add({ id: 'S01', at: cut(1), note: 'wide two-shot: "1822", "ALEXIS ST. MARTIN"; no hole yet; on "shot" a bang at his belly, flash, smoke, he doubles over; "BY ACCIDENT"', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), mood: 0.2 }); blit(); flash2d(s.shot * 0.5);
    pill('1822', 540, 300, popIn(t - T_YEAR + 0.05), '#111', YEL, 96);
    if (t > T_NAME - 0.1) pill('ALEXIS ST. MARTIN · FUR TRADER', 540, 430, popIn(t - T_NAME + 0.1), '#FFFFFF', DARK, 48);
    if (t > T_SHOT - 0.02) pill('BANG', 540, 1150, popIn(t - T_SHOT) * (1 + 0.15 * imp(t - T_SHOT, 5)), '#111', '#FF9F1C', 100);
    if (t > T_ACC - 0.1) pill('BY ACCIDENT', 540, 1290, popIn(t - T_ACC + 0.1), '#FFFFFF', DARK, 54);
  } });
  cue(T_SHOT, 'slam', { gain: 1 }); cue(T_SHOT + 0.02, 'thud', { gain: 0.9 }); cue(T_SHOT + 0.06, 'sizzle', { dur: 0.6, gain: 0.35 });

  // 3 · the wound never closed: x-ray shows it opens straight into the stomach
  add({ id: 'S02', at: cut(2), note: 'belly close-up: the round hole; on "hole" he turns x-ray and the hole is a tunnel straight into the stomach', draw(lt, d, t, blit) {
    const k = eio(lt / d), s = show(t, { flashK: 0, aim: () => (blip.current.isXray ? BELLY(XH, XHOLE.p, k, 0.95, 0.7) : BELLY(HH, HHOLE.p, k, 0.95, 0.7)), look: { aperture: 0.0012 } }); blit();
    if (t > T_SURV - 0.1) pill('HE SURVIVED', 540, 300, popIn(t - T_SURV + 0.1), GRN, DARK, 70);
    if (t > T_NEVER - 0.1) pill('THE WOUND NEVER CLOSED', 540, 420, popIn(t - T_NEVER + 0.1), '#FFFFFF', 'rgba(170,16,24,0.92)', 52);
    if (s.form === 'xray') { const [sx, sy] = screen(stomachW(), cam); label('STOMACH', 800, 1100, sx, sy, eob(seg(t, T_HOLE + 0.1, T_HOLE + 0.4))); }
  } });
  cue(T_NEVER, 'pop'); cue(T_HOLE + 0.1, 'pop');

  // 4 · Dr. Beaumont ties food to a string and lowers it in
  add({ id: 'S03', at: cut(3), note: 'closer two-shot: "DR. WILLIAM BEAUMONT · ARMY SURGEON"; he dangles meat on a string and lowers it into the hole', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), flashK: 0.2 }); blit();
    if (t > T_DOC - 0.1) pill('DR. WILLIAM BEAUMONT', 540, 300, popIn(t - T_DOC + 0.1), '#111', YEL, 70);
    if (t > T_DOC + 0.25) pill('ARMY SURGEON', 540, 410, popIn(t - T_DOC - 0.25), '#FFFFFF', DARK, 46);
    if (t > T_STR - 0.1) pill('FOOD ON A STRING', 540, 1150, popIn(t - T_STR + 0.1), '#FFFFFF', DARK, 66);
  } });
  cue(T_LOW + 0.3, 'plop', { gain: 0.8 });

  // 5 · hours later: pulled out half digested
  add({ id: 'S04', at: cut(4), note: 'x-ray stomach close-up: the meat sits in green acid with bubbles; a clock pill "HOURS LATER"; it shrinks; then the string pulls it back out, half gone: "HALF DIGESTED"', draw(lt, d, t, blit) {
    const k = eio(lt / d), s = show(t, { flashK: 0.25, aim: () => { const c = stomachW(); return { pos: lerpV(c.clone().add(V3(0.24, 0.05, 0.8)), c.clone().add(V3(0.15, 0.03, 0.58)), k), at: c, focus: c }; }, look: { aperture: 0.0012 } }); blit();
    if (t > T_HRS - 0.1) { const hrs = Math.min(3, Math.floor(1 + 3 * seg(t, T_HRS, T_PULL))); pill(`🕒 ${hrs} HOUR${hrs > 1 ? 'S' : ''} LATER`, 540, 300, popIn(t - T_HRS + 0.1), '#111', YEL, 70); }
    if (t > T_DIG - 0.15) pill('HALF DIGESTED', 540, 1150, popIn(t - T_DIG + 0.15), ACID, DARK, 76);
  } });
  cue(T_HRS, 'bubbles', { dur: T_PULL - T_HRS, gain: 0.6 }); cue(T_PULL, 'slide', { dur: 0.6, gain: 0.5 }); cue(T_DIG, 'pop');

  // 6 · acid, not squeezing
  add({ id: 'S05', at: cut(5), note: 'x-ray stomach close: a new chunk melts away in glowing green acid; "MELTS WITH ACID" vs "NOT JUST SQUEEZING"', draw(lt, d, t, blit) {
    const k = eio(lt / d), s = show(t, { flashK: 0.25, aim: () => { const c = stomachW(); return { pos: lerpV(c.clone().add(V3(0.15, 0.03, 0.58)), c.clone().add(V3(0.1, 0.02, 0.46)), k), at: c, focus: c }; }, look: { aperture: 0.0012 } }); blit();
    if (t > T_MELT - 0.1) pill('IT MELTS FOOD WITH ACID', 540, 300, popIn(t - T_MELT + 0.1), '#111', ACID, 62);
    if (t > T_SQ - 0.15) pill('NOT JUST SQUEEZING', 540, 1150, popIn(t - T_SQ + 0.15), '#FFFFFF', DARK, 64);
  } });
  cue(T_MELT, 'sizzle', { dur: 1.4, gain: 0.6 }); cue(T_ACID, 'bubbles', { dur: 1.2, gain: 0.5 });

  // 7 · 238 experiments
  add({ id: 'S06', at: cut(6), note: 'two-shot: the host dunks the food in and out again and again; counter climbs to 238 EXPERIMENTS', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), flashK: 0.2 }); blit();
    const n = Math.round(238 * eo(seg(t, L(6), T_EXP + 0.3))); pill(`${n} EXPERIMENTS`, 540, 300, 1 + 0.04 * Math.sin(t * 20), '#111', YEL, 84);
  } });
  for (let i = 0; i < 4; i++) cue(L(6) + 0.3 + i * 0.62, 'plop', { gain: 0.4 });

  // 8 · the twist: he outlived his doctor by 27 years (loops back into the hook)
  add({ id: 'S07', at: cut(7), note: 'wide two-shot: "DR. BEAUMONT DIED 1853", "ALEXIS DIED 1880"; on "outlived" Blip goes smug, arms crossed; "+27 YEARS"', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), flashK: 0.2 }); blit();
    if (t > L(7) + 0.1) pill('DOCTOR: DIED 1853', 540, 300, popIn(t - L(7) - 0.1), '#FFFFFF', DARK, 56);
    if (t > T_OUT - 0.1) pill('HOLE GUY: DIED 1880', 540, 410, popIn(t - T_OUT + 0.1), '#111', YEL, 56);
    if (t > T_27 - 0.1) pill('+27 YEARS', 540, 1150, popIn(t - T_27 + 0.1), GRN, DARK, 96);
  } });
  cue(T_OUT, 'boing', { gain: 0.5 }); cue(T_27, 'pop');

  return { shots: S, cues: CUES };
}
