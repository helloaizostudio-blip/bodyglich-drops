// WHY YOU CAN'T TICKLE YOURSELF (Body Glitch, new format + Blip transformations + twist)
// Frame 1: Blip is already mid-transformation (flash in the first half-second) into human-Blip who tickles his own side:
// "😐 NOTHING". X-ray: the brain sends a PREDICT signal to the hand, then a red CANCEL stamp. The host tickles him and he
// cracks up. Twist: a tickle robot with a 0.2 s delay — his own tickle works. Back to Blip for the comment question.
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
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const YEL = '#FFD43B', RED = '#FF4D4D', GRN = '#4BE38A', DARK = 'rgba(12,14,20,0.85)';
const imp = (x, d = 7) => (x < 0 ? 0 : x < 0.03 ? x / 0.03 : Math.exp(-(x - 0.03) * d));

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.06);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.78, vignette: 0.45, warm: 0.04, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.3, BZ = 0.12;
  const HF = blip.forms.human, XF = blip.forms.xray, HH = HF.human, XH = XF.human;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_TICK = Wd('tickle', 0), T_WORK = Wd('work', 0);
  const T_BRAIN = Wd('brain', 1), T_PRED = Wd('predicts', 1), T_HAND = Wd('hand', 1);
  const T_CANC = Wd('cancels', 2), T_ARR = Wd('arrives', 2);
  const T_ELSE = Wd('someone', 3), T_HARD = Wd('harder', 3);
  const T_TWIST = Wd('twist', 4), T_ROBOT = Wd('robot', 4), T_TRICK = Wd('trick', 4);
  const T_DELAY = Wd('delay', 5), T_FIFTH = Wd('fifth', 5), T_WORKS = Wd('work', 5);
  const T_TICKL = Wd('ticklish', 6), T_COMM = Wd('comments', 6);
  const PLAN = [{ t: 0.4, form: 'human', charge: 0.35 }, { t: L(1) + 0.1, form: 'xray' }, { t: L(3) - 0.06, form: 'human', charge: 0.12 }, { t: L(6) + 0.15, form: 'blip' }];
  Shifter.cues(PLAN, cue);

  // ── the tickle robot: a pillar, a jointed arm and a yellow feather tip ──
  const grey = new THREE.MeshStandardMaterial({ color: '#8A93A3', metalness: 0.6, roughness: 0.35 }), darkg = new THREE.MeshStandardMaterial({ color: '#2C313A', metalness: 0.4, roughness: 0.4 });
  const robot = new THREE.Group(); robot.position.set(BX + 0.42, 0, BZ + 0.05); ST.scene.add(robot);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.08, 24), darkg); base.position.y = 0.04; robot.add(base);
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.06), grey); pillar.position.y = 0.39; robot.add(pillar);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#4BE3FF').multiplyScalar(1.5) })); eye.position.set(0, 0.66, 0.035); robot.add(eye);
  const shoulder = new THREE.Group(); shoulder.position.set(0, 0.62, 0); robot.add(shoulder);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), grey); arm.position.x = -0.15; shoulder.add(arm);
  const featherM = new THREE.MeshStandardMaterial({ color: '#FFE066', emissive: '#FFB000', emissiveIntensity: 0.4, roughness: 0.6 });
  const feather = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 12), featherM); feather.rotation.z = Math.PI / 2; feather.position.x = -0.34; shoulder.add(feather);
  robot.visible = false;
  // brain → hand prediction signal
  const sigM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7FE8FF').multiplyScalar(1.7) }), sigs = [];
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), sigM); m.visible = false; ST.scene.add(m); sigs.push(m); }

  // ── host ──────────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const TICKLE = { ...REST, shR: [64, -16, 40], elR: 46, head: [6, 22, 0], smile: 1.1, brow: [0.9, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.2, spine: [-6, 0, 0], head: [6, 18, 0] };
  const SHRUG = { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, smile: 0.8, brow: [0.8, 0], head: [-4, 18, 6] };
  const act = track([{ t: 0, pose: { ...SHRUG, smile: 0.3 } }, { t: L(1) - 0.05, d: 0.3, pose: POINT }, { t: L(3) - 0.05, d: 0.25, pose: TICKLE }, { t: T_TWIST - 0.05, d: 0.25, pose: SHOCK }, { t: L(5) - 0.05, d: 0.3, pose: POINT }, { t: L(6) - 0.05, d: 0.3, pose: { ...SHRUG, smile: 1 } }]);

  const laughK = (t) => (t > T_ELSE - 0.1 && t < Le(3) + 0.1 ? 1 : t > T_WORKS - 0.3 && t < L(6) + 0.1 ? 1 : 0);
  const robotOn = (t) => t > L(4) - 0.06 && t < L(6) - 0.06;

  function show(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.set(0, o.turn ?? -0.15, 0);
    const w = Math.sin(t * 2.2), lk = laughK(t), sh = Math.sin(t * 30);
    const bq = t < 0.3 ? { y: 0.03, squash: 0.08 * Math.sin(t * 30), armL: 60, armR: 60, smile: 1 } : { y: 0.06 * Math.abs(Math.sin(t * 6)), armR: 150 + 20 * Math.sin(t * 10), armL: 20, smile: 1, mouth: t > T_COMM ? 0.4 : 0 };
    const s = blip.update(t, PLAN, { blip: bq }), f = blip.current, h = f.human;
    blip.light.intensity *= 0.45; blip.flash.material.opacity *= 0.7;
    if (h) {
      const self = t < L(3) - 0.06 && t > 0.4;                  // tickling himself (hook, x-ray lines)
      let q = { spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24 };
      if (self) q = { ...q, shR: [14, -55, -8], elR: 95 + 12 * sh, head: [12, 0, 0] };
      if (lk) q = { spine: [-10 + 6 * sh, 4 * sh, 6 * sh], head: [-18 + 8 * sh, 6 * sh, 0], shL: [20, 0, 40], shR: [20, 0, 40], elL: 100, elR: 100, knL: 10, knR: 10 };
      if (robotOn(t) && !lk) q = { ...q, shL: [40, 0, 60], elL: 30 };
      h.pose(q);
      if (s.form === 'human') f.face.set({ smile: lk ? 1.3 : self ? -0.15 : 0.8, lid: lk ? 0.7 : 0, look: self && !lk ? [0.2, -0.4] : [0, 0] });
    }
    if (s.form === 'xray') { f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gas.forEach((g) => (g.visible = false)); f.kidneys.forEach((k) => (k.visible = false));
      const al = t > T_BRAIN - 0.1 ? 0.5 + 0.5 * Math.sin(t * 10) : 0; f.brain.material.emissiveIntensity = 0.3 + al; }
    blip.group.updateMatrixWorld(true);
    // robot arm tickles his side (left side, facing the robot)
    robot.visible = robotOn(t); if (robot.visible) { const reach = eio(seg(t, T_ROBOT - 0.2, T_ROBOT + 0.4)); shoulder.rotation.z = -0.55 + 0.12 * reach + (t > T_DELAY ? 0.06 * Math.sin(t * 26) : 0); shoulder.position.x = 0.04 * (1 - reach); eye.material.color.set(t > T_FIFTH ? '#4BE38A' : '#4BE3FF').multiplyScalar(1.5); }
    // prediction signal brain → hand (x-ray)
    const sOn = s.form === 'xray' && t > T_PRED - 0.05 && t < L(2) + 0.5;
    if (sOn) { const path = [f.brain.getWorldPosition(V3()), XH.head.localToWorld(V3(0, 0.02, 0)), XH.arm.R.sh.getWorldPosition(V3()), XH.arm.R.el.getWorldPosition(V3()), XH.arm.R.el.localToWorld(V3(0, -0.24, 0))], k = ((t - T_PRED) * 1.2) % 1;
      sigs.forEach((m, i) => { const u = clamp(k * 1.2 - i * 0.03), x = u * (path.length - 1), j = Math.min(path.length - 2, Math.floor(x)); m.visible = u > 0 && u < 1; m.position.copy(lerpV(path[j], path[j + 1], x - j)); }); }
    else sigs.forEach((m) => (m.visible = false));
    const p0 = drag(act, t), pz = alive(p0, t, { seed: 6, talk: mouthFor(t) }); if (t > L(3) - 0.06 && t < Le(3)) pz.elR = (pz.elR || 0) + 18 * Math.sin(t * 26); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0); host.group.visible = !o.noHost; host.group.updateMatrixWorld(true);
    ST.setMood(Math.max(s.xray * 0.75, 0.12));
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + s.xray * 0.12, bloomThreshold: lerp(0.78, 0.55, s.xray), ...(o.look || {}) });
    return { ...s, lk };
  }
  const TWO = (k) => ({ pos: lerpV(V3(0.1, 1.0, 3.5), V3(0.14, 0.98, 3.15), k), at: V3(0.08, 0.88, 0), focus: V3(0.12, 0.88, BZ), look: { aperture: 0.0016 } });
  const MED = (k) => ({ pos: lerpV(V3(0.32, 1.02, 2.9), V3(0.32, 1.0, 2.6), k), at: V3(0.3, 0.86, 0), focus: V3(BX, 0.8, BZ), look: { aperture: 0.0014 } });
  const ROBO = (k) => ({ pos: lerpV(V3(0.4, 1.05, 3.7), V3(0.42, 1.03, 3.4), k), at: V3(0.42, 0.86, 0), focus: V3(BX + 0.2, 0.75, BZ), look: { aperture: 0.0014 } });

  // 1 · hook: transforming in the first half-second, then tickling himself — nothing
  add({ id: 'S00', at: 0, note: 'medium: Blip already charging at frame 1 and pops (flash/ring/sparks) into human-Blip at 0.4 s, who tickles his own side with a deadpan face: "😐 NOTHING"', draw(lt, d, t, blit) {
    const up = eio(seg(t, 0.25, 0.85)), m0 = MED(eio(lt / d)); m0.at = m0.at.clone(); m0.at.y = lerp(0.45, 0.86, up); m0.pos = m0.pos.clone(); m0.pos.y = lerp(0.62, m0.pos.y, up); m0.pos.z -= 0.6 * (1 - up);
    const s = show(t, { ...m0, noHost: true }); blit();
    pill('TRY TO TICKLE YOURSELF 🤭', 540, 300, 1 + 0.04 * Math.sin(t * 10), '#FFFFFF', 'rgba(190,16,24,0.95)', 60);
    if (t > T_WORK - 0.2) pill('😐 NOTHING', 540, 1180, popIn(t - T_WORK + 0.2), '#111', YEL, 80);
  } });
  cue(T_WORK, 'tock', { gain: 0.6 });

  // 2 · x-ray: the brain predicts the hand
  add({ id: 'S01', at: cut(1), note: 'medium x-ray: still tickling himself; the brain glows and blue PREDICT signals race down to his hand', draw(lt, d, t, blit) {
    const s = show(t, { ...MED(0.5 + 0.5 * eio(lt / d)), noHost: true }); blit();
    if (t > T_PRED - 0.1) pill('🧠 PREDICTS YOUR HAND', 540, 300, popIn(t - T_PRED + 0.1), '#111', YEL, 60);
  } });
  cue(T_PRED, 'zip', { dur: 0.6, gain: 0.5 });

  // 3 · cancels the feeling
  add({ id: 'S02', at: cut(2), note: 'same x-ray: a big red "CANCELLED" stamp slams over the tickle', draw(lt, d, t, blit) {
    const s = show(t, { ...MED(1), noHost: true }); blit();
    if (t > T_CANC - 0.05) { const a = popIn(t - T_CANC + 0.05, 0.25); ctx.save(); ctx.translate(540, 820); ctx.rotate(-0.18); ctx.scale(a * (1 + 0.6 * imp(t - T_CANC, 9)), a * (1 + 0.6 * imp(t - T_CANC, 9))); ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = 16; ctx.strokeRect(-330, -85, 660, 170); ctx.fillStyle = '#FF3B3B'; ctx.font = '900 110px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('CANCELLED', 0, 6); ctx.restore(); }
    if (t > T_ARR - 0.1) pill('BEFORE YOU FEEL IT', 540, 1180, popIn(t - T_ARR + 0.1), '#FFFFFF', DARK, 62);
  } });
  cue(T_CANC, 'slam', { gain: 0.8 });

  // 4 · someone else's tickle hits harder
  add({ id: 'S03', at: cut(3), note: 'two-shot: the host tickles human-Blip, who cracks up and squirms: "🤣 SOMEONE ELSE = WORKS"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)) }); blit();
    if (t > T_ELSE - 0.1) pill('🤣 SOMEONE ELSE? IT WORKS', 540, 300, popIn(t - T_ELSE + 0.1), '#111', GRN, 56);
    if (s.lk) { ctx.save(); ctx.font = '900 70px Inter'; ctx.fillStyle = '#FFFFFF'; for (let i = 0; i < 3; i++) { const ph = (t * 1.4 + i / 3) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.fillText('HA', 760 + 60 * Math.sin(i * 2 + t * 3), 760 - ph * 260); } ctx.restore(); }
  } });
  cue(T_ELSE + 0.1, 'boing', { gain: 0.5 }); cue(T_HARD, 'pop');

  // 5 · the twist: a tickle robot
  add({ id: 'S04', at: cut(4), note: 'wider medium: "🤯 THE TWIST"; a little robot with a feather arm rolls in beside Blip and reaches for his side', draw(lt, d, t, blit) {
    const s = show(t, { ...ROBO(eio(lt / d)) }); blit();
    if (t > T_TWIST - 0.1) pill('🤯 THE TWIST', 540, 300, popIn(t - T_TWIST + 0.1) * (1 + 0.05 * Math.sin(t * 12)), '#FFFFFF', 'rgba(190,16,24,0.95)', 72);
    if (t > T_ROBOT - 0.1) pill('🤖 A TICKLE ROBOT', 540, 1180, popIn(t - T_ROBOT + 0.1), '#111', YEL, 66);
  } });
  cue(T_ROBOT, 'whoosh', { gain: 0.5 }); cue(T_TRICK, 'pop');

  // 6 · 0.2 s delay → it tickles
  add({ id: 'S05', at: cut(5), note: 'same: a delay timeline (YOU MOVE ➜ 0.2 s ➜ TOUCH); the robot feather wiggles and Blip bursts out laughing', draw(lt, d, t, blit) {
    const s = show(t, { ...ROBO(1 - 0.3 * eio(lt / d)) }); blit();
    if (t > T_DELAY - 0.1) { const a = popIn(t - T_DELAY + 0.1); ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = DARK; ctx.beginPath(); ctx.roundRect(110, 400, 860, 120, 60); ctx.fill(); ctx.font = '900 44px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF'; ctx.fillText('YOU MOVE', 270, 475); ctx.fillText('TOUCH', 830, 475); ctx.fillStyle = YEL; ctx.fillText('➜ ⏱ 0.2 s ➜', 545, 475); ctx.restore(); }
    if (t > T_FIFTH - 0.1) pill('1/5 SECOND DELAY', 540, 300, popIn(t - T_FIFTH + 0.1), '#111', YEL, 66);
    if (t > T_WORKS - 0.15) pill('🤣 NOW IT TICKLES!', 540, 1180, popIn(t - T_WORKS + 0.15), '#111', GRN, 66);
    if (s.lk) { ctx.save(); ctx.font = '900 70px Inter'; ctx.fillStyle = '#FFFFFF'; for (let i = 0; i < 3; i++) { const ph = (t * 1.4 + i / 3) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.fillText('HA', 640 + 60 * Math.sin(i * 2 + t * 3), 820 - ph * 260); } ctx.restore(); }
  } });
  cue(T_FIFTH, 'tock', { gain: 0.6 }); cue(T_WORKS, 'boing', { gain: 0.6 });

  // 7 · back to Blip: comment question
  add({ id: 'S06', at: cut(6), note: 'two-shot lowering: human-Blip transforms back into little Blip who bounces and waves: "ARE YOU TICKLISH? ✅ / ❌"', draw(lt, d, t, blit) {
    const k7 = eio(seg(t, PLAN[3].t - 0.1, PLAN[3].t + 0.5)), s = show(t, { pos: lerpV(V3(0.1, 1.0, 3.3), V3(0.14, 0.72, 2.6), k7), at: lerpV(V3(0.08, 0.88, 0), V3(0.14, 0.5, 0), k7), focus: V3(BX, 0.5, BZ), look: { aperture: 0.0016 } }); blit();
    pill('ARE YOU TICKLISH? 👇', 540, 300, popIn(t - L(6)) * (1 + 0.04 * Math.sin(t * 10)), '#FFFFFF', 'rgba(190,16,24,0.95)', 66);
    if (t > T_COMM - 0.3) { pill('✅ YES', 340, 1180, popIn(t - T_COMM + 0.3), '#111', GRN, 64); pill('❌ NO', 740, 1180, popIn(t - T_COMM + 0.15), '#FFFFFF', RED, 64); }
  } });
  cue(L(6), 'pop'); cue(T_COMM, 'pop');

  return { shots: S, cues: CUES };
}
