// YOU'RE GLOWING RIGHT NOW (Body Glitch, new format + real Blip transformations)
// Frame 1: Blip (the little creature) in a pitch-dark room; on "dark" he transforms (full flash) into a human whose
// face glows. Then: real visible light, 1000x too weak, filmed with super-sensitive cameras (viewfinder look), chemical
// reactions in your cells (x-ray, sparkling cells), the twist (your face glows brightest), peak at 4 PM, and he
// transforms back into Blip to ask the comment question (loops into the hook).
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
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const YEL = '#FFD43B', RED = '#FF4D4D', GRN = '#4BE38A', DARK = 'rgba(12,14,20,0.85)';
const imp = (x, d = 7) => (x < 0 ? 0 : x < 0.03 ? x / 0.03 : Math.exp(-(x - 0.03) * d));

function glowAt(x, y, r, a, col = '255,226,150') {
  if (a <= 0.01) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${0.55 * a})`); g.addColorStop(0.45, `rgba(${col},${0.22 * a})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}

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
  const T_GLOW = Wd('glowing', 0), T_DARK = Wd('dark', 0), T_CANT = Wd("can't", 0);
  const T_BODY = Wd('body', 1), T_VIS = Wd('visible', 1);
  const T_THOU = Wd('thousand', 2), T_WEAK = Wd('weak', 2);
  const T_SCI = Wd('scientists', 3), T_FILM = Wd('filmed', 3), T_DARK2 = Wd('darkness', 3), T_CAM = Wd('cameras', 3);
  const T_CHEM = Wd('chemical', 4), T_CELLS = Wd('cells', 4);
  const T_TWIST = Wd('twist', 5), T_BRIGHT = Wd('brightest', 5), T_FACE = Wd('face', 5);
  const T_MOST = Wd('most', 6), T_4 = Wd('four', 6);
  const T_LIT = Wd('literally', 7), T_KNOW = Wd('know', 7), T_BELOW = Wd('below', 7);
  // Blip starts as himself; full, visible transformations (charge = default 0.24 s glow-up + flash + ring + sparks)
  const PLAN = [{ t: T_DARK, form: 'human' }, { t: L(4) + 0.15, form: 'xray' }, { t: L(5) + 0.1, form: 'human' }, { t: L(7) + 0.2, form: 'blip' }];
  Shifter.cues(PLAN, cue);

  // ── glow: the human face/skin emits light; x-ray body sparkles with reacting cells ──
  const skinMats = new Set(); HH.group.traverse((m) => { if (m.isMesh && m.material?.color && m.material !== HF.hair?.material) { const c = m.material.color; if (c.b > 0.8 && c.g > 0.8 && c.r < 0.7) skinMats.add(m.material); } });
  const sparkM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFF2B0').multiplyScalar(2.2), transparent: true, depthWrite: false }), sparks = [];
  for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), sparkM); m.visible = false; XH.spine.add(m); m.userData.p = V3((hash(i) - 0.5) * 0.24, -0.05 + hash(i + 5) * 0.55, (hash(i + 9) - 0.5) * 0.14); sparks.push(m); }

  // ── host ──────────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.2, spine: [-6, 0, 0], head: [6, 18, 0] };
  const SHRUG = { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, smile: 0.8, brow: [0.8, 0], head: [-4, 18, 6] };
  const act = track([{ t: 0, pose: SHOCK }, { t: L(1) - 0.05, d: 0.3, pose: POINT }, { t: T_WEAK - 0.05, d: 0.3, pose: SHRUG }, { t: L(3) - 0.05, d: 0.3, pose: POINT }, { t: T_TWIST - 0.05, d: 0.25, pose: SHOCK }, { t: L(6) - 0.05, d: 0.3, pose: POINT }, { t: L(7) - 0.05, d: 0.3, pose: { ...SHRUG, smile: 1 } }]);

  /** how much the room is dark (0 lit .. 1 pitch black) and how strongly the human glows (0..1, 1 = what the camera sees) */
  const darkK = (t) => (t < L(1) - 0.06 ? 1 : t < L(3) - 0.06 ? 0 : t < L(4) - 0.06 ? 1 : t < L(5) - 0.06 ? 0.7 : t < L(6) - 0.06 ? 1 : 0);
  const glowK = (t) => {
    if (t < L(1) - 0.06) return eio(seg(t, T_DARK + 0.15, T_CANT));
    if (t < L(2) - 0.06) return 0.35 * eio(seg(t, T_VIS - 0.1, T_VIS + 0.4));
    if (t < L(3) - 0.06) return 0.35 * (1 - eio(seg(t, T_THOU, T_WEAK + 0.3)));
    if (t < L(4) - 0.06) return eio(seg(t, T_FILM - 0.2, T_DARK2 + 0.2));
    if (t < L(6) - 0.06) return 1;
    if (t < L(7) - 0.06) return 0.5 + 0.5 * eio(seg(t, T_MOST, T_4 + 0.3));
    return 0;
  };

  function show(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.set(0, o.turn ?? -0.15, 0);
    const w = Math.sin(t * 2.2);
    const bq = t < T_DARK ? { y: 0.02 * Math.abs(Math.sin(t * 5)), squash: 0.05 * Math.sin(t * 10), look: [0, 0.2], armL: 30, armR: 30, smile: 0.9, glow: 2.4, lid: -0.1 }
      : { y: 0.06 * Math.abs(Math.sin(t * 6)), armR: 150 + 20 * Math.sin(t * 10), armL: 20, smile: 1, glow: 2, mouth: t > T_KNOW ? 0.4 : 0 };
    const s = blip.update(t, PLAN, { blip: bq }), f = blip.current, h = f.human;
    blip.light.intensity *= 0.45; blip.flash.material.opacity *= 0.7;          // keep the change visible but never a white-out
    if (s.form === 'human') { h.pose({ spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24 }); f.face.set({ smile: o.smile ?? 0.8, lid: o.lid || 0 }); }
    if (s.form === 'xray') { f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gas.forEach((g) => (g.visible = false)); f.kidneys.forEach((k) => (k.visible = false)); }
    // skin glow (emissive) for the human form
    const gk = glowK(t), dk = darkK(t);
    skinMats.forEach((m) => { m.emissive.set('#FFE2A0'); m.emissiveIntensity = (s.form === 'human' ? gk : 0) * (0.3 + 0.4 * dk) * (s.charge > 0 ? 1 - s.charge : 1); });
    // x-ray cells sparkle
    sparks.forEach((m, i) => { m.visible = s.form === 'xray'; if (!m.visible) return; m.position.copy(m.userData.p); const ph = (t * 1.7 + hash(i + 3)) % 1; m.scale.setScalar(Math.max(0.01, Math.sin(ph * Math.PI) * 1.6)); });
    blip.group.updateMatrixWorld(true);
    // host
    const p0 = drag(act, t), pz = alive(p0, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0); host.group.visible = !o.noHost; host.group.updateMatrixWorld(true);
    ST.setMood(Math.max(s.xray * 0.8, 0.12 + 0.85 * dk));
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + 0.25 * gk * dk + s.xray * 0.12, bloomThreshold: lerp(0.78, 0.5, Math.max(s.xray, gk * dk)), exposure: 1.02 - 0.35 * dk, ...(o.look || {}) });
    return { ...s, gk, dk };
  }
  const headW = () => (blip.current.human ? blip.current.human.head.localToWorld(V3(0, 0.12, 0.05)) : blip.group.localToWorld(V3(0, 0.35, 0)));
  const FACE = (k, d0 = 0.75, d1 = 0.6) => () => { const c = headW(); return { pos: lerpV(c.clone().add(V3(0.08, 0.0, d0)), c.clone().add(V3(0.06, 0.0, d1)), k), at: c.clone().add(V3(0, -0.06, 0)), focus: c, look: { aperture: 0.0012 } }; };
  const TWO = (k) => ({ pos: lerpV(V3(0.1, 1.0, 3.5), V3(0.14, 0.98, 3.15), k), at: V3(0.08, 0.88, 0), focus: V3(0.12, 0.88, BZ), look: { aperture: 0.0016 } });
  const faceGlow2D = (s, k = 1) => { if (!blip.current.human || s.form !== 'human') return; const head = blip.current.human.head, c = screen(head.localToWorld(V3(0, 0.13, 0.08)), cam), e = screen(head.localToWorld(V3(0.1, 0.13, 0.08)), cam), r = Math.abs(e[0] - c[0]) * 2.6;
    const a = s.gk * (0.35 + 0.65 * s.dk) * k; glowAt(c[0], c[1], r, a); for (const sx of [-1, 1]) { const ch = screen(head.localToWorld(V3(sx * 0.06, 0.1, 0.1)), cam); glowAt(ch[0], ch[1], r * 0.45, a * 0.9, '255,240,190'); } };

  // 1 · hook: Blip in the dark → transforms → glowing human face
  add({ id: 'S00', at: 0, note: 'pitch-dark close-up: little Blip bouncing, antenna glowing; on "dark" he charges and transforms (flash, ring, sparks) into a human (with hair) whose face glows warm gold; "YOU\'RE GLOWING RIGHT NOW 👀"', draw(lt, d, t, blit) {
    const s = show(t, { aim: () => { const c = headW(); const p = t < T_DARK ? blip.group.localToWorld(V3(0, 0.38, 0)) : c; return { pos: p.clone().add(V3(0.05, 0.02, t < T_DARK ? 1.75 : 1.0)), at: p.clone().add(V3(0, -0.08, 0)), focus: p, look: { aperture: 0.0012 } }; }, noHost: true }); blit();
    faceGlow2D(s);
    pill("YOU'RE GLOWING RIGHT NOW 👀", 540, 300, 1 + 0.03 * Math.sin(t * 10), '#FFFFFF', 'rgba(190,16,24,0.95)', 60);
    if (t > T_CANT - 0.1) pill('YOU JUST CAN\'T SEE IT', 540, 1180, popIn(t - T_CANT + 0.1), '#111', YEL, 62);
  } });
  cue(T_CANT, 'sparkle', { gain: 0.5 });

  // 2 · real visible light
  add({ id: 'S01', at: cut(1), note: 'lights on, two-shot: the host points at human-Blip, a soft gold glow appears on his skin: "💡 REAL VISIBLE LIGHT"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)) }); blit(); faceGlow2D(s, 1.4);
    if (t > T_VIS - 0.1) pill('💡 REAL, VISIBLE LIGHT', 540, 300, popIn(t - T_VIS + 0.1), '#111', YEL, 66);
  } });
  cue(T_VIS, 'pop');

  // 3 · 1000x too weak
  add({ id: 'S02', at: cut(2), note: 'two-shot: the glow fades away; an eye pill and "1,000× TOO WEAK"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(1 - 0.5 * eio(lt / d)) }); blit(); faceGlow2D(s, 1.4);
    if (t > T_THOU - 0.15) pill('1,000× TOO WEAK', 540, 300, popIn(t - T_THOU + 0.15), '#FFFFFF', RED, 80);
    if (t > T_WEAK - 0.1) pill('👁️ YOUR EYES CAN\'T SEE IT', 540, 1180, popIn(t - T_WEAK + 0.1), '#FFFFFF', DARK, 58);
  } });
  cue(T_THOU, 'thud', { gain: 0.5 });

  // 4 · filmed in total darkness with super-sensitive cameras
  add({ id: 'S03', at: cut(3), note: 'lights out; camera viewfinder overlay (REC, brackets, grain, mono green-gold): human-Blip\'s face slowly glows into view', draw(lt, d, t, blit) {
    const s = show(t, { aim: FACE(eio(lt / d), 1.0, 0.8), noHost: true }); blit(); faceGlow2D(s, 1.2);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(190,230,170,1)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.12; for (let i = 0; i < 900; i++) { const x = hash(i + Math.floor(t * 30) * 7) * W, y = hash(i * 3 + Math.floor(t * 30)) * H; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, 3, 3); } ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 8; const m = 90, k = 120; for (const [x, y, sx, sy] of [[m, 480, 1, 1], [W - m, 480, -1, 1], [m, 1420, 1, -1], [W - m, 1420, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + sy * k); ctx.lineTo(x, y); ctx.lineTo(x + sx * k, y); ctx.stroke(); }
    if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#FF3B3B'; ctx.beginPath(); ctx.arc(150, 560, 20, 0, 7); ctx.fill(); } ctx.fillStyle = '#FFFFFF'; ctx.font = '900 44px Inter'; ctx.fillText('REC', 185, 575); ctx.restore();
    if (t > T_SCI - 0.1) pill('🇯🇵 SCIENTISTS FILMED IT', 540, 300, popIn(t - T_SCI + 0.1), '#FFFFFF', DARK, 58);
    if (t > T_CAM - 0.15) pill('📷 SUPER-SENSITIVE CAMERA', 540, 1180, popIn(t - T_CAM + 0.15), '#111', YEL, 56);
  } });
  cue(L(3) + 0.05, 'thud', { gain: 0.4 }); cue(T_FILM, 'tock', { gain: 0.5 });

  // 5 · chemical reactions in your cells (x-ray, sparkling)
  add({ id: 'S04', at: cut(4), note: 'two-shot, dim: human-Blip transforms into x-ray (visible flash) and his whole body sparkles with tiny gold flashes: "⚗️ CHEMICAL REACTIONS IN YOUR CELLS"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.2, 0.98, 2.7), V3(0.22, 0.96, 2.4), eio(lt / d)), at: V3(0.2, 0.85, 0), focus: V3(BX, 0.85, BZ), look: { aperture: 0.0014 } }); blit();
    if (t > T_CHEM - 0.1) pill('⚗️ CHEMICAL REACTIONS', 540, 300, popIn(t - T_CHEM + 0.1), '#111', YEL, 62);
    if (t > T_CELLS - 0.1) pill('INSIDE YOUR CELLS', 540, 1180, popIn(t - T_CELLS + 0.1), '#FFFFFF', DARK, 66);
  } });
  cue(T_CELLS, 'sparkle', { gain: 0.6 });

  // 6 · the twist: your face glows brightest
  add({ id: 'S05', at: cut(5), note: 'pitch dark, face close-up: x-ray transforms back to human; the face blazes gold, cheeks brightest: "🤯 THE TWIST" "YOUR FACE GLOWS BRIGHTEST"', draw(lt, d, t, blit) {
    const s = show(t, { aim: FACE(eio(lt / d), 0.85, 0.65), noHost: true }); blit(); faceGlow2D(s, 0.85);
    if (t > T_TWIST - 0.1) pill('🤯 THE TWIST', 540, 300, popIn(t - T_TWIST + 0.1) * (1 + 0.05 * Math.sin(t * 12)), '#FFFFFF', 'rgba(190,16,24,0.95)', 72);
    if (t > T_FACE - 0.15) pill('YOUR FACE GLOWS BRIGHTEST ✨', 540, 1180, popIn(t - T_FACE + 0.15), '#111', YEL, 54);
  } });
  cue(T_TWIST, 'slam', { gain: 0.6 }); cue(T_FACE, 'sparkle', { gain: 0.7 });

  // 7 · peak at 4 PM
  add({ id: 'S06', at: cut(6), note: 'two-shot in the lit studio: a clock pill "🕓 4 PM" and a glow meter filling to MAX; human-Blip glows a little stronger', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)) }); blit(); faceGlow2D(s, 1.5);
    if (t > T_MOST - 0.1) { const k = eio(seg(t, T_MOST, T_4 + 0.4)); ctx.save(); ctx.fillStyle = DARK; ctx.beginPath(); ctx.roundRect(190, 980, 700, 90, 45); ctx.fill(); const gr = ctx.createLinearGradient(210, 0, 870, 0); gr.addColorStop(0, '#7A5A10'); gr.addColorStop(1, '#FFE066'); ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(210, 998, Math.max(54, 660 * (0.35 + 0.65 * k)), 54, 27); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.font = '900 40px Inter'; ctx.textAlign = 'center'; ctx.fillText(k > 0.9 ? 'GLOW: MAX' : 'GLOW', 540, 1039); ctx.restore(); }
    if (t > T_4 - 0.15) pill('🕓 PEAK AT 4 PM', 540, 300, popIn(t - T_4 + 0.15), '#111', YEL, 72);
  } });
  cue(T_4, 'pop');

  // 8 · back to Blip: comment question (loops into the hook)
  add({ id: 'S07', at: cut(7), note: 'two-shot: human-Blip transforms back into little Blip (flash, ring, sparks), who bounces and waves at the viewer: "DID YOU KNOW? ✅ YES / ❌ NO"', draw(lt, d, t, blit) {
    const k7 = eio(seg(t, PLAN[3].t - 0.1, PLAN[3].t + 0.5)), s = show(t, { pos: lerpV(V3(0.1, 1.0, 3.3), V3(0.14, 0.72, 2.6), k7), at: lerpV(V3(0.08, 0.88, 0), V3(0.14, 0.5, 0), k7), focus: V3(BX, 0.5, BZ), look: { aperture: 0.0016 } }); blit(); faceGlow2D(s, 1.2);
    if (t > T_LIT - 0.1) pill("YOU'RE LITERALLY GLOWING ✨", 540, 300, popIn(t - T_LIT + 0.1), '#111', YEL, 58);
    if (t > T_KNOW - 0.15) { pill('DID YOU KNOW? 👇', 540, 1060, popIn(t - T_KNOW + 0.15), '#FFFFFF', 'rgba(190,16,24,0.95)', 66); pill('✅ YES', 340, 1200, popIn(t - T_KNOW), '#111', GRN, 60); pill('❌ NO', 740, 1200, popIn(t - T_KNOW - 0.1), '#FFFFFF', RED, 60); }
  } });
  cue(T_KNOW, 'pop'); cue(T_BELOW, 'boing', { gain: 0.4 });

  return { shots: S, cues: CUES };
}
