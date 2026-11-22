// CAN YOU WIGGLE YOUR EARS? (Body Glitch, new format + real Blip transformations + a twist)
// Frame 1: little Blip bounces, "TRY THIS 👂"; on "ears" he transforms into human-Blip whose ears wiggle. Then: most
// people can't but the muscles are there (red muscle strands light up), Blip transforms into a CAT whose head snaps toward
// sounds, ancestors lost it 25 million years ago, the twist: your ear muscles still twitch toward sudden sounds (BANG,
// amplified micro-twitch), and back to Blip for the comment question (loops into the hook).
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

function waves(x, y, dir, a, t) {      // sound-wave arcs drawn from a point, opening toward dir (+1 right / -1 left)
  if (a <= 0.01) return; ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${0.9 * a})`; ctx.lineWidth = 10; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const r = 40 + ((t * 160 + i * 50) % 150); ctx.globalAlpha = a * (1 - r / 190); ctx.beginPath(); ctx.arc(x, y, r, dir > 0 ? -0.7 : Math.PI - 0.7, dir > 0 ? 0.7 : Math.PI + 0.7); ctx.stroke(); }
  ctx.restore();
}

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.06);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.78, vignette: 0.45, warm: 0.04, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'cat'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.3, BZ = 0.12;
  const HF = blip.forms.human, CF = blip.forms.cat, HH = HF.human;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_WIG = Wd('wiggle', 0), T_EARS = Wd('ears', 0), T_CAN = Wd('Can', 0);
  const T_CANT = Wd("can't", 1), T_MUSC = Wd('muscles', 1);
  const T_CATS = Wd('Cats', 2), T_TURN = Wd('turn', 2), T_SOUNDS = Wd('sounds', 2);
  const T_ANC = Wd('ancestors', 3), T_LOST = Wd('lost', 3), T_25 = Wd('twenty', 3);
  const T_TWIST = Wd('twist', 4), T_TRY = Wd('try', 4);
  const T_SUDDEN = Wd('sudden', 5), T_TWITCH = Wd('twitch', 5), T_SMALL = Wd('small', 5);
  const T_YOURS = Wd('wiggle', 6), T_COMM = Wd('comments', 6);
  const PLAN = [{ t: T_EARS - 0.05, form: 'human' }, { t: L(2) + 0.12, form: 'cat' }, { t: L(4) + 0.1, form: 'human' }, { t: L(6) + 0.15, form: 'blip' }];
  Shifter.cues(PLAN, cue);

  // ── ear muscles: three thin red strands around each ear (above, front, behind) ──
  const muscM = new THREE.MeshStandardMaterial({ color: '#E8505A', emissive: '#FF3040', emissiveIntensity: 0.4, transparent: true, opacity: 0, depthWrite: false });
  const muscles = [];
  for (const s of [-1, 1]) for (const [x, y, z, rz, ry, len] of [[0.1, 0.17, -0.005, 0.15, 0, 0.05], [0.098, 0.13, 0.03, 1.4, 0.4, 0.035], [0.1, 0.125, -0.04, 1.6, -0.4, 0.035]]) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, len, 6, 10), muscM); m.position.set(s * x, y, z); m.rotation.set(0, s * ry, s * rz); m.renderOrder = 4; HH.head.add(m); muscles.push(m); }

  // ── host ──────────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.2, spine: [-6, 0, 0], head: [6, 18, 0] };
  const SHRUG = { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, smile: 0.8, brow: [0.8, 0], head: [-4, 18, 6] };
  const act = track([{ t: 0, pose: POINT }, { t: T_CANT - 0.05, d: 0.3, pose: SHRUG }, { t: L(2) - 0.05, d: 0.3, pose: { ...POINT, smile: 1 } }, { t: L(3) - 0.05, d: 0.3, pose: SHRUG }, { t: T_TWIST - 0.05, d: 0.25, pose: SHOCK }, { t: L(5) - 0.05, d: 0.3, pose: POINT }, { t: L(6) - 0.05, d: 0.3, pose: { ...SHRUG, smile: 1 } }]);

  const soundDir = (t) => (t < T_TURN ? 0 : Math.floor((t - T_TURN) / 0.9) % 2 ? 1 : -1);
  const bang = (t) => imp(t - T_SUDDEN, 4);

  function show(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.set(0, o.turn ?? -0.15, 0);
    const w = Math.sin(t * 2.2);
    const bq = t < T_EARS ? { y: 0.03 * Math.abs(Math.sin(t * 6)), squash: 0.05 * Math.sin(t * 12), armL: 40, armR: 40, smile: 1, look: [0, 0.2] }
      : { y: 0.06 * Math.abs(Math.sin(t * 6)), armR: 150 + 20 * Math.sin(t * 10), armL: 20, smile: 1, mouth: t > T_COMM ? 0.4 : 0 };
    const s = blip.update(t, PLAN, { blip: bq }), f = blip.current, h = f.human;
    blip.light.intensity *= 0.45; blip.flash.material.opacity *= 0.7;
    // ear wiggle (hook + end) / muscle glow / micro-twitch on the bang
    let wig = 0, mus = 0, tw = 0;
    if (t < L(1) - 0.06) wig = 1; else if (t < L(2) - 0.06) mus = eio(seg(t, T_MUSC - 0.15, T_MUSC + 0.3));
    if (t > L(4) - 0.06 && t < L(6) - 0.06) { mus = 0.35 + 0.65 * bang(t); tw = bang(t); }
    if (s.form === 'human') {
      h.pose({ spine: [0, w * 2, 0], head: [-3, w * 3 + 20 * tw * (t > T_SUDDEN ? 1 : 0) * 0, 0], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24 });
      f.face.set({ smile: tw > 0.3 ? -0.2 : 0.9, lid: tw > 0.3 ? -0.3 : 0, look: tw > 0.2 ? [-0.8, 0] : [0, 0] });
      f.ears.forEach((e, i) => { const sd = i ? 1 : -1, wg = wig * Math.sin(t * 22 + i * 0.4) * 0.35, k = tw * 0.25 * (sd < 0 ? 1 : 0.4); e.rotation.set(wg * 0.6, sd * (wg + k), 0); e.position.y = 0.128 + wig * 0.004 * Math.sin(t * 22); });
    }
    if (s.form === 'cat') { const d = soundDir(t); f.head.rotation.y = lerp(f.head.rotation.y, d * 0.75, 0.9); f.head.rotation.z = d * 0.12; }
    muscM.opacity = s.form === 'human' ? mus * 0.95 : 0; muscM.emissiveIntensity = 0.4 + 1.6 * tw;
    blip.group.updateMatrixWorld(true);
    const p0 = drag(act, t), pz = alive(p0, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0); host.group.visible = !o.noHost; host.group.updateMatrixWorld(true);
    ST.setMood(o.mood ?? 0.12);
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), ...(o.look || {}) });
    return { ...s, tw };
  }
  const headW = () => (blip.current.human ? blip.current.human.head.localToWorld(V3(0, 0.13, 0.02)) : blip.current.head ? blip.current.head.getWorldPosition(V3()).add(V3(0, 0.08, 0)) : blip.group.localToWorld(V3(0, 0.36, 0)));
  const FACE = (k, d0, d1) => () => { const c = headW(); return { pos: lerpV(c.clone().add(V3(0.06, 0.02, d0)), c.clone().add(V3(0.05, 0.02, d1)), k), at: c.clone().add(V3(0, -0.05, 0)), focus: c, look: { aperture: 0.0012 } }; };
  const TWO = (k) => ({ pos: lerpV(V3(0.1, 1.0, 3.5), V3(0.14, 0.98, 3.15), k), at: V3(0.08, 0.88, 0), focus: V3(0.12, 0.88, BZ), look: { aperture: 0.0016 } });
  const LOW = (k) => ({ pos: lerpV(V3(0.12, 0.75, 2.7), V3(0.16, 0.72, 2.45), k), at: V3(0.15, 0.5, 0), focus: V3(BX, 0.45, BZ), look: { aperture: 0.0016 } });
  const earScr = (i = 0) => (blip.current.ears ? screen(blip.current.ears[i].getWorldPosition(V3()), cam) : [540, 900]);

  // 1 · hook
  add({ id: 'S00', at: 0, note: 'close: little Blip bouncing, "TRY THIS RIGHT NOW 👂"; on "ears" he transforms (flash/ring/sparks) into human-Blip with hair whose ears wiggle fast', draw(lt, d, t, blit) {
    const s = show(t, { aim: () => { const c = headW(); return { pos: c.clone().add(V3(0.05, 0.02, t < T_EARS ? 1.75 : 1.2)), at: c.clone().add(V3(0, -0.07, 0)), focus: c, look: { aperture: 0.0012 } }; }, noHost: true }); blit();
    pill('TRY THIS RIGHT NOW 👂', 540, 300, 1 + 0.04 * Math.sin(t * 10), '#FFFFFF', 'rgba(190,16,24,0.95)', 66);
    if (t > T_CAN - 0.1) pill('CAN YOU WIGGLE YOUR EARS?', 540, 1180, popIn(t - T_CAN + 0.1), '#111', YEL, 56);
  } });
  cue(T_EARS + 0.3, 'boing', { gain: 0.5 }); cue(T_CAN, 'pop');

  // 2 · most can't, muscles still there
  add({ id: 'S01', at: cut(1), note: 'face close-up: ears stop; three thin red muscles light up around each ear: label EAR MUSCLES', draw(lt, d, t, blit) {
    const s = show(t, { aim: FACE(eio(lt / d), 1.15, 1.0), noHost: true }); blit();
    if (t > T_CANT - 0.1) pill("MOST PEOPLE CAN'T ❌", 540, 300, popIn(t - T_CANT + 0.1), '#FFFFFF', RED, 66);
    if (t > T_MUSC - 0.1) { const [x, y] = earScr(0); label('EAR MUSCLES', 300, y + 330, x, y - 40, eob(seg(t, T_MUSC - 0.1, T_MUSC + 0.2))); }
  } });
  cue(T_MUSC, 'pop');

  // 3 · cats turn their ears toward sounds
  add({ id: 'S02', at: cut(2), note: 'low two-shot: human-Blip transforms into a CAT; sound waves pop left/right and the cat\'s head snaps toward each', draw(lt, d, t, blit) {
    const s = show(t, { ...LOW(eio(lt / d)) }); blit();
    if (t > T_CATS - 0.1) pill('🐱 CATS & DOGS 🐶', 540, 300, popIn(t - T_CATS + 0.1), '#111', YEL, 66);
    const dv = soundDir(t); if (dv) { const k = 1 - ((t - T_TURN) % 0.9) / 0.9; waves(dv > 0 ? 930 : 150, 900, -dv, k, t); }
    if (t > T_SOUNDS - 0.1) pill('EARS TURN TO SOUNDS', 540, 1180, popIn(t - T_SOUNDS + 0.1), '#FFFFFF', DARK, 62);
  } });
  for (let i = 0; i < 3; i++) cue(T_TURN + i * 0.9, 'tock', { gain: 0.6 });

  // 4 · ancestors lost it 25 million years ago
  add({ id: 'S03', at: cut(3), note: 'two-shot with host; the cat keeps turning its head; big "25,000,000 YEARS AGO" counter', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)) }); blit();
    if (t > T_LOST - 0.1) pill('🐒 WE LOST IT', 540, 300, popIn(t - T_LOST + 0.1), '#FFFFFF', DARK, 66);
    if (t > T_25 - 0.2) { const n = Math.round(25000000 * eo(seg(t, T_25 - 0.2, Le(3)))); pill(`${n.toLocaleString('en-US')} YEARS AGO`, 540, 1180, popIn(t - T_25 + 0.2), '#111', YEL, 58); }
  } });
  cue(T_25, 'whoosh', { gain: 0.5 });

  // 5 · the twist: they still try to move
  add({ id: 'S04', at: cut(4), note: 'two-shot: cat transforms back into human-Blip; "🤯 THE TWIST"; the ear muscles glow faintly', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)) }); blit();
    if (t > T_TWIST - 0.1) pill('🤯 THE TWIST', 540, 300, popIn(t - T_TWIST + 0.1) * (1 + 0.05 * Math.sin(t * 12)), '#FFFFFF', 'rgba(190,16,24,0.95)', 72);
    if (t > T_TRY - 0.1) pill('THEY STILL TRY TO MOVE', 540, 1180, popIn(t - T_TRY + 0.1), '#111', YEL, 60);
  } });
  cue(T_TWIST, 'slam', { gain: 0.6 });

  // 6 · BANG → micro-twitch toward the sound
  add({ id: 'S05', at: cut(5), note: 'face close-up: BANG from the left with sound waves; the ear muscles flash red and the ear twitches toward it; "×10 AMPLIFIED"', draw(lt, d, t, blit) {
    const s = show(t, { aim: FACE(eio(lt / d), 1.1, 0.95), noHost: true, shake: 1.2 * bang(t) }); blit();
    if (t > T_SUDDEN - 0.05) { pill('💥 BANG', 220, 640, popIn(t - T_SUDDEN + 0.05) * (1 + 0.2 * bang(t)), '#111', '#FF9F1C', 70); waves(120, 900, 1, Math.max(bang(t), 0.25), t); }
    if (t > T_TWITCH - 0.1) pill('THEY TWITCH TOWARD IT 👂', 540, 300, popIn(t - T_TWITCH + 0.1), '#111', YEL, 56);
    if (t > T_SMALL - 0.15) pill('🔬 TOO SMALL TO SEE (×10 HERE)', 540, 1180, popIn(t - T_SMALL + 0.15), '#FFFFFF', DARK, 50);
  } });
  cue(T_SUDDEN, 'slam', { gain: 0.9 }); cue(T_SUDDEN + 0.03, 'thud', { gain: 0.7 }); cue(T_TWITCH, 'boing', { gain: 0.35 });

  // 7 · back to Blip: comment question
  add({ id: 'S06', at: cut(6), note: 'two-shot lowering: human-Blip transforms back into little Blip who bounces and waves: "CAN YOU? ✅ YES / ❌ NO"', draw(lt, d, t, blit) {
    const k7 = eio(seg(t, PLAN[3].t - 0.1, PLAN[3].t + 0.5)), s = show(t, { pos: lerpV(V3(0.1, 1.0, 3.3), V3(0.14, 0.72, 2.6), k7), at: lerpV(V3(0.08, 0.88, 0), V3(0.14, 0.5, 0), k7), focus: V3(BX, 0.5, BZ), look: { aperture: 0.0016 } }); blit();
    pill('CAN YOU WIGGLE YOURS? 👇', 540, 300, popIn(t - L(6)) * (1 + 0.04 * Math.sin(t * 10)), '#FFFFFF', 'rgba(190,16,24,0.95)', 60);
    if (t > T_COMM - 0.3) { pill('✅ YES', 340, 1180, popIn(t - T_COMM + 0.3), '#111', GRN, 64); pill('❌ NO', 740, 1180, popIn(t - T_COMM + 0.15), '#FFFFFF', RED, 64); }
  } });
  cue(L(6), 'pop'); cue(T_COMM, 'pop');

  return { shots: S, cues: CUES };
}
