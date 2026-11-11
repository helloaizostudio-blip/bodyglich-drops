// WHAT ACTUALLY HAPPENS WHEN YOU GET HICCUPS? (Body Glitch, host v2 + shape-shifting Blip)
// The host has the hiccups the whole time. Blip becomes a person, then that person's x-ray: the brainstem fires,
// the diaphragm jerks down, air rushes in and the vocal cords slam shut (the hic). Then a tadpole (the gill theory),
// then Charles Osborne, who hiccuped for 68 years.
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
/** a hiccup impulse: snaps up in 60 ms, dies away over ~0.4 s */
const imp = (x) => (x < 0 ? 0 : x < 0.06 ? x / 0.06 : Math.exp(-(x - 0.06) * 7));
const hicAt = (t, list) => list.reduce((m, h) => Math.max(m, imp(t - h)), 0);
/** big comic "HIC!" pop */
function hicText(x, y, k, rot = -0.12) {
  if (k <= 0.01) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); const s = 0.6 + 0.6 * spring(clamp(1 - k + 0.001)) * 0 + 0.55 * k; ctx.scale(s, s); ctx.globalAlpha = Math.min(1, k * 2.2);
  ctx.font = '900 150px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 34; ctx.strokeStyle = '#111'; ctx.strokeText('HIC!', 0, 0); ctx.fillStyle = '#FFD43B'; ctx.fillText('HIC!', 0, 0); ctx.restore();
}
/** inset: looking down on the vocal cords. open 1 = wide V, 0 = slammed shut */
function cordsInset(x, y, r, open, a, slam = 0) {
  if (a <= 0.01) return; ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = '#3A0E18'; ctx.fill(); ctx.lineWidth = 12; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 6, 0, 7); ctx.clip();
  const ang = 0.03 + 0.36 * open, top = -r * 0.62, len = r * 1.25;
  ctx.fillStyle = '#12040A'; ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(Math.sin(ang) * len, top + Math.cos(ang) * len); ctx.lineTo(-Math.sin(ang) * len, top + Math.cos(ang) * len); ctx.closePath(); ctx.fill();
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(0, top); ctx.rotate(-s * ang); ctx.fillStyle = '#F4B8C4'; ctx.beginPath(); ctx.ellipse(s * 15, len / 2, 17, len / 2, 0, 0, 7); ctx.fill(); ctx.restore(); }
  if (slam > 0.01) { ctx.globalAlpha = slam; ctx.strokeStyle = '#FFD43B'; ctx.lineWidth = 10; for (let i = 0; i < 6; i++) { const q = i / 6 * 6.283; ctx.beginPath(); ctx.moveTo(Math.cos(q) * 40, Math.sin(q) * 40 + 20); ctx.lineTo(Math.cos(q) * (60 + 40 * slam), Math.sin(q) * (60 + 40 * slam) + 20); ctx.stroke(); } }
  ctx.restore(); ctx.restore();
}

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.8, vignette: 0.4, warm: 0.015, exposure: 1.02 };
  const YEL = '#FFD43B', RED = '#FF5A5A', DARK = 'rgba(12,14,20,0.82)';

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray', 'tadpole'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.33, BZ = 0.12;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_REFLEX = Wd('reflex', 1), T_JERK = Wd('jerks', 2), T_RUSH = Wd('rushes', 3), T_SNAP = Wd('snap', 3), T_SLAM = Wd('slam', 4), T_HIC = Wd('hic', 4), T_TAD = Wd('tadpoles', 6), T_MAN = Wd('man', 8);
  const PLAN = [
    { t: Wd('you', 0), form: 'human' },
    { t: T_REFLEX, form: 'xray' },
    { t: L(5) - 0.08, form: 'blip', charge: 0.03 },
    { t: T_TAD, form: 'tadpole' },
    { t: T_MAN, form: 'human' },
    { t: Wd('Follow', 9) + 0.1, form: 'blip', charge: 0.14 },
  ];
  Shifter.cues(PLAN, cue);
  // every hiccup in the film: the host's, the x-ray body's, and the 68-year man's
  const HOST_HICS = [0.62, Wd('hiccups', 0) + 0.32, Wd('weird', 5) - 0.32, Wd('years', 8) + 0.1, Wd('glitch', 9) + 0.25];
  const X_HICS = [T_HIC + 0.05];
  const MAN_HICS = []; for (let t = T_MAN + 0.55; t < L(9) - 0.25; t += 0.42) MAN_HICS.push(t);
  for (const h of HOST_HICS) { cue(h, 'gulp', { gain: 1.0 }); cue(h + 0.02, 'tock', { gain: 0.7 }); }
  for (const h of X_HICS) { cue(h, 'gulp', { gain: 1.1 }); cue(h, 'slam', { gain: 0.6 }); }
  MAN_HICS.forEach((h, i) => cue(h, 'gulp', { gain: 0.45 + 0.1 * (i % 2) }));

  // ── the host ──────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.6 };
  const act = track([
    { t: 0, pose: { ...REST, shR: [52, 0, 10], elR: 118, smile: 0.2, brow: [0.3, 0.6] } },                    // hand at his mouth
    { t: L(1) - 0.1, d: 0.5, pose: REST },
    { t: L(5) - 0.05, d: 0.4, pose: { ...REST, spine: [8, 0, 0], head: [4, 0, -6], shR: [74, 0, 14], elR: 128, brow: { L: [-0.4, -0.5], R: [0.9, 0] }, lid: 0.2, smile: 0.6 } },
    { t: L(6) - 0.05, d: 0.5, pose: REST },
    { t: T_MAN + 0.3, d: 0.5, pose: { ...REST, brow: [0.9, 0.5], lid: -0.3, smile: -0.3, mouth: 0.3 } },
    { t: Wd('Follow', 9) - 0.1, d: 0.45, pose: { ...REST, shL: [8, 0, 128], elL: 50, smile: 1, brow: [0.5, 0] } },
  ]);

  // ── inside the x-ray ──────────────────────────────────────────────────────
  const airM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#BFF3FF').multiplyScalar(1.4) });
  const BRAIN_DOWN = [V3(0, 0.75, -0.02), V3(0, 0.63, -0.06), V3(0, 0.46, -0.085), V3(0, 0.33, -0.07), V3(0.04, 0.26, -0.01)];
  const AIR = (sd) => [V3(0, 0.69, 0.1), V3(0, 0.62, 0.06), V3(0, 0.545, 0.03), V3(0, 0.47, 0.02), V3(sd * 0.07, 0.38, 0.01)];
  const along = (pts, k) => { const x = clamp(k) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x)); return pts[i].clone().lerp(pts[i + 1], x - i); };
  /** diaphragm flatten 0..1 and vocal-cord openness 1..0 at time t */
  const dia = (t) => Math.max(t < T_SNAP + 0.3 ? spring(clamp((t - T_JERK) / 0.18)) * (1 - eio(seg(t, T_SNAP + 0.15, T_SNAP + 0.9))) : 0, hicAt(t, X_HICS));
  const cords = (t) => (t < T_SNAP ? 1 : t < T_HIC - 0.12 ? 1 - spring(clamp((t - T_SNAP) / 0.12)) : 1 - Math.max(0, 1 - hicAt(t, X_HICS) * 3) * 0 - (imp(t - X_HICS[0] - 0.03) > 0.05 ? 1 : 0)) ;
  function inside(t, f) {
    f.bladder.visible = false; f.ring.visible = false;
    const d = dia(t); f.diaG.scale.set(1 + 0.04 * d, 1 - 0.7 * d, 1 + 0.04 * d); f.diaG.position.y = 0.235 - 0.045 * d; f.diaphragm.material.emissiveIntensity = 0.7 + 1.3 * d;
    f.lungs.forEach((l) => l.scale.setScalar(1 + 0.14 * d));
    const shut = t > T_SNAP ? spring(clamp((t - T_SNAP) / 0.15)) : 0; f.larynx.material.emissiveIntensity = 0.3 + 1.6 * shut * (t < T_SNAP + 1.2 ? 1 : 0.4) + 1.6 * hicAt(t, X_HICS); f.larynx.scale.setScalar(1 - 0.25 * shut);
    const sig = t > T_REFLEX - 0.1 && t < T_JERK + 0.3; let pulse = 0;
    f.gas.forEach((b, i) => {
      b.rotation.set(0, 0, 0);
      if (sig && i < 10) { const k = (t - T_REFLEX) * 0.62 - i * 0.1; b.visible = k > 0 && k < 1; if (!b.visible) return; b.material = f.sigM; b.position.copy(along(BRAIN_DOWN, eio(k))); b.scale.setScalar(1.9 * Math.sin(Math.min(1, k * 6) * 1.57) * (1 - seg(k, 0.92, 1))); if (k < 0.12) pulse = Math.max(pulse, 1 - k / 0.12); return; }
      if (t > T_RUSH - 0.1 && t < T_SLAM && i >= 10 && i < 40) {                                          // air rushing in, stopped dead at the cords
        const j = i - 10, k0 = (t - T_RUSH + 0.1) * 0.9 - j * 0.045, stopK = 0.5, k = t > T_SNAP ? Math.min(k0, Math.max(stopK - 0.02 * (j % 6), (T_SNAP - T_RUSH + 0.1) * 0.9 - j * 0.045)) : k0;
        b.visible = k > 0 && (k < 1 || t > T_SNAP); if (!b.visible) return; b.material = airM; const p = along(AIR(j % 2 ? 1 : -1), clamp(k)); if (t > T_SNAP && k <= stopK) { p.x += Math.sin(t * 30 + j) * 0.004; } b.position.copy(p); b.scale.setScalar(0.9 * (1 - seg(k, 0.95, 1)));
        return;
      }
      b.visible = false;
    });
    f.brain.material.emissiveIntensity = 0.3 + 1.4 * pulse;
  }

  /** one frame: Blip + effect, insides, the host, mood, camera punch, render */
  function show(t, o) {
    const pre = blip.state(t, PLAN);
    const bh = hicAt(t, HOST_HICS.map((h) => h + 0.18)), hi = hop(t - Wd('Follow', 9) - 0.3, { d: 0.4, h: 0.2, pre: 0.1 }), wave = t > Wd('Follow', 9) + 0.7 ? 1 : 0, giggle = t > T_MAN + 0.4 && t < L(9) ? 1 : 0;
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = o.turn ?? -0.3;
    const s = blip.update(t, PLAN, { blip: { y: hi.y + 0.04 * bh, squash: hi.squash + 0.16 * bh + Math.sin(t * 2.4) * 0.02, tilt: [hi.air * 8, 0], armL: 14 + hi.air * 70 + wave * (125 + Math.sin(t * 15) * 22), armR: 14 + hi.air * 70,
      lean: (hi.land > 0 ? wobble(hi.land / 0.9, 2.4, 3.5) * 32 : -hi.air * 24) + drift(t, 3, 1.2) * 5 + 25 * bh, lid: Math.max(blink(t, 5), 0) - 0.3 * bh, look: [-0.5, 0.3], smile: 0.9, mouth: hi.air * 0.7 + 0.6 * bh, glow: 1.6 + hi.air * 2 + 2 * bh } });
    const f = blip.current;
    if (s.form === 'xray') inside(t, f);
    if (s.form === 'human') {
      if (t < L(1)) { const wv = bump(seg(s.since, 0.25, 1.2)); f.human.pose({ head: [-4, -10, 4], spine: [0, -8, 0], shL: [6, 0, 12], shR: [10, 0, 12 + 128 * wv], elL: 22, elR: 20 + 50 * wv + Math.sin(t * 14) * 20 * wv }); }
      else { const k = hicAt(t, MAN_HICS); f.human.pose({ spine: [-8 * k, 0, 0], head: [-12 * k + 4, 0, 0], shL: [6, 0, 12 + 10 * k], shR: [6, 0, 12 + 10 * k], elL: 24, elR: 24, hipL: [0, 0, 3], hipR: [0, 0, 3], knL: 6 * k, knR: 6 * k }); f.human.parts[0].scale.set(1, 1 + 0.05 * k, 1 + 0.08 * k); f.group.position.y = 0.035 * k; }
    }
    if (s.form === 'tadpole') { const gulp = bump(seg(t, Wd('throat', 7) - 0.05, Wd('throat', 7) + 0.4)); f.body.scale.set(1 + 0.08 * gulp, 1 - 0.1 * gulp, 1 + 0.08 * gulp); f.group.position.y = 0.06; blip.group.rotation.y = (o.turn ?? -0.3) - 0.6; }
    ST.setMood(Math.max(s.xray, s.form === 'tadpole' ? 0.55 * eio(clamp(s.since / 0.5)) : 0));
    // the host
    const hk = hicAt(t, HOST_HICS), watch = s.n >= 0 ? Math.max(pre.charge, 1 - eio(seg(s.since, 0.7, 1.3))) * (t > L(1) ? 1 : 0) : 0, r = s.n >= 0 && s.since < 2 ? Math.exp(-s.since * 2.4) * (1 - Math.exp(-s.since * 22)) : 0;
    const mh = t > T_MAN ? hicAt(t, MAN_HICS) * 0.25 : 0;                                                   // he twitches in sympathy
    let p = drag(act, t);
    p = addPose(p, { spine: [-4 * r - 8 * hk, 12 * watch, -3 * watch], head: [3 * watch - 5 * r - 12 * hk - 4 * mh, 26 * watch, 0], look: [0.7 * watch, -0.45 * watch - 0.3 * hk], brow: Array.isArray(p.brow ?? [0, 0]) ? [0.8 * r + 1.0 * hk, 0] : undefined, lid: -0.3 * r - 0.45 * hk, squash: 0.04 * r + 0.07 * hk, shL: [0, 0, -6 * hk], shR: [0, 0, -6 * hk] });
    if (p.brow === undefined) delete p.brow;
    const pz = alive(p, t, { seed: 6, talk: mouthFor(t) }); pz.mouth = Math.max(pz.mouth ?? 0, 0.7 * hk);
    host.pose(pz); breathe(host, t); host.belly(0); host.parts[0].scale.multiply(V3(1, 1 + 0.03 * hk, 1 + 0.06 * hk));
    host.group.position.set(HX, 0.03 * hk, 0);
    // camera
    const at = o.at.clone(), pos = o.pos.clone(), tgt = V3(BX, f.cy * 1.25, BZ), shake = s.kick + (o.shake || 0) + 0.6 * (o.hicShake ? hk : 0);
    pos.lerp(tgt, s.kick * 0.1); at.lerp(tgt, s.kick * 0.35);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || V3(0, 1, 0)), bloom: LOOK.bloom + s.flash * 0.2 + s.xray * 0.2, bloomThreshold: lerp(0.8, 0.5, s.xray), ...(o.look || {}) });
    return { ...s, hk };
  }
  const flash2d = (s) => { if (s.flash > 0.02) { ctx.fillStyle = `rgba(255,244,200,${Math.min(0.2, s.flash * 0.2)})`; ctx.fillRect(0, 0, W, H); } };
  const XW = (f, v) => f.human.spine.localToWorld(v.clone());
  const wy = (ly) => 0.7275 + 0.75 * ly;                                                                  // x-ray spine-local y → world y

  // 1 · the hook: he's got them
  add({ id: 'S01', at: 0, note: 'two-shot: host hiccups, Blip jolts too; on "you" Blip becomes a person', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.2, 0.95, 4.2), V3(0.12, 0.96, 3.7), eio(lt / d)), at: V3(0.05, 0.72, 0), hicShake: true }); blit(); flash2d(s);
    const [x, y] = screen(V3(HX, 1.5, 0), cam); hicText(x + 40, y - 40, s.hk);
  } });

  // 2 · the reflex in the brainstem
  add({ id: 'S02', at: cut(1), note: 'two-shot: on "reflex" lights drop and the person goes x-ray', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.14, 0.98, 3.75), V3(0.2, 0.98, 3.2), eio(lt / d)), at: V3(0.1, 0.78, 0) }); blit(); flash2d(s);
  } });
  add({ id: 'S02b', at: Wd('deep', 1) - 0.08, note: 'x-ray head and neck: brainstem flashes, a spark starts down the spine', draw(lt, d, t, blit) {
    const c = V3(BX, wy(0.62), BZ), s = show(t, { pos: lerpV(V3(BX + 0.55, wy(0.66), BZ + 1.05), V3(BX + 0.4, wy(0.64), BZ + 0.88), eio(lt / d)), at: c, focus: c, turn: -0.35, look: { aperture: 0.0015 } }); blit(); flash2d(s);
    if (s.form === 'xray') { const [x, y] = screen(XW(blip.current, V3(0, 0.71, -0.03)), cam); label('BRAINSTEM', 260, 520, x, y, eob(seg(t, Wd('brainstem', 1) - 0.2, Wd('brainstem', 1) + 0.05))); }
  } });
  cue(Wd('deep', 1) - 0.08, 'whoosh'); cue(Wd('brainstem', 1), 'pop', { gain: 0.6 }); cue(Wd('brainstem', 1) + 0.1, 'zip', { gain: 0.5 });

  // 3 · the diaphragm jerks down
  add({ id: 'S03', at: cut(2), note: 'x-ray chest: the spark reaches the red diaphragm dome under the lungs; on "jerks" it slams flat', draw(lt, d, t, blit) {
    const c = V3(BX, wy(0.3), BZ), s = show(t, { pos: lerpV(V3(BX + 0.55, wy(0.42), BZ + 1.25), V3(BX + 0.36, wy(0.36), BZ + 1.0), eio(lt / d)), at: c, focus: c, turn: -0.2, shake: 0.6 * imp(t - T_JERK), look: { aperture: 0.0015 } }); blit(); flash2d(s);
    if (s.form === 'xray') { const f = blip.current, [x, y] = screen(XW(f, V3(0.12, 0.25, 0.05)), cam), [x2, y2] = screen(XW(f, V3(-0.085, 0.38, 0.03)), cam);
      label('DIAPHRAGM', 790, 1200, x, y, eob(seg(t, Wd('diaphragm', 2) - 0.1, Wd('diaphragm', 2) + 0.15))); label('LUNGS', 250, 560, x2, y2, eob(seg(t, Wd('lungs', 2) - 0.1, Wd('lungs', 2) + 0.15))); }
  } });
  cue(cut(2), 'whoosh'); cue(T_JERK, 'thud', { gain: 0.9 }); cue(Wd('diaphragm', 2), 'pop', { gain: 0.5 });

  // 4 · air rushes in, the cords snap shut
  add({ id: 'S04', at: cut(3), note: 'x-ray throat and chest: air streams in, then on "snap" stops dead at the voice box; inset of the cords slamming', draw(lt, d, t, blit) {
    const c = V3(BX, wy(0.5), BZ), s = show(t, { pos: lerpV(V3(BX + 0.32, wy(0.58), BZ + 1.25), V3(BX + 0.2, wy(0.55), BZ + 1.02), eio(lt / d)), at: c, focus: c, turn: -0.25, shake: 0.5 * imp(t - T_SNAP), look: { aperture: 0.0015 } }); blit(); flash2d(s);
    if (s.form === 'xray') { const [x, y] = screen(XW(blip.current, V3(0, 0.545, 0.03)), cam); label('VOICE BOX', 260, 1180, x, y, eob(seg(t, Wd('vocal', 3) - 0.15, Wd('vocal', 3) + 0.1))); }
    cordsInset(790, 520, 150, cords(t), eob(seg(t, Wd('vocal', 3) - 0.2, Wd('vocal', 3) + 0.1)), imp(t - T_SNAP));
    if (t > Wd('vocal', 3) - 0.2) { ctx.save(); ctx.globalAlpha = clamp((t - Wd('vocal', 3) + 0.2) / 0.3); pill('VOCAL CORDS', 790, 720, 1, '#FFFFFF', DARK, 40); ctx.restore(); }
  } });
  cue(cut(3), 'whoosh'); cue(T_RUSH, 'inhale', { dur: 1.0, gain: 0.8 }); cue(T_SNAP, 'slam', { gain: 0.8 });

  // 5 · that slam is the hic: one real-speed hiccup
  add({ id: 'S05', at: cut(4), note: 'x-ray full torso: one real-speed hiccup, diaphragm and voice box flash together, "HIC!"', draw(lt, d, t, blit) {
    const c = V3(BX, wy(0.42), BZ), s = show(t, { pos: lerpV(V3(BX + 0.42, wy(0.48), BZ + 1.85), V3(BX + 0.3, wy(0.46), BZ + 1.6), eio(lt / d)), at: c, focus: c, turn: -0.2, shake: 0.9 * hicAt(t, X_HICS), look: { aperture: 0.0012 } }); blit(); flash2d(s);
    cordsInset(820, 430, 115, cords(t), 1, hicAt(t, X_HICS));
    const [x, y] = screen(XW(blip.current.human ? blip.current : blip.current, V3(0, 0.6, 0.1)), cam); hicText(x - 200, y - 60, hicAt(t, X_HICS), 0.1);
  } });

  // 6 · the weird part
  add({ id: 'S06', at: cut(5), note: 'lights up, host face close-up, finger up; he hiccups mid-sentence', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(-0.55, 1.36, 1.9), V3(-0.4, 1.34, 1.6), eio(lt / d)), at: V3(HX, 1.27, 0.08), focus: V3(HX, 1.36, 0.1), hicShake: true, look: { aperture: 0.005 } }); blit(); flash2d(s);
    hicText(800, 420, s.hk, 0.12);
  } });
  cue(cut(5), 'whoosh');

  // 7 · tadpoles
  add({ id: 'S07', at: cut(6), note: 'Blip alone, low: "SCIENTISTS THINK"; on "tadpoles" he becomes a tadpole, lights go watery', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.95, 0.6, 2.7), V3(0.78, 0.55, 2.3), eio(lt / d)), at: V3(0.26, 0.36, 0.1), focus: V3(BX, 0.33, BZ), turn: 0.0, look: { aperture: 0.0035 } }); blit(); flash2d(s);
    pill('THEORY', 540, 330, popIn(t - Wd('Scientists', 6)), '#111', YEL, 60);
  } });
  add({ id: 'S07b', at: cut(7), note: 'tadpole close: gills flutter, on "throat shut" it gulps; "NO WATER IN THE LUNGS"', draw(lt, d, t, blit) {
    const c = V3(BX, 0.42, BZ), s = show(t, { pos: lerpV(V3(BX + 1.05, 0.55, BZ + 1.75), V3(BX + 0.85, 0.52, BZ + 1.5), eio(lt / d)), at: c, focus: c, turn: 0.2, look: { aperture: 0.004 } }); blit(); flash2d(s);
    if (s.form === 'tadpole') { const f = blip.current, [x, y] = screen(f.gills[1].getWorldPosition(V3(0, 0, 0)), cam); label('GILLS', 820, 560, x, y, eob(seg(t, Wd('gills', 7) - 0.15, Wd('gills', 7) + 0.1)));
      pill('THROAT SHUT', 540, 1230, popIn(t - Wd('throat', 7)), YEL, DARK, 60); }
  } });
  cue(cut(7), 'whoosh'); cue(T_TAD + 0.3, 'bubbles', { dur: 3.5, gain: 0.7 }); cue(Wd('gills', 7), 'pop', { gain: 0.6 }); cue(Wd('throat', 7), 'gulp', { gain: 0.9 }); cue(Wd('Scientists', 6), 'pop');

  // 8 · 68 years
  add({ id: 'S08', at: cut(8), note: 'two-shot, lights up: on "man" Blip becomes a person hiccuping nonstop; counter; host stares, hiccups too', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.1, 0.95, 3.6), V3(0.2, 0.98, 3.25), eio(lt / d)), at: V3(0.1, 0.76, 0) }); blit(); flash2d(s);
    pill('68 YEARS', 790, 640, popIn(t - Wd('sixty', 8)) * (1 + 0.05 * hicAt(t, MAN_HICS)), YEL, DARK, 84);
    const n = Math.round(430 * eo(seg(t, Wd('sixty', 8), L(9) - 0.2))); pill(`≈ ${n} MILLION HICS`, 540, 1230, popIn(t - Wd('sixty', 8) - 0.3), '#FFFFFF', DARK, 54);
  } });
  cue(cut(8), 'whoosh'); cue(Wd('sixty', 8), 'pop');

  // 9 · sign-off
  add({ id: 'S09', at: cut(9), note: 'two-shot: Blip himself again waves, host waves and hiccups one last time', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.05, 0.92, 3.8), V3(0.12, 0.97, 4.2), eio(lt / d)), at: V3(0.05, 0.7, 0), hicShake: true }); blit(); flash2d(s);
    pill('FOLLOW', 800, 700, popIn(t - Wd('Follow', 9)), '#111', YEL, 70);
    const [x, y] = screen(V3(HX, 1.5, 0), cam); hicText(x + 30, y - 40, s.hk);
  } });
  cue(Wd('Follow', 9), 'pop');

  return { shots: S, cues: CUES };
}
