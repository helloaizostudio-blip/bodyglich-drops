// HOW DOCTORS UNBLOCK YOUR HEART WITHOUT OPENING YOUR CHEST (Body Glitch — the format that gets millions in this niche:
// inside the body from frame 1 + a real medical procedure, step by step).
// Frame 1: inside a red coronary artery, blood cells crawl toward a yellow plaque wall that almost seals it; "90% BLOCKED".
// Then: the plaque; studio: Blip flashes into x-ray and a glowing catheter path runs wrist → heart; back inside: the
// catheter arrives, the balloon inflates, the plaque is crushed and blood rushes through; the stent stays; twist: you're
// awake and go home next day; Blip pops back: "Would you watch your own surgery?" + follow.
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
  const T_BLOCK = Wd('blocked', 0), T_OPEN = Wd('open', 0), T_CUT = Wd('cutting', 0);
  const T_PLAQ = Wd('plaque', 1), T_BARE = Wd('barely', 1);
  const T_WRIST = Wd('wrist', 2), T_TUBE = Wd('tube', 2), T_HEART = Wd('heart', 2);
  const T_BALL = Wd('balloon', 3), T_INFL = Wd('inflate', 3);
  const T_CRUSH = Wd('crushes', 4), T_RUSH = Wd('rushes', 4);
  const T_STENT = Wd('stent', 5), T_KEEP = Wd('open', 5);
  const T_TWIST = Wd('twist', 6), T_AWAKE = Wd('awake', 6), T_HOME = Wd('home', 6);
  const T_WATCH = Wd('watch', 7), T_BELOW = Wd('below', 7);
  const inVessel = (t) => t < L(2) - 0.05 || (t > L(3) - 0.05 && t < L(6) - 0.05);

  // ── inside the artery ─────────────────────────────────────────────────────
  const V = vessel(E), ZP = -7.5;
  const prof = []; for (let i = 0; i <= 40; i++) { const y = -1.9 + 3.8 * i / 40, b = Math.cos(Math.min(1, Math.abs(y) / 1.9) * Math.PI / 2) ** 2; prof.push(new THREE.Vector2(1.8 - (1.8 - 0.36) * b, y)); }
  const plaqGeo = new THREE.LatheGeometry(prof, 72); { const p = plaqGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z), n = 1 + 0.12 * noise3(x * 2.2, y * 2.2, z * 2.2); p.setXYZ(i, x * n, y, z * n); } plaqGeo.computeVertexNormals(); }
  const plaqM = new THREE.MeshPhysicalMaterial({ color: '#D6A03E', roughness: 0.5, clearcoat: 0.5, emissive: '#5A3A08', emissiveIntensity: 0.18, side: THREE.DoubleSide });
  const plaque = new THREE.Mesh(plaqGeo, plaqM); plaque.rotation.x = Math.PI / 2; plaque.position.z = ZP; V.scene.add(plaque);
  const steel = new THREE.MeshStandardMaterial({ color: '#C9D1DB', metalness: 0.85, roughness: 0.25 });
  const cath = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1, 16), steel); cath.rotation.x = Math.PI / 2; V.scene.add(cath);
  const ballM = new THREE.MeshPhysicalMaterial({ color: '#1E88E5', roughness: 0.25, transparent: true, opacity: 0.62, emissive: '#0D47A1', emissiveIntensity: 0.25, depthWrite: false });
  const balloon = new THREE.Mesh(new THREE.CapsuleGeometry(1, 2.6, 8, 24), ballM); balloon.rotation.x = Math.PI / 2; V.scene.add(balloon);
  const stentM = new THREE.MeshStandardMaterial({ color: '#E8EEF5', metalness: 0.9, roughness: 0.2, wireframe: true, emissive: '#C8D8EA', emissiveIntensity: 0.7 });
  const stent = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3.0, 18, 8, true), stentM); stent.rotation.x = Math.PI / 2; stent.position.z = ZP; V.scene.add(stent);
  const vcam = camera(42);
  // procedure state over time
  const tipZ = (t) => (t < L(3) - 0.05 ? 4 : lerp(1.5, ZP, eio(seg(t, L(3), T_INFL - 0.1))));
  const inflK = (t) => (t < T_INFL - 0.1 ? 0 : t < L(5) + 0.4 ? eob(seg(t, T_INFL - 0.1, T_INFL + 0.6)) : 1 - eio(seg(t, L(5) + 0.4, L(5) + 1.0)));
  const crushK = (t) => eio(seg(t, T_INFL, T_CRUSH + 0.5));
  const outK = (t) => eio(seg(t, L(5) + 0.9, T_KEEP));                     // balloon + catheter pulled back out
  const flowT = (t) => { const a = Math.min(t, T_RUSH - 0.3) * 0.22, b = Math.max(0, t - (T_RUSH - 0.3)) * 1.25; return a + b; };

  function showV(t, o) {
    const ik = inflK(t), ck = crushK(t), ok = outK(t), r = lerp(0.07, 1.22, ik);
    plaque.scale.set(lerp(1, 3.3, ck), 1, lerp(1, 3.3, ck)); plaqM.emissiveIntensity = 0.18 + (t < T_RUSH ? 0.15 * Math.sin(t * 6) ** 2 : 0);
    const tz = tipZ(t) + ok * 14; cath.visible = t > L(3) - 0.05 && t < L(6); const back = 6; cath.scale.y = Math.max(0.01, back - tz); cath.position.set(0, -0.0, (tz + back) / 2);
    balloon.visible = cath.visible && ok < 0.95; balloon.position.z = Math.min(tz, ZP + 0.0) + (tz - ZP > 0 ? tz - ZP : 0); balloon.position.z = tz; balloon.scale.set(r, 1.25 * 0.8, r);
    stent.visible = t > T_INFL - 0.1; const sr = t < L(5) ? r * 1.02 : 1.24; stent.scale.set(sr, 1, sr); stentM.emissiveIntensity = 0.7 + (t > L(5) - 0.05 ? 0.8 * Math.sin(t * 5) ** 2 : 0);
    V.update(flowT(t), 0, 0, 0);
    if (o.aim) Object.assign(o, o.aim());
    vcam.position.copy(o.pos); vcam.lookAt(o.at);
    E.render(V.scene, vcam, { ...LOOK, focus: o.pos.distanceTo(o.at), aperture: 0.0016, bloom: 0.3, bloomThreshold: 0.85, exposure: 0.92 });
  }

  // ── studio (Blip + host) ──────────────────────────────────────────────────
  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.3, BZ = 0.12, XF = blip.forms.xray, XH = XF.human;
  const PLAN = [{ t: L(2) + 0.25, form: 'xray', charge: 0.2 }, { t: L(6) + 0.1, form: 'human', charge: 0.15 }, { t: L(7) + 0.3, form: 'blip', charge: 0.2 }];
  Shifter.cues(PLAN, cue);
  const pathM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9BE7FF').multiplyScalar(1.6), transparent: true, depthWrite: false }), dots = [];
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), pathM); m.visible = false; ST.scene.add(m); dots.push(m); }
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.2, spine: [-6, 0, 0], head: [6, 18, 0] };
  const act = track([{ t: 0, pose: POINT }, { t: T_TWIST - 0.05, d: 0.25, pose: SHOCK }, { t: L(7) - 0.05, d: 0.3, pose: { ...POINT, smile: 1 } }]);
  function showS(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.set(0, -0.15, 0);
    const bq = { y: 0.06 * Math.abs(Math.sin(t * 6)), armR: 150 + 20 * Math.sin(t * 10), armL: 20, smile: 1, mouth: t > T_BELOW ? 0.5 : 0 };
    const s = blip.update(t, PLAN, { blip: bq }); blip.light.intensity *= 0.45; blip.flash.material.opacity *= 0.75;
    const f = blip.current, w = Math.sin(t * 2.2);
    if (s.form === 'xray') { f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gas.forEach((g) => (g.visible = false)); f.kidneys.forEach((k) => (k.visible = false));
      f.human.pose({ spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [4, 0, 20], shR: [30, 0, 30], elL: 16, elR: 30 }); }
    if (s.form === 'human') { f.human.pose({ spine: [0, w * 2, 0], head: [-4, w * 3, 0], shL: [6, 0, 14], shR: [150, 0, 30], elL: 24, elR: 30 + 20 * Math.sin(t * 9) }); f.face.set({ smile: 1.1 }); }
    blip.group.updateMatrixWorld(true);
    // catheter path: wrist → elbow → shoulder → heart, drawn as it grows
    const on = s.form === 'xray' && t > T_WRIST - 0.2 && t < L(3);
    if (on) { const path = [XH.arm.R.el.localToWorld(V3(0, -0.22, 0.02)), XH.arm.R.el.getWorldPosition(V3()), XH.arm.R.sh.getWorldPosition(V3()), XH.spine.localToWorld(V3(0.0, 0.42, 0.06)), XF.heart.getWorldPosition(V3())], grow = eio(seg(t, T_WRIST, T_HEART + 0.2));
      dots.forEach((m, i) => { const u = i / (dots.length - 1); m.visible = u <= grow; if (!m.visible) return; const x = u * (path.length - 1), j = Math.min(path.length - 2, Math.floor(x)); m.position.copy(lerpV(path[j], path[j + 1], x - j)); }); }
    else dots.forEach((m) => (m.visible = false));
    if (s.form === 'xray') XF.heart.material.emissiveIntensity = 0.6 + (t > T_HEART ? 1.2 * Math.sin(t * 8) ** 2 : 0);
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
  const plaqScr = () => screen(V3(0.35, 0.3, ZP + 1.6), vcam);

  // 1 · frame 1 inside the blocked artery
  add({ id: 'S00', at: 0, note: 'inside a red coronary artery from frame 1: blood cells crawl toward a lumpy yellow plaque that almost seals it; red pulsing vignette; "90% BLOCKED"', draw(lt, d, t, blit) {
    showV(t, IN(eio(lt / d), 4.0, 1.6)); blit();
    vignette(0.3 + 0.25 * Math.sin(t * 7) ** 2);
    pill('🫀 YOUR HEART ARTERY', 540, 300, popIn(t), '#FFFFFF', 'rgba(190,16,24,0.95)', 62);
    bigText('90% BLOCKED', 560, popIn(t - T_BLOCK + 0.1), RED, 118, 1 + 0.05 * Math.sin(t * 7));
    if (t > T_CUT - 0.2) pill('NO CUTTING YOUR CHEST 😱', 540, 1180, popIn(t - T_CUT + 0.2), '#111', YEL, 58);
  } });
  cue(0.05, 'heartbeat', { dur: 6.5, gain: 0.7 }); cue(T_BLOCK, 'slam', { gain: 0.6 }); cue(T_CUT, 'pop');

  // 2 · the plaque
  add({ id: 'S01', at: cut(1), note: 'closer on the plaque: label FATTY PLAQUE; cells crawl through the tiny gap; "BLOOD CAN BARELY GET THROUGH"', draw(lt, d, t, blit) {
    showV(t, IN(eio(lt / d), 1.6, -0.6, [0.6, 0.45])); blit();
    vignette(0.3 + 0.2 * Math.sin(t * 7) ** 2);
    if (t > T_PLAQ - 0.1) { const [x, y] = plaqScr(); label('FATTY PLAQUE', 300, 560, x, y, eob(seg(t, T_PLAQ - 0.1, T_PLAQ + 0.2))); }
    if (t > T_BARE - 0.1) pill('🩸 BLOOD CAN BARELY GET THROUGH', 540, 1180, popIn(t - T_BARE + 0.1), '#FFFFFF', DARK, 52);
  } });
  cue(L(1), 'heartbeat', { dur: 4.4, gain: 0.6 });

  // 3 · studio: Blip → x-ray, catheter path wrist → heart
  add({ id: 'S02', at: cut(2), note: 'studio two-shot: Blip flashes into x-ray; a glowing dotted catheter path grows from his wrist up the arm to his heart, which pulses', draw(lt, d, t, blit) {
    const s = showS(t, TWO(eio(lt / d))); blit();
    if (t > T_WRIST - 0.1) pill('✂️ TINY CUT IN YOUR WRIST', 540, 300, popIn(t - T_WRIST + 0.1), '#111', YEL, 58);
    if (t > T_TUBE - 0.1) pill('THIN TUBE ➜ ALL THE WAY TO YOUR HEART', 540, 1180, popIn(t - T_TUBE + 0.1), '#FFFFFF', DARK, 48);
  } });
  cue(T_TUBE, 'slide', { dur: 1.6, gain: 0.5 });

  // 4 · balloon goes in and inflates
  add({ id: 'S03', at: cut(3), note: 'inside: the steel catheter slides past camera into the plaque; on "inflate" a translucent blue balloon swells inside the blockage', draw(lt, d, t, blit) {
    showV(t, IN(eio(lt / d), 3.2, 1.6, [0.55, 0.5])); blit();
    vignette(0.25, '255,30,30');
    if (t > T_BALL - 0.1) pill('🎈 A TINY BALLOON', 540, 300, popIn(t - T_BALL + 0.1), '#111', '#8FD8FF', 66);
    if (t > T_INFL - 0.1) pill('INFLATE!', 540, 1180, popIn(t - T_INFL + 0.1) * (1 + 0.1 * imp(t - T_INFL, 5)), '#FFFFFF', DARK, 76);
  } });
  cue(L(3) + 0.1, 'slide', { dur: 1.2, gain: 0.5 }); cue(T_INFL, 'inhale', { gain: 0.8 });

  // 5 · plaque crushed, blood rushes through
  add({ id: 'S04', at: cut(4), note: 'inside: the plaque is pushed flat against the wall, the lumen opens wide and blood cells rush through fast; green vignette', draw(lt, d, t, blit) {
    showV(t, IN(eio(lt / d), 1.6, -0.2, [0.5, 0.4])); blit();
    vignette(0.25 * eio(seg(t, T_RUSH - 0.3, T_RUSH + 0.3)), '40,220,120');
    if (t > T_CRUSH - 0.1) pill('💥 PLAQUE CRUSHED FLAT', 540, 300, popIn(t - T_CRUSH + 0.1), '#111', YEL, 62);
    if (t > T_RUSH - 0.15) pill('✅ BLOOD RUSHES THROUGH', 540, 1180, popIn(t - T_RUSH + 0.15), '#111', GRN, 60);
  } });
  cue(T_CRUSH, 'thud', { gain: 0.7 }); cue(T_RUSH, 'whoosh', { gain: 0.8 }); cue(T_RUSH, 'heartbeat', { dur: 3.5, gain: 0.5 });

  // 6 · the stent stays
  add({ id: 'S05', at: cut(5), note: 'inside: the balloon deflates and pulls back out; a shining silver mesh tube stays pressed against the wall; label STENT', draw(lt, d, t, blit) {
    showV(t, IN(eio(lt / d), 0.4, -2.0, [0.55, 0.45])); blit();
    if (t > T_STENT - 0.1) { const [x, y] = screen(V3(0.9, 0.7, ZP + 0.8), vcam); label('STENT', 820, 560, x, y, eob(seg(t, T_STENT - 0.1, T_STENT + 0.2))); pill('🔩 METAL MESH TUBE', 540, 300, popIn(t - T_STENT + 0.1), '#111', '#C9D1DB', 62); }
    if (t > T_KEEP - 0.1) pill('KEEPS IT OPEN', 540, 1180, popIn(t - T_KEEP + 0.1), '#111', GRN, 66);
  } });
  cue(T_STENT, 'sparkle', { gain: 0.6 });

  // 7 · twist: awake, home next day
  add({ id: 'S06', at: cut(6), note: 'studio two-shot: x-ray Blip flashes into human-Blip waving, host shocked; "🤯 THE TWIST" "YOU\'RE AWAKE 👀" "🏠 HOME NEXT DAY"', draw(lt, d, t, blit) {
    const s = showS(t, TWO(eio(lt / d))); blit();
    pill('🤯 THE TWIST', 540, 300, popIn(t - T_TWIST + 0.1) * (1 + 0.05 * Math.sin(t * 12)), '#FFFFFF', 'rgba(190,16,24,0.95)', 72);
    if (t > T_AWAKE - 0.1) pill("👀 YOU'RE AWAKE THE WHOLE TIME", 540, 1100, popIn(t - T_AWAKE + 0.1), '#111', YEL, 50);
    if (t > T_HOME - 0.1) pill('🏠 MANY GO HOME NEXT DAY', 540, 1220, popIn(t - T_HOME + 0.1), '#FFFFFF', DARK, 50);
  } });
  cue(T_TWIST, 'slam', { gain: 0.5 }); cue(T_HOME, 'pop');

  // 8 · back to Blip: would you watch? + follow
  add({ id: 'S07', at: cut(7), note: 'two-shot lowering: human-Blip pops back into little Blip waving; "WOULD YOU WATCH YOUR OWN SURGERY? 👇" + follow pill', draw(lt, d, t, blit) {
    const k7 = eio(seg(t, PLAN[2].t - 0.1, PLAN[2].t + 0.5)), s = showS(t, { pos: lerpV(V3(0.12, 1.0, 3.2), V3(0.14, 0.72, 2.6), k7), at: lerpV(V3(0.1, 0.88, 0), V3(0.14, 0.5, 0), k7) }); blit();
    pill('WOULD YOU WATCH YOUR OWN SURGERY? 👇', 540, 300, popIn(t - L(7)), '#FFFFFF', 'rgba(190,16,24,0.95)', 46);
    if (t > T_WATCH) { pill('✅ YES', 340, 1100, popIn(t - T_WATCH), '#111', GRN, 64); pill('❌ NO WAY', 740, 1100, popIn(t - T_WATCH - 0.12), '#FFFFFF', RED, 64); }
    if (t > T.dur - 1.6) pill('FOLLOW FOR DAILY GLITCHES 💙', 540, 1240, popIn(t - T.dur + 1.6), '#FFFFFF', 'rgba(23,169,201,0.95)', 44);
  } });
  cue(L(7), 'pop'); cue(T_BELOW, 'pop');

  return { shots: S, cues: CUES };
}
