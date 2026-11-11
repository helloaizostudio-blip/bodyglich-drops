// WHAT HAPPENS IF YOU HOLD IN YOUR PEE? (Body Glitch, host v2 + shape-shifting Blip)
// The host does the dance for real; Blip becomes a person, then that person's x-ray (bladder filling, sensors
// messaging the brain, the ring of muscle clamping, bacteria multiplying), and a cat for the 21-second fact.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host } from './core/host.js';
import { Shifter } from './core/shift.js';
import { studio } from './core/studio.js';
import { track, drag, alive, addPose, breathe, mouthFor, hop, spring, bump, wobble, drift, blink, popIn } from './core/motion.js';
import { pill, label } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.8, vignette: 0.4, warm: 0.015, exposure: 1.02 };
  const YEL = '#FFD43B', RED = '#FF5A5A', GRN = '#C8F04A', DARK = 'rgba(12,14,20,0.82)';

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray', 'cat'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.33, BZ = 0.12;

  // ── times ─────────────────────────────────────────────────────────────────
  const X1 = Wd('bladder', 1), T_SENS = Wd('sensors', 2), T_CLAMP = Wd('clamps', 3), X2 = Wd('bacteria', 6), T_RUN = Wd('just', 8) + 0.1, T_CAT = Wd('cat', 9), T_21 = Wd('twenty', 9), T_BACK = L(10) - 0.5;
  const PLAN = [
    { t: Wd('you', 0), form: 'human' },
    { t: X1, form: 'xray' },
    { t: L(5) - 0.08, form: 'blip', charge: 0.03 },
    { t: X2, form: 'xray' },
    { t: L(8) - 0.08, form: 'blip', charge: 0.03 },
    { t: T_CAT, form: 'cat' },
    { t: Wd('Follow', 10) + 0.1, form: 'blip', charge: 0.14 },
  ];
  Shifter.cues(PLAN, cue);

  // ── the host's performance ────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.6 };
  const DANCE = { spine: [9, 0, 0], head: [-6, 0, 0], shL: [6, 0, 5], shR: [6, 0, 5], elL: 62, elR: 62, hipL: [0, 0, -6], hipR: [0, 0, -6], knL: 18, knR: 18, brow: [0.5, 0.9], lid: -0.3, smile: -0.7 };
  const act = track([
    { t: 0, pose: DANCE },
    { t: L(1) - 0.1, d: 0.5, pose: { ...REST, hipL: [0, 0, -4], hipR: [0, 0, -4], knL: 10, knR: 10, brow: [0.2, 0.4], smile: 0.3 } },
    { t: L(5) - 0.05, d: 0.4, pose: { ...DANCE, spine: [4, 0, 0], shR: [58, 0, 14], elR: 104, smile: 0.7, brow: [0.4, 0.8], lid: 0 } },
    { t: L(6) - 0.05, d: 0.5, pose: REST },
    { t: L(8) - 0.05, d: 0.35, pose: { ...DANCE, spine: [12, 0, 0], lid: 0.4, squash: -0.04 } },
    { t: T_BACK + 0.7, d: 0.4, pose: { spine: [-4, 0, 0], head: [-8, 0, 0], shL: [0, 0, 16], shR: [0, 0, 16], elL: 14, elR: 14, lid: 0.85, smile: 1, brow: [0.6, 0] } },
    { t: Wd('next', 10), d: 0.4, pose: { ...REST, shL: [8, 0, 128], elL: 50, smile: 1, brow: [0.5, 0] } },
  ]);
  const strain = (t) => Math.max(1 - seg(t, L(1) - 0.3, L(1)), 0.45 * seg(t, L(1), L(1) + 0.5) * (1 - seg(t, L(6) - 0.2, L(6) + 0.2)), 0.5 * seg(t, L(6), L(6) + 0.4) * (t < L(8) ? 1 : 0), seg(t, L(8) - 0.1, L(8) + 0.2) * (t < T_RUN ? 1 : 0));

  // ── inside the x-ray: bladder, signals, ring, bacteria (spine-local) ──────
  const germM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#B45CFF').multiplyScalar(1.5) });
  const BL = V3(0, -0.085, 0.045), UP = [BL, V3(0, -0.04, -0.06), V3(0, 0.2, -0.085), V3(0, 0.5, -0.07), V3(0, 0.66, -0.03), V3(0, 0.77, 0)];
  const along = (pts, k) => { const x = clamp(k) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x)); return pts[i].clone().lerp(pts[i + 1], x - i); };
  function inside(t, f) {
    const second = t >= X2, fill = second ? 1 : lerp(0.5, 1, eio(seg(t, X1, L(5) - 0.4))), sag = second ? seg(t, L(7), L(8) - 0.3) : 0, press = second ? 0.5 : seg(t, L(3), L(5));
    const r = (0.62 + 0.75 * fill + 0.22 * sag) * (1 + 0.035 * press * Math.sin(t * 13));
    f.bladder.scale.set(r * (1 + 0.12 * sag), r * (1 - 0.14 * sag), r); f.bladder.position.set(0, -0.085 + (r - 1) * 0.022 - 0.012 * sag, 0.045);
    f.bladder.material.emissiveIntensity = 0.3 + 0.35 * fill; f.bladder.material.opacity = second ? 0.45 : 0.88; f.bladder.material.color.set('#FFD23F').lerp(new THREE.Color('#C9B24A'), sag * 0.7);
    const clampK = second ? 1 : spring(clamp((t - T_CLAMP) / 0.35)); f.ring.scale.setScalar(lerp(1.15, 0.62, clampK)); f.ring.material.emissiveIntensity = 0.3 + clampK * (0.6 + 0.4 * Math.sin(t * 10));
    const sig = !second && t > T_SENS - 0.1; let pulse = 0;
    const nb = second ? Math.min(34, Math.round(Math.pow(2, seg(t, X2, L(7) + 0.4) * 5.1))) : 0, R = 0.04 * r * 0.72;
    f.gas.forEach((b, i) => {
      if (second) {                                                                                         // bacteria: doubling inside the bladder
        b.visible = i < nb; if (!b.visible) return; const a = hash(i) * 6.28 + t * (0.5 + hash(i + 2)), ph = (hash(i + 5) - 0.5) * 2.4, rr = R * Math.cbrt(hash(i + 7) + 0.05);
        b.material = germM; b.position.set(Math.cos(a) * Math.cos(ph) * rr, f.bladder.position.y + Math.sin(ph) * rr * 0.85, 0.045 + Math.sin(a) * Math.cos(ph) * rr + R * 0.35); b.scale.set(0.55, 0.55, 1.0).multiplyScalar(0.9 + 0.2 * Math.sin(t * 8 + i)); b.rotation.set(hash(i) * 6 + t, hash(i + 1) * 6, 0);
      } else {                                                                                              // sensors → brain
        b.visible = sig && i < 10; if (!b.visible) return; const k = ((t - T_SENS) * 0.75 + i / 10) % 1; if (t - T_SENS < i / 10 / 0.75 - k / 0.75 + 0.001 && (t - T_SENS) * 0.75 < i / 10) { b.visible = (t - T_SENS) * 0.75 + i / 10 >= 1 ? true : k > i / 10; }
        b.material = f.sigM; b.position.copy(along(UP, eio(k))); b.rotation.set(0, 0, 0); b.scale.setScalar(1.9 * Math.sin(Math.min(1, k * 6) * 1.57) * (1 - seg(k, 0.9, 1))); if (k > 0.86) pulse = Math.max(pulse, 1 - Math.abs(k - 0.93) / 0.07);
      }
    });
    f.brain.material.emissiveIntensity = 0.3 + 1.3 * pulse; f.brain.scale.set(0.068 * (1 + 0.06 * pulse), 0.052 * (1 + 0.06 * pulse), 0.074 * (1 + 0.06 * pulse));
  }

  /** one frame: Blip + effect, the x-ray's insides, the host, mood, camera punch, render */
  function show(t, o) {
    const pre = blip.state(t, PLAN);
    const hi = hop(t - Wd('Follow', 10) - 0.25, { d: 0.4, h: 0.2, pre: 0.1 }), follow = t > T_RUN && t < T_CAT ? eio(seg(t, T_RUN, T_RUN + 0.6)) : 0, sus = t > L(5) && t < L(6) ? 1 : t > L(8) && t < T_RUN ? 1 : 0, wave = t > Wd('Follow', 10) + 0.7 ? 1 : 0;
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = o.turn ?? -0.3;
    const s = blip.update(t, PLAN, { blip: { y: hi.y, squash: hi.squash + Math.sin(t * 2.4) * 0.02, tilt: [hi.air * 8, -6 * sus], turn: -10 * sus - 40 * follow,
      armL: 14 + hi.air * 70 + wave * (125 + Math.sin(t * 15) * 22), armR: 14 + hi.air * 70, lean: (hi.land > 0 ? wobble(hi.land / 0.9, 2.4, 3.5) * 32 : -hi.air * 24) + drift(t, 3, 1.2) * 5,
      lid: Math.max(blink(t, 5), sus * 0.4), look: [-0.75 * Math.max(sus, follow) - 0.2, 0.6 * sus + 0.2], smile: sus ? -0.2 : 0.9, mouth: hi.air * 0.7 + follow * 0.5 * (1 - seg(t, T_RUN + 0.8, T_RUN + 1.2)), glow: 1.6 + hi.air * 2 } });
    const f = blip.current;
    if (s.form === 'xray') inside(t, f);
    if (s.form === 'human') { const wv = bump(seg(s.since, 0.25, 1.2)); f.human.pose({ head: [-4, -10, 4], spine: [0, -8, 0], shL: [6, 0, 12], shR: [10, 0, 12 + 128 * wv], elL: 22, elR: 20 + 50 * wv + Math.sin(t * 14) * 20 * wv }); }
    ST.setMood(s.xray);
    // the host: dances on the spot, runs off on "just go", strolls back relieved for the sign-off
    const gone = t >= T_RUN && t < T_BACK, back = t >= T_BACK ? seg(t, T_BACK, T_BACK + 0.75) : 0, st = strain(t), bounce = Math.sin(t * 11);
    const watch = s.n >= 0 && !gone ? Math.max(pre.charge, 1 - eio(seg(s.since, 0.7, 1.3))) * (t > L(1) && back === 0 ? 1 : 0) : 0, r = s.n >= 0 && s.since < 2 ? Math.exp(-s.since * 2.4) * (1 - Math.exp(-s.since * 22)) : 0;
    host.group.rotation.y = 0; host.belly(0);
    if (gone) { const k = seg(t, T_RUN, T_RUN + 1.0); host.walk((t - T_RUN) * 17, 1, { brow: [0.6, 0.8], lid: -0.3, mouth: 0.5, smile: -0.5, spine: [14, 0, 0] }); host.group.rotation.y = -1.45 * eo(clamp(k * 5)); host.group.position.set(HX - 2.2 * k * k, 0, 0); }
    else if (back > 0 && back < 1) { host.walk((t - T_BACK) * 9, 0.8, { smile: 1, lid: 0.5, brow: [0.5, 0] }); host.group.rotation.y = 1.3 * (1 - eio(seg(back, 0.7, 1))); host.group.position.set(HX - 1.3 * (1 - eio(back)), 0, 0); }
    else {
      let p = drag(act, t);
      p = addPose(p, { spine: [-4 * r, 12 * watch, -3 * watch + 3 * st * bounce], head: [3 * watch - 5 * r, 26 * watch, -3 * st * bounce], look: [0.7 * watch, -0.45 * watch], brow: Array.isArray(p.brow ?? [0, 0]) ? [0.8 * r, 0] : undefined, lid: -0.3 * r, squash: 0.04 * r, knL: 8 * st * bounce, knR: -8 * st * bounce });
      if (p.brow === undefined) delete p.brow;
      host.pose(alive(p, t, { seed: 6, talk: mouthFor(t), amt: 1 - 0.5 * st })); host.hips.position.y = 0.72 - 0.02 * st - 0.008 * st * Math.abs(bounce);
      host.group.position.set(HX + 0.018 * st * bounce, 0.012 * st * Math.abs(Math.sin(t * 11 + 1)), 0);
    }
    breathe(host, t);
    // camera
    const at = o.at.clone(), pos = o.pos.clone(), tgt = V3(BX, f.cy * 1.25, BZ), shake = s.kick + (o.shake || 0);
    pos.lerp(tgt, s.kick * 0.1); at.lerp(tgt, s.kick * 0.35);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || V3(0, 1, 0)), bloom: LOOK.bloom + s.flash * 0.2 + s.xray * 0.2, bloomThreshold: lerp(0.8, 0.5, s.xray), ...(o.look || {}) });
    return s;
  }
  const flash2d = (s) => { if (s.flash > 0.02) { ctx.fillStyle = `rgba(255,244,200,${Math.min(0.2, s.flash * 0.2)})`; ctx.fillRect(0, 0, W, H); } };
  const XW = (f, v) => f.human.spine.localToWorld(v.clone());
  const TWO = { a: V3(0.2, 0.95, 4.35), b: V3(0.1, 0.9, 3.95), at: V3(0.05, 0.66, 0) }, XBL = V3(BX, 0.665, BZ + 0.03);

  // 1 · the hook: he's doing the dance
  add({ id: 'S01', at: 0, note: 'two-shot: host doing the pee dance, Blip watching; on "you" Blip turns into a person', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(TWO.a, V3(0.12, 0.96, 3.7), eio(lt / d)), at: V3(0.05, 0.72, 0) }); blit(); flash2d(s);
  } });
  cue(0.4, 'boing', { gain: 0.4 }); cue(1.0, 'boing', { gain: 0.35 });

  // 2 · the bladder: stretchy bag, two cups
  add({ id: 'S02', at: cut(1), note: 'two-shot: on "bladder" lights drop and the person goes x-ray', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.14, 0.98, 3.75), V3(0.2, 0.95, 3.2), eio(lt / d)), at: V3(0.1, 0.74, 0) }); blit(); flash2d(s);
  } });
  add({ id: 'S02b', at: Wd('stretchy', 1) - 0.05, note: 'x-ray close-up low on the hips: the yellow bladder filling under the kidneys', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(BX + 0.24, 0.71, BZ + 0.88), V3(BX + 0.13, 0.68, BZ + 0.68), eio(lt / d)), at: XBL.clone().setY(0.672), focus: XBL, turn: -0.1, look: { aperture: 0.002 } }); blit(); flash2d(s);
    if (s.form === 'xray') { const [x, y] = screen(XW(blip.current, V3(-0.02, -0.07, 0.08)), cam); label('BLADDER', 250, 560, x, y, eob(seg(lt, 0.1, 0.35))); pill('≈ 2 CUPS', 540, 1250, popIn(t - Wd('two', 1)), YEL, DARK, 70); }
  } });
  cue(Wd('stretchy', 1) - 0.05, 'whoosh'); cue(Wd('two', 1), 'pop'); cue(Wd('stretchy', 1), 'bubbles', { dur: 2.2, gain: 0.5 });

  // 3 · sensors message the brain
  add({ id: 'S03', at: cut(2), note: 'x-ray full torso and head: sparks run from the bladder up the spine, the brain pulses', draw(lt, d, t, blit) {
    const c = V3(BX, 1.02, BZ), s = show(t, { pos: lerpV(V3(BX + 0.46, 1.02, BZ + 2.1), V3(BX + 0.3, 1.04, BZ + 1.8), eio(lt / d)), at: c, focus: c, turn: -0.35, look: { aperture: 0.0012 } }); blit(); flash2d(s);
    if (s.form === 'xray') { const f = blip.current, [x, y] = screen(f.brain.getWorldPosition(V3(0, 0, 0)), cam); label('BRAIN', 800, 330, x, y, eob(seg(t, Wd('brain', 2) - 0.15, Wd('brain', 2) + 0.1))); pill('“GOTTA GO”', 540, 1250, popIn(t - Wd('messaging', 2) - 0.2) * (1 + 0.04 * Math.sin(t * 12)), YEL, DARK, 68); }
  } });
  cue(cut(2), 'whoosh'); for (let i = 0; i < 4; i++) cue(T_SENS + 0.9 + i * 0.66, 'tock', { gain: 0.8 }); cue(Wd('messaging', 2) + 0.2, 'pop');

  // 4 · the ring clamps, the bag stretches
  add({ id: 'S04', at: cut(3), note: 'x-ray, close under the bladder: the red ring of muscle squeezes shut', draw(lt, d, t, blit) {
    const c = V3(BX, 0.64, BZ + 0.03), s = show(t, { pos: lerpV(V3(BX - 0.26, 0.68, BZ + 0.82), V3(BX - 0.12, 0.65, BZ + 0.64), eio(lt / d)), at: c, focus: c, turn: -0.1, look: { aperture: 0.002 } }); blit(); flash2d(s);
    if (s.form === 'xray') { const [x, y] = screen(blip.current.ring.getWorldPosition(V3(0, 0, 0)), cam); label('RING OF MUSCLE', 700, 1200, x, y, eob(seg(t, Wd('ring', 3) - 0.1, Wd('ring', 3) + 0.15))); }
  } });
  add({ id: 'S04b', at: cut(4), note: 'x-ray bladder close: it swells and trembles', draw(lt, d, t, blit) {
    const k = seg(t, L(4), L(5)), s = show(t, { pos: lerpV(V3(BX + 0.2, 0.74, BZ + 0.9), V3(BX + 0.1, 0.7, BZ + 0.7), eio(lt / d)), at: XBL.clone().setY(0.68), focus: XBL, turn: -0.1, shake: 0.35 * k, look: { aperture: 0.002 } }); blit(); flash2d(s);
    if (s.form === 'xray') pill('STRETCHING', 540, 420, popIn(t - Wd('stretching', 4) + 0.15) * (1 + 0.04 * Math.sin(t * 14)), RED, DARK, 64);
  } });
  cue(cut(3), 'whoosh'); cue(T_CLAMP, 'zip'); cue(T_CLAMP + 0.05, 'thud', { gain: 0.5 }); cue(cut(4), 'slide', { dur: 1.5, gain: 0.6 });

  // 5 · once in a while: fine
  add({ id: 'S05', at: cut(5), note: 'lights up, medium on the host: strained thumbs-up, still bouncing; Blip unconvinced', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.5, 1.02, 3.0), V3(0.36, 1.0, 2.7), eio(lt / d)), at: V3(-0.05, 0.86, 0), focus: V3(HX, 1, 0) }); blit(); flash2d(s);
    pill('ONCE IN A WHILE: OK', 540, 1240, popIn(t - Wd('fine', 5) + 0.3), '#111', YEL, 58);
  } });
  cue(Wd('fine', 5) - 0.3, 'pop');

  // 6 · the habit: bacteria multiply
  add({ id: 'S06', at: cut(6), note: 'two-shot: on "bacteria" lights drop, x-ray again', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.1, 0.95, 3.8), V3(0.22, 0.95, 3.1), eio(lt / d)), at: V3(0.12, 0.74, 0) }); blit(); flash2d(s);
  } });
  add({ id: 'S06b', at: X2 + 0.3, note: 'x-ray bladder close: green bacteria double and double', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(BX + 0.24, 0.73, BZ + 0.86), V3(BX + 0.14, 0.7, BZ + 0.66), eio(lt / d)), at: XBL.clone().setY(0.675), focus: XBL, turn: -0.1, look: { aperture: 0.002 } }); blit(); flash2d(s);
    if (s.form === 'xray') { const [x, y] = screen(XW(blip.current, V3(0.02, -0.07, 0.085)), cam); label('BACTERIA', 790, 560, x, y, eob(seg(lt, 0.05, 0.3))); pill('HIGHER UTI RISK', 540, 1250, popIn(t - Wd('multiply', 6)), '#D9A8FF', DARK, 62); }
  } });
  cue(X2 + 0.3, 'whoosh'); cue(X2 + 0.4, 'bubbles', { dur: 2.4, gain: 0.6 }); cue(Wd('multiply', 6), 'pop');

  // 7 · the muscle stretches out
  add({ id: 'S07', at: cut(7), note: 'x-ray bladder from the other side: it sags, bigger and duller', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(BX - 0.24, 0.72, BZ + 0.9), V3(BX - 0.14, 0.7, BZ + 0.74), eio(lt / d)), at: XBL.clone().setY(0.67), focus: XBL, turn: -0.1, look: { aperture: 0.002 } }); blit(); flash2d(s);
    if (s.form === 'xray') pill('WEAKER MUSCLE', 540, 420, popIn(t - Wd('weaker', 7) + 0.25), RED, DARK, 62);
  } });
  cue(cut(7), 'whoosh'); cue(Wd('stretch', 7), 'slide', { dur: 1.0, gain: 0.6 }); cue(Wd('weaker', 7) - 0.25, 'pop');

  // 8 · just go
  add({ id: 'S08', at: cut(8), note: 'two-shot, lights up: host dances harder, then bolts off screen on "just go"; Blip watches him leave', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.05, 0.92, 3.7), V3(0.14, 0.95, 4.0), eio(lt / d)), at: V3(0.06, 0.68, 0) }); blit(); flash2d(s);
    pill('JUST GO', 540, 300, popIn(t - T_RUN), '#111', YEL, 70);
  } });
  cue(T_RUN, 'whoosh'); cue(T_RUN + 0.05, 'zip', { gain: 0.8 }); cue(T_RUN + 0.1, 'pop');

  // 9 · fun fact: 21 seconds
  add({ id: 'S09', at: cut(9), note: 'Blip alone, medium: "FUN FACT"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.9, 0.6, 2.9), V3(0.8, 0.56, 2.6), eio(lt / d)), at: V3(0.28, 0.36, 0.1), focus: V3(BX, 0.3, BZ), turn: 0.0, look: { aperture: 0.0035 } }); blit(); flash2d(s);
    pill('FUN FACT', 540, 330, popIn(t - L(9)), '#111', YEL, 66);
  } });
  add({ id: 'S09b', at: T_CAT - 0.12, note: 'low close-up: Blip becomes a cat; a timer runs to 0:21', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.95, 0.55, 2.55), V3(0.8, 0.5, 2.2), eio(lt / d)), at: V3(0.26, 0.34, 0.1), focus: V3(BX, 0.4, BZ), turn: 0.05, look: { aperture: 0.0035 } }); blit(); flash2d(s);
    const n = Math.round(21 * eo(seg(t, T_21 - 0.2, T_21 + 1.0))); pill(`0:${String(n).padStart(2, '0')}`, 540, 330, popIn(t - T_21 + 0.3), YEL, DARK, 84);
  } });
  cue(cut(9), 'whoosh'); cue(L(9), 'pop'); cue(T_21 - 0.3, 'pop'); for (let i = 0; i < 6; i++) cue(T_21 - 0.15 + i * 0.2, 'tock', { gain: 0.7 });

  // 10 · sign-off: he's back, relieved
  add({ id: 'S10', at: cut(10), note: 'two-shot: host strolls back in relieved and waves, Blip is himself again and waves', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.05, 0.92, 3.8), V3(0.12, 0.97, 4.2), eio(lt / d)), at: V3(0.05, 0.7, 0) }); blit(); flash2d(s);
    pill('FOLLOW', 800, 700, popIn(t - Wd('Follow', 10)), '#111', YEL, 70);
  } });
  cue(Wd('Follow', 10), 'pop'); cue(T_BACK + 0.7, 'sparkle', { dur: 0.8, gain: 0.5 });

  return { shots: S, cues: CUES };
}
