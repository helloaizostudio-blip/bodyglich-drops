// WHAT LIGHTNING ACTUALLY DOES TO YOUR BODY (Body Glitch, host v2 + shape-shifting Blip)
// Storm studio. Blip is Roy Sullivan, the park ranger struck 7 times. Hook: 7 strikes in 3 s with a counter.
// Then: hotter than the sun, the flashover (current runs over the skin), 90% survive, the heart stops, Lichtenberg
// figures, and the reveal of his name, struck 7 times again so the end runs straight back into the hook.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Le, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host } from './core/host.js';
import { Shifter } from './core/shift.js';
import { studio } from './core/studio.js';
import { bump, popIn, track, drag, alive, addPose, mouthFor, breathe as hostBreathe } from './core/motion.js';
import { pill, label } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const YEL = '#FFD43B', RED = '#FF4D4D', GRN = '#4BE38A', BLUE = '#BFE4FF', DARK = 'rgba(12,14,20,0.82)';
const along = (pts, k) => { const x = clamp(k) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x)); return pts[i].clone().lerp(pts[i + 1], x - i); };
const imp = (x, d = 7) => (x < 0 ? 0 : x < 0.03 ? x / 0.03 : Math.exp(-(x - 0.03) * d));
const impAt = (t, list, d) => list.reduce((m, h) => Math.max(m, imp(t - h, d)), 0);

