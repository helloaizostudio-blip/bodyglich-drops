// BODY GLITCH: Blip the shape-shifter (demo). The narrator names a thing, Blip charges up, flashes and becomes it:
// "you" → a person, "heart" → x-ray with a beating heart (the studio lights drop), then octopus, shark, cat.
// The whole show is driven by PLAN: one line per word → form. Change the words and Blip follows the new script.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host } from './core/host.js';
import { Shifter } from './core/shift.js';
import { studio } from './core/studio.js';
import { alive, addPose, breathe, mouthFor, hop, spring, bump, wobble, drift, blink, popIn } from './core/motion.js';
import { pill, label } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function heart2d(x, y, s, col = '#FF3B55') { if (s <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, 34); ctx.bezierCurveTo(-70, -14, -40, -62, 0, -28); ctx.bezierCurveTo(40, -62, 70, -14, 0, 34); ctx.fillStyle = col; ctx.strokeStyle = '#111'; ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill(); ctx.restore(); }

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.8, vignette: 0.4, warm: 0.015, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({});
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.33, BZ = 0.12, BP = V3(BX, 0, BZ);
  host.group.position.set(HX, 0, 0);

  // ── the plan: which word turns Blip into what ─────────────────────────────
  const R0 = Wd('becomes', 6);
  const PLAN = [
    { t: Wd('you', 1), form: 'human' },
    { t: Wd('heart', 2), form: 'xray' },
    { t: Wd('octopus', 3), form: 'octopus' },
    { t: Wd('shark', 4), form: 'shark' },
    { t: Wd('cat', 5), form: 'cat' },
    { t: L(6), form: 'blip' },
    { t: R0, form: 'octopus', charge: 0.12 }, { t: R0 + 0.4, form: 'shark', charge: 0.1 }, { t: R0 + 0.8, form: 'cat', charge: 0.1 }, { t: R0 + 1.2, form: 'blip', charge: 0.1 },   // the roulette
  ];
  Shifter.cues(PLAN, cue);
  const T_IN = 0.08;                                                                                         // Blip's entrance hop

  /** one frame of the show: Blip (form, glow, effect), the host acting around it, mood, camera punch, flash */
  function show(t, o) {
    const pre = blip.state(t, PLAN);
    // Blip as himself: hops in at the start, bounces when he's excited, waves at the end
    const h1 = hop(t - T_IN, { x0: 1.05, x1: 0.7, h: 0.34 }), h2 = hop(t - T_IN - 0.85, { x0: 0.7, x1: BX, h: 0.42 }), h = t < T_IN + 0.85 ? h1 : h2;
    const joy = t > L(6) ? hop((t - L(6) - 0.25) % 0.8, { d: 0.42, h: 0.16, pre: 0.12 }) : hop(((t - 2.6) % 1.1), { d: 0.4, h: t > 2.6 && t < 4.6 ? 0.13 : 0, pre: 0.12 });
    const b = t < 2.2 ? h : joy, wave = t > L(6) + 0.2 ? 1 : bump(seg(h2.land, 0.3, 1.3));
    blip.group.position.set(t < 2.2 ? h.x : BX, 0, BZ); blip.group.rotation.y = o.turn ?? -0.3;
    const s = blip.update(t, PLAN, { blip: { y: b.y, squash: b.squash, tilt: [b.air * 8, 0], armL: 14 + b.air * 60 + wave * (125 + Math.sin(t * 15) * 22), armR: 14 + b.air * 70,
      lean: (b.land > 0 ? wobble(b.land / 0.9, 2.4, 3.5) * 32 : -b.air * 24) + drift(t, 3, 1.2) * 4, lid: blink(t, 5) - b.air * 0.2, look: [-0.4, 0.4], mouth: b.air * 0.7 + wave * 0.4, glow: 1.6 + b.air * 2 } });
    if (s.form === 'shark') { const lunge = bump(seg(s.since, 0.3, 0.95)); blip.group.position.x = BX - 0.2 * lunge; blip.group.rotation.y = -0.95 + 0.25 * lunge; }
    if (s.form === 'human' || s.form === 'xray') { const hm = blip.current.human, wv = s.form === 'human' ? bump(seg(s.since, 0.3, 1.4)) : 0; if (wv > 0) { hm.pose({ head: [-4, -10, 4], shL: [6, 0, 12], shR: [10, 0, 12 + 128 * wv], elL: 22, elR: 20 + 50 * wv + Math.sin(t * 14) * 20 * wv }); } }
    ST.setMood(s.xray);
    // the host: talks to camera, turns to watch every change, reacts
    const watch = Math.max(pre.charge, 1 - eio(seg(s.since, 0.9, 1.5))), r = s.since < 2 ? Math.exp(-s.since * 2.2) * (1 - Math.exp(-s.since * 22)) : 0, scare = s.form === 'shark' ? bump(seg(s.since, 0.25, 1.1)) : 0;
    const talk = mouthFor(t), pt = bump(seg(t, Wd('whatever', 0) - 0.2, Wd('whatever', 0) + 1.6)) + bump(seg(t, Wd('you', 1) - 0.25, Wd('you', 1) + 0.7));
    let p = { shL: [4, 0, 9], shR: [4 + 34 * pt, 0, 9 + 22 * pt], elL: 16, elR: 16 + 34 * pt, smile: 0.6 + 0.4 * r,
      spine: [-5 * r - 7 * scare, 13 * watch, -3 * watch - 6 * scare], head: [3 * watch - 6 * r, 27 * watch, 0], look: [0.7 * watch, -0.45 * watch], brow: [0.95 * r + scare, 0.4 * scare], lid: -0.4 * Math.max(r, scare), mouth: 0.6 * Math.max(r, scare),
      squash: 0.05 * r + 0.08 * scare, headSquash: 0.06 * r };
    if (scare > 0) p = addPose(p, { shL: [10, 0, 60], shR: [10, 0, 40], elL: 70, elR: 80, hipL: [0, 0, 8], knL: 10 }, scare);
    if (t > L(6) + 0.3) { const wv = bump(seg(t, L(6) + 0.3, T.dur - 0.2)); p = addPose(p, { shL: [8, 0, 128], elL: 50 + Math.sin(t * 13) * 22 }, wv); }
    host.pose(alive(p, t, { seed: 6, talk })); breathe(host, t);
    host.group.position.set(HX - 0.14 * scare, 0.1 * bump(seg(s.since, 0.25, 0.75)) * (s.form === 'shark' ? 1 : 0), 0);
    // camera: the shot's move, plus a punch-in and a shake on every change
    const at = o.at.clone(), pos = o.pos.clone(), tgt = V3(BX, blip.current.cy * 1.25, BZ);
    pos.lerp(tgt, s.kick * 0.1); at.lerp(tgt, s.kick * 0.35);
    pos.x += Math.sin(t * 83) * 0.012 * s.kick; pos.y += Math.cos(t * 97) * 0.012 * s.kick;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || V3(0, 1, 0)), bloom: LOOK.bloom + s.flash * 0.2 + s.xray * 0.25, bloomThreshold: lerp(0.8, 0.45, s.xray), ...(o.look || {}) });
    return s;
  }
  const flash2d = (s) => { if (s.flash > 0.02) { ctx.fillStyle = `rgba(255,244,200,${Math.min(0.2, s.flash * 0.2)})`; ctx.fillRect(0, 0, W, H); } };
  const TWO = { a: V3(0.2, 0.95, 4.35), b: V3(0.1, 0.9, 3.95), at: V3(0.05, 0.66, 0) };

  // 1 · Blip hops in; then a close look at him bouncing
  { const st = cut(0), c2 = Wd('turns', 0) - 0.1;
    add({ id: 'S01', at: st, note: 'two-shot: Blip hops in and waves, host presents him', draw(lt, d, t, blit) {
      const s = show(t, { pos: lerpV(TWO.a, TWO.b, eio(lt / d)), at: TWO.at }); blit(); flash2d(s);
    } });
    add({ id: 'S01b', at: c2, note: 'low close-up on Blip, bouncing, spark flickering', draw(lt, d, t, blit) {
      const s = show(t, { pos: lerpV(V3(0.95, 0.5, 2.5), V3(0.75, 0.46, 2.15), eio(lt / d)), at: V3(0.3, 0.3, 0.12), focus: BP.clone().setY(0.3), look: { aperture: 0.004 } }); blit(); flash2d(s);
    } });
    cue(st + T_IN + 0.71, 'boing', { gain: 0.5 }); cue(st + T_IN + 0.85 + 0.71, 'boing', { gain: 0.6 }); cue(c2, 'whoosh'); }

  // 2 · "Like you": becomes a person
  add({ id: 'S02', at: cut(1), note: 'two-shot: host points at the viewer, Blip becomes a little human and waves', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(TWO.b, V3(0.14, 0.98, 3.75), eio(lt / d)), at: V3(0.05, 0.72, 0) }); blit(); flash2d(s);
  } });

  // 3 · "Your heart": lights drop, x-ray; then into the chest for the count
  { const st = cut(2), c2 = Wd('beats', 2) + 0.12, HEART = () => blip.current.heart ? blip.current.heart.getWorldPosition(V3(0, 0, 0)) : V3(BX, 1, BZ);
    add({ id: 'S03', at: st, note: 'two-shot: on "heart" the lights drop and the human turns x-ray', draw(lt, d, t, blit) {
      const s = show(t, { pos: lerpV(V3(0.14, 0.98, 3.75), V3(0.2, 1.0, 3.3), eio(lt / d)), at: V3(0.1, 0.78, 0) }); blit(); flash2d(s);
    } });
    add({ id: 'S03b', at: c2, note: 'x-ray chest close-up: beating heart, counter runs to 100,000', draw(lt, d, t, blit) {
      const s = show(t, { pos: lerpV(V3(0.72, 1.08, 1.5), V3(0.5, 1.02, 1.12), eio(lt / d)), at: V3(BX + 0.01, 0.97, BZ), focus: V3(BX, 1, BZ), turn: -0.1, look: { aperture: 0.002 } }); blit(); flash2d(s);
      const [hx, hy] = screen(HEART(), cam); label('HEART', 250, 560, hx, hy, eob(seg(lt, 0.15, 0.4)));
      const n = Math.round(100000 * eo(seg(lt, 0.25, d - 0.5))); pill(n.toLocaleString('en-US') + ' / DAY', 540, 1250, popIn(lt - 0.2), '#FFD43B', 'rgba(12,14,20,0.82)', 70);
    } });
    cue(c2, 'whoosh'); for (let i = 0; i < 4; i++) cue(c2 + 0.15 + i * 0.83, 'heartbeat', { gain: 0.8 }); }

  // 4 · octopus: three hearts
  add({ id: 'S04', at: cut(3), note: 'two-shot, lights come back: octopus, three hearts pop up', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.3, 0.8, 3.5), V3(0.26, 0.76, 3.15), eio(lt / d)), at: V3(0.12, 0.6, 0) }); blit(); flash2d(s);
    if (s.form === 'octopus') { const [x, y] = screen(V3(BX, 0.82, BZ), cam), t3 = t - Wd('three', 3); for (let i = 0; i < 3; i++) heart2d(x + (i - 1) * 118, y - 40 - Math.abs(i - 1) * -26 + Math.sin(t * 7.6 + i) * 5, popIn(t3 - i * 0.11, 0.3) * (1 + 0.12 * Math.pow(Math.max(0, Math.sin(t * 7.6 - i * 0.5)), 6))); }
  } });
  for (let i = 0; i < 3; i++) cue(Wd('three', 3) + i * 0.11, 'pop', { gain: 0.7 });

  // 5 · shark: zero bones (it lunges, the host jumps)
  add({ id: 'S05', at: cut(4), note: 'two-shot: shark lunges at the host, he jumps; "0 BONES"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.0, 1.0, 3.6), V3(0.08, 0.98, 3.85), eio(lt / d)), at: V3(0.05, 0.74, 0) }); blit(); flash2d(s);
    if (s.form === 'shark') pill('0 BONES', 760, 560, popIn(t - Wd('zero', 4)), '#FFD43B', 'rgba(12,14,20,0.82)', 64);
  } });
  cue(Wd('shark', 4) + 0.3, 'thud', { gain: 0.6 });

  // 6 · cat: can't taste sugar (low close-up, the host bends into frame)
  add({ id: 'S06', at: Wd('cat', 5) - 0.1, note: 'low close-up on the cat, head tilts; "CAN\'T TASTE SWEET"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.95, 0.55, 2.55), V3(0.8, 0.5, 2.2), eio(lt / d)), at: V3(0.26, 0.34, 0.1), focus: BP.clone().setY(0.4), turn: 0.05, look: { aperture: 0.0035 } }); blit(); flash2d(s);
    if (s.form === 'cat') pill("CAN'T TASTE SWEET", 540, 330, popIn(t - Wd('taste', 5)), '#FFD43B', 'rgba(12,14,20,0.82)', 58);
  } });

  // 7 · sign-off: back to Blip, then the roulette (octopus, shark, cat, Blip in under a second)
  add({ id: 'S07', at: cut(6), note: 'two-shot: both wave; on "becomes" Blip flickers through every form', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.05, 0.92, 3.8), V3(0.12, 0.97, 4.3), eio(lt / d)), at: TWO.at }); blit(); flash2d(s);
  } });

  return { shots: S, cues: CUES };
}
