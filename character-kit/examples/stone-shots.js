// HOW DOCTORS SMASH A KIDNEY STONE WITHOUT CUTTING YOU (Body Glitch, inside-the-body + real procedure format).
// Frame 1: inside the tube from the kidney, a spiky stone is stuck, "STUCK!". Studio: Blip goes x-ray, shock-wave rings
// converge on his kidney from outside. Inside: waves crack the stone, it shatters into sand, the grains get flushed out.
// Twist: a model kidney on a roller coaster passed small stones. Blip pops back: "Would you ride one?" + follow.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Le, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host } from './core/host.js';
import { Shifter } from './core/shift.js';
import { studio } from './core/studio.js';
import { vessel } from './core/sets.js';
import { noise3 } from './core/sdf.js';
import { popIn, track, drag, alive, mouthFor, breathe as hostBreathe } from './core/motion.js';
import { pill, label } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const YEL = '#FFD43B', RED = '#FF3B3B', GRN = '#4BE38A', DARK = 'rgba(12,14,20,0.85)';
const imp = (x, d = 7) => (x < 0 ? 0 : x < 0.03 ? x / 0.03 : Math.exp(-(x - 0.03) * d));
function bigText(text, y, a, col, size = 200, sc = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.translate(540, y); ctx.scale(sc, sc); ctx.font = `900 ${size}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = size * 0.12; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 40; ctx.fillText(text, 0, 0); ctx.restore();
}
function vignette(a, col = '255,30,30') { if (a <= 0) return; ctx.save(); const g = ctx.createRadialGradient(540, 960, 300, 540, 960, 1150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(${col},${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.05);
  const cam = camera(40);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.78, vignette: 0.5, warm: 0.04, exposure: 1.02 };

  // ── times ─────────────────────────────────────────────────────────────────
  const T_STUCK = Wd('stuck', 0), T_BRUTAL = Wd('brutal', 0), T_CUT = Wd('cut', 0);
  const T_JAM = Wd('jammed', 1), T_KID = Wd('kidney', 1);
  const T_SHOCK = Wd('shock', 2), T_OUT = Wd('outside', 2);
  const T_CRACK = Wd('cracks', 3);
  const T_SHAT = Wd('shatters', 4), T_SAND = Wd('sand', 4);
  const T_PEE = Wd('pee', 5);
  const T_TWIST = Wd('twist', 6), T_COAST = Wd('coaster', 6), T_PASS = Wd('pass', 6);
  const T_RIDE = Wd('ride', 7), T_BELOW = Wd('below', 7);

  // ── inside the ureter ─────────────────────────────────────────────────────
  const V = vessel(E), ZP = -7.5;
  V.scene.background = new THREE.Color('#1E0A06'); V.scene.fog.color.set('#2A120A');
  V.scene.traverse((o) => {
    if (o.isMesh && !o.isInstancedMesh && o.material && o.material.side === THREE.BackSide) { o.material.color.set('#C46A5A'); o.material.emissive.set('#4A1A10'); o.material.emissiveIntensity = 0.45; }
    if (o.isInstancedMesh && o.geometry.type === 'LatheGeometry') o.visible = false;                     // no blood cells in here
    if (o.isInstancedMesh && o.geometry.type === 'SphereGeometry') { o.material.color.set('#F2D27A'); o.material.emissive.set('#8A6A1A'); o.material.opacity = 0.35; }   // urine specks
  });
  // the stone: spiky crystal lump
  const sg = new THREE.IcosahedronGeometry(1.05, 5); { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)), n = 1 + 0.22 * noise3(v.x * 2.4, v.y * 2.4, v.z * 2.4) + 0.12 * Math.max(0, noise3(v.x * 7, v.y * 7, v.z * 7)); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y * 0.92, v.z); } sg.computeVertexNormals(); }
  const stoneM = new THREE.MeshPhysicalMaterial({ color: '#C9A266', roughness: 0.85, clearcoat: 0.3, emissive: '#3A2408', emissiveIntensity: 0.2, flatShading: true });
  const stone = new THREE.Mesh(sg, stoneM); stone.position.set(0, -0.05, ZP); V.scene.add(stone);
  // glowing cracks: a slightly larger wire shell that brightens as it cracks
  const crackM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE6A0').multiplyScalar(2), wireframe: true, transparent: true, opacity: 0, depthWrite: false });
  const cracks = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), crackM); stone.add(cracks);
  // shock waves: blue rings converging on the stone
  const waveM = [], waves = [];
  for (let i = 0; i < 4; i++) { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color('#6FD3FF').multiplyScalar(1.8), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }); const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 64), m); V.scene.add(r); waves.push(r); waveM.push(m); }
  // sand: fragments
  const NF = 160, frag = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 0), stoneM, NF), fseeds = [];
  for (let i = 0; i < NF; i++) { const d = V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(); fseeds.push([d, 0.3 + Math.random() * 0.9, 0.35 + Math.random() * 0.9, Math.random() * 6]); }
  frag.visible = false; V.scene.add(frag);
  const vcam = camera(42), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), EU = new THREE.Euler(), SC = V3(1, 1, 1);
  const wavesOn = (t) => t > L(3) - 0.05 && t < T_SHAT + 0.1;
  const crackK = (t) => eio(seg(t, L(3), T_SHAT));
  function showV(t, o) {
    const shat = t > T_SHAT, ck = crackK(t);
    // impact pulses every 0.42 s while waves run
    const ph = wavesOn(t) ? ((t - L(3)) / 0.42) % 1 : 0, hit = wavesOn(t) ? imp(ph > 0.8 ? (ph - 0.8) * 0.42 : 1, 9) : 0;
    stone.visible = !shat; stone.scale.setScalar(1 + 0.04 * hit); stone.position.x = Math.sin(t * 61) * 0.03 * hit; stone.rotation.set(0.2 + t * 0.05, t * 0.08, 0);
    crackM.opacity = ck * (0.35 + 0.6 * hit); stoneM.emissiveIntensity = 0.2 + 0.5 * hit * ck;
    waves.forEach((w, i) => { const p = wavesOn(t) ? (((t - L(3)) / 0.42) + i * 0.25) % 1 : 0; w.visible = wavesOn(t); w.position.set(0, -0.05, ZP + 0.2); w.scale.setScalar(lerp(1.55, 0.9, p)); waveM[i].opacity = wavesOn(t) ? Math.sin(p * Math.PI) * 0.9 : 0; });
    frag.visible = shat;
    if (shat) { const ft = t - T_SHAT, flush = Math.max(0, t - (T_PEE - 0.2));
      fseeds.forEach(([d, sp, sz, sr], i) => { const out = 1 - Math.exp(-ft * 4), r = sp * out; const p = V3(d.x * r * 1.2, d.y * r * 1.0, d.z * r * 0.8 + ZP - flush * (2.5 + sp * 3) - flush * flush * 3); p.y += Math.sin(t * 2 + sr) * 0.05; EU.set(sr + t * 2, sr * 2 + t * 1.5, 0); Q.setFromEuler(EU); SC.setScalar(sz); M4.compose(p, Q, SC); frag.setMatrixAt(i, M4); });
      frag.instanceMatrix.needsUpdate = true; }
    V.update(t * (t > T_PEE - 0.2 ? 1.6 : 0.35), 0, 0.6, 0);
    if (o.aim) Object.assign(o, o.aim());
    vcam.position.copy(o.pos); vcam.lookAt(o.at);
    E.render(V.scene, vcam, { ...LOOK, focus: o.pos.distanceTo(o.at), aperture: 0.0016, bloom: 0.32 + 0.25 * hit, bloomThreshold: 0.82, exposure: 0.95 });
    return hit;
  }

  // ── studio (Blip + host) ──────────────────────────────────────────────────
  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.3, BZ = 0.12, XF = blip.forms.xray, XH = XF.human;
  const PLAN = [{ t: L(2) + 0.25, form: 'xray', charge: 0.2 }, { t: L(6) + 0.1, form: 'human', charge: 0.15 }, { t: L(7) + 0.3, form: 'blip', charge: 0.2 }];
  Shifter.cues(PLAN, cue);
  const pathM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7FD6FF').multiplyScalar(1.6), transparent: true, depthWrite: false }), dots = [];
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), pathM); m.visible = false; ST.scene.add(m); dots.push(m); }
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.2, spine: [-6, 0, 0], head: [6, 18, 0] };
  const act = track([{ t: 0, pose: POINT }, { t: T_TWIST - 0.05, d: 0.25, pose: SHOCK }, { t: L(7) - 0.05, d: 0.3, pose: { ...POINT, smile: 1 } }]);
  function showS(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.set(0, -0.15, 0);
    const bq = { y: 0.06 * Math.abs(Math.sin(t * 6)), armR: 150 + 20 * Math.sin(t * 10), armL: 20, smile: 1, mouth: t > T_BELOW ? 0.5 : 0 };
    const s = blip.update(t, PLAN, { blip: bq }); blip.light.intensity *= 0.45; blip.flash.material.opacity *= 0.75;
    const f = blip.current, w = Math.sin(t * 2.2);
    if (s.form === 'xray') { f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gas.forEach((g) => (g.visible = false)); f.kidneys.forEach((k, i) => { k.visible = true; if (k.material && 'emissiveIntensity' in k.material) k.material.emissiveIntensity = 0.5 + (i === 0 && t > T_SHOCK ? 1.4 * Math.sin(t * 9) ** 2 : 0); });
      f.human.pose({ spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [4, 0, 20], shR: [30, 0, 30], elL: 16, elR: 30 }); }
    if (s.form === 'human') { f.human.pose({ spine: [0, w * 2, 0], head: [-4, w * 3, 0], shL: [6, 0, 14], shR: [150, 0, 30], elL: 24, elR: 30 + 20 * Math.sin(t * 9) }); f.face.set({ smile: 1.1 }); }
    blip.group.updateMatrixWorld(true);
    // shock waves: rings of glowing dots converge on the right kidney from outside the body
    const on = s.form === 'xray' && t > T_SHOCK - 0.2 && t < L(3);
    if (on) { const kc = f.kidneys[0].getWorldPosition(V3()); dots.forEach((m, i) => { const ring = i % 2, ph = ((t - T_SHOCK) * 1.6 + ring * 0.5) % 1, r = lerp(0.42, 0.02, ph), a = (i / dots.length) * Math.PI * 4; m.visible = true; m.position.set(kc.x + Math.cos(a) * r, kc.y + Math.sin(a) * r, kc.z + 0.05); m.scale.setScalar(1 + ph * 1.5); }); }
    else dots.forEach((m) => (m.visible = false));
    const p0 = drag(act, t), pz = alive(p0, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0); host.group.updateMatrixWorld(true);
    ST.setMood(Math.max(s.xray * 0.8, 0.12));
    if (o.aim) Object.assign(o, o.aim());
    const pos = o.pos.clone(), shake = s.kick; pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(o.at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.at), aperture: 0.0016, bloom: LOOK.bloom + s.xray * 0.15, bloomThreshold: lerp(0.78, 0.5, s.xray) });
    return s;
  }
  const IN = (k, z0, z1, off = [0.45, 0.35]) => ({ pos: V3(off[0], off[1], lerp(z0, z1, k)), at: V3(0, 0, ZP) });
  const TWO = (k) => ({ pos: lerpV(V3(0.1, 1.0, 3.3), V3(0.14, 0.98, 3.0), k), at: V3(0.08, 0.88, 0) });
  const stoneScr = () => screen(V3(0.7, 0.6, ZP + 0.6), vcam);

  // 1 · frame 1: the stone, stuck
  add({ id: 'S00', at: 0, note: 'inside the tube from the kidney from frame 1: a spiky yellow-brown stone fills the tube, specks drift past; pulsing red vignette; "STUCK!"', draw(lt, d, t, blit) {
    showV(t, IN(eio(lt / d), 3.6, 0.6)); blit();
    vignette(0.32 + 0.25 * Math.sin(t * 7) ** 2);
    pill('🪨 KIDNEY STONE', 540, 300, popIn(t), '#FFFFFF', 'rgba(190,16,24,0.95)', 64);
    bigText('STUCK!', 560, popIn(t - T_STUCK + 0.1), RED, 150, 1 + 0.05 * Math.sin(t * 7));
    if (t > T_BRUTAL - 0.15) pill('😖 PAIN: 10/10', 540, 700, popIn(t - T_BRUTAL + 0.15), '#111', YEL, 54);
    if (t > T_CUT - 0.25) pill('NO CUTS 😱', 540, 1180, popIn(t - T_CUT + 0.25), '#111', YEL, 62);
  } });
  cue(0.05, 'heartbeat', { dur: 5.5, gain: 0.6 }); cue(T_STUCK, 'slam', { gain: 0.6 }); cue(T_CUT, 'pop');

  // 2 · jammed in the ureter
  add({ id: 'S01', at: cut(1), note: 'closer: the stone jammed against the tube wall; label KIDNEY STONE; "STUCK IN THE TUBE FROM YOUR KIDNEY"', draw(lt, d, t, blit) {
    showV(t, IN(eio(lt / d), 1.2, -0.6, [0.6, 0.45])); blit();
    vignette(0.3 + 0.2 * Math.sin(t * 7) ** 2);
    if (t > T_JAM - 0.1) { const [x, y] = stoneScr(); label('KIDNEY STONE', 300, 560, x, y, eob(seg(t, T_JAM - 0.1, T_JAM + 0.2))); }
    if (t > T_KID - 0.2) pill('JAMMED IN THE TUBE FROM YOUR KIDNEY', 540, 1180, popIn(t - T_KID + 0.2), '#FFFFFF', DARK, 46);
  } });

  // 3 · studio: shock waves from outside
  add({ id: 'S02', at: cut(2), note: 'studio two-shot: Blip flashes into x-ray; rings of blue dots converge on his glowing kidney from outside the body', draw(lt, d, t, blit) {
    const s = showS(t, TWO(eio(lt / d))); blit();
    if (t > T_SHOCK - 0.15) pill('💥 THOUSANDS OF SHOCK WAVES', 540, 300, popIn(t - T_SHOCK + 0.15), '#111', '#8FD8FF', 56);
    if (t > T_OUT - 0.15) pill('FROM OUTSIDE YOUR BODY', 540, 1180, popIn(t - T_OUT + 0.15), '#FFFFFF', DARK, 54);
  } });
  cue(T_SHOCK, 'zip', { gain: 0.6 });

  // 4 · waves crack it
  add({ id: 'S03', at: cut(3), note: 'inside: blue rings slam into the stone again and again; glowing cracks spread; it shakes on each hit', draw(lt, d, t, blit) {
    const hit = showV(t, IN(eio(lt / d), 2.4, 0.4, [0.55, 0.45])); blit();
    vignette(0.2 + 0.25 * hit, '60,160,255');
    if (t > T_CRACK - 0.1) pill('CRACK… CRACK… CRACK…', 540, 300, popIn(t - T_CRACK + 0.1) * (1 + 0.06 * hit), '#FFFFFF', DARK, 60);
  } });
  for (let tt = L(3) + 0.34; tt < L(5) - 0.6; tt += 0.42) cue(tt, 'thud', { gain: 0.45 });

  // 5 · shatters into sand
  add({ id: 'S04', at: cut(4), note: 'inside: on "shatters" the stone bursts into a cloud of tiny grains', draw(lt, d, t, blit) {
    showV(t, IN(eio(lt / d), 1.0, -0.4, [0.5, 0.4])); blit();
    vignette(0.3 * imp(t - T_SHAT, 2), '255,210,80');
    if (t > T_SHAT - 0.1) pill('💥 SHATTERED!', 540, 300, popIn(t - T_SHAT + 0.1), '#111', YEL, 70);
    if (t > T_SAND - 0.15) pill('INTO TINY GRAINS, LIKE SAND', 540, 1180, popIn(t - T_SAND + 0.15), '#FFFFFF', DARK, 52);
  } });
  cue(T_SHAT, 'slam', { gain: 0.8 }); cue(T_SHAT + 0.05, 'sparkle', { gain: 0.5 });

  // 6 · pee it out
  add({ id: 'S05', at: cut(5), note: 'inside: the grains get flushed down the tube and away; green vignette', draw(lt, d, t, blit) {
    showV(t, IN(eio(lt / d), 0.2, -1.2, [0.45, 0.35])); blit();
    vignette(0.25 * eio(seg(t, T_PEE - 0.2, T_PEE + 0.3)), '40,220,120');
    if (t > T_PEE - 0.15) pill('🚽 YOU PEE THE PIECES OUT', 540, 1180, popIn(t - T_PEE + 0.15), '#111', GRN, 56);
  } });
  cue(T_PEE, 'whoosh', { gain: 0.8 });

  // 7 · twist: roller coaster
  add({ id: 'S06', at: cut(6), note: 'studio two-shot: x-ray Blip flashes into human-Blip cheering, host shocked; "🤯 THE TWIST" "🎢 ROLLER COASTER"', draw(lt, d, t, blit) {
    const s = showS(t, TWO(eio(lt / d))); blit();
    pill('🤯 THE TWIST', 540, 300, popIn(t - T_TWIST + 0.1) * (1 + 0.05 * Math.sin(t * 12)), '#FFFFFF', 'rgba(190,16,24,0.95)', 72);
    if (t > T_COAST - 0.2) pill('🎢 RIDING A ROLLER COASTER', 540, 1100, popIn(t - T_COAST + 0.2), '#111', YEL, 54);
    if (t > T_PASS - 0.2) pill('HELPED SMALL STONES PASS (MODEL KIDNEY)', 540, 1220, popIn(t - T_PASS + 0.2), '#FFFFFF', DARK, 40);
  } });
  cue(T_TWIST, 'slam', { gain: 0.5 }); cue(T_COAST, 'whoosh', { gain: 0.6 });

  // 8 · back to Blip: would you ride? + follow
  add({ id: 'S07', at: cut(7), note: 'two-shot lowering: human-Blip pops back into little Blip waving; "WOULD YOU RIDE ONE? 🎢👇" + follow pill', draw(lt, d, t, blit) {
    const k7 = eio(seg(t, PLAN[2].t - 0.1, PLAN[2].t + 0.5)), s = showS(t, { pos: lerpV(V3(0.12, 1.0, 3.2), V3(0.14, 0.72, 2.6), k7), at: lerpV(V3(0.1, 0.88, 0), V3(0.14, 0.5, 0), k7) }); blit();
    pill('WOULD YOU RIDE ONE TO SKIP THE PAIN? 👇', 540, 300, popIn(t - L(7)), '#FFFFFF', 'rgba(190,16,24,0.95)', 44);
    if (t > T_RIDE) { pill('✅ YES', 340, 1100, popIn(t - T_RIDE), '#111', GRN, 64); pill('❌ NO WAY', 740, 1100, popIn(t - T_RIDE - 0.12), '#FFFFFF', RED, 64); }
    if (t > T.dur - 1.6) pill('FOLLOW FOR DAILY GLITCHES 💙', 540, 1240, popIn(t - T.dur + 1.6), '#FFFFFF', 'rgba(23,169,201,0.95)', 44);
  } });
  cue(L(7), 'pop'); cue(T_BELOW, 'pop');

  return { shots: S, cues: CUES };
}
