// YOU'RE TALLER IN THE MORNING (Body Glitch, host v2 + shape-shifting Blip)
// A height board stands next to Blip. Hook: he shrinks right now. X-ray spine: bones + squishy discs; gravity squeezes
// water out, he loses ~1 cm by night; lying down to sleep the discs soak it back up; morning he's taller again;
// in space he floats and grows 3%; back on Earth he thuds down and shrinks back (loops into the hook).
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Le, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host } from './core/host.js';
import { Shifter } from './core/shift.js';
import { studio } from './core/studio.js';
import { popIn, track, drag, alive, addPose, mouthFor, breathe as hostBreathe } from './core/motion.js';
import { pill, label } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const YEL = '#FFD43B', RED = '#FF4D4D', GRN = '#4BE38A', BLUE = '#5EC8FF', DARK = 'rgba(12,14,20,0.82)';
const imp = (x, d = 7) => (x < 0 ? 0 : x < 0.03 ? x / 0.03 : Math.exp(-(x - 0.03) * d));

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.78, vignette: 0.45, warm: 0.04, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.3, BZ = 0.12;
  const HF = blip.forms.human, XF = blip.forms.xray, HH = HF.human, XH = XF.human;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_NOW = Wd('now', 0), T_SHORT = Wd('shorter', 0), T_WOKE = Wd('woke', 0);
  const T_SPINE = Wd('spine', 1), T_BONES = Wd('bones', 1), T_SQUISH = Wd('squishy', 1);
  const T_GRAV = Wd('gravity', 2), T_SQZ = Wd('squeezes', 2), T_WATER = Wd('water', 2);
  const T_NIGHT = Wd('night', 3), T_LOSE = Wd('lose', 3), T_CM = Wd('centimeter', 3);
  const T_SLEEP = Wd('sleep', 4), T_SOAK = Wd('soak', 4);
  const T_MORN = Wd('morning', 5), T_TALL = Wd('taller', 5);
  const T_SPACE = Wd('space', 6), T_NOG = Wd('no', 6), T_ASTRO = Wd('astronauts', 6), T_3 = Wd('three', 6);
  const T_EARTH = Wd('Earth', 7), T_SHRINK = Wd('shrink', 7);
  const PLAN = [
    { t: -5, form: 'human' },
    { t: L(1) + 0.25, form: 'xray', charge: 0.02 },
    { t: L(3) - 0.08, form: 'human', charge: 0.02 },
    { t: L(4) - 0.08, form: 'xray', charge: 0.02 },
    { t: L(5) - 0.08, form: 'human', charge: 0.02 },
  ];
  Shifter.cues(PLAN.slice(1), cue);

  // ── the spine: re-stack the x-ray vertebrae with fat squishy discs between them ──
  const IG = XF.heart.parent;
  const verts = IG.children.filter((m) => m.isMesh && m.geometry.type === 'CylinderGeometry' && Math.abs(m.geometry.parameters.radiusTop - 0.018) < 1e-4).sort((a, b) => a.position.y - b.position.y);
  const vz = verts.map((v) => v.position.z);
  const discM = new THREE.MeshStandardMaterial({ color: '#5EC8FF', roughness: 0.25, emissive: '#2E9BFF', emissiveIntensity: 0.55, transparent: true, opacity: 0.95 });
  const discs = []; for (let i = 0; i < verts.length - 1; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), discM); IG.add(d); discs.push(d); }
  const VH = 0.021, DFULL = 0.016, DSQ = 0.005;
  function stackSpine(dk) {                 // dk 0 = squeezed flat, 1 = full, >1 = swollen (space)
    const dt = DSQ + (DFULL - DSQ) * dk; let y = -0.05;
    verts.forEach((v, i) => { v.scale.y = VH / 0.03; v.position.y = y + VH / 2; if (i < discs.length) { const d = discs[i]; d.position.set(0, y + VH + dt / 2, (vz[i] + vz[i + 1]) / 2); d.scale.set(0.029 + 0.006 * (1 - Math.min(1, dk)), dt / 2, 0.025 + 0.004 * (1 - Math.min(1, dk))); } y += VH + dt; });
  }
  // water drops leaving / entering the discs
  const dropM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7FDBFF').multiplyScalar(1.3), transparent: true, depthWrite: false }), drops = [];
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 8), dropM); m.visible = false; IG.add(m); drops.push(m); }
  const organs = [XF.heart, XF.stomach, ...XF.lungs, XF.gut, XF.bladder, XF.ring, ...XF.kidneys, XF.diaphragm, XF.larynx, ...XF.gas];

  // ── the height board + the red head line ──────────────────────────────────
  blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = -0.15; HH.pose({}); blip.group.updateMatrixWorld(true);
  const TOP = HH.head.localToWorld(V3(0, 0.25, 0)).y;
  const RX = BX + 0.24, RZ = BZ - 0.1;
  const boardT = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 1024; const g = c.getContext('2d'); g.fillStyle = '#F4EBD8'; g.fillRect(0, 0, 128, 1024); g.fillStyle = '#2A2A30';
    for (let i = 0; i <= 120; i++) { const y = 1024 - i * (1024 / 120), big = i % 10 === 0; g.fillRect(0, y - (big ? 2 : 1), big ? 70 : i % 5 === 0 ? 46 : 28, big ? 4 : 2); if (big && i) { g.font = 'bold 26px Inter'; g.fillText(String(i), 76, y + 9); } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.3, 0.02), new THREE.MeshStandardMaterial({ map: boardT, roughness: 0.6 })); board.position.set(RX, 0.65, RZ); board.castShadow = true; ST.scene.add(board);
  const markM = new THREE.MeshStandardMaterial({ color: '#FF3B3B', emissive: '#FF2020', emissiveIntensity: 0.8 }), mark = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.012), markM); ST.scene.add(mark);
  const ghostM = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.6 }), ghost = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.006, 0.006), ghostM); ST.scene.add(ghost);
  // bed for sleeping
  const bed = new THREE.Group(); { const mat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.42), new THREE.MeshStandardMaterial({ color: '#2B3A67', roughness: 0.8 })); mat.position.y = 0.06; const pil = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.2, 6, 12), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9 })); pil.rotation.x = Math.PI / 2; pil.position.set(0.5, 0.15, 0); bed.add(mat, pil); bed.position.set(BX + 0.45, 0, BZ); } bed.visible = false; ST.scene.add(bed);
  // astronaut helmet + stars
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 20), new THREE.MeshPhysicalMaterial({ color: '#CFEFFF', roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.35, depthWrite: false })); helmet.position.set(0, 0.15, 0); helmet.scale.setScalar(1 / 0.6); HH.head.add(helmet); helmet.visible = false;
  const starM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFFFFF').multiplyScalar(2), transparent: true }), stars = [];
  for (let i = 0; i < 70; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.006 + 0.008 * hash(i), 6, 4), starM); s.position.set((hash(i + 1) - 0.5) * 2.4, 0.1 + hash(i + 2) * 2.0, -0.6 - hash(i + 3) * 1.2); s.visible = false; ST.scene.add(s); stars.push(s); }

  // ── the host ──────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const POINTUP = { ...REST, shR: [140, -10, 30], elR: 10, head: [-10, 22, 0], smile: 0.7, brow: [0.7, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.2, spine: [-6, 0, 0], head: [-8, 18, 0] };
  const SHRUG = { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, smile: 0.8, brow: [0.8, 0], head: [-4, 18, 6] };
  const act = track([
    { t: 0, pose: POINT },
    { t: T_SHORT - 0.05, d: 0.2, pose: { ...SHOCK, smile: 0.3 } },
    { t: L(1) - 0.05, d: 0.35, pose: POINT },
    { t: L(3) - 0.05, d: 0.35, pose: { ...POINT, smile: 0.2 } },
    { t: T_CM - 0.05, d: 0.3, pose: { ...SHRUG, smile: 0.2 } },
    { t: L(5) - 0.05, d: 0.35, pose: POINT },
    { t: T_TALL - 0.05, d: 0.3, pose: { ...SHRUG, smile: 1 } },
    { t: L(6) - 0.05, d: 0.35, pose: POINTUP },
    { t: T_3 - 0.05, d: 0.25, pose: SHOCK },
    { t: L(7) - 0.05, d: 0.35, pose: POINT },
    { t: T_SHRINK - 0.05, d: 0.3, pose: SHRUG },
  ]);

  // ── body state over time ──────────────────────────────────────────────────
  const discK = (t) => {
    if (t < T_SQZ) return 1;
    if (t < L(4) - 0.08) return 1 - eio(seg(t, T_SQZ, T_WATER + 0.6));
    if (t < L(5) - 0.08) return eio(seg(t, T_SOAK - 0.2, Le(4)));
    if (t < L(6) - 0.08) return 1;
    if (t < L(7) - 0.08) return 1 + 0.4 * eio(seg(t, T_3 - 0.3, T_3 + 0.4));
    return 1;
  };
  const SQ = 0.955;     // squashed scale (exaggerated so a centimeter reads on screen)
  const tallK = (t) => {
    if (t < L(1) - 0.08) return lerp(1, SQ, eob(seg(t, T_SHORT, T_SHORT + 0.35)));
    if (t < L(3) - 0.08) return 1;
    if (t < L(4) - 0.08) return lerp(1, SQ, eio(seg(t, T_LOSE - 0.1, T_CM + 0.2)));
    if (t < L(5) - 0.08) return 1;
    if (t < L(6) - 0.08) return lerp(SQ, 1, eob(seg(t, T_TALL - 0.1, T_TALL + 0.35)));
    if (t < L(7) - 0.08) return lerp(1, 1.035, eob(seg(t, T_3 - 0.1, T_3 + 0.4)));
    return lerp(1.035, 1, eob(seg(t, T_SHRINK - 0.05, T_SHRINK + 0.35)));
  };
  const liftK = (t) => {     // float height in space
    if (t < L(6) - 0.08 || t > T_EARTH + 0.15) return 0;
    if (t > L(7) - 0.08) return 0.16 * (1 - eio(seg(t, L(7), T_EARTH + 0.15)) ** 2);
    return 0.16 * eio(seg(t, T_SPACE - 0.1, T_NOG + 0.3)) + 0.02 * Math.sin(t * 2.4);
  };
  const lying = (t) => t > L(4) - 0.08 && t < L(5) - 0.08;
  const space = (t) => t > L(6) - 0.08 && t < T_EARTH + 0.15;

  /** one frame */
  function show(t, o) {
    const lie = lying(t), sp = space(t), sy = tallK(t), sx = 1 + (1 - sy) * 0.6, lift = liftK(t);
    blip.group.rotation.set(0, o.turn ?? -0.15, 0); blip.group.scale.set(sx, sy, sx); blip.group.position.set(BX, lift, BZ);
    if (lie) { blip.group.rotation.set(0, 0, -Math.PI / 2); blip.group.scale.set(1, 1, 1); blip.group.position.set(BX - 0.08, 0.2, BZ); }
    if (sp) blip.group.rotation.z = Math.sin(t * 1.3) * 0.08;
    const s = blip.update(t, PLAN, {}), f = blip.current, h = f.human;
    if (o.flashK != null) { blip.flash.visible = false; blip.ring.material.opacity *= 0.5; f.mats.forEach((m) => { if (!m.uniforms && m.emissive) m.emissiveIntensity *= 0.25 + 0.75 * o.flashK; if (m.uniforms?.uS) m.uniforms.uS.value = 1.15 + (m.uniforms.uS.value - 1.15) * o.flashK; }); blip.light.intensity *= o.flashK; }
    if (o.noHost) blip.ring.visible = false;
    const w = Math.sin(t * 2.2);
    if (s.form === 'human') {
      let q = { spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24 }, face = { smile: 0.8 };
      if (t < L(1) - 0.08 && t > T_SHORT) { const k = clamp((t - T_SHORT) * 3); q = { spine: [6 * k, 0, 0], head: [18 * k, 0, 0], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24 }; face = { smile: lerp(0.8, -0.5, k), look: [0, -0.5 * k] }; }
      else if (t > L(3) - 0.08 && t < L(4) - 0.08) { const k = clamp((t - T_LOSE) * 2); q = { spine: [10 * k, 0, 0], head: [10 * k, 0, 0], shL: [10, 0, 10], shR: [10, 0, 10], elL: 30, elR: 30, knL: 8 * k, knR: 8 * k }; face = { lid: 0.45 * k, smile: -0.2 }; }
      else if (t > L(5) - 0.08 && t < L(6) - 0.08) { const k = eob(seg(t, T_TALL - 0.2, T_TALL + 0.4)); q = { spine: [-6 * k, w * 2, 0], head: [-14 * k, 0, 0], shL: [6 + 150 * k, 0, 14], shR: [6 + 150 * k, 0, 14], elL: 24 - 14 * k, elR: 24 - 14 * k }; face = { smile: 0.8 + 0.4 * k, lid: 0.2 * (1 - k) }; }
      else if (sp) { q = { spine: [0, w * 4, 0], head: [-8, w * 6, 0], shL: [20 + 30 * w, 0, 50], shR: [20 - 30 * w, 0, 50], elL: 30, elR: 30, hipL: [14 + 10 * w, 0, 8], hipR: [8 - 10 * w, 0, 8], knL: 24, knR: 30 }; face = { smile: 1.1 }; }
      else if (t > T_EARTH + 0.15) { const k = clamp((t - T_SHRINK) * 3); q = { spine: [4 * k, 0, 0], head: [10 * k, 0, 0], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24, knL: 10 * imp(t - T_EARTH - 0.15, 5), knR: 10 * imp(t - T_EARTH - 0.15, 5) }; face = { smile: lerp(1, -0.3, k) }; }
      h.pose(q); f.face.set(face);
    }
    if (s.form === 'xray') {
      f.diaG.visible = false; organs.forEach((m) => (m.visible = false));
      h.pose(lie ? { spine: [0, 0, 0], head: [-6, 0, 0], shL: [0, 0, 6], shR: [0, 0, 6], elL: 6, elR: 6 } : { spine: [0, 0, 0], head: [-3, w * 3, 0], shL: [4, 0, 20], shR: [4, 0, 20], elL: 16, elR: 16 });
      if (lie) f.face.set({ lid: 1 });
    }
    if (lie && s.form === 'human') { h.pose({ head: [-6, 0, 0], shL: [0, 0, 6], shR: [0, 0, 6], elL: 6, elR: 6 }); f.face.set({ lid: 1, smile: 0.6 }); }
    helmet.visible = sp && s.form === 'human';
    // spine discs + water drops
    const dk = discK(t); stackSpine(dk);
    const squeezing = t > T_SQZ && t < L(3) - 0.08, soaking = t > T_SOAK - 0.2 && t < L(5) - 0.08;
    drops.forEach((m, i) => {
      const di = i % discs.length, d = discs[di], side = i % 2 ? 1 : -1, ph = (t * 0.9 + hash(i)) % 1;
      m.visible = s.form === 'xray' && (squeezing || soaking); if (!m.visible) return;
      const r = squeezing ? 0.03 + ph * 0.09 : 0.12 - ph * 0.09;
      m.position.set(side * r, d.position.y + (hash(i + 5) - 0.5) * 0.01 - (squeezing ? ph * ph * 0.03 : 0), d.position.z + (hash(i + 7) - 0.5) * 0.03); m.scale.setScalar(squeezing ? 1 - ph * 0.5 : 0.5 + ph * 0.5);
    });
    dropM.opacity = 0.95;
    blip.group.updateMatrixWorld(true);
    // board, head line, bed, stars
    board.visible = !lie; bed.visible = lie;
    const top = TOP * sy + lift, lineOn = !lie && !sp && s.form === 'human';
    mark.visible = lineOn || (sp && s.form === 'human'); mark.position.set(RX - 0.14, top, RZ + 0.03);
    ghost.visible = mark.visible && Math.abs(sy - 1) > 0.004 && !sp; ghost.position.set(RX - 0.14, TOP, RZ + 0.03);
    stars.forEach((m, i) => { m.visible = sp; if (sp) m.scale.setScalar(0.6 + 0.4 * Math.sin(t * 3 + i)); });
    starM.opacity = clamp((t - L(6) + 0.08) * 4);
    // host
    const p0 = drag(act, t), pz = alive(p0, t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX, 0, 0); host.group.visible = !o.noHost; host.group.updateMatrixWorld(true);
    ST.setMood(Math.max(s.xray * (o.xk ?? 1), o.mood ?? 0.15));
    // camera
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0);
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + s.xray * 0.15, bloomThreshold: lerp(0.78, 0.5, s.xray), ...(o.look || {}) });
    return { ...s, sy, top };
  }
  const WIDE = (k) => ({ pos: lerpV(V3(0.06, 1.02, 4.45), V3(0.09, 1.0, 4.1), k), at: V3(0.07, 0.9, 0), focus: V3(0.07, 0.9, 0.05), look: { aperture: 0.0016 } });
  const TWO = (k) => ({ pos: lerpV(V3(0.12, 1.0, 3.5), V3(0.16, 0.98, 3.15), k), at: V3(0.1, 0.88, 0), focus: V3(0.14, 0.88, BZ), look: { aperture: 0.0016 } });
  const spineW = (y = 0.05) => IG.localToWorld(V3(0, y, -0.07));
  const SPINE = (k, y = 0.06, d0 = 0.85, d1 = 0.62) => { const c = spineW(y); return { pos: lerpV(c.clone().add(V3(0.32, 0.05, d0)), c.clone().add(V3(0.24, 0.04, d1)), k), at: c, focus: c, look: { aperture: 0.0011 } }; };
  const yLine = (top) => screen(V3(RX - 0.14, top, RZ + 0.03), cam)[1];

  // 1 · hook: you're shorter right now
  add({ id: 'S00', at: 0, note: 'wide two-shot with the height board: Blip stands tall, on "shorter" he squashes down; the red head line drops below a white ghost line; "−1 CM"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), flashK: 0.2 }); blit();
    pill("YOU'RE SHORTER RIGHT NOW", 540, 300, 1, '#FFFFFF', 'rgba(190,16,24,0.95)', 60);
    if (t > T_SHORT + 0.15) { const [x, y] = screen(V3(RX + 0.06, s.top, RZ), cam); pill('−1 CM', Math.min(960, x + 90), y, popIn(t - T_SHORT - 0.15), '#FFFFFF', RED, 58); }
    if (t > T_WOKE - 0.1) pill('THAN THIS MORNING', 540, 1150, popIn(t - T_WOKE + 0.1), '#111', YEL, 62);
  } });
  cue(T_SHORT, 'slide', { dur: 0.35, gain: 0.7 }); cue(T_SHORT + 0.3, 'thud', { gain: 0.5 }); cue(T_WOKE, 'pop');

  // 2 · spine = bones + squishy discs
  add({ id: 'S01', at: cut(1), note: 'two-shot, then he turns x-ray and the camera pushes in on the lower spine: white bones with fat blue squishy discs between; labels BONE / DISC', draw(lt, d, t, blit) {
    const k = eio(seg(t, PLAN[1].t + 0.05, Le(1))), s = show(t, { flashK: 0.1, noHost: !s0(t), aim: () => (s0(t) ? TWO(eio(lt / d)) : SPINE(k, 0.08, 1.0, 0.72)) }); blit();
    if (t > T_SPINE - 0.1) pill('YOUR SPINE', 540, 300, popIn(t - T_SPINE + 0.1), '#111', YEL, 76);
    if (s.form === 'xray') {
      const v = verts[4].getWorldPosition(V3(0, 0, 0)), dd = discs[6].getWorldPosition(V3(0, 0, 0));
      const [vx, vy] = screen(v, cam), [dx, dy] = screen(dd, cam);
      if (t > T_BONES - 0.1) label('BONE', 200, vy + 140, vx - 30, vy, eob(seg(t, T_BONES - 0.1, T_BONES + 0.2)));
      if (t > T_SQUISH - 0.15) label('SQUISHY DISC', 860, dy - 160, dx + 30, dy, eob(seg(t, T_SQUISH - 0.15, T_SQUISH + 0.15)));
    }
  } });
  const s0 = (t) => t < PLAN[1].t + 0.05;
  cue(T_SPINE, 'pop'); cue(T_BONES, 'tock'); cue(T_SQUISH, 'boing', { gain: 0.5 });

  // 3 · gravity squeezes water out
  add({ id: 'S02', at: cut(2), note: 'x-ray spine close-up: big GRAVITY arrows press down, the discs flatten and blue water drops squirt out sideways', draw(lt, d, t, blit) {
    const s = show(t, { flashK: 0.1, noHost: true, ...SPINE(0.6 + 0.4 * eio(lt / d), 0.08, 1.0, 0.72) }); blit();
    if (t > T_GRAV - 0.1) { const a = popIn(t - T_GRAV + 0.1), bob = 18 * Math.sin(t * 8); ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = 'rgba(255,212,59,0.92)'; ctx.font = '900 230px Inter'; ctx.textAlign = 'center';
      for (const x of [170, 910]) ctx.fillText('⬇', x, 700 + bob); ctx.restore(); pill('GRAVITY', 540, 300, a, '#111', YEL, 80); }
    if (t > T_SQZ - 0.1) pill('SQUEEZE', 540, 420, popIn(t - T_SQZ + 0.1), '#FFFFFF', DARK, 54);
    if (t > T_WATER - 0.15) pill('💧 WATER SQUEEZED OUT', 540, 1150, popIn(t - T_WATER + 0.15), '#FFFFFF', 'rgba(20,110,200,0.92)', 60);
  } });
  cue(T_GRAV, 'thud', { gain: 0.8 }); cue(T_SQZ, 'slide', { dur: 0.8, gain: 0.6 }); cue(T_WATER, 'bubbles', { dur: 1.2, gain: 0.6 });

  // 4 · by night: −1 cm
  add({ id: 'S03', at: cut(3), note: 'wide two-shot, evening mood: Blip sags and gets sleepy, squashes down; head line drops below the morning ghost line; "BY NIGHT" "−1 CM"', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), flashK: 0.1, mood: 0.15 + 0.35 * eio(seg(t, L(3), T_NIGHT + 0.5)) }); blit();
    if (t > T_NIGHT - 0.1) pill('🌙 BY NIGHT', 540, 300, popIn(t - T_NIGHT + 0.1), '#FFFFFF', DARK, 72);
    if (t > T_CM - 0.1) { const [x, y] = screen(V3(RX + 0.06, s.top, RZ), cam); pill('−1 CM', Math.min(960, x + 90), y + 10, popIn(t - T_CM + 0.1), '#FFFFFF', RED, 62); pill('ABOUT 1 CM SHORTER', 540, 1150, popIn(t - T_CM), '#111', YEL, 60); }
  } });
  cue(T_LOSE, 'slide', { dur: 0.6, gain: 0.6 }); cue(T_CM, 'pop');

  // 5 · sleep: discs soak the water back up
  add({ id: 'S04', at: cut(4), note: 'Blip lies on a bed asleep (x-ray): close-up on the now-horizontal spine; blue drops flow back into the discs and they puff up; Zzz', draw(lt, d, t, blit) {
    const s = show(t, { flashK: 0.1, xk: 0.9, noHost: true, aim: () => { const c = spineW(0.08); return { pos: lerpV(c.clone().add(V3(0.0, 0.32, 1.45)), c.clone().add(V3(0.0, 0.26, 1.2)), eio(lt / d)), at: c, focus: c, look: { aperture: 0.0011 } }; } }); blit();
    if (t > T_SLEEP - 0.1) { pill('😴 SLEEP', 540, 300, popIn(t - T_SLEEP + 0.1), '#FFFFFF', DARK, 72); ctx.save(); ctx.fillStyle = '#FFFFFF'; ctx.font = '900 70px Inter'; for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.fillText('Z', 760 + ph * 120 + i * 10, 640 - ph * 220); } ctx.restore(); }
    if (t > T_SOAK - 0.15) pill('💧 DISCS SOAK IT BACK UP', 540, 1150, popIn(t - T_SOAK + 0.15), '#FFFFFF', 'rgba(20,110,200,0.92)', 58);
  } });
  cue(L(4) + 0.1, 'plop', { gain: 0.5 }); cue(T_SOAK, 'bubbles', { dur: 1.5, gain: 0.6 });

  // 6 · morning: taller again
  add({ id: 'S05', at: cut(5), note: 'wide two-shot, bright: Blip stretches arms up and pops back up to the ghost line; "☀️ MORNING" "+1 CM TALLER"', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), flashK: 0.1, mood: 0.05 }); blit();
    if (t > T_MORN - 0.1) pill('☀️ MORNING', 540, 300, popIn(t - T_MORN + 0.1), '#111', YEL, 76);
    if (t > T_TALL - 0.05) { const [x, y] = screen(V3(RX + 0.06, s.top, RZ), cam); pill('+1 CM', Math.min(960, x + 90), y, popIn(t - T_TALL + 0.05), '#111', GRN, 60); pill('TALLER AGAIN', 540, 1150, popIn(t - T_TALL), GRN, DARK, 76); }
  } });
  cue(T_MORN, 'sparkle', { gain: 0.6 }); cue(T_TALL, 'boing', { gain: 0.7 });

  // 7 · space: +3%
  add({ id: 'S06', at: cut(6), note: 'two-shot in space: lights go dark, stars, Blip in a glass helmet floats up and grows; the host points up amazed; "NO GRAVITY" "+3% TALLER"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.06, 1.2, 4.7), V3(0.08, 1.2, 4.4), eio(lt / d)), at: V3(0.07, 1.02, 0), look: { aperture: 0.0016 }, flashK: 0.1, mood: 0.15 + 0.85 * eio(seg(t, L(6) - 0.08, T_SPACE + 0.3)), xk: 0 }); blit();
    if (t > T_SPACE - 0.1) pill('🚀 IN SPACE', 540, 300, popIn(t - T_SPACE + 0.1), '#FFFFFF', DARK, 72);
    if (t > T_NOG - 0.1) pill('NO GRAVITY', 540, 420, popIn(t - T_NOG + 0.1), '#111', YEL, 54);
    if (t > T_3 - 0.1) pill('+3% TALLER', 540, 1150, popIn(t - T_3 + 0.1) * (1 + 0.04 * Math.sin(t * 18)), '#111', GRN, 96);
  } });
  cue(T_SPACE, 'whoosh', { gain: 0.7 }); cue(T_3, 'boing', { gain: 0.7 }); cue(T_3 + 0.05, 'sparkle', { gain: 0.5 });

  // 8 · back on Earth: shrink back (loops into the hook)
  add({ id: 'S07', at: cut(7), note: 'two-shot: lights come back, Blip drops to the floor with a thud, helmet gone, and squashes back down to normal; "BACK ON EARTH" "SHRINKS BACK"', draw(lt, d, t, blit) {
    const s = show(t, { ...TWO(eio(lt / d)), flashK: 0.1, mood: 1.0 - 0.85 * eio(seg(t, L(7), T_EARTH + 0.2)), shake: 1.5 * imp(t - T_EARTH - 0.15, 6) }); blit();
    if (t > T_EARTH - 0.1) pill('🌍 BACK ON EARTH', 540, 300, popIn(t - T_EARTH + 0.1), '#FFFFFF', DARK, 66);
    if (t > T_SHRINK - 0.1) pill('SHRINKS RIGHT BACK', 540, 1150, popIn(t - T_SHRINK + 0.1), '#FFFFFF', RED, 66);
  } });
  cue(T_EARTH + 0.15, 'thud', { gain: 1 }); cue(T_SHRINK, 'slide', { dur: 0.35, gain: 0.6 });

  return { shots: S, cues: CUES };
}
