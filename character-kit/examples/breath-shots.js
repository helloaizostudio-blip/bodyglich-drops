// WHY YOU CAN'T HOLD YOUR BREATH FOREVER (Body Glitch, host v2 + shape-shifting Blip)
// Hook: Blip puffs his cheeks, a stopwatch races to 24:37 (Budimir Šobat's record), "but you can't hold yours forever".
// Then: the record on pure oxygen; it's not low oxygen that makes you gasp; it's CO2 building up (grey bubbles fill
// the x-ray body); the brain alarms and the diaphragm twitches; he passes out; the brain takes over: one huge gasp.
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
const YEL = '#FFD43B', RED = '#FF4D4D', GRN = '#4BE38A', BLUE = '#5EC8FF', GREY = '#C9CED8', DARK = 'rgba(12,14,20,0.82)';
const imp = (x, d = 7) => (x < 0 ? 0 : x < 0.03 ? x / 0.03 : Math.exp(-(x - 0.03) * d));

function meter(x, y, w, k, col, txt) {
  ctx.save(); ctx.fillStyle = 'rgba(12,14,20,0.82)'; ctx.beginPath(); ctx.roundRect(x - w / 2 - 18, y - 58, w + 36, 116, 58); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 40, w, 80, 40); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 40, Math.max(80, w * k), 80, 40); ctx.fill();
  ctx.font = '900 54px Inter'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 2); ctx.restore();
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
  const T_24 = Wd('twenty', 0), T_CANT = Wd("can't", 0), T_FOREVER = Wd('forever', 0);
  const T_NAME = Wd('Budimir', 1), T_REC = Wd('record', 1), T_2021 = Wd('twenty', 1), T_OXY = Wd('oxygen', 1);
  const T_HOLD = Wd('hold', 2), T_NOT = Wd('not', 2), T_O2 = Wd('oxygen', 2), T_GASP = Wd('gasp', 2);
  const T_CO2 = Wd('carbon', 3), T_BUILD = Wd('building', 3), T_BLOOD = Wd('blood', 3);
  const T_BRAIN = Wd('brain', 4), T_SENSE = Wd('senses', 4), T_DIA = Wd('diaphragm', 4), T_TWITCH = Wd('twitch', 4);
  const T_KEEP = Wd('holding', 5), T_PASS = Wd('pass', 5);
  const T_SEC = Wd('second', 6), T_TAKES = Wd('takes', 6), T_BREATH = Wd('breathing', 6);
  const PLAN = [{ t: -5, form: 'human' }, { t: L(2) - 0.08, form: 'xray', charge: 0.02 }, { t: L(5) - 0.08, form: 'human', charge: 0.02 }, { t: T_SEC - 0.1, form: 'xray', charge: 0.02 }];
  Shifter.cues(PLAN.slice(1), cue);

  // ── puffed cheeks, oxygen tank, CO2 bubbles, nerve signal ─────────────────
  const skin = new THREE.MeshStandardMaterial({ color: '#8EDCEA', roughness: 0.5 });
  const puffs = [-1, 1].map((sx) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin); m.position.set(sx * 0.05, 0.085, 0.1); m.scale.set(0.04, 0.035, 0.035); HH.head.add(m); return m; });
  const tank = new THREE.Group(); { const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.55, 8, 20), new THREE.MeshStandardMaterial({ color: '#2FBF71', roughness: 0.35, metalness: 0.3 })); body.position.y = 0.34; const top = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.07, 16), new THREE.MeshStandardMaterial({ color: '#EDEDED', metalness: 0.6, roughness: 0.3 })); top.position.y = 0.69; tank.add(body, top); body.castShadow = true; }
  tank.position.set(BX + 0.27, 0, BZ - 0.05); ST.scene.add(tank);
  XF.gasM.color.set(GREY).multiplyScalar(1.1);
  const gasP = XF.gas.map((g, i) => V3((hash(i) - 0.5) * 0.22, 0.02 + hash(i + 9) * 0.42, -0.04 + hash(i + 3) * 0.1));
  const sigM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF5A3A').multiplyScalar(1.6) }), sigs = [];
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), sigM); m.visible = false; ST.scene.add(m); sigs.push(m); }
  const brainM = XF.brain.material;

  // ── the host ──────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.2, spine: [-6, 0, 0], head: [6, 18, 0] };
  const SHRUG = { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, smile: 0.8, brow: [0.8, 0], head: [-4, 18, 6] };
  const act = track([
    { t: 0, pose: POINT }, { t: T_CANT - 0.05, d: 0.3, pose: { ...SHRUG, smile: 0.3 } },
    { t: L(1) - 0.05, d: 0.35, pose: POINT }, { t: T_OXY - 0.05, d: 0.3, pose: SHRUG },
    { t: L(2) - 0.05, d: 0.35, pose: POINT }, { t: L(5) - 0.05, d: 0.3, pose: POINT }, { t: T_PASS - 0.05, d: 0.2, pose: SHOCK },
    { t: T_BREATH - 0.05, d: 0.35, pose: { ...SHRUG, smile: 1 } },
  ]);

  // ── body state ────────────────────────────────────────────────────────────
  const co2K = (t) => (t < L(3) - 0.08 ? 0.12 : t < L(5) - 0.08 ? 0.12 + 0.88 * eio(seg(t, T_CO2 - 0.1, Le(3))) : t < T_BREATH ? 1 : 1 - eio(seg(t, T_BREATH, T_BREATH + 1.0)));
  const faintK = (t) => (t < L(5) - 0.08 ? 0 : t < T_PASS - 0.05 ? 0.15 * Math.sin(t * 9) ** 2 : t < T_BREATH + 0.3 ? eob(seg(t, T_PASS - 0.05, T_PASS + 0.45)) : 1 - eio(seg(t, Le(6) - 0.5, Le(6) + 0.2)));
  const gaspK = (t) => imp(t - T_BREATH + 0.05, 1.6);
  const holdK = (t) => (t < L(2) - 0.08 ? 1 : t > L(5) - 0.08 && t < T_PASS ? 1 : 0);

  /** one frame */
  function show(t, o) {
    const fk = faintK(t);
    blip.group.position.set(BX, -0.2 * fk, BZ + 0.03 * fk); blip.group.rotation.set(0, o.turn ?? -0.15, 0);
    const s = blip.update(t, PLAN, {}), f = blip.current, h = f.human;
    if (o.flashK != null) { blip.flash.visible = false; blip.ring.material.opacity *= 0.5; f.mats.forEach((m) => { if (!m.uniforms && m.emissive) m.emissiveIntensity *= 0.25 + 0.75 * o.flashK; if (m.uniforms?.uS) m.uniforms.uS.value = 1.15 + (m.uniforms.uS.value - 1.15) * o.flashK; }); blip.light.intensity *= o.flashK; }
    const w = Math.sin(t * 2.2), gk = gaspK(t);
    const slump = { spine: [28 * fk - 18 * gk, w * 2, 0], head: [30 * fk - 26 * gk, 0, 8 * fk], shL: [10, 0, 14 + 20 * fk], shR: [10, 0, 14 + 20 * fk], elL: 24, elR: 24, hipL: [80 * fk, 0, 6], hipR: [80 * fk, 0, 6], knL: 120 * fk, knR: 120 * fk };
    if (s.form === 'human') {
      const hk = holdK(t), shake = t > L(5) - 0.08 ? 3 * Math.sin(t * 30) * (1 - fk) : 0;
      h.pose(fk > 0.001 ? slump : { spine: [0, w * 2, shake], head: [-4, w * 2, shake], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24 });
      puffs.forEach((p) => { p.visible = hk > 0; p.scale.set(0.04, 0.035, 0.035).multiplyScalar(1 + 0.08 * Math.sin(t * 6)); });
      f.face.set({ lid: fk > 0.3 ? 1 : t > L(5) - 0.08 ? 0.35 : 0, smile: hk ? -0.1 : 0.6, look: fk > 0.3 ? [0, 0] : [0, 0.2] });
    } else puffs.forEach((p) => (p.visible = false));
    if (s.form === 'xray') {
      f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.kidneys.forEach((k) => (k.visible = false));
      h.pose(fk > 0.001 ? slump : { spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [4, 0, 20], shR: [4, 0, 20], elL: 16, elR: 16 });
      // lungs: held full, then a huge gasp
      const lk = t > T_SEC ? 0.9 + 0.55 * gk + 0.08 * Math.sin(t * 3) : 1.08; f.lungs.forEach((l) => l.scale.setScalar(lk));
      // CO2 bubbles
      const c = co2K(t), n = Math.round(XF.gas.length * c);
      XF.gas.forEach((g, i) => { g.visible = i < n; if (!g.visible) return; g.position.copy(gasP[i]).add(V3(Math.sin(t * 2 + i) * 0.006, Math.sin(t * 1.4 + i * 2) * 0.008, 0)); g.scale.setScalar(1.4 + 0.5 * hash(i)); });
      // brain alarm + diaphragm twitch
      const al = t > T_BRAIN - 0.1 && t < L(5) - 0.08 ? 0.5 + 0.5 * Math.sin(t * 14) : 0;
      brainM.color.set(al ? '#FF7070' : '#F2A3C0'); brainM.emissiveIntensity = 0.3 + 1.2 * al;
      const tw = t > T_TWITCH - 0.15 && t < L(5) - 0.08 ? Math.pow(Math.max(0, Math.sin((t - T_TWITCH) * 11)), 8) : 0;
      f.diaG.visible = t > L(4) - 0.08 && t < L(5) - 0.08; f.diaG.scale.set(1, 1 - 0.45 * tw, 1); f.diaG.position.y = 0.235 - 0.01 * tw;
      f.face.set({ lid: fk > 0.3 && t < T_BREATH ? 1 : 0 });
      o._tw = tw;
    }
    blip.group.updateMatrixWorld(true);
    tank.visible = t > L(1) - 0.08 && t < L(2) - 0.08;
    // nerve signal brain → diaphragm
    const sk = ((t - T_SENSE) * 1.3) % 1, sOn = s.form === 'xray' && t > T_SENSE && t < L(5) - 0.08;
    if (sOn) { const path = [XF.brain.getWorldPosition(V3()), XH.head.localToWorld(V3(0, 0.02, -0.02)), XH.spine.localToWorld(V3(0, 0.45, -0.07)), XH.spine.localToWorld(V3(0, 0.3, -0.06)), XH.spine.localToWorld(V3(0, 0.24, 0.02))];
      sigs.forEach((m, i) => { const u = clamp(sk * 1.2 - i * 0.03), x = u * (path.length - 1), j = Math.min(path.length - 2, Math.floor(x)); m.visible = u > 0 && u < 1; m.position.copy(lerpV(path[j], path[j + 1], x - j)); }); }
    else sigs.forEach((m) => (m.visible = false));
    // host
    const p0 = drag(act, t), pz = alive(p0, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0); host.group.visible = !o.noHost; host.group.updateMatrixWorld(true);
    ST.setMood(Math.max(s.xray * (o.xk ?? 0.7), o.mood ?? 0.15));
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + s.xray * 0.12, bloomThreshold: lerp(0.78, 0.55, s.xray), ...(o.look || {}) });
    return s;
  }
  const WIDE = (k) => ({ pos: lerpV(V3(0.03, 1.02, 4.45), V3(0.06, 1.0, 4.1), k), at: V3(0.04, 0.9, 0), focus: V3(0.04, 0.9, 0.05), look: { aperture: 0.0016 } });
  const TWO = (k) => ({ pos: lerpV(V3(0.1, 1.0, 3.5), V3(0.14, 0.98, 3.15), k), at: V3(0.08, 0.88, 0), focus: V3(0.12, 0.88, BZ), look: { aperture: 0.0016 } });
  const CHEST = (k, y = 0.3, d0 = 1.35, d1 = 1.1) => { const c = XH.spine.localToWorld(V3(0, y, 0)); return { pos: lerpV(c.clone().add(V3(0.2, 0.06, d0)), c.clone().add(V3(0.16, 0.05, d1)), k), at: c, focus: c, look: { aperture: 0.0012 } }; };
  const clock = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  // 1 · hook: 24 minutes
  add({ id: 'S00', at: 0, note: 'two-shot: Blip with puffed cheeks holding his breath, a stopwatch pill races to 24:37; "BUT YOU CAN\'T HOLD YOURS FOREVER"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), flashK: 0.2 }); blit();
    const sec = 1477 * eo(seg(t, 0.15, T_24 + 0.9)); pill(`⏱ ${clock(sec)}`, 540, 300, 1 + 0.03 * Math.sin(t * 20), '#111', YEL, 96);
    if (t > T_24 + 0.6) pill('24 MINUTES 🤯', 540, 440, popIn(t - T_24 - 0.6), '#FFFFFF', 'rgba(190,16,24,0.95)', 62);
    if (t > T_CANT - 0.1) pill("BUT YOU CAN'T", 540, 1180, popIn(t - T_CANT + 0.1), '#FFFFFF', DARK, 74);
  } });
  cue(0.15, 'tock', { gain: 0.5 }); cue(T_24 + 0.6, 'pop'); cue(T_CANT, 'thud', { gain: 0.5 });

  // 2 · the record (with pure oxygen)
  add({ id: 'S01', at: cut(1), note: 'wide two-shot: "BUDIMIR ŠOBAT · CROATIA", "🏆 WORLD RECORD 2021 · 24:37"; a green oxygen tank appears next to Blip: "AFTER BREATHING PURE OXYGEN"', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), flashK: 0.2 }); blit();
    if (t > T_NAME - 0.1) pill('BUDIMIR ŠOBAT · CROATIA', 540, 300, popIn(t - T_NAME + 0.1), '#FFFFFF', DARK, 54);
    if (t > T_REC - 0.1) pill('🏆 WORLD RECORD · 24:37', 540, 420, popIn(t - T_REC + 0.1), '#111', YEL, 58);
    if (t > T_OXY - 0.2) { pill('AFTER PURE OXYGEN 🫧', 540, 1180, popIn(t - T_OXY + 0.2), '#111', GRN, 64); }
  } });
  cue(T_REC, 'sparkle', { gain: 0.6 }); cue(T_OXY - 0.2, 'bubbles', { dur: 0.8, gain: 0.5 });

  // 3 · not low oxygen
  add({ id: 'S02', at: cut(2), note: 'x-ray chest close-up: full lungs; O₂ meter stays high; "NOT LOW OXYGEN ❌"', draw(lt, d, t, blit) {
    const s = show(t, { ...CHEST(eio(lt / d)), noHost: true, flashK: 0.2 }); blit();
    if (t > T_HOLD - 0.1) meter(540, 300, 520, 0.88, BLUE, 'O₂ STILL OK');
    if (t > T_NOT - 0.1) pill('NOT LOW OXYGEN ❌', 540, 1180, popIn(t - T_NOT + 0.1), '#FFFFFF', RED, 66);
    if (t > T_GASP - 0.1) pill('SO WHY DO YOU GASP?', 540, 440, popIn(t - T_GASP + 0.1), '#111', YEL, 52);
  } });
  cue(T_NOT, 'pop'); cue(T_GASP, 'pop');

  // 4 · CO2 builds up
  add({ id: 'S03', at: cut(3), note: 'x-ray chest close-up: grey CO₂ bubbles multiply inside him; CO₂ meter fills red', draw(lt, d, t, blit) {
    const s = show(t, { ...CHEST(eio(lt / d), 0.25, 1.2, 1.0), noHost: true, flashK: 0.2 }); blit();
    const c = co2K(t); meter(540, 300, 520, c, c > 0.7 ? RED : '#FF9F1C', `CO₂ ${Math.round(c * 100)}%`);
    if (t > T_CO2 - 0.1) pill('CARBON DIOXIDE ⬆', 540, 1180, popIn(t - T_CO2 + 0.1), '#FFFFFF', DARK, 66);
  } });
  cue(T_CO2, 'bubbles', { dur: 2.2, gain: 0.6 }); cue(T_BLOOD, 'pop');

  // 5 · brain alarm → diaphragm twitches
  add({ id: 'S04', at: cut(4), note: 'x-ray medium on head + chest: the brain flashes red (alarm), red nerve signals run down to the diaphragm, which jerks/twitches', draw(lt, d, t, blit) {
    const s = show(t, { ...CHEST(eio(lt / d), 0.5, 2.0, 1.75), noHost: true, flashK: 0.2 }); blit();
    if (t > T_BRAIN - 0.1) pill('🚨 BRAIN ALARM', 540, 300, popIn(t - T_BRAIN + 0.1) * (1 + 0.05 * Math.sin(t * 14)), '#FFFFFF', RED, 70);
    if (t > T_DIA - 0.1) { const [x, y] = screen(XH.spine.localToWorld(V3(0, 0.24, 0.06)), cam); label('DIAPHRAGM', 830, y + 220, x + 40, y, eob(seg(t, T_DIA - 0.1, T_DIA + 0.2))); }
    if (t > T_TWITCH - 0.1) pill('IT STARTS TO TWITCH', 540, 1180, popIn(t - T_TWITCH + 0.1), '#111', YEL, 62);
  } });
  cue(T_BRAIN, 'alarm', { dur: 1.4, gain: 0.35 }); for (let i = 0; i < 3; i++) cue(T_TWITCH + i * 0.57, 'thud', { gain: 0.4 });

  // 6 · pass out
  add({ id: 'S05', at: cut(5), note: 'wide two-shot: Blip (cheeks puffed) shakes, eyes roll shut and he slumps to the floor; host gasps; "😵 YOU PASS OUT"', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), flashK: 0.2, shake: 0.8 * imp(t - T_PASS - 0.35, 5) }); blit();
    if (t > T_KEEP - 0.1) pill('KEEP HOLDING…', 540, 300, popIn(t - T_KEEP + 0.1), '#FFFFFF', DARK, 62);
    if (t > T_PASS - 0.05) pill('😵 YOU PASS OUT', 540, 1180, popIn(t - T_PASS + 0.05), '#FFFFFF', RED, 76);
  } });
  cue(T_PASS + 0.35, 'thud', { gain: 1 });

  // 7 · the brain takes over: huge gasp (loops into the hook)
  add({ id: 'S06', at: cut(6), note: 'two-shot, Blip slumped on the floor in x-ray; the brain takes over and on "breathing" the lungs balloon in one huge gasp, the CO₂ clears, he sits up and stands', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), flashK: 0.2 }); blit();
    if (t > T_TAKES - 0.1) pill('🧠 BRAIN TAKES OVER', 540, 300, popIn(t - T_TAKES + 0.1), '#111', YEL, 64);
    if (t > T_BREATH - 0.05) pill('🫁 GASP!', 540, 1180, popIn(t - T_BREATH + 0.05) * (1 + 0.1 * gaspK(t)), '#111', GRN, 96);
  } });
  cue(T_BREATH - 0.05, 'inhale', { gain: 1 }); cue(T_BREATH + 0.1, 'whoosh', { gain: 0.5 });

  return { shots: S, cues: CUES };
}
