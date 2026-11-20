// DO YOU HAVE THIS MUSCLE? (Body Glitch, NEW FORMAT: payoff in frame 1, viewer participation, a new visual every
// 2-3 s, one fact per line, ends on a comment question that loops into the hook)
// Frame 1 is already the close-up: Blip's raised forearm, "DO THIS RIGHT NOW", and the palmaris longus tendon pops.
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
  const T_THUMB = Wd('thumb', 0), T_BEND = Wd('bend', 0), T_CORD = Wd('cord', 0), T_POP = Wd('pop', 0);
  const T_MUSC = Wd('muscle', 1), T_PALM = Wd('palmaris', 1);
  const T_ONE = Wd('one', 2), T_DONT = Wd("don't", 2);
  const T_LEFT = Wd('left', 3), T_ANC = Wd('ancestors', 3), T_TREES = Wd('trees', 3);
  const T_USE = Wd('useless', 4), T_SURG = Wd('surgeons', 4), T_FIX = Wd('fix', 4);
  const T_BOTH = Wd('both', 5), T_SIDE = Wd('side', 5);
  const T_YOU = Wd('you', 6), T_COMM = Wd('comments', 6);
  const PLAN = [{ t: -5, form: 'human' }, { t: L(1) - 0.06, form: 'xray', charge: 0.02 }, { t: L(2) - 0.06, form: 'human', charge: 0.02 }, { t: L(4) - 0.06, form: 'xray', charge: 0.02 }, { t: L(6) - 0.06, form: 'human', charge: 0.02 }];
  Shifter.cues(PLAN.slice(1), cue);

  // ── the tendon (on both forms, both arms) — always placed on the forearm side facing the camera ──
  const skinT = new THREE.MeshStandardMaterial({ color: '#D8FAFF', roughness: 0.35, emissive: '#6FD6EA', emissiveIntensity: 0.25 });
  const glowT = new THREE.MeshStandardMaterial({ color: '#FFE066', emissive: '#FFC21A', emissiveIntensity: 1.1, roughness: 0.3 });
  const bellyM = new THREE.MeshStandardMaterial({ color: '#E8505A', emissive: '#C0303A', emissiveIntensity: 0.5, roughness: 0.4 });
  const mk = (h, side, mat, xray) => { const el = h.arm[side].el, g = new THREE.Group(); el.add(g);
    const tend = new THREE.Mesh(new THREE.CapsuleGeometry(xray ? 0.0075 : 0.011, 0.15, 6, 12), mat); tend.position.y = -0.14; g.add(tend);
    let belly = null; if (xray) { belly = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), bellyM); belly.scale.set(0.016, 0.04, 0.012); belly.position.y = -0.045; g.add(belly); }
    return { el, g, tend, belly }; };
  const TH = { R: mk(HH, 'R', skinT, false), L: mk(HH, 'L', skinT, false) }, TX = { R: mk(XH, 'R', glowT, true), L: mk(XH, 'L', glowT, true) };
  const tmp = new THREE.Vector3();
  function faceCam(T, out) {      // offset the tendon group toward the camera, around the forearm axis
    const pL = T.el.worldToLocal(cam.position.clone()); tmp.set(pL.x, 0, pL.z).normalize(); T.g.position.copy(tmp).multiplyScalar(out);
  }
  // tree branch
  const branch = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.4, 12), new THREE.MeshStandardMaterial({ color: '#6B4426', roughness: 0.8 })); b.rotation.z = Math.PI / 2; branch.add(b);
    const leaf = new THREE.MeshStandardMaterial({ color: '#3FA34D', roughness: 0.7 }); for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.1 + 0.04 * (i % 3), 12, 10), leaf); l.position.set(-0.6 + i * 0.2, 0.08 + 0.04 * (i % 2), -0.05); branch.add(l); } }
  branch.position.set(BX + 0.1, 1.52, BZ); branch.scale.set(0.6, 0.7, 0.7); branch.visible = false; ST.scene.add(branch);

  // ── host ──────────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const SHOWARM = { ...REST, shR: [48, -10, 18], elR: 100, head: [8, 10, 0], smile: 0.7, brow: [0.6, 0] };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const SHRUG = { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, smile: 0.8, brow: [0.8, 0], head: [-4, 18, 6] };
  const act = track([{ t: 0, pose: SHOWARM }, { t: L(2) - 0.05, d: 0.3, pose: POINT }, { t: T_DONT - 0.05, d: 0.3, pose: SHRUG }, { t: L(3) - 0.05, d: 0.3, pose: POINT }, { t: L(5) - 0.05, d: 0.3, pose: SHOWARM }, { t: L(6) - 0.05, d: 0.3, pose: { ...POINT, smile: 0.9 } }]);

  const popK = (t) => (t < L(1) - 0.06 ? eob(seg(t, T_POP - 0.25, T_POP + 0.15)) * 0.3 + eob(seg(t, T_BEND, T_BEND + 0.3)) * 0.7 : 1);
  const ARMUP = (s) => ({ ['sh' + s]: [52, s === 'R' ? 10 : -10, 12], ['el' + s]: 105 });
  const FLEX = { shL: [85, 0, 8], shR: [85, 0, 8], elL: 110, elR: 110 };

  function show(t, o) {
    blip.group.position.set(BX, o.lift || 0, BZ); blip.group.rotation.set(0, o.turn ?? -0.15, 0);
    const s = blip.update(t, PLAN, {}), f = blip.current, h = f.human;
    if (o.flashK != null) { blip.flash.visible = false; blip.ring.material.opacity *= 0.5; f.mats.forEach((m) => { if (!m.uniforms && m.emissive) m.emissiveIntensity *= 0.25 + 0.75 * o.flashK; if (m.uniforms?.uS) m.uniforms.uS.value = 1.15 + (m.uniforms.uS.value - 1.15) * o.flashK; }); blip.light.intensity *= o.flashK; }
    const w = Math.sin(t * 2.2);
    let q = { spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24 };
    if (o.arms === 'R') q = { ...q, ...ARMUP('R'), head: [8, 12, 0] };
    if (o.arms === 'both') q = { ...q, ...FLEX, head: [0, 0, 0] };
    if (o.arms === 'hang') { const sw = Math.sin(t * 3); q = { spine: [0, 0, sw * 4], head: [-14, 0, 0], shL: [172, 0, 14], shR: [172, 0, 14], elL: 8, elR: 8, hipL: [10 + sw * 12, 0, 4], hipR: [10 - sw * 12, 0, 4], knL: 20, knR: 20 }; }
    if (o.arms === 'wave') q = { ...q, shR: [150, 0, 30], elR: 30 + 20 * Math.sin(t * 9) };
    h.pose(q);
    if (s.form === 'human') f.face.set({ smile: o.smile ?? 0.8, look: o.look || [0, 0] });
    if (s.form === 'xray') { f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gas.forEach((g) => (g.visible = false)); f.kidneys.forEach((k) => (k.visible = false)); f.face.set({}); }
    blip.group.updateMatrixWorld(true);
    // tendons
    const pk = popK(t), set = (T, on, out, k = 1) => { T.g.visible = on; if (!on) return; faceCam(T, out); T.tend.scale.set(1, 1, 1).multiplyScalar(k); };
    const pull = o.pull || 0;
    set(TH.R, s.form === 'human' && o.arms !== 'hang', 0.05 + 0.012 * pk, 0.4 + 0.6 * pk);
    set(TH.L, false, 0.06);
    set(TX.R, s.form === 'xray' && !o.noRight, 0.055 + 0.25 * pull); if (TX.R.g.visible) { TX.R.tend.position.y = -0.14 - 0.1 * pull; TX.R.belly.visible = pull < 0.05; glowT.emissiveIntensity = 0.9 + 0.5 * Math.sin(t * 8) ** 2; }
    set(TX.L, s.form === 'xray' && !!o.leftOn, 0.045); TX.L.tend.scale.set(2.6, 1, 2.6);
    branch.visible = o.arms === 'hang';
    // host
    const p0 = drag(act, t), pz = alive(p0, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0); host.group.visible = !o.noHost; host.group.updateMatrixWorld(true);
    ST.setMood(Math.max(s.xray * (o.xk ?? 0.75), o.mood ?? 0.12));
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + s.xray * 0.12, bloomThreshold: lerp(0.78, 0.55, s.xray), ...(o.look || {}) });
    return s;
  }
  const ARM = (side, k, d0 = 0.62, d1 = 0.48, h = XH) => () => { const el = (blip.current.isXray ? XH : HH).arm[side].el, c = el.localToWorld(V3(0, -0.13, 0)); return { pos: lerpV(c.clone().add(V3(-0.06, 0.02, d0)), c.clone().add(V3(-0.04, 0.02, d1)), k), at: c, focus: c, look: { aperture: 0.001 } }; };
  const TWO = (k) => ({ pos: lerpV(V3(0.1, 1.0, 3.5), V3(0.14, 0.98, 3.15), k), at: V3(0.08, 0.88, 0), focus: V3(0.12, 0.88, BZ), look: { aperture: 0.0016 } });
  const WIDE = (k) => ({ pos: lerpV(V3(0.03, 1.08, 4.6), V3(0.06, 1.06, 4.25), k), at: V3(0.04, 0.95, 0), focus: V3(0.04, 0.95, 0.05), look: { aperture: 0.0016 } });
  const tendScr = (T) => screen(T.tend.getWorldPosition(V3()), cam);

  // 1 · frame 1 = the payoff: arm close-up, "DO THIS RIGHT NOW", the cord pops
  add({ id: 'S00', at: 0, note: 'EXTREME close-up from frame 1: Blip\'s raised forearm fills the frame; "DO THIS RIGHT NOW 👇" and "👍 → 🤙 + BEND"; on "bend"/"pop" a cord rises under the skin', draw(lt, d, t, blit) {
    const s = show(t, { arms: 'R', aim: ARM('R', eio(lt / d), 0.95, 0.78), noHost: false, flashK: 0.2 }); blit();
    pill('DO THIS RIGHT NOW 👇', 540, 300, 1 + 0.04 * Math.sin(t * 10), '#FFFFFF', 'rgba(190,16,24,0.95)', 70);
    pill('THUMB ➜ PINKY + BEND', 540, 440, popIn(t - T_THUMB + 0.3), '#111', YEL, 56);
    if (t > T_CORD - 0.1) { const [x, y] = tendScr(TH.R); label('SEE IT?', 830, y - 200, x + 18, y, eob(seg(t, T_CORD - 0.1, T_CORD + 0.2))); }
  } });
  cue(T_BEND, 'slide', { dur: 0.3, gain: 0.5 }); cue(T_POP, 'boing', { gain: 0.6 });

  // 2 · x-ray: palmaris longus
  add({ id: 'S01', at: cut(1), note: 'same arm close-up, x-ray: the tendon glows gold, a small red muscle belly near the elbow; label PALMARIS LONGUS', draw(lt, d, t, blit) {
    const s = show(t, { arms: 'R', aim: ARM('R', eio(lt / d), 0.55, 0.45), flashK: 0.15 }); blit();
    if (t > T_MUSC - 0.1) pill('IT\'S A MUSCLE 💪', 540, 300, popIn(t - T_MUSC + 0.1), '#111', YEL, 70);
    if (t > T_PALM - 0.1) { const [x, y] = tendScr(TX.R); label('PALMARIS LONGUS', 540, Math.min(1050, y + 260), x, y + 40, eob(seg(t, T_PALM - 0.1, T_PALM + 0.2))); }
  } });
  cue(T_PALM, 'sparkle', { gain: 0.5 });

  // 3 · 1 in 7 don't have it
  add({ id: 'S02', at: cut(2), note: 'two-shot (host + Blip, both showing a wrist); a row of 7 people icons, one flips to a red ❌: "1 IN 7 DON\'T HAVE IT"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), arms: 'R', flashK: 0.15 }); blit();
    if (t > T_ONE - 0.15) { ctx.save(); ctx.font = '88px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (let i = 0; i < 7; i++) { const a = popIn(t - T_ONE + 0.15 - i * 0.05); if (a <= 0) continue; ctx.globalAlpha = Math.min(1, a); const x = 120 + i * 140; ctx.fillText(i === 3 && t > T_DONT ? '❌' : '🧍', x, 300); } ctx.restore(); }
    if (t > T_DONT - 0.1) pill("1 IN 7 DON'T HAVE IT", 540, 1180, popIn(t - T_DONT + 0.1), '#FFFFFF', RED, 70);
  } });
  for (let i = 0; i < 7; i++) cue(T_ONE - 0.15 + i * 0.05, 'pop', { gain: 0.2 }); cue(T_DONT, 'boing', { gain: 0.5 });

  // 4 · left over from tree-climbing ancestors
  add({ id: 'S03', at: cut(3), note: 'wide: a leafy branch appears and Blip hangs from it swinging like an ape; "🐒 LEFT OVER FROM TREE CLIMBERS"', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), arms: 'hang', lift: 0.16, flashK: 0.15, smile: 1.1 }); blit();
    if (t > T_LEFT - 0.1) pill('LEFT OVER 🦴', 540, 300, popIn(t - T_LEFT + 0.1), '#FFFFFF', DARK, 66);
    if (t > T_TREES - 0.15) pill('🐒 FROM TREE CLIMBERS', 540, 1180, popIn(t - T_TREES + 0.15), '#111', GRN, 66);
  } });
  cue(L(3) + 0.05, 'whoosh', { gain: 0.5 }); cue(T_TREES, 'boing', { gain: 0.4 });

  // 5 · useless → surgeons take it out
  add({ id: 'S04', at: cut(4), note: 'x-ray arm close-up: the golden tendon slides right out of the forearm toward camera; "SO USELESS…" "🔧 SURGEONS USE IT AS A SPARE"', draw(lt, d, t, blit) {
    const s = show(t, { arms: 'R', aim: ARM('R', eio(lt / d), 0.6, 0.5), pull: eio(seg(t, T_SURG, T_FIX + 0.2)), flashK: 0.15 }); blit();
    if (t > T_USE - 0.1) pill('SO USELESS…', 540, 300, popIn(t - T_USE + 0.1), '#FFFFFF', DARK, 70);
    if (t > T_SURG - 0.05) pill('🔧 SPARE PART FOR SURGEONS', 540, 1180, popIn(t - T_SURG + 0.05), '#111', YEL, 56);
  } });
  cue(T_SURG + 0.1, 'zip', { dur: 0.6, gain: 0.6 });

  // 6 · check both arms
  add({ id: 'S05', at: cut(5), note: 'x-ray Blip raises BOTH forearms: one has the glowing tendon (✅), the other has none (❌)', draw(lt, d, t, blit) {
    const s = show(t, { arms: 'both', leftOn: true, noRight: t > T_BOTH + 0.3, noHost: true, flashK: 0.15, aim: () => { const c = XH.spine.localToWorld(V3(0, 0.55, 0.12)); return { pos: lerpV(c.clone().add(V3(0, 0.08, 2.2)), c.clone().add(V3(0, 0.08, 1.95)), eio(lt / d)), at: c, focus: c, look: { aperture: 0.0011 } }; } }); blit();
    if (t > T_BOTH - 0.1) pill('CHECK BOTH ARMS', 540, 300, popIn(t - T_BOTH + 0.1), '#111', YEL, 72);
    if (t > T_SIDE - 0.15) { const [lx, ly] = tendScr(TX.L), rp = screen(XH.arm.R.el.localToWorld(V3(0, -0.14, 0)), cam); pill('✅', lx, ly - 170, popIn(t - T_SIDE + 0.15), '#111', GRN, 70); pill('❌', rp[0], rp[1] - 170, popIn(t - T_SIDE + 0.05), '#FFFFFF', RED, 70); pill('SOME HAVE IT ON ONE SIDE', 540, 1180, popIn(t - T_SIDE + 0.15), '#FFFFFF', DARK, 54); }
  } });
  cue(T_SIDE, 'pop'); cue(T_SIDE + 0.1, 'pop');

  // 7 · comment question (loops back into the arm close-up hook)
  add({ id: 'S06', at: cut(6), note: 'two-shot pushing in: Blip waves at the viewer; "DO YOU HAVE IT? 👇" with "✅ YES / ❌ NO" pills', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), arms: 'wave', flashK: 0.15, smile: 1.1 }); blit();
    pill('DO YOU HAVE IT? 👇', 540, 300, popIn(t - L(6)) * (1 + 0.04 * Math.sin(t * 10)), '#FFFFFF', 'rgba(190,16,24,0.95)', 76);
    if (t > T_COMM - 0.3) { pill('✅ YES', 340, 1180, popIn(t - T_COMM + 0.3), '#111', GRN, 66); pill('❌ NO', 740, 1180, popIn(t - T_COMM + 0.15), '#FFFFFF', RED, 66); }
  } });
  cue(L(6), 'pop'); cue(T_COMM, 'pop');

  return { shots: S, cues: CUES };
}
