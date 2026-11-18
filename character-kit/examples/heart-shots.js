// YOUR HEART DOESN'T NEED YOUR BRAIN (Body Glitch, host v2 + shape-shifting Blip)
// Blip turns x-ray; his brain is "not needed" and his heart pops out of his chest and keeps beating in mid-air.
// Then: the SA node (its own spark plug), one spark a second, the spark spreads and the heart squeezes, the brain
// only turns the speed dial (BPM up / down), a donor heart carried warm and beating in a glass box, and the heart
// goes home: it has beaten on its own since before you were born (loops back into the hook).
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
const YEL = '#FFD43B', RED = '#FF4D4D', GRN = '#4BE38A', BLUE = '#5BC0FF', DARK = 'rgba(12,14,20,0.82)';
const imp = (x, d = 7) => (x < 0 ? 0 : x < 0.03 ? x / 0.03 : Math.exp(-(x - 0.03) * d));
const pulse = (x) => (x < 0 ? 0 : x < 0.07 ? x / 0.07 : Math.exp(-(x - 0.07) * 7));

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.78, vignette: 0.45, warm: 0.04, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.33, BZ = 0.12;
  const HF = blip.forms.human, XF = blip.forms.xray, XH = XF.human;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_HEART = Wd('heart', 0), T_BRAIN = Wd('brain', 0), T_OUTS = Wd('outside', 0);
  const T_PLUG = Wd('spark', 1), T_TINY = Wd('tiny', 1), T_SA = Wd('the', 1) + 0.25;
  const T_ONCE = Wd('once', 2), T_FIRE = Wd('fires', 2);
  const T_SPREAD = Wd('spreads', 3), T_SQ = Wd('squeezes', 3);
  const T_FAST = Wd('speed', 4), T_SLOW = Wd('slow', 4), T_DS = Wd("doesn't", 4);
  const T_DONOR = Wd('donor', 5), T_CARRY = Wd('carry', 5), T_WARM = Wd('warm', 5), T_BEAT = Wd('beating', 5);
  const T_OWN = Wd('own', 6), T_BEFORE = Wd('before', 6), T_BORN = Wd('born', 6);
  const PLAN = [
    { t: -5, form: 'human' },
    { t: T_HEART, form: 'xray', charge: 0.12 },
    { t: T_BORN, form: 'human', charge: 0.12 },
  ];
  Shifter.cues(PLAN.slice(1), cue);

  // ── the beat clock: bpm(t) integrated; the brain only changes the speed during line 4 ──
  const bpm = (t) => { let b = 60; if (t > T_FAST - 0.1) b = lerp(60, 128, eio(seg(t, T_FAST - 0.1, T_FAST + 0.7))); if (t > T_SLOW - 0.1) b = lerp(128, 44, eio(seg(t, T_SLOW - 0.1, T_SLOW + 0.7))); if (t > T_DS) b = lerp(44, 60, eio(seg(t, T_DS, T_DS + 0.8))); return b; };
  const DT = 0.004, PH = [0]; for (let t = DT; t <= T.dur + 1; t += DT) PH.push(PH[PH.length - 1] + bpm(t) / 60 * DT);
  const phRaw = (t) => PH[Math.max(0, Math.min(PH.length - 1, Math.round(t / DT)))];
  const OFF = Math.ceil(phRaw(T_ONCE)) - phRaw(T_ONCE);                 // a beat lands right on "once"
  const phase = (t) => phRaw(t) + OFF;
  const BEATS = []; for (let i = 1; i < PH.length; i++) if (Math.floor(PH[i] + OFF) > Math.floor(PH[i - 1] + OFF)) BEATS.push(i * DT);
  const lastBeat = (t) => { let b = -9; for (const x of BEATS) { if (x > t) break; b = x; } return b; };

  // ── the big heart (pops out of the chest) with its SA node + spark wave ────
  blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = -0.15; XH.pose({}); blip.group.updateMatrixWorld(true);
  const chestW = () => XF.heart.getWorldPosition(V3(0, 0, 0));
  const WS = XF.heart.getWorldScale(V3(1, 1, 1)).x, BIG = 2.6;          // world scale of the chest heart vs the floating one
  const C0 = chestW(), FP = V3((HX + BX) / 2 + 0.03, C0.y + 0.06, 0.34);
  const heartM = new THREE.MeshPhysicalMaterial({ color: '#D62839', roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.25, emissive: '#D62839', emissiveIntensity: 0.35 });
  const BH = new THREE.Group(), bhMesh = new THREE.Mesh(XF.heart.geometry, heartM); bhMesh.rotation.z = -0.4; BH.add(bhMesh); ST.scene.add(BH);
  const vesM = new THREE.MeshPhysicalMaterial({ color: '#B0203A', roughness: 0.4, clearcoat: 0.6, emissive: '#7A1020', emissiveIntensity: 0.3 });
  for (const [x, z, r, h, a] of [[-0.012, 0.0, 0.012, 0.05, 0.25], [0.016, -0.008, 0.01, 0.045, -0.2]]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, h, 14), vesM); v.position.set(x, 0.065, z); v.rotation.z = a; bhMesh.add(v); }
  const NODE_P = V3(-0.03, 0.045, 0.022), nodeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(YEL) });
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 16, 12), nodeM); node.position.copy(NODE_P); bhMesh.add(node);
  const waveM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFD84A'), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const wave = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), waveM); wave.position.copy(NODE_P); bhMesh.add(wave);
  const nodeL = new THREE.PointLight('#FFD86A', 0, 1.2, 1.6); node.add(nodeL);
  const EM_R = new THREE.Color('#D62839'), EM_Y = new THREE.Color('#FFC83A');

  // ── organ-transport box (glass, cyan edges, handle, two tubes) ─────────────
  const box = new THREE.Group(); ST.scene.add(box);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.3), new THREE.MeshPhysicalMaterial({ color: '#BFEFFF', roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, clearcoat: 1 }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: '#7FE6FF' }));
  const baseM = new THREE.MeshStandardMaterial({ color: '#2E3A48', roughness: 0.5, metalness: 0.4 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.32), baseM); base.position.y = -0.195;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 10, 24, Math.PI), baseM); handle.position.y = 0.17;
  const screenM = new THREE.MeshBasicMaterial({ color: new THREE.Color(GRN).multiplyScalar(0.9) }), scr = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.03), screenM); scr.position.set(0, -0.195, 0.161);
  const tubeM = new THREE.MeshStandardMaterial({ color: '#E8505A', emissive: '#A01828', emissiveIntensity: 0.5, roughness: 0.3 });
  const tubes = [[-0.06, 0.03], [0.07, -0.02]].map(([x, z]) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(x, 0.17, z), V3(x * 0.8, 0.12, z), V3(x * 0.3, 0.07, z * 0.5)]), 16, 0.007, 8), tubeM); return m; });
  const warmL = new THREE.PointLight('#FF9A5A', 0, 0.8, 1.5);
  box.add(glass, edges, base, handle, scr, warmL, ...tubes); box.visible = false;

  // ── brain → heart nerve signals (line 4) ──────────────────────────────────
  const sigUp = new THREE.MeshBasicMaterial({ color: new THREE.Color(GRN).multiplyScalar(1.5) }), sigDn = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.5) }), sigs = [];
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), sigUp); m.visible = false; ST.scene.add(m); sigs.push(m); }

  // ── the host ──────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.2, spine: [-6, 0, 0], head: [0, 18, 0] };
  const HOLD = { ...REST, shR: [58, -18, 26], elR: 22, head: [6, 22, 0], smile: 0.8, brow: [0.6, 0] };
  const act = track([
    { t: 0, pose: { ...REST, head: [0, 16, 0], smile: 0.6 } },
    { t: T_BRAIN - 0.1, d: 0.35, pose: POINT },
    { t: T_OUTS - 0.05, d: 0.15, pose: SHOCK },
    { t: L(1) - 0.05, d: 0.35, pose: POINT },
    { t: L(3) - 0.05, d: 0.35, pose: { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, smile: 0.8, brow: [0.8, 0], head: [-4, 18, 6] } },
    { t: T_FAST - 0.1, d: 0.3, pose: { ...REST, shL: [150, 0, 20], shR: [150, 0, 20], elL: 20, elR: 20, smile: 1, brow: [1, 0], head: [-8, 12, 0] } },
    { t: T_SLOW - 0.1, d: 0.4, pose: { ...REST, shL: [40, 0, 30], shR: [40, 0, 30], elL: 10, elR: 10, smile: 0.3, head: [10, 12, 0], lid: 0.3 } },
    { t: T_DS - 0.1, d: 0.3, pose: { ...POINT, smile: 0.3, brow: [0.9, 0.2] } },
    { t: L(5) - 0.05, d: 0.35, pose: POINT },
    { t: T_CARRY - 0.2, d: 0.35, pose: HOLD },
    { t: L(6) - 0.05, d: 0.35, pose: { ...POINT, smile: 0.8 } },
    { t: T_BEFORE - 0.05, d: 0.4, pose: { ...REST, shL: [40, 0, 55], shR: [40, 0, 55], elL: 30, elR: 30, smile: 1, brow: [0.8, 0] } },
  ]);
  const handW = () => host.arm.R.el.localToWorld(V3(0, -0.25, 0.01));
  const boxAt = () => handW().add(V3(0.0, -0.2, 0.02));

  /** where the big heart is: { show, p, s (×WS), boxK } */
  function heartAt(t) {
    const bob = V3(0, Math.sin(t * 1.6) * 0.012, 0);
    if (t < T_OUTS - 0.05) return { show: false };
    if (t < L(5) - 0.08) { const k = eo(seg(t, T_OUTS - 0.05, T_OUTS + 0.55)), p = lerpV(chestW(), FP, k).add(V3(0, Math.sin(Math.PI * k) * 0.12, 0.0)).add(bob.multiplyScalar(k)); return { show: true, p, s: lerp(1, BIG, eob(k)) }; }
    if (t < L(6) - 0.08) { const bk = eob(seg(t, T_DONOR - 0.2, T_DONOR + 0.25)), mv = eio(seg(t, T_CARRY - 0.2, T_CARRY + 0.5)), c = lerpV(FP.clone().add(V3(0, 0.02, 0)), boxAt(), mv); return { show: true, p: c, s: BIG * 0.9, boxK: bk, boxP: c }; }
    const k = eio(seg(t, L(6) - 0.08, L(6) + 0.75)), from = boxAt(); if (k >= 1) return { show: false };
    return { show: true, p: lerpV(from, chestW(), k).add(V3(0, Math.sin(Math.PI * k) * 0.08, 0)), s: lerp(BIG * 0.9, 1, eio(k)), boxK: 1 - clamp(k * 3), boxP: from };
  }

  /** one frame */
  function show(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = o.turn ?? -0.15;
    const s = blip.update(t, PLAN, {}), f = blip.current, h = f.human;
    if (o.flashK != null) { blip.flash.visible = false; blip.ring.material.opacity *= 0.5; f.mats.forEach((m) => { if (!m.uniforms && m.emissive) m.emissiveIntensity *= 0.25 + 0.75 * o.flashK; if (m.uniforms?.uS) m.uniforms.uS.value = 1.15 + (m.uniforms.uS.value - 1.15) * o.flashK; }); blip.light.intensity *= o.flashK; }
    const w = Math.sin(t * 2.2), hd = heartAt(t);
    if (s.form === 'xray') {
      f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gas.forEach((g) => (g.visible = false)); f.kidneys.forEach((k) => (k.visible = false));
      let q = { spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [4, 0, 20], shR: [4, 0, 20], elL: 16, elR: 16 };
      if (t > T_OUTS - 0.05 && t < L(1)) { const j = imp(t - T_OUTS + 0.05, 4); q = { spine: [-10 * j, 0, 0], head: [-10 * j, 0, 0], shL: [10 + 30 * j, 0, 20 + 30 * j], shR: [10 + 30 * j, 0, 20 + 30 * j], elL: 30, elR: 30 }; }
      h.pose(q);
      const away = hd.show || (t > T_OUTS && t < L(6) + 0.5);
      f.heart.visible = !away;
      // the brain is "not needed": it dims after "brain"
      const dim = t > T_BRAIN && t < L(4) - 0.08 ? 0.15 : 1; f.brain.material.emissiveIntensity *= dim;
    }
    blip.group.updateMatrixWorld(true);
    // host
    const p0 = drag(act, t), pz = alive(p0, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0); host.group.updateMatrixWorld(true);
    // big heart: beat → spark from the SA node → wave spreads → squeeze
    BH.visible = !!hd.show; const lb = lastBeat(t), since = t - lb, sq = pulse(since - 0.12), sp = clamp(since / 0.22), spark = since < 0.4 ? 1 - clamp(since / 0.35) : 0;
    if (hd.show) {
      BH.position.copy(hd.p); BH.scale.setScalar(WS * hd.s * (1 - 0.13 * sq)); BH.rotation.set(0, Math.sin(t * 0.7) * 0.3, 0);
      const spread = since < 0.5 ? (1 - clamp((since - 0.2) / 0.25)) * clamp(since / 0.12) : 0;
      heartM.emissive.copy(EM_R).lerp(EM_Y, 0.3 * spread); heartM.emissiveIntensity = 0.35 + 0.7 * sq + 0.25 * spread;
      nodeM.color.set(YEL).multiplyScalar(1 + 2.5 * spark); node.scale.setScalar(1 + 0.8 * spark); nodeL.intensity = 0.6 * spark * (o.nodeLight ?? 1);
      wave.visible = since < 0.32; wave.scale.setScalar(0.004 + 0.062 * eo(sp)); waveM.opacity = 0.14 * (1 - sp) * (o.wave ?? 0.5);
    }
    box.visible = !!(hd.boxK > 0.01); if (box.visible) { box.position.copy(hd.boxP); box.scale.setScalar(hd.boxK); box.rotation.y = -0.25; warmL.intensity = t > T_WARM - 0.1 ? 0.6 : 0; screenM.color.set(GRN).multiplyScalar(0.6 + 0.8 * sq); }
    // nerve signals brain → heart while the brain turns the dial
    const sigOn = t > T_FAST - 0.1 && t < T_DS && hd.show, bw = XF.brain.getWorldPosition(V3(0, 0, 0));
    sigs.forEach((m, i) => { m.visible = sigOn && s.form === 'xray'; if (!m.visible) return; const k = (t * 1.4 + i / sigs.length) % 1; m.material = t < T_SLOW - 0.1 ? sigUp : sigDn; m.position.copy(lerpV(bw, hd.p, k)).add(V3(0, Math.sin(k * Math.PI) * 0.08, 0)); });
    ST.setMood(Math.max(s.xray * (o.xk ?? 1), o.mood ?? 0.15));
    // camera
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + s.xray * 0.12, bloomThreshold: lerp(0.78, 0.55, s.xray), ...(o.look || {}) });
    return { ...s, hd, sq, spark, since };
  }
  const WIDE = (k) => ({ pos: lerpV(V3(0.03, 1.02, 4.45), V3(0.06, 1.0, 4.1), k), at: V3(0.04, 0.9, 0), focus: V3(0.04, 0.9, 0.05), look: { aperture: 0.0016 }, xk: 0.62 });
  const TWO = (k) => ({ pos: lerpV(V3(0.07, 1.0, 3.95), V3(0.08, 0.99, 3.6), k), at: V3(0.06, 0.9, 0), focus: V3(0.05, 0.92, 0.25), look: { aperture: 0.0016 }, xk: 0.62 });
  const CLOSE = (k, d0 = 1.25, d1 = 0.95, sx = 0.14) => { const c = heartAt(Math.max(T_OUTS + 0.6, 0)).p || FP; return { pos: lerpV(FP.clone().add(V3(sx, 0.05, d0)), FP.clone().add(V3(sx * 0.7, 0.03, d1)), k), at: FP.clone().add(V3(0, 0.01, 0)), focus: FP.clone(), look: { aperture: 0.0012 }, xk: 1 }; };
  const mixCam = (a, b, k) => ({ ...b, pos: lerpV(a.pos, b.pos, k), at: lerpV(a.at, b.at, k), focus: lerpV(a.focus, b.focus, k), xk: lerp(a.xk, b.xk, k), look: { aperture: lerp(a.look.aperture, b.look.aperture, k) } });
  const beatCues = (a, b, gain, zip = 0) => BEATS.filter((x) => x >= a && x < b).forEach((x) => { cue(x + 0.12, 'heartbeat', { gain }); if (zip) cue(x, 'zip', { gain: zip }); });

  // 1 · hook: x-ray Blip, the brain is not needed, the heart pops out and keeps beating in mid-air
  add({ id: 'S00', at: 0, note: 'closer two-shot: Blip turns x-ray on "heart"; on "brain" the brain dims + "NOT NEEDED"; on "outside" the heart pops out of his chest and floats between them, still beating', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.08, 1.0, 3.55), V3(0.08, 0.99, 3.2), eio(lt / d)), at: V3(0.06, 0.92, 0), focus: V3(0.1, 0.92, 0.2), look: { aperture: 0.0016 }, xk: 0.7, flashK: 0.3 }); blit();
    pill("YOUR HEART DOESN'T NEED YOUR BRAIN", 540, 300, 1, '#FFFFFF', 'rgba(190,16,24,0.95)', 50);
    if (t > T_BRAIN + 0.05 && t < T_OUTS) { const [x, y] = screen(XF.brain.getWorldPosition(V3(0, 0, 0)), cam); label('BRAIN', 860, 560, x, y, eob(seg(t, T_BRAIN + 0.05, T_BRAIN + 0.35))); pill('❌ NOT NEEDED', 540, 1150, popIn(t - T_BRAIN - 0.2), '#FFFFFF', DARK, 66); }
    if (t > T_OUTS + 0.1) pill('IT BEATS OUTSIDE YOUR BODY', 540, 1150, popIn(t - T_OUTS - 0.1), '#111', YEL, 62);
  } });
  cue(T_BRAIN + 0.05, 'pop'); cue(T_OUTS - 0.05, 'whoosh'); cue(T_OUTS + 0.3, 'plop', { gain: 0.9 });
  beatCues(T_OUTS + 0.4, L(1), 0.7);

  // 2 · its own spark plug: the SA node
  add({ id: 'S01', at: cut(1), note: 'two-shot, host points at the floating heart; "ITS OWN SPARK PLUG ⚡"; on "S. A." push in close to the glowing yellow SA node: label "SA NODE"', draw(lt, d, t, blit) {
    const k = eio(seg(t, T_TINY - 0.2, T_SA + 0.3)), s = show(t, { ...mixCam(TWO(eio(lt / d)), CLOSE(eio(seg(t, T_SA, Le(1) + 0.3)), 1.15, 0.95), k), flashK: 0.3 }); blit();
    if (t > T_PLUG - 0.1) pill('⚡ ITS OWN SPARK PLUG', 540, 300, popIn(t - T_PLUG + 0.1), '#111', YEL, 66);
    if (t > T_SA - 0.05) { const [x, y] = screen(node.getWorldPosition(V3(0, 0, 0)), cam); label('SA NODE', 820, 700, x, y, eob(seg(t, T_SA - 0.05, T_SA + 0.3))); pill('A TINY PATCH OF CELLS', 540, 1150, popIn(t - T_SA - 0.15), '#FFFFFF', DARK, 58); }
  } });
  cue(T_PLUG, 'zip', { gain: 0.6 }); cue(T_SA, 'sparkle', { gain: 0.6 });
  beatCues(L(1) - 0.08, L(2), 0.55);

  // 3 · once a second it fires a spark
  add({ id: 'S02', at: cut(2), note: 'mid shot (host + floating heart): every second the SA node flashes and a glowing wave bursts out; spark counter "⚡ 1 SPARK / SECOND"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(-0.04, 1.0, 2.55), V3(-0.02, 0.99, 2.3), eio(lt / d)), at: V3(-0.05, FP.y - 0.06, 0.15), focus: FP, look: { aperture: 0.0014 }, xk: 0.75, flashK: 0.3, nodeLight: 1.6 }); blit();
    if (t > T_ONCE - 0.1) pill('⚡ 1 SPARK EVERY SECOND', 540, 300, popIn(t - T_ONCE + 0.1) * (1 + 0.06 * s.spark), '#111', YEL, 64);
    if (t > T_FIRE - 0.1) { const n = BEATS.filter((x) => x >= T_ONCE - 0.05 && x <= t).length; pill(`SPARK #${n}`, 540, 1150, popIn(t - T_FIRE + 0.1) * (1 + 0.1 * s.spark), '#FFFFFF', DARK, 66); }
  } });
  beatCues(L(2) - 0.08, L(3), 0.7, 0.45);

  // 4 · the spark spreads, the whole heart squeezes (close payoff)
  add({ id: 'S03', at: cut(3), note: 'close-up on the heart: the yellow spark wave washes over it and the whole heart squeezes on each beat; "SPARK → SQUEEZE"', draw(lt, d, t, blit) {
    const s = show(t, { ...CLOSE(eio(lt / d), 1.05, 0.85, -0.12), flashK: 0.3, wave: 1.0 }); blit();
    if (t > T_SPREAD - 0.1) pill('⚡ SPARK → 💪 SQUEEZE', 540, 300, popIn(t - T_SPREAD + 0.1), '#111', YEL, 66);
    if (t > T_SQ - 0.1) pill('THE WHOLE HEART SQUEEZES', 540, 1150, popIn(t - T_SQ + 0.1) * (1 + 0.08 * s.sq), '#FFFFFF', 'rgba(190,16,24,0.92)', 60);
  } });
  beatCues(L(3) - 0.08, L(4), 0.9, 0.35);

  // 5 · the brain only turns the speed dial
  add({ id: 'S04', at: cut(4), note: 'two-shot: green nerve signals stream from Blip\'s brain to the heart: BPM climbs to 128 (host cheers), blue signals: BPM drops to 44; "IT DOESN\'T START THE BEAT"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), flashK: 0.3 }); blit();
    pill('🧠 BRAIN = SPEED DIAL ONLY', 540, 300, popIn(t - L(4) - 0.1), '#FFFFFF', DARK, 58);
    const b = Math.round(bpm(t)), col = b > 75 ? GRN : b < 52 ? BLUE : '#FFFFFF';
    if (t < T_DS - 0.05) pill(`💓 ${b} BPM ${t > T_SLOW - 0.1 ? '▼' : t > T_FAST - 0.1 ? '▲' : ''}`, 540, 1150, popIn(t - L(4) - 0.2) * (1 + 0.06 * s.sq), '#111', col, 76);
    else pill("BUT IT DOESN'T START IT", 540, 1150, popIn(t - T_DS + 0.05), '#FFFFFF', 'rgba(190,16,24,0.92)', 62);
  } });
  cue(T_FAST, 'zip', { gain: 0.5 }); cue(T_SLOW, 'slide', { dur: 0.6, gain: 0.5 }); cue(T_DS, 'thud', { gain: 0.6 });
  beatCues(L(4) - 0.08, L(5), 0.6);

  // 6 · donor heart carried in a machine, warm and beating
  add({ id: 'S05', at: cut(5), note: 'two-shot: a glass organ box with tubes pops up around the floating heart; the host picks it up by the handle; it keeps beating inside, warm glow: "DONOR HEART", "STILL BEATING"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), flashK: 0.3 }); blit();
    if (t > T_DONOR - 0.1) pill('DONOR HEART · IN A BOX', 540, 300, popIn(t - T_DONOR + 0.1), '#111', YEL, 64);
    if (t > T_WARM - 0.1) pill(t > T_BEAT - 0.1 ? '🔥 WARM · 💓 STILL BEATING' : '🔥 STILL WARM', 540, 1150, popIn(t - T_WARM + 0.1) * (1 + 0.05 * s.sq), '#FFFFFF', DARK, 60);
  } });
  cue(T_DONOR, 'pop'); cue(T_CARRY + 0.1, 'whoosh', { gain: 0.6 });
  beatCues(L(5) - 0.08, L(6), 0.6);

  // 7 · it goes home: beating on its own since before you were born (loops into the hook)
  add({ id: 'S06', at: cut(6), note: 'wide two-shot: the heart flies back into Blip\'s chest; "ON ITS OWN"; "SINCE BEFORE YOU WERE BORN"; on "born" Blip turns back to normal (loops to the hook)', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), flashK: 0.3 }); blit();
    if (t > T_OWN - 0.1) pill('💓 BEATING ON ITS OWN', 540, 300, popIn(t - T_OWN + 0.1), '#111', YEL, 64);
    if (t > T_BEFORE - 0.1) pill('SINCE BEFORE YOU WERE BORN', 540, 1150, popIn(t - T_BEFORE + 0.1), '#FFFFFF', 'rgba(190,16,24,0.92)', 58);
    if (t > T_BORN - 0.05) pill('STARTS ~3 WEEKS AFTER CONCEPTION', 540, 1280, popIn(t - T_BORN + 0.05), '#FFFFFF', DARK, 42);
  } });
  cue(L(6) + 0.1, 'whoosh', { gain: 0.6 }); cue(L(6) + 0.75, 'gulp', { gain: 0.6 }); cue(T_BEFORE, 'pop');

  return { shots: S, cues: CUES };
}
