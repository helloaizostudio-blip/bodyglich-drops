// CAN YOU ROLL YOUR TONGUE? (Body Glitch, playbook 24 Nov: Blip mid-transformation in frame 1, am_puck x1.15, <24 s,
// follow line at the end). Blip pops into human-Blip who sticks out his tongue and rolls it into a tube; 2 out of 3 can;
// "one gene" textbook claim → MYTH stamp; twist: Blip splits into identical twins — one rolls, one can't; the other
// learns with practice; back to Blip for ✅/❌ + FOLLOW.
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
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.05);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.78, vignette: 0.45, warm: 0.04, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human'] }), twin = new Shifter({ forms: ['human'] });
  ST.scene.add(host.group, blip.group, twin.group);
  const HX = -0.25, BX = 0.3, BZ = 0.12;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_ROLL = Wd('roll', 0), T_TUBE = Wd('tube', 0), T_CAN0 = Wd('Can', 0);
  const T_23 = Wd('two', 1);
  const T_DEC = Wd('decades', 2), T_GENE = Wd('gene', 2);
  const T_TWIST = Wd('twist', 3), T_MYTH = Wd('myth', 3);
  const T_TWINS = Wd('twins', 4), T_DNA = Wd('DNA', 4), T_CAN = Wd('can', 4), T_CANT = Wd("can't", 4);
  const T_LEARN = Wd('learn', 5), T_PRAC = Wd('practice', 5);
  const T_YOURS = Wd('roll', 6), T_BELOW = Wd('below', 6);
  const PLAN = [{ t: 0.35, form: 'human', charge: 0.3 }, { t: L(6) + 0.1, form: 'blip' }];
  const TPLAN = [{ t: L(4) + 0.05, form: 'human', charge: 0.2 }];
  Shifter.cues(PLAN, cue); Shifter.cues(TPLAN, cue);

  // ── tongues: flat (squashed oval) or rolled (a U-shaped tube seen end-on) ──
  const tongueM = new THREE.MeshStandardMaterial({ color: '#FF7A96', roughness: 0.35, emissive: '#C2405A', emissiveIntensity: 0.25 });
  const mkTongue = (head) => { const g = new THREE.Group(); g.position.set(0, 0.088, 0.112); head.add(g);
    const flat = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), tongueM); flat.scale.set(0.022, 0.006, 0.026); flat.position.z = 0.016; g.add(flat);
    const roll = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0055, 10, 24, Math.PI * 1.55), tongueM); roll.rotation.z = Math.PI / 2 - Math.PI * 1.775; roll.position.set(0, 0.002, 0.03); roll.scale.z = 2.2; g.add(roll);
    return { g, flat, roll }; };
  const TA = mkTongue(blip.forms.human.human.head), TB = mkTongue(twin.forms.human.human.head);
  const setTongue = (T, out, rolled) => { T.g.visible = out > 0.02; T.g.scale.setScalar(Math.max(0.01, out)); T.flat.visible = !rolled; T.roll.visible = rolled; };

  // ── host ──────────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.2, spine: [-6, 0, 0], head: [6, 18, 0] };
  const SHRUG = { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, smile: 0.8, brow: [0.8, 0], head: [-4, 18, 6] };
  const act = track([{ t: 0, pose: POINT }, { t: L(2) - 0.05, d: 0.3, pose: SHRUG }, { t: T_TWIST - 0.05, d: 0.25, pose: SHOCK }, { t: L(4) - 0.05, d: 0.3, pose: POINT }, { t: L(6) - 0.05, d: 0.3, pose: { ...SHRUG, smile: 1 } }]);

  const twinOn = (t) => t > L(4) - 0.05 && t < L(6) - 0.05;

  function show(t, o) {
    const split = twinOn(t), mx = split ? BX - 0.08 : BX;
    blip.group.position.set(mx, 0, BZ); blip.group.rotation.set(0, o.turn ?? -0.15, 0);
    const bq = t < 0.3 ? { y: 0.03, squash: 0.1 * Math.sin(t * 34), armL: 70, armR: 70, smile: 1 } : { y: 0.06 * Math.abs(Math.sin(t * 6)), armR: 150 + 20 * Math.sin(t * 10), armL: 20, smile: 1, mouth: t > T_BELOW ? 0.4 : 0 };
    const s = blip.update(t, PLAN, { blip: bq }); blip.light.intensity *= 0.45; blip.flash.material.opacity *= 0.7;
    const f = blip.current, w = Math.sin(t * 2.2);
    // main tongue: out from 0.55 s, rolls on "tube"; stays rolled; tucked away when the twin "learns" so we watch the twin
    if (f.human) { f.human.pose({ spine: [0, w * 2, 0], head: [-6, w * 3, 0], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24 }); f.face.set({ smile: 0.4, lid: 0 });
      setTongue(TA, eob(seg(t, 0.55, 0.85)) * (t < L(6) - 0.05 ? 1 : 0), t > T_TUBE - 0.05); }
    // twin: pops out of Blip at L(4) (same colours = identical twin), can't roll until practice
    twin.group.visible = split; twin.group.position.set(BX + 0.3, 0, BZ); twin.group.rotation.set(0, -0.3, 0);
    if (split) { const ts = twin.update(t, TPLAN, {}); twin.light.intensity *= 0.45; twin.flash.material.opacity *= 0.7; const tf = twin.current;
      if (tf.human) { const tryk = t > T_LEARN - 0.2 && t < T_PRAC + 0.1 ? Math.sin((t - T_LEARN) * 18) : 0;
        tf.human.pose({ spine: [0, -w * 2, 3 * tryk], head: [-6 + 4 * tryk, -w * 3, 4 * tryk], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24 });
        const rolled = t > T_PRAC + 0.15; tf.face.set({ smile: rolled ? 1.1 : -0.2, lid: tryk ? 0.4 : 0 }); setTongue(TB, eob(seg(t, L(4) + 0.4, L(4) + 0.7)), rolled); } }
    blip.group.updateMatrixWorld(true); twin.group.updateMatrixWorld(true);
    const p0 = drag(act, t), pz = alive(p0, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX - (split ? 0.08 : 0), 0, 0); host.group.visible = !o.noHost; host.group.updateMatrixWorld(true);
    ST.setMood(0.12);
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), ...(o.look || {}) });
    return s;
  }
  const headOf = (sh) => (sh.current?.human ? sh.current.human.head.localToWorld(V3(0, 0.12, 0.03)) : sh.group.localToWorld(V3(0, 0.4, 0)));
  const FACE = (k, d0, d1) => () => { const c = headOf(blip); return { pos: lerpV(c.clone().add(V3(0.05, 0.0, d0)), c.clone().add(V3(0.04, 0.0, d1)), k), at: c.clone().add(V3(0, -0.05, 0)), focus: c, look: { aperture: 0.0012 } }; };
  const TWO = (k) => ({ pos: lerpV(V3(0.1, 1.0, 3.5), V3(0.14, 0.98, 3.15), k), at: V3(0.08, 0.88, 0), focus: V3(0.12, 0.88, BZ), look: { aperture: 0.0016 } });
  const WIDE = (k) => ({ pos: lerpV(V3(0.12, 1.08, 4.4), V3(0.14, 1.06, 4.1), k), at: V3(0.12, 0.95, 0), focus: V3(0.2, 0.95, BZ), look: { aperture: 0.0016 } });
  const overHead = (sh, dy = 0.04) => screen(sh.current?.human ? sh.current.human.head.localToWorld(V3(0, 0.3 + dy, 0)) : sh.group.localToWorld(V3(0, 0.6, 0)), cam);

  // 1 · hook: mid-transformation in frame 1 → tongue out → rolls
  add({ id: 'S00', at: 0, note: 'medium→face: Blip is already charging at frame 1 and pops into human-Blip at 0.35 s; his tongue pops out flat, then rolls into a tube on "tube"', draw(lt, d, t, blit) {
    const s = show(t, { aim: () => { const up = eio(seg(t, 0.33, 0.5)), c0 = blip.group.localToWorld(V3(0, 0.32, 0)), c1 = headOf(blip), c = lerpV(c0, c1, up); return { pos: c.clone().add(V3(0.05, 0.02, t < 0.33 ? 1.9 : lerp(1.0, 0.72, eio(seg(t, 0.33, 1.4))))), at: c.clone().add(V3(0, -0.05, 0)), focus: c, look: { aperture: 0.0012 } }; }, noHost: true }); blit();
    pill('TRY THIS 👅', 540, 300, 1 + 0.04 * Math.sin(t * 10), '#FFFFFF', 'rgba(190,16,24,0.95)', 80);
    if (t > T_TUBE - 0.05) pill('ROLL IT INTO A TUBE', 540, 1180, popIn(t - T_TUBE + 0.05), '#111', YEL, 62);
  } });
  cue(T_TUBE, 'boing', { gain: 0.6 });

  // 2 · 2 out of 3 can
  add({ id: 'S01', at: cut(1), note: 'face close-up with the rolled tongue; three people icons, two ✅ one ❌: "2 OUT OF 3 CAN"', draw(lt, d, t, blit) {
    const s = show(t, { aim: FACE(eio(lt / d), 0.9, 0.8), noHost: true }); blit();
    if (t > T_23 - 0.15) { ctx.save(); ctx.font = '120px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; for (let i = 0; i < 3; i++) { const a = popIn(t - T_23 + 0.15 - i * 0.08); if (a <= 0) continue; ctx.globalAlpha = Math.min(1, a); ctx.fillText(i < 2 ? '✅' : '❌', 330 + i * 210, 300); } ctx.restore(); pill('2 OUT OF 3 CAN', 540, 1180, popIn(t - T_23), '#111', GRN, 70); }
  } });
  cue(T_23, 'pop');

  // 3 · "one gene", taught for decades
  add({ id: 'S02', at: cut(2), note: 'two-shot with the host: a textbook pill "📚 1 GENE = TONGUE ROLLING"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)) }); blit();
    if (t > T_DEC - 0.1) pill('📚 TAUGHT FOR DECADES', 540, 300, popIn(t - T_DEC + 0.1), '#FFFFFF', DARK, 62);
    if (t > T_GENE - 0.15) pill('🧬 "ONE GENE DECIDES IT"', 540, 1100, popIn(t - T_GENE + 0.15), '#111', YEL, 60);
  } });
  cue(T_GENE, 'tock');

  // 4 · twist: myth
  add({ id: 'S03', at: cut(3), note: 'same two-shot: "🤯 THE TWIST"; a red MYTH stamp slams across the one-gene pill', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(1) }); blit();
    pill('🧬 "ONE GENE DECIDES IT"', 540, 1100, 1, '#111', YEL, 60);
    if (t > T_TWIST - 0.1) pill('🤯 THE TWIST', 540, 300, popIn(t - T_TWIST + 0.1) * (1 + 0.05 * Math.sin(t * 12)), '#FFFFFF', 'rgba(190,16,24,0.95)', 72);
    if (t > T_MYTH - 0.05) { const a = popIn(t - T_MYTH + 0.05, 0.25), k = 1 + 0.6 * imp(t - T_MYTH, 9); ctx.save(); ctx.translate(540, 1100); ctx.rotate(-0.15); ctx.scale(a * k, a * k); ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = 16; ctx.strokeRect(-230, -80, 460, 160); ctx.fillStyle = '#FF3B3B'; ctx.font = '900 120px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MYTH', 0, 6); ctx.restore(); }
  } });
  cue(T_TWIST, 'slam', { gain: 0.5 }); cue(T_MYTH, 'slam', { gain: 0.8 });

  // 5 · identical twins: one can, one can't
  add({ id: 'S04', at: cut(4), note: 'wide: Blip splits — an identical twin pops out next to him (flash); "IDENTICAL TWINS · SAME DNA"; ✅ over one (rolled tongue), ❌ over the other (flat tongue)', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)) }); blit();
    if (t > T_TWINS - 0.1) pill('👯 IDENTICAL TWINS', 540, 300, popIn(t - T_TWINS + 0.1), '#111', YEL, 66);
    if (t > T_DNA - 0.1) pill('🧬 SAME DNA', 540, 420, popIn(t - T_DNA + 0.1), '#FFFFFF', DARK, 54);
    if (t > T_CAN - 0.1) { const [x, y] = overHead(blip); pill('✅', x, y, popIn(t - T_CAN + 0.1), '#111', GRN, 64); }
    if (t > T_CANT - 0.1) { const [x, y] = overHead(twin); pill('❌', x, y, popIn(t - T_CANT + 0.1), '#FFFFFF', RED, 64); }
  } });
  cue(T_CAN, 'pop'); cue(T_CANT, 'thud', { gain: 0.5 });

  // 6 · practice
  add({ id: 'S05', at: cut(5), note: 'closer on the twin straining, then his tongue rolls: "💪 LEARNED WITH PRACTICE"', draw(lt, d, t, blit) {
    const s = show(t, { aim: () => { const c = headOf(twin); return { pos: lerpV(c.clone().add(V3(-0.04, 0.0, 0.95)), c.clone().add(V3(-0.03, 0.0, 0.8)), eio(lt / d)), at: c.clone().add(V3(0, -0.05, 0)), focus: c, look: { aperture: 0.0013 } }; } }); blit();
    if (t > T_LEARN - 0.1) pill('😤 TRYING…', 540, 300, popIn(t - T_LEARN + 0.1), '#FFFFFF', DARK, 62);
    if (t > T_PRAC + 0.1) { const [x, y] = overHead(twin, 0.05); pill('✅', x, y, popIn(t - T_PRAC - 0.1), '#111', GRN, 64); pill('💪 LEARNED IT', 540, 1180, popIn(t - T_PRAC - 0.1), '#111', GRN, 70); }
  } });
  cue(T_PRAC + 0.15, 'boing', { gain: 0.6 }); cue(T_PRAC + 0.17, 'sparkle', { gain: 0.5 });

  // 7 · back to Blip: comment question + follow
  add({ id: 'S06', at: cut(6), note: 'two-shot lowering: the twin vanishes; human-Blip transforms back into little Blip who waves: "CAN YOU? ✅ / ❌" and a small FOLLOW pill for the last 1.5 s', draw(lt, d, t, blit) {
    const k7 = eio(seg(t, PLAN[1].t - 0.1, PLAN[1].t + 0.5)), s = show(t, { pos: lerpV(V3(0.1, 1.0, 3.3), V3(0.14, 0.72, 2.6), k7), at: lerpV(V3(0.08, 0.88, 0), V3(0.14, 0.5, 0), k7), focus: V3(BX, 0.5, BZ), look: { aperture: 0.0016 } }); blit();
    pill('CAN YOU ROLL YOURS? 👇', 540, 300, popIn(t - L(6)) * (1 + 0.04 * Math.sin(t * 10)), '#FFFFFF', 'rgba(190,16,24,0.95)', 62);
    if (t > T_YOURS) { pill('✅ YES', 340, 1100, popIn(t - T_YOURS), '#111', GRN, 64); pill('❌ NO', 740, 1100, popIn(t - T_YOURS - 0.12), '#FFFFFF', RED, 64); }
    if (t > T.dur - 1.6) pill('FOLLOW FOR DAILY GLITCHES 💙', 540, 1240, popIn(t - T.dur + 1.6), '#FFFFFF', 'rgba(23,169,201,0.95)', 44);
  } });
  cue(L(6), 'pop'); cue(T_BELOW, 'pop');

  return { shots: S, cues: CUES };
}