/** a row of 10 people: n of them light up green, the rest red */
function people(t, t0, x0, y, n = 9) {
  for (let i = 0; i < 10; i++) {
    const k = popIn(t - t0 - i * 0.07); if (k <= 0) continue; const x = x0 + i * 86, col = i < n ? GRN : RED;
    ctx.save(); ctx.translate(x, y); ctx.scale(k * 1.35, k * 1.35); ctx.fillStyle = col; ctx.strokeStyle = '#111'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, -36, 18, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-24, -12, 48, 52, 20); ctx.fill(); ctx.stroke(); ctx.restore();
  }
}
/** ECG strip: beats scroll by, then a flat line from tStop */
function ecg(t, tStop, x0, y, w, h, a) {
  if (a <= 0.01) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(6,10,12,0.85)'; ctx.beginPath(); ctx.roundRect(x0 - 20, y - h / 2 - 20, w + 40, h + 40, 24); ctx.fill();
  const flat = t > tStop; ctx.strokeStyle = flat ? RED : GRN; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14; ctx.beginPath();
  for (let i = 0; i <= 240; i++) { const u = i / 240, tt = t - (1 - u) * 2.2, ph = (tt * 1.3) % 1, beat = tt < tStop ? (ph < 0.06 ? Math.sin(ph / 0.06 * Math.PI) * 1 : ph < 0.1 ? -Math.sin((ph - 0.06) / 0.04 * Math.PI) * 0.35 : 0) : 0, py = y - beat * h * 0.45; i ? ctx.lineTo(x0 + u * w, py) : ctx.moveTo(x0, py); }
  ctx.stroke(); ctx.restore();
}
/** a branching fern (Lichtenberg figure) growing from (x, y) toward angle a; k 0..1 grows it */
function fern(x, y, a, len, k, depth = 0, seed = 1) {
  if (depth > 5 || k <= 0) return; const l = len * Math.min(1, k * (1 + depth * 0.5)), steps = 6; let px = x, py = y, ang = a;
  ctx.beginPath(); ctx.moveTo(px, py);
  for (let i = 1; i <= steps; i++) { ang += (hash(seed * 13 + i) - 0.5) * 0.5; px += Math.cos(ang) * l / steps; py += Math.sin(ang) * l / steps; ctx.lineTo(px, py); }
  ctx.lineWidth = Math.max(1.5, 9 - depth * 1.6); ctx.stroke();
  const n = depth < 2 ? 4 : 3;
  for (let j = 1; j <= n; j++) { const u = j / (n + 1), bx = lerp(x, px, u), by = lerp(y, py, u), side = j % 2 ? 1 : -1; fern(bx, by, a + side * (0.7 + 0.3 * hash(seed + j)), len * 0.5, (k - 0.12 * (depth + 1)) * 1.2, depth + 1, seed * 7 + j); }
}

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.38, bloomThreshold: 0.75, vignette: 0.45, warm: 0.0, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.33, BZ = 0.12;

  // ── times ─────────────────────────────────────────────────────────────────
  const s0 = Wd('struck', 0) + 0.02, s1 = Wd('and', 0) - 0.12, HOOK = []; for (let i = 0; i < 7; i++) HOOK.push(s0 + (s1 - s0) * i / 6);
  const e0 = Wd('seven', 7) - 0.05, e1 = Le(7) - 0.05, END = []; for (let i = 0; i < 7; i++) END.push(e0 + (e1 - e0) * i / 6);
  const T_SUN = Wd('sun', 2), T_HOT = Wd('five', 2), T_FLASH = Wd('flashes', 3), T_THRU = Wd('through', 3), T_90 = Wd('ninety', 4);
  const T_SHOCK = Wd('shock', 5), T_STOP = Wd('stop', 5), T_FERN = Wd('these', 6), T_LICH = Wd('Lichtenberg', 6), T_ROY = Wd('Roy', 7);
  const STRIKES = [...HOOK, L(2) + 0.1, T_SHOCK, ...END];
  const PLAN = [
    { t: -5, form: 'human' },
    { t: T_FLASH - 0.35, form: 'xray', charge: 0.12 },
    { t: L(4) - 0.08, form: 'human', charge: 0.12 },
    { t: L(5) - 0.08, form: 'xray', charge: 0.12 },
    { t: L(6) + 0.08, form: 'human', charge: 0.12 },
  ];
  Shifter.cues(PLAN.slice(1), cue);
  STRIKES.forEach((s, i) => { cue(s, 'slam', { gain: 0.75 }); cue(s + 0.01, 'zip', { gain: 0.5 }); if (i % 2 === 0) cue(s + 0.05, 'thud', { gain: 0.6 }); });

  // ── storm props: bolts, a flash light, smoke puffs, the ranger hat ─────────
  const boltM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#E6F1FF').multiplyScalar(3.2) }), glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7FB8FF').multiplyScalar(1.6), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  const bolts = [];
  for (let b = 0; b < 4; b++) {
    const g = new THREE.Group(), pts = []; let x = 0, z = 0;
    for (let i = 0; i <= 14; i++) { const u = i / 14; if (i && i < 14) { x += (hash(b * 50 + i) - 0.5) * 0.28; z += (hash(b * 80 + i) - 0.5) * 0.12; } pts.push(V3(i === 14 ? 0 : x * (1 - u * 0.3), (1 - u) * 2.6, i === 14 ? 0 : z)); }
    const add3 = (p, r) => { const c = new THREE.CatmullRomCurve3(p, false, 'catmullrom', 0.05); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 70, r, 6), boltM)); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 70, r * 4, 6), glowM)); };
    add3(pts, 0.011);
    for (const at of [4, 8]) { const st = pts[at], br = [st]; let bx = st.x, by = st.y; for (let i = 1; i < 6; i++) { bx += (hash(b * 9 + at * 3 + i) - 0.2) * 0.12 * (at % 8 ? 1 : -1); by -= 0.09; br.push(V3(bx, by, st.z)); } add3(br, 0.006); }
    g.visible = false; g.traverse((m) => (m.castShadow = false)); ST.scene.add(g); bolts.push(g);
  }
  const flashL = new THREE.PointLight('#CFE4FF', 0, 9, 1.2); flashL.position.set(BX + 0.2, 2.4, 1.4); ST.scene.add(flashL);
  const smokeM = new THREE.MeshStandardMaterial({ color: '#9AA3AD', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 }), smoke = [];
  for (let i = 0; i < 18; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05 + 0.04 * hash(i), 12, 10), smokeM); s.visible = false; s.castShadow = false; ST.scene.add(s); smoke.push(s); }
  const HF = blip.forms.human, XF = blip.forms.xray, HH = HF.human;
  const hatM = new THREE.MeshStandardMaterial({ color: '#8C6A3C', roughness: 0.7 }), hat = new THREE.Group();
  hat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.012, 36), hatM)); const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.085, 28), hatM); crown.position.y = 0.045; hat.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.101, 0.101, 0.018, 28), new THREE.MeshStandardMaterial({ color: '#3B2A16', roughness: 0.6 })); band.position.y = 0.012; hat.add(band);
  hat.position.y = 0.245; HH.head.add(hat); HF.antenna.position.y = 0.33;
  // flashover sparks: run over the outside of the body (world space)
  const sparkM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#DDF0FF').multiplyScalar(2.2) }), sparks = [];
  for (let i = 0; i < 80; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), sparkM); s.visible = false; ST.scene.add(s); sparks.push(s); }
  const skinPaths = (h) => {
    const out = (v, s) => v.add(V3(s * 0.05, 0, 0.02)), top = h.head.localToWorld(V3(0, 0.29, 0));
    const arm = (k, s) => [top, out(h.arm[k].sh.localToWorld(V3(0, 0.06, 0)), s), out(h.arm[k].el.localToWorld(V3(0, 0, 0)), s), out(h.arm[k].el.localToWorld(V3(0, -0.38, 0)), s)];
    const leg = (k, s) => [top, out(h.spine.localToWorld(V3(s * 0.19, 0.3, 0)), s), out(h.spine.localToWorld(V3(s * 0.17, 0.0, 0)), s), out(h.leg[k].kn.localToWorld(V3(0, 0, 0)), s), out(h.leg[k].kn.localToWorld(V3(0, -0.46, 0.04)), s)];
    return [arm('L', -1), arm('R', 1), leg('L', -1), leg('R', 1)];
  };

  // ── the host ──────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const act = track([
    { t: 0, pose: { ...REST, shL: [40, 0, 30], shR: [40, 0, 30], elL: 120, elR: 120, brow: [1, 0], lid: -0.35, mouth: 0.4, smile: -0.3, spine: [-8, 0, 0] } },  // ducking, hands up
    { t: Wd('lived', 0) - 0.05, d: 0.35, pose: { ...REST, brow: [1, 0.3], lid: -0.3, mouth: 0.35, smile: 0.2, head: [0, 22, 0] } },
    { t: L(1) - 0.05, d: 0.35, pose: { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, brow: [0.9, 0], smile: 0.3, head: [-4, 0, 6] } },
    { t: L(2) + 0.6, d: 0.4, pose: POINT },
    { t: L(4) - 0.05, d: 0.35, pose: { ...REST, shR: [84, 0, 8], elR: 4, smile: 0.9, brow: [0.5, 0] } },                                                     // points at you: 90%
    { t: L(5) - 0.05, d: 0.35, pose: { ...REST, shL: [48, 30, 12], elL: 105, shR: [48, -30, 12], elR: 105, brow: [0.9, 0.4], smile: -0.4, mouth: 0.2 } },     // hands on chest
    { t: L(6) - 0.05, d: 0.4, pose: POINT },
    { t: L(7) - 0.05, d: 0.35, pose: { ...POINT, smile: 0.9 } },
    { t: e0 - 0.15, d: 0.3, pose: { ...REST, shL: [40, 0, 30], shR: [40, 0, 30], elL: 120, elR: 120, brow: [1, 0], lid: -0.35, mouth: 0.4, smile: -0.3, spine: [-8, 0, 0] } },
  ]);

  /** one frame */
  function show(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = o.turn ?? -0.15;
    const s = blip.update(t, PLAN, {}), f = blip.current, hit = impAt(t, STRIKES, 6);
    if (o.flashK != null) { blip.flash.visible = false; blip.ring.material.opacity *= 0.5; f.mats.forEach((m) => { if (!m.uniforms && m.emissive) m.emissiveIntensity *= 0.25 + 0.75 * o.flashK; }); }
    // the struck body jolts
    if (s.form === 'human') { const w = Math.sin(t * 2.2), j = hit, up = t > Wd('lived', 0) && t < L(1) + 0.3 ? eo(seg(t, Wd('lived', 0), Wd('lived', 0) + 0.3)) : 0;
      HH.pose({ spine: [-10 * j, w * 2, 6 * j * Math.sin(t * 60)], head: [-16 * j - 3, 0, 0], shL: [6 + 30 * j, 0, 12 + 40 * j], shR: [6 + 30 * j + 100 * up, 0, 12 + 40 * j + 20 * up], elL: 24 + 40 * j, elR: 24 + 40 * j + 60 * up, knL: 10 * j, knR: 10 * j });
      f.face.set({ lid: j > 0.2 ? 0.9 : 0, smile: up > 0.5 ? 1 : j > 0.1 ? -0.6 : 0.8 }); f.group.position.y = 0.02 * j; }
    if (s.form === 'xray') {
      f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gut.visible = false; f.kidneys.forEach((k) => (k.visible = false)); f.gas.forEach((g) => (g.visible = false));
      if (o.fx === 'heart') { const live = t < T_STOP, ph = t * 7.6, beat = live ? Math.pow(Math.max(0, Math.sin(ph)), 6) + 0.5 * Math.pow(Math.max(0, Math.sin(ph - 0.9)), 6) : 0; f.heart.scale.setScalar(1.15 + beat * 0.3); f.heart.material.emissiveIntensity = live ? 0.5 + beat * 1.2 : 0.06; if (!live) f.heart.material.color.set('#7A5560'); else f.heart.material.color.set('#D62839'); }
      else f.heart.material.color.set('#D62839');
    }
    blip.group.updateMatrixWorld(true);
    // bolts + flash + smoke
    let bi = -1, last = -9; STRIKES.forEach((st, i) => { if (t >= st && t - st < 0.2) { bi = i; last = st; } });
    bolts.forEach((b, i) => { b.visible = !o.noBolt && bi >= 0 && i === bi % 4 && (Math.floor((t - last) * 60) % 3 !== 2); if (b.visible) { b.position.copy(o.boltTo ? o.boltTo() : HH.head.localToWorld(V3(0, 0.3, 0))); } });
    flashL.intensity = 9 * hit; ST.setMood(Math.max(s.xray, o.storm ?? 0.55) - 0.25 * hit);
    smoke.forEach((m, i) => { const st = STRIKES.filter((x) => x <= t).pop(), age = st != null ? t - st - hash(i) * 0.2 : -1; m.visible = age > 0 && age < 1.4 && s.form === 'human'; if (!m.visible) return; const p = HH.head.localToWorld(V3((hash(i + 2) - 0.5) * 0.25, 0.3, (hash(i + 4) - 0.5) * 0.2)); p.y += age * 0.35; p.x += Math.sin(age * 3 + i) * 0.04; m.position.copy(p); m.scale.setScalar(0.6 + age * 0.9); smokeM.opacity = 0.45; });
    // flashover sparks over the skin
    const fo = o.fx === 'flashover' && s.form === 'xray' ? clamp((t - T_FLASH + 0.1) * 3) : 0;
    sparks.forEach((p, i) => { p.visible = fo > 0; if (!p.visible) return; const paths = skinPaths(XF.human), k = ((t - T_FLASH) * 1.6 + hash(i)) % 1; p.position.copy(along(paths[i % 4], k)); p.scale.setScalar(1.2 + 1.4 * hash(i + 7)); });
    // host
    const p0 = drag(act, t), pz = alive(addPose(p0, { spine: [-6 * hit, 0, 0], head: [-6 * hit, 0, 0], lid: -0.4 * hit, squash: 0.05 * hit }), t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX - 0.03 * hit, 0, 0);
    // camera
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0) + 0.9 * hit;
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + 0.18 * hit + s.xray * 0.15, bloomThreshold: lerp(0.75, 0.5, s.xray), exposure: 1.02 + 0.12 * hit, ...(o.look || {}) });
    return { ...s, hit };
  }
  const flash2d = (k) => { if (k > 0.02) { ctx.fillStyle = `rgba(225,238,255,${Math.min(0.16, k * 0.16)})`; ctx.fillRect(0, 0, W, H); } };
  const WIDE = (k) => ({ pos: lerpV(V3(0.03, 1.02, 4.45), V3(0.06, 1.0, 4.1), k), at: V3(0.04, 0.9, 0), focus: V3(0.04, 0.9, 0.05), look: { aperture: 0.0016 } });
  const strikeNo = (t, list) => list.filter((x) => x <= t).length;

  // 1 · hook: struck 7 times in 3 seconds, and lived
  add({ id: 'S00', at: 0, note: 'storm two-shot: lightning strikes Blip (park ranger hat) 7 times, counter 1→7, host ducks; on "lived" Blip gives a smoking thumbs up', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)) }); blit(); flash2d(s.hit);
    const n = strikeNo(t, HOOK); pill('STRUCK BY LIGHTNING', 540, 300, 1, '#FFFFFF', 'rgba(190,16,24,0.95)', 58);
    if (n > 0) pill(`${n} TIME${n > 1 ? 'S' : ''}`, 540, 420, (1 + 0.12 * imp(t - HOOK[n - 1], 8)), '#111', YEL, 96);
    if (t > Wd('lived', 0) - 0.05) pill('…AND LIVED', 540, 1150, popIn(t - Wd('lived', 0) + 0.05), GRN, DARK, 80);
  } });

  // 2 · the question
  add({ id: 'S01', at: cut(1), note: 'two-shot: host shrugs "so what does lightning do to you?"; Blip still smoking', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)) }); blit(); flash2d(s.hit);
    pill('WHAT DOES IT DO TO YOU?', 540, 330, popIn(t - L(1) - 0.1), '#111', YEL, 60);
  } });

  // 3 · hotter than the sun
  add({ id: 'S02', at: cut(2), note: 'two-shot: one more strike; temperature pills: bolt 50,000°F vs sun surface 10,000°F', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)) }); blit(); flash2d(s.hit);
    if (t > T_HOT - 0.1) { const v = Math.round(50000 * eo(seg(t, T_HOT - 0.1, T_HOT + 0.6)) / 100) * 100; pill(`⚡ ${v.toLocaleString('en-US')}°F`, 540, 330, popIn(t - T_HOT + 0.1), '#111', YEL, 84); }
    if (t > T_SUN - 0.15) { pill('☀ SUN SURFACE  10,000°F', 540, 470, popIn(t - T_SUN + 0.15), '#FFFFFF', DARK, 50); pill('5× HOTTER', 540, 1150, popIn(t - T_SUN), RED, DARK, 84); }
  } });

  // 4 · the flashover
  add({ id: 'S03', at: cut(3), note: 'closer two-shot: "so fast"; Blip goes x-ray and bright sparks race over the OUTSIDE of his body, not through it', draw(lt, d, t, blit) {
    const s = show(t, { fx: 'flashover', pos: lerpV(V3(0.2, 0.98, 3.45), V3(0.24, 0.96, 3.05), eio(lt / d)), at: V3(0.18, 0.86, 0), focus: V3(BX, 0.86, BZ), flashK: 0.4, storm: 0.6 }); blit();
    if (s.form === 'xray') { const [x, y] = screen(XF.human.arm.R.el.localToWorld(V3(0.05, -0.1, 0)), cam); label('OVER THE SKIN', 820, 560, x, y, eob(seg(t, T_FLASH, T_FLASH + 0.3))); }
    if (t > T_THRU - 0.1) pill('NOT THROUGH YOU', 540, 1150, popIn(t - T_THRU + 0.1), GRN, DARK, 70);
  } });
  cue(T_FLASH, 'zip', { gain: 0.8 }); cue(T_FLASH + 0.05, 'sparkle', { dur: 1.6, gain: 0.7 });

  // 5 · 90% survive
  add({ id: 'S04', at: cut(4), note: 'two-shot, Blip a person again; host points at the viewer; ten people icons, nine go green: "90% SURVIVE"', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), flashK: 0.4 }); blit();
    people(t, Wd('ninety', 4) - 0.1, 153, 250); if (t > Wd('survive', 4) - 0.1) pill('90% SURVIVE', 540, 1150, popIn(t - Wd('survive', 4) + 0.1), GRN, DARK, 84);
  } });
  for (let i = 0; i < 10; i++) cue(Wd('ninety', 4) - 0.1 + i * 0.07, 'pop', { gain: 0.3 });

  // 6 · the heart stops
  add({ id: 'S05', at: cut(5), note: 'x-ray chest close: heart beating; on "shock" a bolt of sparks hits it; on "stop" it freezes and goes grey; ECG flatlines', draw(lt, d, t, blit) {
    const k = eio(lt / d), s = show(t, { fx: 'heart', flashK: 0.25, noBolt: true, aim: () => { const c0 = XF.human.spine.localToWorld(V3(0.025, 0.36, 0.03)); return { pos: lerpV(c0.clone().add(V3(0.18, 0.08, 0.85)), c0.clone().add(V3(0.1, 0.05, 0.64)), k), at: c0, focus: c0 }; }, look: { aperture: 0.0016 } }); blit(); flash2d(s.hit * 0.8);
    const [x, y] = screen(XF.human.spine.localToWorld(V3(0.03, 0.38, 0.07)), cam); label('HEART', 800, 520, x, y, eob(seg(t, Wd('heart', 5) - 0.15, Wd('heart', 5) + 0.15)));
    if (s.hit > 0.05) { ctx.save(); ctx.strokeStyle = '#E6F1FF'; ctx.lineWidth = 7; ctx.shadowColor = '#7FB8FF'; ctx.shadowBlur = 24; for (let i = 0; i < 7; i++) { ctx.beginPath(); let px = x, py = y; ctx.moveTo(px, py); const a = i / 7 * 6.283 + hash(Math.floor(t * 20) + i); for (let j = 0; j < 5; j++) { px += Math.cos(a + (hash(i * 9 + j + Math.floor(t * 30)) - 0.5)) * 40; py += Math.sin(a + (hash(i * 7 + j) - 0.5)) * 40; ctx.lineTo(px, py); } ctx.globalAlpha = s.hit; ctx.stroke(); } ctx.restore(); }
    ecg(t, T_STOP, 190, 1150, 700, 120, eo(seg(t, L(5), L(5) + 0.3)));
    if (t > T_STOP) pill('HEART STOPPED', 540, 360, popIn(t - T_STOP) * (1 + 0.04 * Math.sin(t * 9)), '#FFFFFF', 'rgba(170,16,24,0.92)', 66);
  } });
  cue(T_STOP, 'alarm', { dur: Le(5) - T_STOP + 0.1, gain: 0.3 });

  // 7 · Lichtenberg figures
  add({ id: 'S06', at: cut(6), note: 'closer on Blip (person) and the host: a red fern pattern grows across his chest and arm on "these"; "LICHTENBERG FIGURES"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.22, 1.0, 3.3), V3(0.26, 0.98, 2.95), eio(lt / d)), at: V3(0.16, 0.9, 0), focus: V3(BX, 0.9, BZ), flashK: 0.35, storm: 0.45 }); blit();
    const k = eo(seg(t, T_FERN - 0.1, T_FERN + 1.4));
    if (k > 0) { const [x, y] = screen(HH.spine.localToWorld(V3(0.14, 0.4, 0.12)), cam), [x2, y2] = screen(HH.arm.R.el.localToWorld(V3(0, 0.05, 0.05)), cam);
      ctx.save(); ctx.strokeStyle = 'rgba(255,92,112,0.9)'; ctx.shadowColor = '#FF2040'; ctx.shadowBlur = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      fern(x, y, Math.atan2(y2 - y, x2 - x), Math.hypot(x2 - x, y2 - y) * 1.6, k, 0, 3); fern(x, y, Math.PI * 0.62, 150, k * 0.9, 1, 11); ctx.restore(); }
    if (t > T_LICH - 0.1) pill('LICHTENBERG FIGURES', 540, 330, popIn(t - T_LICH + 0.1), '#111', YEL, 60);
    if (t > T_LICH + 0.6) pill('FADE IN A DAY OR TWO', 540, 1150, popIn(t - T_LICH - 0.6), '#FFFFFF', DARK, 56);
  } });
  cue(T_FERN, 'sizzle', { dur: 1.2, gain: 0.6 }); cue(T_LICH, 'pop');

  // 8 · Roy Sullivan, struck 7 times (loops back into the hook)
  add({ id: 'S07', at: cut(7), note: 'two-shot: "ROY SULLIVAN · PARK RANGER · 1942–1977"; on "seven times" the strikes come again 1→7', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)) }); blit(); flash2d(s.hit);
    pill('ROY SULLIVAN', 540, 300, popIn(t - T_ROY), '#111', YEL, 84); pill('PARK RANGER · 1942–1977', 540, 430, popIn(t - T_ROY - 0.3), '#FFFFFF', DARK, 46);
    const n = strikeNo(t, END); if (n > 0) pill(`STRUCK ${n}×`, 540, 1150, 1 + 0.12 * imp(t - END[n - 1], 8), n === 7 ? RED : '#FFFFFF', DARK, 86);
  } });
  cue(T_ROY, 'pop');

  return { shots: S, cues: CUES };
}
