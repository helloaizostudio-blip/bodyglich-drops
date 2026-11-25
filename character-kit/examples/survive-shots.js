// THE MAN WHO DIDN'T EAT FOR 382 DAYS (Body Glitch — high-stakes cold open, dark look, fast countdown, twist)
// Frame 1: pitch-dark, Blip charging; at 0.25 s he flashes into x-ray, lungs freeze, a huge red 3:00 timer races to zero.
// 3 days without water (blue meter drains), 3 weeks without food (empty stomach). Twist: back to human — a chubby
// human-Blip shrinks while a day counter runs to 382 (Angus Barbieri, 1965). Doctors, water/tea/vitamins, DON'T TRY
// THIS. −125 kg. He pops back into Blip: "HOW LONG COULD YOU LAST?" + follow.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Le, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host } from './core/host.js';
import { Shifter } from './core/shift.js';
import { studio } from './core/studio.js';
import { popIn, track, drag, alive, mouthFor, breathe as hostBreathe } from './core/motion.js';
import { pill } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const YEL = '#FFD43B', RED = '#FF3B3B', GRN = '#4BE38A', BLUE = '#4FB8FF', DARK = 'rgba(12,14,20,0.85)';
const imp = (x, d = 7) => (x < 0 ? 0 : x < 0.03 ? x / 0.03 : Math.exp(-(x - 0.03) * d));

