// WHAT YOUR BODY CAN REGROW, RANKED (Body Glitch, host v2 + shape-shifting Blip)
// A countdown. The hook shows the answer slots first ("???" for the one part that never grows back), then Blip acts
// out each one: #5 liver (x-ray, two thirds vanish and regrow), #4 bone (x-ray arm snaps and fuses), #3 skin (a ghost
// layer peels off), #2 stomach lining (acid eats it, it rebuilds), #1 eye (scratch heals), then the twist: Blip turns
// into a tooth and the enamel chips off for good. No outro: the last frame cuts straight back to the hook (loops).
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Le, Wd } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host } from './core/host.js';
import { Human } from './core/human.js';
import { Shifter } from './core/shift.js';
import { studio } from './core/studio.js';
import { mesh, ellipsoid, smin, smax } from './core/sdf.js';
import { track, drag, alive, addPose, breathe, mouthFor, spring, bump, wobble, drift, blink, popIn } from './core/motion.js';
import { pill, label } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const YEL = '#FFD43B', RED = '#FF4D4D', GRN = '#4BE38A', DARK = 'rgba(12,14,20,0.82)';

/** green tick badge (a part that regrows) */
function tick(x, y, k) {
  if (k <= 0.01) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.beginPath(); ctx.arc(0, 0, 38, 0, 7); ctx.fillStyle = GRN; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#0B2A18'; ctx.stroke();
  ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0B2A18'; ctx.beginPath(); ctx.moveTo(-16, 1); ctx.lineTo(-4, 14); ctx.lineTo(18, -12); ctx.stroke(); ctx.restore();
}
/** pulsing red ring with a "?" (the part that never grows back) */
function mystery(x, y, k, t) {
  if (k <= 0.01) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); const p = 1 + 0.08 * Math.sin(t * 9);
  ctx.beginPath(); ctx.arc(0, 0, 70 * p, 0, 7); ctx.lineWidth = 12; ctx.strokeStyle = RED; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 100 * p + 10 * ((t * 1.6) % 1), 0, 7); ctx.lineWidth = 5; ctx.globalAlpha = 1 - ((t * 1.6) % 1); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.font = '900 96px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 18; ctx.strokeStyle = '#111'; ctx.strokeText('?', 0, 4); ctx.fillStyle = RED; ctx.fillText('?', 0, 4); ctx.restore();
}
/** inset: a human eye with a scratch across the cornea. len 1 = full scratch, 0 = healed (closes from the ends in) */
function eyeInset(x, y, r, len, a, t) {
  if (a <= 0.01) return; ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = '#F7F4EF'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 6, 0, 7); ctx.clip();
  const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.5); g.addColorStop(0, '#6FC3F2'); g.addColorStop(1, '#1F5E96');
  ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, 7); ctx.fillStyle = '#0B0907'; ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.16, -r * 0.18, r * 0.09, 0, 7); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  if (len > 0.01) {                                                                                      // the scratch: a jagged red line, shrinking toward its middle as it heals
    const P = [[-0.72, -0.34], [-0.4, -0.2], [-0.18, -0.24], [0.08, -0.04], [0.3, -0.08], [0.52, 0.1], [0.74, 0.16]], m = 0.5, a0 = m - len / 2, a1 = m + len / 2;
    ctx.strokeStyle = '#FF5A6A'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = '#FF2040'; ctx.shadowBlur = 18; ctx.beginPath();
    const n = P.length - 1, at = (u) => { const q = clamp(u) * n, i = Math.min(n - 1, Math.floor(q)), f = q - i; return [lerp(P[i][0], P[i + 1][0], f) * r, lerp(P[i][1], P[i + 1][1], f) * r]; };
    for (let k = 0; k <= 30; k++) { const [px, py] = at(lerp(a0, a1, k / 30)); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.lineWidth = 12; ctx.strokeStyle = '#FFFFFF'; ctx.stroke(); ctx.restore();
}
/** sparkle burst (healing) */
function sparkles(x, y, k, n = 8, R = 110) {
  if (k <= 0 || k >= 1) return; ctx.save(); ctx.fillStyle = '#FFF6B0'; ctx.globalAlpha = 1 - k;
  for (let i = 0; i < n; i++) { const a = i / n * 6.283 + hash(i) * 0.6, d = R * eo(k) * (0.6 + 0.5 * hash(i + 9)), s = 12 * (1 - k) + 4; ctx.save(); ctx.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.rotate(0.785); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore(); }
  ctx.restore();
}

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.8, vignette: 0.4, warm: 0.015, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray', 'tooth'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.33, BZ = 0.12;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_EXC = Wd('never', 0), T_TWO = Wd('two', 2), T_GROW = Wd('grows', 2), T_BRK = Wd('broken', 3), T_FUSE = Wd('fuses', 3);
  const T_SK = Wd('skin', 4), PEELS = [Wd('outer', 4) - 0.1, Wd('few', 4) - 0.05], T_ST = Wd('stomach', 5), T_ACID = Wd('acid', 5), T_EATS = Wd('eats', 5), T_REB = Wd('rebuilds', 5);
  const T_SCR = Wd('scratch', 6), T_HEAL = Wd('heals', 6), T_TOOTH = Wd('tooth', 7), T_GONE = Wd('gone', 7), T_FOREVER = Wd('forever', 7);
  const PLAN = [
    { t: -5, form: 'xray' },                                         // already x-ray on frame one (the hook)
    { t: T_SK, form: 'human' },
    { t: L(5) - 0.08, form: 'xray', charge: 0.12 },
    { t: L(6) - 0.08, form: 'blip', charge: 0.12 },
    { t: T_TOOTH, form: 'tooth' },
  ];
  Shifter.cues(PLAN.slice(1), cue);

  // the countdown strip at the top: fills in as we go, the last slot stays "???" until the twist
  const RANK = [
    { n: 5, name: 'LIVER', t: L(2) }, { n: 4, name: 'BONE', t: L(3) }, { n: 3, name: 'SKIN', t: L(4) },
    { n: 2, name: 'STOMACH', t: L(5) }, { n: 1, name: 'EYE', t: L(6) }, { n: 0, name: 'ENAMEL', t: Wd('enamel', 7) },
  ];
  let QUIET = false;                                                // true while the cold open replays other shots
  function ladder(t) {
    if (QUIET) return;
    const w = 166, h = 76, gap = 8, x0 = (W - (6 * w + 5 * gap)) / 2, y = 150;
    RANK.forEach((r, i) => {
      const on = t >= r.t - 0.04, last = r.n === 0, active = on && (i === 5 || t < RANK[i + 1].t - 0.04), k = on ? popIn(t - r.t + 0.04) : 1;
      ctx.save(); ctx.translate(x0 + i * (w + gap) + w / 2, y); ctx.scale(k, k);
      ctx.fillStyle = last ? (on ? RED : 'rgba(60,8,12,0.8)') : active ? YEL : on ? 'rgba(12,14,20,0.86)' : 'rgba(12,14,20,0.55)';
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 22); ctx.fill();
      if (last && !on) { ctx.lineWidth = 5; ctx.strokeStyle = `rgba(255,77,77,${0.55 + 0.45 * Math.sin(t * 7)})`; ctx.stroke(); }
      ctx.font = on ? '900 27px Inter' : '900 36px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = last ? '#FFFFFF' : active ? '#111' : on ? '#FFFFFF' : 'rgba(255,255,255,0.75)';
      ctx.fillText(on ? (last ? 'ENAMEL ✕' : r.name) : last ? '???' : `#${r.n}`, 0, 2); ctx.restore();
    });
  }
  /** the big rank number for the current item */
  const rankNo = (t, n, at) => QUIET ? 0 : pill(`#${n}`, 150, 330, popIn(t - at) * (1 + 0.06 * bump(seg(t, at, at + 0.35))), '#111', YEL, 96);
  RANK.slice(0, 5).forEach((r) => cue(r.t - 0.02, 'pop', { gain: 0.8 }));

  // ── the host (only in the skin two-shot; idles politely everywhere else) ────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.6 };
  const act = track([
    { t: 0, pose: REST },
    { t: Wd('outer', 4) - 0.2, d: 0.45, pose: { ...REST, shL: [40, -20, 18], elL: 100, brow: [0.8, 0.3], lid: -0.2, smile: 0.2, mouth: 0.25 } },   // looks at his own arm
    { t: Le(4) - 0.2, d: 0.5, pose: REST },
  ]);

  // ── x-ray extras: a liver that loses two thirds and regrows, a forearm bone that snaps and fuses ──
  const FX = blip.forms.xray, XH = FX.human;
  const organM = (col, o = {}) => new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.35, clearcoat: 0.8, emissive: col, emissiveIntensity: 0.3, ...o });
  const LV = [-0.06, 0.205, 0.06], liverSDF = (p) => smin(ellipsoid(p, [-0.05, 0.205, 0.06], [0.09, 0.038, 0.06]), ellipsoid(p, [-0.115, 0.195, 0.055], [0.052, 0.052, 0.058]), 0.035);
  const CUTX = -0.105, liverKeepM = organM('#B2343C'), liverGrowM = organM('#B2343C');
  const liverKeep = new THREE.Mesh(mesh((p) => smax(liverSDF(p), p[0] - CUTX, 0.004), [[-0.2, 0.12, -0.02], [0.06, 0.27, 0.14]], 0.004), liverKeepM); XH.spine.add(liverKeep);
  const liverG = new THREE.Group(); liverG.position.set(CUTX, 0, 0); XH.spine.add(liverG);
  const liverGrow = new THREE.Mesh(mesh((q) => { const p = [q[0] + CUTX, q[1], q[2]]; return smax(liverSDF(p), -(p[0] - CUTX), 0.004); }, [[-0.02, 0.12, -0.02], [0.2, 0.27, 0.14]], 0.004), liverGrowM); liverG.add(liverGrow);
  [liverKeep, liverGrow].forEach((m) => (m.castShadow = false));
  const LIVER0 = new THREE.Color('#B2343C'), LIVERG = new THREE.Color('#5BFF9C');
  /** how much of the cut-away liver is there (1 = whole) and how bright the regrowth glow is */
  const liverAt = (t) => { const gone = spring(clamp((t - T_TWO - 0.15) / 0.3)), back = eo(clamp((t - T_GROW + 0.05) / 1.4)); return { amt: t < T_TWO ? 1 : Math.max(0.0001, 1 - gone + back * gone), glow: t > T_GROW - 0.05 ? bump(seg(t, T_GROW - 0.05, T_GROW + 1.6)) : 0, cut: t > T_TWO + 0.1 && t < T_GROW + 0.3 ? bump(seg(t, T_TWO + 0.1, T_TWO + 0.6)) : 0 }; };

  const EL = XH.arm.R.el, boneOrig = EL.children.find((m) => m.geometry?.type === 'CapsuleGeometry'), boneM = boneOrig.material;
  const bA = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.1, 6, 10), boneM); bA.position.y = -0.075; EL.add(bA);
  const bPiv = new THREE.Group(); bPiv.position.y = -0.135; EL.add(bPiv);
  const bB = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.1, 6, 10), boneM); bB.position.y = -0.065; bPiv.add(bB);
  const brkM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF4D4D').multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const brk = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 14), brkM); brk.position.y = -0.135; EL.add(brk);
  const callM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#5BFF9C').multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const call = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 14), callM); call.position.y = -0.135; call.scale.set(1, 1.3, 1); EL.add(call);
  [bA, bB, brk, call].forEach((m) => (m.castShadow = false));
  function boneAt(t) {
    const split = t > cut(3) - 0.2 && t < cut(4) + 0.1; boneOrig.visible = !split; bA.visible = bB.visible = split;
    const b = spring(clamp((t - T_BRK) / 0.16)) * (t > T_BRK ? 1 : 0), h = eio(seg(t, T_FUSE + 0.1, Le(3))), open = b * (1 - h);
    bPiv.position.y = -0.135 - 0.018 * open; bPiv.rotation.z = 0.42 * open; bPiv.position.x = 0.01 * open;
    brk.visible = split && open > 0.02; brk.scale.setScalar(0.6 + 0.6 * open + 0.15 * Math.sin(t * 20)); brkM.opacity = 0.75 * open;
    const c = split && t > T_FUSE - 0.05 ? bump(seg(t, T_FUSE - 0.05, Le(3) + 0.25)) : 0; call.visible = c > 0.01; call.scale.set(0.6 + 0.9 * c, 0.8 + 1.3 * c, 0.6 + 0.9 * c); callM.opacity = 0.85 * c;
    return { open, c };
  }

  // ── skin: a ghost of the outer layer that lifts off and drifts away, plus falling flakes ──
  const HF = blip.forms.human, c = blip.o;
  const ghost = new Human({ skin: c.belly, shirt: c.color, pants: c.dark, shoes: c.darker, face: false, scale: 0.6 });
  const ghostM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#D8FBFF').multiplyScalar(1.1), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
  ghost.setAllMaterial(ghostM); ghost.parts.forEach((p) => (p.castShadow = false)); HF.holder.add(ghost.group);
  const J = (h) => [h.group, h.hips, h.spine, h.head, h.arm.L.sh, h.arm.L.el, h.arm.R.sh, h.arm.R.el, h.leg.L.hip, h.leg.L.kn, h.leg.R.hip, h.leg.R.kn];
  const JS = J(HF.human), JG = J(ghost);
  const flakeM = new THREE.MeshStandardMaterial({ color: '#CFF6FF', emissive: '#BFF3FF', emissiveIntensity: 0.6, roughness: 0.6, side: THREE.DoubleSide, transparent: true }), flakes = [];
  for (let i = 0; i < 26; i++) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.018 + 0.012 * hash(i), 6), flakeM); f.castShadow = false; HF.holder.add(f); flakes.push(f); }
  const peelAt = (t) => PEELS.reduce((m, p) => (t > p && t < p + 1.3 ? (t - p) / 1.3 : m), -1);
  function skin(t) {
    const k = peelAt(t); ghost.group.visible = k >= 0; flakes.forEach((f) => (f.visible = k >= 0));
    if (k < 0) return;
    JG.forEach((g, i) => { g.rotation.copy(JS[i].rotation); g.position.copy(JS[i].position); });
    ghost.group.scale.setScalar(0.6 * (1 + 0.07 * eo(k))); ghost.group.position.y = HF.human.group.position.y + 0.12 * eo(k); ghostM.opacity = 0.42 * (1 - k) * Math.min(1, k * 8);
    flakeM.opacity = 1 - k;
    flakes.forEach((f, i) => { const y0 = 0.25 + hash(i) * 0.8, x0 = (hash(i + 5) - 0.5) * 0.4, z0 = (hash(i + 11) - 0.5) * 0.2 + 0.06; f.position.set(x0 + Math.sin(k * 6 + i) * 0.03 + Math.sign(x0) * 0.08 * k, y0 - 0.35 * k * k - 0.05 * k, z0 + 0.05 * k); f.rotation.set(k * 6 + i, k * 4 + i * 0.7, i); f.scale.setScalar(Math.min(1, k * 6)); });
  }

  // ── stomach: acid bubbles, the lining reddens as it's eaten, then a bright rebuild ──
  const STO = FX.stomach, STO0 = STO.material.color.clone(), STO_HURT = new THREE.Color('#6E1222');
  function stomach(t, f) {
    const hurt = t > T_EATS - 0.1 ? eo(clamp((t - T_EATS + 0.1) / 0.5)) * (1 - eo(seg(t, T_REB, T_REB + 0.7))) : 0, reb = t > T_REB - 0.05 ? bump(seg(t, T_REB - 0.05, T_REB + 1.1)) : 0;
    STO.material.color.copy(STO0).lerp(STO_HURT, 0.75 * hurt);
    STO.material.emissive.copy(STO0).lerp(new THREE.Color('#FF2A2A'), hurt).lerp(new THREE.Color('#9FFFE0'), 0.5 * reb); STO.material.emissiveIntensity = 0.25 + 0.5 * hurt * (0.7 + 0.3 * Math.sin(t * 24)) + 0.3 * reb;
    STO.scale.setScalar(1 + 0.05 * reb);
    const on = t > T_ACID - 0.15;
    f.gas.forEach((b, i) => {
      if (!on || i >= 34) { b.visible = false; return; }
      const life = 0.9 + hash(i) * 0.6, k = ((t - T_ACID + hash(i + 3) * life) / life) % 1, born = t - T_ACID + 0.15 > hash(i + 7) * 0.5;
      b.visible = born; if (!born) return; b.material = f.gasM;
      const a = hash(i + 1) * 6.283; b.position.set(0.03 + Math.cos(a) * 0.055 * hash(i + 2), 0.13 + hash(i + 4) * 0.05 + k * 0.06, 0.03 + Math.sin(a) * 0.035 * hash(i + 6)); b.scale.setScalar((0.5 + 0.7 * hash(i + 8)) * Math.sin(k * Math.PI));
    });
    return { hurt, reb };
  }

  /** one frame: Blip + effect, extras, the host, mood, camera punch, render */
  function show(t, o) {
    const pre = blip.state(t, PLAN);
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = o.turn ?? -0.2;
    const ouch = t > T_SCR && t < T_HEAL ? 1 : 0, happy = t > T_HEAL + 0.1 ? 1 : 0;
    const s = blip.update(t, PLAN, { blip: { y: 0, squash: Math.sin(t * 2.4) * 0.02 + 0.08 * bump(seg(t, T_SCR, T_SCR + 0.35)), tilt: [0, 6 * ouch], armL: 14 + 40 * ouch, armR: 14 + 110 * ouch,
      lean: drift(t, 3, 1.2) * 5 + 20 * bump(seg(t, T_SCR, T_SCR + 0.4)), lid: ouch ? 0.65 : Math.max(blink(t, 5), 0) - 0.15 * happy, look: [0, 0.2], smile: ouch ? -0.6 : 0.9, mouth: ouch ? 0.35 : 0.15 * happy, glow: 1.6 } });
    const f = blip.current;
    blip.flash.material.opacity *= o.flashK ?? 1; if (o.flashK != null) { blip.flash.visible = false; blip.ring.material.opacity *= 0.5; } blip.light.intensity *= o.flashK ?? 1; blip.flash.scale.multiplyScalar(0.5 + 0.5 * (o.flashK ?? 1));
    if (o.flashK != null) f.mats.forEach((m) => { if (!m.uniforms && m.emissive) m.emissiveIntensity *= 0.25 + 0.75 * o.flashK; });
    // x-ray: keep only what this film talks about
    if (s.form === 'xray') {
      f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gut.visible = !o.noGut;
      const lv = liverAt(t); liverG.scale.set(lv.amt, 0.7 + 0.3 * lv.amt, 0.7 + 0.3 * lv.amt); liverG.visible = lv.amt > 0.01;
      liverGrowM.emissive.copy(LIVER0).lerp(LIVERG, lv.glow); liverGrowM.emissiveIntensity = 0.3 + 1.6 * lv.glow; liverKeepM.emissive.copy(LIVER0).lerp(new THREE.Color('#FF4040'), lv.cut); liverKeepM.emissiveIntensity = 0.3 + 0.9 * lv.cut;
      liverKeep.visible = !o.noLiver; liverG.visible = liverG.visible && !o.noLiver;
      if (o.hook) hookGlow(t, f);
      if (o.arm) { const w = Math.sin(t * 2.2); f.human.pose({ spine: [0, w * 2, 0], head: [-3, -10, 0], shL: [4, 0, 20], shR: [8, 0, 80], elL: 16, elR: 4 }); }
      boneAt(t);
      STO.visible = !o.noStomach;
      if (o.stomach) stomach(t, f); else { f.gas.forEach((b) => (b.visible = false)); STO.material.color.copy(STO0); STO.scale.setScalar(1); }
      blip.group.updateMatrixWorld(true);
    }
    if (s.form === 'human') skin(t); else { ghost.group.visible = false; flakes.forEach((x) => (x.visible = false)); }
    if (s.form === 'tooth') tooth(t, f);
    ST.setMood(s.xray);
    // the host
    const watch = s.n >= 1 ? Math.max(pre.charge, 1 - eio(seg(s.since, 0.7, 1.3))) : 0, r = s.n >= 1 && s.since < 2 ? Math.exp(-s.since * 2.4) * (1 - Math.exp(-s.since * 22)) : 0;
    let p = drag(act, t);
    p = addPose(p, { spine: [-4 * r, 12 * watch, -3 * watch], head: [3 * watch - 5 * r, 26 * watch, 0], look: [0.7 * watch, -0.45 * watch], lid: -0.3 * r, squash: 0.04 * r });
    const pz = alive(p, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); breathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0);
    // camera (aim(): placed after posing, so it can target a body part)
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), tgt = V3(BX, f.cy * 1.25, BZ), shake = s.kick + (o.shake || 0);
    pos.lerp(tgt, s.kick * 0.08); at.lerp(tgt, s.kick * 0.3);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + s.flash * 0.2 + s.xray * 0.2, bloomThreshold: lerp(0.8, 0.5, s.xray), ...(o.look || {}) });
    return s;
  }
  const flash2d = (s) => { if (s.flash > 0.02 && false) { ctx.fillStyle = `rgba(255,244,200,${Math.min(0.2, s.flash * 0.2)})`; ctx.fillRect(0, 0, W, H); } };
  const XW = (v) => XH.spine.localToWorld(v.clone());
  const wy = (ly) => 0.7275 + 0.75 * ly;                                                                  // x-ray spine-local y → world y (turn 0)

  // ── the hook: every part that regrows ticks green, in time with the words ──
  const HOOK = [
    { at: -9, p: () => XW(V3(-0.07, 0.2, 0.08)), m: () => [liverKeepM, liverGrowM] },                       // liver
    { at: -9, p: () => EL.localToWorld(V3(0, -0.13, 0)), m: () => [boneM] },                                  // arm bone
    { at: -9, p: () => XW(V3(0.17, 0.42, 0.06)), m: () => [] },                                            // skin (shoulder)
    { at: -9, p: () => XW(V3(0.04, 0.17, 0.06)), m: () => [STO.material] },                                // stomach
    { at: -9, p: () => XH.head.localToWorld(V3(0.045, 0.15, 0.1)), m: () => [] },                         // eye
  ];
  function hookGlow(t, f) {
    const off = 1 - eo(seg(t, T_EXC - 0.1, T_EXC + 0.3));
    HOOK.forEach((h) => { const k = bump(seg(t, h.at, h.at + 0.5)) * off; h.m().forEach((m) => { m.emissive.lerp(LIVERG, k); m.emissiveIntensity += 1.4 * k; }); });
    f.xm.uniforms.uS.value = 1.15 * (1 - 0.45 * eo(seg(t, T_EXC - 0.05, T_EXC + 0.3)));
  }

  // ── the tooth: enamel cracks, a chip flies off, it's gone for good ──
  function tooth(t, f) {
    const cr = clamp((t - T_GONE + 0.12) / 0.22); f.crack.geometry.setDrawRange(0, Math.floor(f.crackN * cr / 6) * 6);
    const k = t - T_GONE - 0.08; f.chip.visible = k < 1.2;
    if (k > 0) { f.chip.position.set(0.075 + 0.5 * k, 0.445 + 0.55 * k - 1.3 * k * k, 0.06 + 0.35 * k); f.chip.rotation.set(k * 9, k * 5, k * 7); }
    else { f.chip.position.set(0.075, 0.445, 0.06); f.chip.rotation.set(0, 0, 0); }
    const shock = t > T_GONE ? 1 : 0, sad = eo(seg(t, T_GONE + 0.5, T_GONE + 1)); f.face.set({ lid: shock ? -0.35 + 0.5 * sad : Math.max(0, blink(t, 3)), look: [0.4 * shock * (1 - sad), 0.3 * (1 - sad) - 0.3 * sad], smile: shock ? lerp(-0.2, -1, sad) : 1 });
    f.body.position.y += 0.04 * bump(seg(t, T_GONE, T_GONE + 0.3)); f.body.rotation.z += 0.12 * wobble(clamp((t - T_GONE) / 0.9), 2.5, 3.5);
    f.enamel.emissive.set('#FF3030'); f.enamel.emissiveIntensity = 0.02 + 0.22 * bump(seg(t, T_FOREVER - 0.05, T_FOREVER + 0.6));
  }

  // 1 · cold open: three payoff moments in about 1.3 s (bone snaps, skin peels, liver regrows) under the promise, then the question
  const M_END = T_EXC - 0.06, MONT = [['S03', T_BRK - 0.04, 3], ['S04', PEELS[0] + 0.12, 4], ['S02', T_GROW + 0.12, 2]];
  function banner(t) {
    pill('1 BODY PART', 540, 290, 1, '#111', YEL, 76); pill('NEVER GROWS BACK', 540, 425, 1 + 0.03 * Math.sin(t * 9), '#FFFFFF', 'rgba(190,16,24,0.95)', 76);
  }
  add({ id: 'S00', at: 0, note: 'cold open montage: bone snaps (CRACK!), skin peels, liver regrows; banner "1 BODY PART NEVER GROWS BACK" from frame one', draw(lt, d, t, blit) {
    const step = M_END / 3, n = Math.min(2, Math.floor(t / step)), [id, t0, li] = MONT[n], sh = S.find((x) => x.id === id), tt = t0 + (t - n * step);
    QUIET = true; sh.draw(tt - sh.at, cut(li + 1) - cut(li), tt, blit); QUIET = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ladder(t); banner(t);
  } });
  add({ id: 'S01b', at: M_END, note: 'x-ray head: everything dims, red "?" pulses over the mouth; "CAN YOU GUESS?"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(BX + 0.1, 1.2, BZ + 1.45), V3(BX + 0.06, 1.2, BZ + 1.12), eio(lt / d)), at: V3(BX, 1.17, BZ), aim: () => ({ focus: XH.head.localToWorld(V3(0, 0.07, 0.1)) }), turn: 0, hook: true, noGut: true, look: { aperture: 0.0016 } }); blit(); flash2d(s);
    const [x, y] = screen(XH.head.localToWorld(V3(0, 0.07, 0.1)), cam); mystery(x, y, eob(seg(t, T_EXC - 0.05, T_EXC + 0.25)), t);
    pill('CAN YOU GUESS?', 540, 1180, popIn(t - Wd('guess', 1)), '#111', YEL, 62);
    ladder(t); banner(t);
  } });
  cue(0.02, 'slam', { gain: 0.9 }); cue(0.04, 'tock', { gain: 0.8 }); cue(M_END / 3, 'whoosh'); cue(M_END / 3 + 0.05, 'sparkle', { dur: 0.5, gain: 0.6 }); cue(M_END * 2 / 3, 'whoosh'); cue(M_END * 2 / 3 + 0.05, 'boing', { gain: 0.5 });
  cue(M_END, 'thud', { gain: 0.8 }); cue(Wd('guess', 1), 'pop');

  // 2 · #5 liver
  add({ id: 'S02', at: cut(2), note: 'x-ray belly close: two thirds of the red liver shrink away on "two thirds", then grow back glowing green', draw(lt, d, t, blit) {
    const k = eio(lt / d), s = show(t, { aim: () => { const c0 = XW(V3(-0.075, 0.2, 0.06)); return { pos: lerpV(c0.clone().add(V3(0.12, 0.14, 0.95)), c0.clone().add(V3(0.06, 0.1, 0.74)), k), at: c0, focus: c0 }; }, turn: 0, noGut: true, noStomach: true, look: { aperture: 0.0016 } }); blit(); flash2d(s);
    rankNo(t, 5, RANK[0].t);
    const [x, y] = screen(XW(V3(-0.03, 0.22, 0.12)), cam); label('LIVER', 760, 560, x, y, eob(seg(t, Wd('liver', 2) - 0.1, Wd('liver', 2) + 0.2)));
    if (t > T_TWO) pill(t < T_GROW ? '− 2/3' : 'GROWS BACK', 540, 1180, popIn(t - (t < T_GROW ? T_TWO : T_GROW)), t < T_GROW ? RED : GRN, DARK, 64);
    ladder(t);
  } });
  cue(cut(2), 'whoosh'); cue(T_TWO + 0.15, 'slide', { gain: 0.8 }); cue(T_GROW, 'sparkle', { dur: 1.2, gain: 0.8 }); cue(T_GROW + 0.1, 'boing', { gain: 0.5 });

  // 3 · #4 bone
  add({ id: 'S03', at: cut(3), note: 'x-ray arm held out: forearm bone snaps on "broken" (red glow), fuses with a green glow on "fuses"; week counter', draw(lt, d, t, blit) {
    const k = eio(lt / d), s = show(t, { aim: () => { const b0 = EL.localToWorld(V3(0, -0.12, 0)); return { pos: lerpV(b0.clone().add(V3(-0.02, 0.06, 0.82)), b0.clone().add(V3(0.02, 0.04, 0.62)), k), at: b0, focus: b0 }; }, turn: 0, arm: true, shake: 0.7 * Math.exp(-Math.max(0, t - T_BRK) * 6) * (t > T_BRK ? 1 : 0), look: { aperture: 0.0016 } }); blit(); flash2d(s);
    rankNo(t, 4, RANK[1].t);
    const [x, y] = screen(EL.localToWorld(V3(0, -0.135, 0.01)), cam);
    if (t > T_BRK && t < T_FUSE) pill('CRACK!', x, y - 190, popIn(t - T_BRK), RED, DARK, 58);
    if (t > T_FUSE) { const wk = Math.max(1, Math.round(6 * eo(seg(t, T_FUSE, Le(3) - 0.1)))); pill(`WEEK ${wk}`, 540, 1180, popIn(t - T_FUSE), wk >= 6 ? GRN : '#FFFFFF', DARK, 64); sparkles(x, y, seg(t, Le(3) - 0.35, Le(3) + 0.3)); }
    ladder(t);
  } });
  cue(cut(3), 'whoosh'); cue(T_BRK, 'slam', { gain: 0.8 }); cue(T_BRK + 0.02, 'tock', { gain: 0.8 }); cue(T_FUSE, 'sparkle', { dur: 1.2, gain: 0.7 }); cue(Le(3) - 0.2, 'pop', { gain: 0.6 });

  // 4 · #3 skin
  add({ id: 'S04', at: cut(4), note: 'lights up, two-shot: on "skin" Blip becomes a person; a ghost layer of his skin lifts off twice, flakes fall; host looks at his own arm', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.12, 0.98, 3.5), V3(0.2, 0.98, 3.15), eio(lt / d)), at: V3(0.12, 0.8, 0), focus: V3(BX, 0.8, BZ), flashK: 0.35 }); blit(); flash2d(s);
    rankNo(t, 3, RANK[2].t);
    if (t > PEELS[0]) pill('NEW OUTER LAYER', 540, 1180, popIn(t - PEELS[0]), '#FFFFFF', DARK, 56);
    if (t > PEELS[1]) pill('EVERY FEW WEEKS', 540, 1060, popIn(t - PEELS[1]), YEL, DARK, 56);
    ladder(t);
  } });
  PEELS.forEach((p) => { cue(p, 'sparkle', { dur: 1.0, gain: 0.7 }); cue(p + 0.05, 'slide', { gain: 0.5 }); });

  // 5 · #2 stomach lining
  add({ id: 'S05', at: cut(5), note: 'belly close; on "stomach" he goes x-ray: acid bubbles, lining turns angry red on "eats", flashes bright and heals on "rebuilds"', draw(lt, d, t, blit) {
    const c0 = V3(BX + 0.02, wy(0.17), BZ + 0.02), s = show(t, { pos: lerpV(c0.clone().add(V3(0.22, 0.1, 0.95)), c0.clone().add(V3(0.14, 0.06, 0.72)), eio(lt / d)), at: c0, focus: c0, turn: 0, flashK: 0.25, stomach: true, noGut: true, noLiver: true, look: { aperture: 0.0016 } }); blit(); flash2d(s);
    rankNo(t, 2, RANK[3].t);
    if (s.form === 'xray') { const [x, y] = screen(XW(V3(0.06, 0.2, 0.08)), cam); label('STOMACH LINING', 600, 560, x, y, eob(seg(t, T_ST + 0.15, T_ST + 0.45)));
      if (t > T_ACID) pill('ACID', 230, 1180, popIn(t - T_ACID), '#D6FF4A', DARK, 58);
      if (t > T_REB) pill('NEW LINING EVERY FEW DAYS', 540, 1060, popIn(t - T_REB), GRN, DARK, 50); sparkles(x, y, seg(t, T_REB, T_REB + 0.7), 10, 160); }
    ladder(t);
  } });
  cue(cut(5), 'whoosh'); cue(T_ACID, 'bubbles', { dur: 2.2, gain: 0.7 }); cue(T_EATS, 'sizzle', { dur: 0.9, gain: 0.7 }); cue(T_REB, 'sparkle', { dur: 1.2, gain: 0.8 });

  // 6 · #1 eye
  add({ id: 'S06', at: cut(6), note: 'Blip himself, close: on "scratch" he winces, inset shows a scratched eye; it heals on "heals"; "1-2 DAYS"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(BX + 0.12, 0.42, BZ + 1.35), V3(BX + 0.08, 0.4, BZ + 1.08), eio(lt / d)), at: V3(BX, 0.33, BZ), focus: V3(BX, 0.33, BZ + 0.2), turn: 0, flashK: 0.15, look: { aperture: 0.0035 } }); blit(); flash2d(s);
    rankNo(t, 1, RANK[4].t);
    const len = t < T_HEAL ? eo(clamp((t - T_SCR) / 0.2)) : 1 - eio(seg(t, T_HEAL, T_HEAL + 0.9));
    eyeInset(790, 520, 150, len, eob(seg(t, T_SCR - 0.15, T_SCR + 0.15)), t); sparkles(790, 520, seg(t, T_HEAL + 0.7, T_HEAL + 1.4), 10, 170);
    if (t > T_HEAL) pill('HEALED IN 1–2 DAYS', 540, 1180, popIn(t - T_HEAL - 0.3), GRN, DARK, 56);
    ladder(t);
  } });
  cue(T_SCR, 'zip', { gain: 0.7 }); cue(T_SCR + 0.02, 'tock', { gain: 0.5 }); cue(T_HEAL + 0.6, 'sparkle', { dur: 1.0, gain: 0.8 });

  // 7 · the twist: enamel
  add({ id: 'S07', at: cut(7), note: 'on "tooth" Blip becomes a tooth; on "gone" the enamel cracks and a chip flies off; "NEVER GROWS BACK"; ends on the sad tooth (loops to the hook)', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(BX + 0.1, 0.62, BZ + 1.75), V3(BX + 0.04, 0.56, BZ + 1.32), eio(lt / d)), at: V3(BX, 0.4, BZ), focus: V3(BX, 0.4, BZ + 0.15), turn: 0, flashK: 0.3, shake: t > T_GONE ? 0.8 * Math.exp(-(t - T_GONE) * 6) : 0, look: { aperture: 0.003 } }); blit(); flash2d(s);
    if (t > T_GONE + 0.15) pill('NO LIVING CELLS', 540, 1180, popIn(t - T_GONE - 0.15), '#FFFFFF', DARK, 54);
    if (t > T_FOREVER) pill('NEVER GROWS BACK', 540, 380, popIn(t - T_FOREVER) * (1 + 0.04 * Math.sin(t * 9)), '#FFFFFF', 'rgba(170,16,24,0.92)', 70);
    ladder(t);
  } });
  cue(T_GONE, 'slam', { gain: 0.9 }); cue(T_GONE + 0.08, 'tock', { gain: 0.8 }); cue(T_GONE + 0.12, 'whoosh', { gain: 0.6 }); cue(T_FOREVER, 'thud', { gain: 0.9 }); cue(Wd('enamel', 7), 'pop');

  return { shots: S, cues: CUES };
}