function bigText(text, y, a, col, size = 230, sc = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.translate(540, y); ctx.scale(sc, sc); ctx.font = `900 ${size}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = size * 0.12; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 40; ctx.fillText(text, 0, 0); ctx.restore();
}
function vignette(a, col = '255,30,30') { if (a <= 0) return; ctx.save(); const g = ctx.createRadialGradient(540, 960, 300, 540, 960, 1150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(${col},${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.04);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.78, vignette: 0.55, warm: 0.04, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.3, BZ = 0.12;
  const XF = blip.forms.xray, XH = XF.human;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_AIR = Wd('air', 0), T_WATER = Wd('water', 1), T_FOOD = Wd('food', 2), T_TWIST = Wd('twist', 3);
  const T_1965 = L(4) + 0.05, T_SCOT = Wd('Scotland', 4), T_DAYS = Wd('days', 4), T_EAT = Wd('eating', 4);
  const T_DOC = Wd('Doctors', 5), T_TEA = Wd('tea', 5), T_VIT = Wd('vitamins', 5);
  const T_LOST = Wd('lost', 6), T_LAST = Wd('last', 6);
  const PLAN = [{ t: 0.25, form: 'xray', charge: 0.22 }, { t: L(3) + 0.06, form: 'human', charge: 0.15 }, { t: T_LOST + 1.05, form: 'blip', charge: 0.2 }];
  Shifter.cues(PLAN, cue);

  // ── host ──────────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.2, spine: [-6, 0, 0], head: [6, 18, 0] };
  const CLIP = { ...REST, shL: [40, 0, 20], elL: 100, shR: [30, -10, 30], elR: 60, head: [10, 20, 0], smile: 0.3, brow: [0.7, 0.2] };
  const act = track([{ t: 0, pose: SHOCK }, { t: L(4) - 0.05, d: 0.3, pose: POINT }, { t: L(5) - 0.05, d: 0.3, pose: CLIP }, { t: L(6) - 0.05, d: 0.3, pose: SHOCK }]);

  const darkK = (t) => (t < L(3) ? 1 : t < L(4) ? 1 - 0.85 * eio(seg(t, L(3), L(3) + 0.4)) : 0.15);
  const fatK = (t) => (t < L(4) ? 1.45 : t < Le(6) ? lerp(1.45, 1.0, eio(seg(t, T_SCOT, T_LOST + 0.3))) : 1.0);

  function show(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.set(0, o.turn ?? -0.15, 0);
    const bq = t < 0.25 ? { y: 0.02, squash: 0.1 * Math.sin(t * 34), armL: 70, armR: 70, smile: -0.3, lid: -0.3 } : { y: 0.06 * Math.abs(Math.sin(t * 6)), armR: 150 + 20 * Math.sin(t * 10), armL: 20, smile: 1, mouth: t > T_LAST ? 0.5 : 0 };
    const s = blip.update(t, PLAN, { blip: bq }); blip.light.intensity *= 0.45; blip.flash.material.opacity *= 0.75;
    const f = blip.current, w = Math.sin(t * 2.2);
    if (s.form === 'xray') {
      f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gas.forEach((g) => (g.visible = false)); f.kidneys.forEach((k) => (k.visible = false));
      const gasp = t < L(1) ? 1 - eio(seg(t, 0.5, T_AIR + 0.3)) : 0;               // lungs breathe, then freeze shut
      f.lungs.forEach((l) => l.scale.setScalar(0.85 + 0.2 * gasp * (0.5 + 0.5 * Math.sin(t * 9))));
      f.human.pose({ spine: [6 * (1 - gasp), w * 2, 0], head: [8 * (1 - gasp), 0, 0], shL: [10, 0, 16], shR: [10, 0, 16], elL: 30, elR: 30 });
      f.face.set({ lid: t > T_AIR ? 0.4 : 0 });
      const st = f.stomach; st.scale.setScalar(t > L(2) - 0.05 ? 0.75 + 0.05 * Math.sin(t * 20) : 1);
    }
    if (s.form === 'human') {
      f.human.pose({ spine: [0, w * 2, 0], head: [-4, w * 3, 0], shL: [6, 0, 18], shR: [6, 0, 18], elL: 24, elR: 24 });
      f.face.set({ smile: t > T_LOST ? 1.1 : 0.4 });
      const fk = fatK(t); f.human.spine.scale.set(fk, 1 + 0.04 * (fk - 1), fk * 1.1 - 0.1); f.human.head.scale.set(1 / fk, 1, 1 / (fk * 1.1 - 0.1));
    }
    blip.group.updateMatrixWorld(true);
    const p0 = drag(act, t), pz = alive(p0, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0); host.group.visible = !o.noHost; host.group.updateMatrixWorld(true);
    const dk = darkK(t); ST.setMood(Math.max(s.xray * 0.9, 0.12 + 0.88 * dk));
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + s.xray * 0.15, bloomThreshold: lerp(0.78, 0.5, s.xray), exposure: 1.02 - 0.25 * dk, ...(o.look || {}) });
    return { ...s, dk };
  }
  const CHEST = (k, y = 0.35, d0 = 1.5, d1 = 1.2) => () => { const c = XH.spine.localToWorld(V3(0, y, 0)); return { pos: lerpV(c.clone().add(V3(0.15, 0.05, d0)), c.clone().add(V3(0.12, 0.04, d1)), k), at: c, focus: c, look: { aperture: 0.0012 } }; };
  const TWO = (k) => ({ pos: lerpV(V3(0.1, 1.0, 3.5), V3(0.14, 0.98, 3.15), k), at: V3(0.08, 0.88, 0), focus: V3(0.12, 0.88, BZ), look: { aperture: 0.0016 } });

  // 1 · 3 minutes without air — frame 1 is already charging in the dark
  add({ id: 'S00', at: 0, note: 'pitch dark: Blip charging, flashes into x-ray at 0.25 s; lungs freeze; a huge red 3:00 timer races to 0:00; red pulsing vignette', draw(lt, d, t, blit) {
    const s = show(t, { aim: () => { const c = t < 0.25 ? blip.group.localToWorld(V3(0, 0.3, 0)) : XH.spine.localToWorld(V3(0, 0.4, 0)); return { pos: c.clone().add(V3(0.1, 0.05, t < 0.25 ? 1.5 : lerp(1.9, 1.5, eio(seg(t, 0.25, Le(0)))))), at: c, focus: c, look: { aperture: 0.0012 } }; }, noHost: true }); blit();
    const sec = Math.max(0, 180 * (1 - eo(seg(t, 0.15, T_AIR + 0.25)))), mm = Math.floor(sec / 60), ss = Math.floor(sec % 60);
    vignette(0.35 + 0.25 * Math.sin(t * 12) ** 2);
    bigText(`${mm}:${String(ss).padStart(2, '0')}`, 640, 1, sec < 1 ? RED : '#FFFFFF', 260, 1 + 0.08 * imp(t - T_AIR, 6));
    pill('😮‍💨 NO AIR', 540, 300, popIn(t), '#FFFFFF', 'rgba(190,16,24,0.95)', 70);
  } });
  cue(0.15, 'zip', { dur: 1.3, gain: 0.4 }); cue(T_AIR + 0.25, 'slam', { gain: 0.8 }); cue(0.2, 'heartbeat', { dur: 1.6, gain: 0.6 });

  // 2 · 3 days without water
  add({ id: 'S01', at: cut(1), note: 'x-ray chest, blue vignette: "3 DAYS" + a water meter draining to empty', draw(lt, d, t, blit) {
    const s = show(t, { aim: CHEST(eio(lt / d), 0.3, 1.5, 1.3), noHost: true }); blit();
    vignette(0.35, '20,90,255'); bigText('3 DAYS', 640, popIn(t - L(1) + 0.05), BLUE, 220);
    const k = 1 - eio(seg(t, L(1) + 0.1, Le(1))); ctx.save(); ctx.fillStyle = DARK; ctx.beginPath(); ctx.roundRect(240, 1080, 600, 70, 35); ctx.fill(); ctx.fillStyle = BLUE; ctx.beginPath(); ctx.roundRect(252, 1092, Math.max(46, 576 * k), 46, 23); ctx.fill(); ctx.restore();
    pill('💧 NO WATER', 540, 300, popIn(t - L(1)), '#FFFFFF', 'rgba(20,90,200,0.95)', 70);
  } });
  cue(L(1), 'slam', { gain: 0.6 }); cue(L(1) + 0.1, 'bubbles', { dur: 0.9, gain: 0.5 });

  // 3 · 3 weeks without food
  add({ id: 'S02', at: cut(2), note: 'x-ray stomach close: the stomach shrinks and shivers (empty); "3 WEEKS" in orange', draw(lt, d, t, blit) {
    const s = show(t, { aim: CHEST(eio(lt / d), 0.18, 1.2, 1.0), noHost: true }); blit();
    vignette(0.3, '255,140,0'); bigText('3 WEEKS', 640, popIn(t - L(2) + 0.05), '#FF9F1C', 200);
    pill('🍔 NO FOOD', 540, 300, popIn(t - L(2)), '#111', '#FF9F1C', 70);
  } });
  cue(L(2), 'slam', { gain: 0.6 }); cue(T_FOOD, 'gulp', { gain: 0.5 });

  // 4 · the twist
  add({ id: 'S03', at: cut(3), note: 'two-shot: x-ray Blip flashes into a chubby human-Blip as the lights come up; host shocked; "🤯 THE TWIST"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)) }); blit();
    pill('🤯 THE TWIST', 540, 300, popIn(t - L(3) + 0.04) * (1 + 0.06 * Math.sin(t * 14)), '#FFFFFF', 'rgba(190,16,24,0.95)', 80);
  } });
  cue(T_TWIST, 'boing', { gain: 0.5 });

  // 5 · 382 days
  add({ id: 'S04', at: cut(4), note: 'two-shot: "1965 · SCOTLAND"; a giant day counter runs 0 → 382 while chubby human-Blip slims down', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(1 - 0.3 * eio(lt / d)) }); blit();
    pill('1965 · SCOTLAND 🏴', 540, 300, popIn(t - T_1965), '#FFFFFF', DARK, 62);
    const n = Math.round(382 * eo(seg(t, T_SCOT - 0.1, T_EAT))); bigText(String(n), 620, popIn(t - T_SCOT + 0.1), YEL, 240, 1 + 0.05 * (n === 382 ? imp(t - T_EAT, 5) : 0));
    if (t > T_DAYS - 0.1) pill('DAYS WITHOUT FOOD', 540, 800, popIn(t - T_DAYS + 0.1), '#111', YEL, 58);
  } });
  for (let i = 0; i < 6; i++) cue(T_SCOT + i * 0.45, 'tock', { gain: 0.35 }); cue(T_EAT, 'slam', { gain: 0.7 });

  // 6 · doctors, water/tea/vitamins, don't try this
  add({ id: 'S05', at: cut(5), note: 'two-shot: host with a clipboard (doctor), Blip slimming; icons 💧 ☕ 💊; small "⚠️ DON\'T TRY THIS"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(0.7 + 0.3 * eio(lt / d)) }); blit();
    pill('👨‍⚕️ DOCTORS WATCHED', 540, 300, popIn(t - T_DOC + 0.1), '#111', GRN, 62);
    const items = [['💧 WATER', T_DOC + 0.9], ['☕ TEA', T_TEA - 0.1], ['💊 VITAMINS', T_VIT - 0.1]];
    items.forEach(([txt, tt], i) => { if (t > tt) pill(txt, 540, 1000 + i * 110, popIn(t - tt), '#FFFFFF', DARK, 54); });
    pill("⚠️ DON'T TRY THIS", 540, 420, popIn(t - L(5) - 0.6), '#FFFFFF', 'rgba(190,16,24,0.9)', 40);
  } });
  cue(T_TEA, 'pop'); cue(T_VIT, 'pop');

  // 7 · −125 kg, back to Blip, how long could you last?
  add({ id: 'S06', at: cut(6), note: 'two-shot lowering: slim human-Blip, "−125 KG"; he flashes back into little Blip: "HOW LONG COULD YOU LAST? 👇" + follow', draw(lt, d, t, blit) {
    const k7 = eio(seg(t, PLAN[2].t - 0.1, PLAN[2].t + 0.5)), s = show(t, { pos: lerpV(V3(0.12, 1.0, 3.2), V3(0.14, 0.72, 2.6), k7), at: lerpV(V3(0.1, 0.88, 0), V3(0.14, 0.5, 0), k7), focus: V3(BX, 0.6, BZ), look: { aperture: 0.0016 } }); blit();
    if (t > T_LOST) bigText('−125 KG', 640, popIn(t - T_LOST) * (1 - seg(t, PLAN[2].t, PLAN[2].t + 0.3)), GRN, 190);
    if (t > PLAN[2].t - 0.1) { pill('HOW LONG COULD YOU LAST? 👇', 540, 300, popIn(t - PLAN[2].t + 0.1), '#FFFFFF', 'rgba(190,16,24,0.95)', 54); }
    if (t > T.dur - 1.5) pill('FOLLOW FOR DAILY GLITCHES 💙', 540, 1240, popIn(t - T.dur + 1.5), '#FFFFFF', 'rgba(23,169,201,0.95)', 44);
  } });
  cue(T_LOST, 'slam', { gain: 0.6 });

  return { shots: S, cues: CUES };
}
