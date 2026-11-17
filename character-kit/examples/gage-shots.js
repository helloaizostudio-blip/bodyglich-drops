// THE MAN WHO SURVIVED AN IRON ROD THROUGH HIS SKULL (Body Glitch, host v2 + shape-shifting Blip)
// Blip is Phineas Gage. Hook: the rod already through his head, rewound and fired again, and he stands up.
// Then: 1848 railroad blasting (tamping, boom), the rod's size, the path in x-ray (cheek in, top out), it flies
// 25 m away and he talks, the frontal lobe, the personality flip, and the museum, which loops back into the hook.
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
const YEL = '#FFD43B', RED = '#FF4D4D', GRN = '#4BE38A', DARK = 'rgba(12,14,20,0.82)';
const imp = (x, d = 7) => (x < 0 ? 0 : x < 0.03 ? x / 0.03 : Math.exp(-(x - 0.03) * d));
const impAt = (t, list, d) => list.reduce((m, h) => Math.max(m, imp(t - h, d)), 0);

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +Math.max(0, t).toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.34, bloomThreshold: 0.78, vignette: 0.45, warm: 0.05, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Shifter({ forms: ['human', 'xray'] });
  ST.scene.add(host.group, blip.group);
  const HX = -0.25, BX = 0.33, BZ = 0.12;
  const HF = blip.forms.human, XF = blip.forms.xray;

  // ── times ─────────────────────────────────────────────────────────────────
  const T_SHOT = Wd('shot', 0), T_STOOD = Wd('stood', 0), T_YEAR = Wd('eighteen', 1), T_NAME = Wd('Phineas', 1), T_BOOM = Wd('railroad', 1) + 0.22;
  const T_METER = Wd('meter', 2), T_KG = Wd('six', 2), T_IN = Wd('in', 3), T_CHEEK = Wd('cheek', 3), T_OUT = Wd('out', 3), T_TOP = Wd('top', 3), T_HEAD = Wd('head', 3);
  const T_LAND = Wd('landed', 4), T_AWAY = Wd('away', 4), T_TALK = Wd('talking', 4), T_TORE = Wd('tore', 5), T_LOBE = Wd('frontal', 5), T_CTRL = Wd('controls', 5);
  const T_NO = Wd('longer', 6) - 0.25, T_PERS = Wd('personality', 6), T_CHG = Wd('changed', 6), T_12 = Wd('twelve', 7), T_SKULL = Wd('skull', 7), T_MUS = Wd('museum', 7);
  const HITS = [T_SHOT + 0.05, T_BOOM + 0.08];
  const PLAN = [
    { t: -5, form: 'human' },
    { t: L(3) - 0.3, form: 'xray', charge: 0.12 },
    { t: L(4) - 0.08, form: 'human', charge: 0.12 },
    { t: L(5) - 0.08, form: 'xray', charge: 0.12 },
    { t: L(6) - 0.08, form: 'human', charge: 0.12 },
    { t: L(7) + 0.1, form: 'xray', charge: 0.12 },
  ];
  Shifter.cues(PLAN.slice(1), cue);

  // ── props: the tamping iron, an x-ray tunnel + exit hole, the frontal lobe, smoke, a blast light, a pedestal ──
  const ROD_L = 0.78, ROD_R = 0.022;
  const rodM = new THREE.MeshStandardMaterial({ color: '#8C939C', metalness: 0.8, roughness: 0.3, emissive: '#30343A', emissiveIntensity: 0.6 });
  const prof = [V3(0, 0, 0), V3(ROD_R * 0.35, 0.004, 0), V3(ROD_R, ROD_L * 0.27, 0), V3(ROD_R, ROD_L - 0.004, 0), V3(ROD_R * 0.9, ROD_L, 0), V3(0, ROD_L, 0)].map((p) => new THREE.Vector2(p.x, p.y));
  const rodGeo = new THREE.LatheGeometry(prof, 24); rodGeo.rotateX(Math.PI); // tip at origin, body along -y; the group's +y is the travel direction
  const rod = new THREE.Group(), rodMesh = new THREE.Mesh(rodGeo, rodM); rodMesh.castShadow = true; rod.add(rodMesh); ST.scene.add(rod);
  const rodGlowM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9FB4CC').multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const rodGlow = new THREE.Mesh(new THREE.CylinderGeometry(ROD_R * 2.4, ROD_R * 2.4, ROD_L, 16), rodGlowM); rodGlow.position.y = -ROD_L / 2; rod.add(rodGlow);
  // head-local entry (under the left cheekbone) and exit (top of the skull)
  const ENTRY = V3(0.046, 0.112, 0.088), EXIT = V3(0.006, 0.262, 0.022);
  const tunM = new THREE.MeshStandardMaterial({ color: '#B0122A', emissive: '#FF1E3C', emissiveIntensity: 0.9, transparent: true, opacity: 0.85, depthWrite: false });
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 14), tunM); { const d = EXIT.clone().sub(ENTRY); tunnel.scale.y = d.length(); tunnel.position.copy(ENTRY.clone().add(EXIT).multiplyScalar(0.5)); tunnel.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); }
  tunnel.castShadow = false; tunnel.renderOrder = 3; XF.human.head.add(tunnel);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.016, 20), new THREE.MeshBasicMaterial({ color: '#140A0C', side: THREE.DoubleSide })); hole.position.copy(EXIT).add(V3(0, -0.004, 0)); hole.rotation.x = -Math.PI / 2 + 0.25; XF.human.head.add(hole);
  const lobeM = new THREE.MeshStandardMaterial({ color: '#FF3355', emissive: '#FF1E3C', emissiveIntensity: 1.2, transparent: true, opacity: 0, depthWrite: false });
  const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), lobeM); lobe.scale.set(0.046, 0.04, 0.042); lobe.position.set(0.022, 0.2, 0.038); lobe.castShadow = false; lobe.renderOrder = 4; XF.human.head.add(lobe);
  const blastL = new THREE.PointLight('#FFB347', 0, 6, 1.4); blastL.position.set(BX + 0.1, 0.4, BZ + 0.5); ST.scene.add(blastL);
  const smokeM = new THREE.MeshStandardMaterial({ color: '#8E8A84', transparent: true, opacity: 0.55, depthWrite: false, roughness: 1 }), smoke = [];
  for (let i = 0; i < 22; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05 + 0.05 * hash(i), 12, 10), smokeM); s.visible = false; s.castShadow = false; ST.scene.add(s); smoke.push(s); }
  const rockM = new THREE.MeshStandardMaterial({ color: '#6E6259', roughness: 0.95 }), rocks = [];
  for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.05 + 0.04 * hash(i + 3), 0), rockM); r.position.set(BX + 0.05 + (hash(i) - 0.5) * 0.45, 0.03, BZ + 0.28 + (hash(i + 9) - 0.5) * 0.2); r.rotation.set(hash(i) * 3, hash(i + 1) * 3, 0); r.castShadow = true; ST.scene.add(r); rocks.push(r); }
  const pedM = new THREE.MeshStandardMaterial({ color: '#2B2F38', roughness: 0.5, metalness: 0.2 }), ped = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.16), pedM); ped.position.set(BX + 0.19, 0.18, BZ + 0.38); ST.scene.add(ped);
  const spot = new THREE.SpotLight('#FFF1D6', 0, 6, 0.35, 0.6, 1); spot.position.set(BX + 0.2, 2.6, 1.2); spot.target.position.set(BX + 0.2, 0.8, BZ); ST.scene.add(spot, spot.target);

  // ── where the rod is ──────────────────────────────────────────────────────
  // s = how far the tip has travelled past the entry point along the entry→exit line (world units)
  const path = (h) => { const e = h.head.localToWorld(ENTRY.clone()), x = h.head.localToWorld(EXIT.clone()), d = x.clone().sub(e), len = d.length(); return { e, x, dir: d.normalize(), len }; };
  const LODGED = (p) => p.len + ROD_L * 0.4;
  function placeOnPath(h, s) { const p = path(h); rod.position.copy(p.e).addScaledVector(p.dir, s); rod.quaternion.setFromUnitVectors(V3(0, 1, 0), p.dir); return p; }
  function placeRod(t, h) {
    rod.visible = true; rodGlowM.opacity = 0; rod.scale.setScalar(1); const p = path(h);
    if (t < L(1) - 0.08) {                                        // hook: lodged, rewound, fired again
      const back = -ROD_L - 0.5, r = seg(t, T_SHOT - 0.3, T_SHOT - 0.1), f = seg(t, T_SHOT - 0.06, T_SHOT + 0.05);
      const s = t < T_SHOT - 0.1 ? lerp(LODGED(p), back, eio(r)) : t < T_SHOT - 0.06 ? back : lerp(back, LODGED(p), f);
      rodGlowM.opacity = t > T_SHOT - 0.06 && t < T_SHOT + 0.12 ? 0.5 : 0; placeOnPath(h, s); return;
    }
    if (t < T_BOOM) {                                              // tamping powder into a hole by his feet
      const hand = h.arm.R.el.localToWorld(V3(0, -0.36, 0.02)).add(h.arm.L.el.localToWorld(V3(0, -0.36, 0.02))).multiplyScalar(0.5), bob = Math.abs(Math.sin((t - L(1)) * 5.5)) * 0.06;
      rod.position.set(hand.x, Math.max(0.02, hand.y - 0.5 + bob), hand.z + 0.02); rod.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(0, -1, 0)); rod.position.y += 0; return;
    }
    if (t < L(3) - 0.08) { const f = seg(t, T_BOOM, T_BOOM + 0.1); placeOnPath(h, lerp(-ROD_L - 0.3, LODGED(p), f)); rodGlowM.opacity = t < T_BOOM + 0.18 ? 0.5 : 0; return; }
    if (t < L(4) - 0.08) {                                         // slow replay: tip at the cheek on "in", out the top by "head"
      const s = t < T_IN ? -0.03 : lerp(-0.03, LODGED(p) - ROD_L * 0.15, eio(seg(t, T_IN, T_HEAD + 0.15))); placeOnPath(h, s); return;
    }
    if (t < T_AWAY + 0.25) {                                       // keeps going: out, up and away
      const u = seg(t, L(4) - 0.08, T_AWAY + 0.2), s0 = LODGED(p); const tip = p.e.clone().addScaledVector(p.dir, s0 + u * 5.5); tip.z -= u * u * 4.5; tip.y -= u * u * 1.5;
      rod.position.copy(tip); const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), p.dir); q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), -u * 9)); rod.quaternion.copy(q); rodGlowM.opacity = 0.25; return;
    }
    if (t > T_SKULL - 0.1) {                                       // the museum: the rod stands on a pedestal
      const k = eob(seg(t, T_SKULL - 0.1, T_SKULL + 0.35)); rod.position.set(BX + 0.19, 0.36 + ROD_L + (1 - k) * 0.6, BZ + 0.38); rod.quaternion.identity(); rod.scale.setScalar(Math.max(0.01, k)); return;
    }
    rod.visible = false;
  }

  // ── the host ──────────────────────────────────────────────────────────────
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.5 };
  const POINT = { ...REST, shR: [62, -12, 48], elR: 14, head: [0, 22, 0], smile: 0.6, brow: [0.5, 0] };
  const SHOCK = { ...REST, shL: [30, 0, 40], shR: [30, 0, 40], elL: 95, elR: 95, brow: [1, 0.4], lid: -0.35, mouth: 0.55, smile: -0.4, spine: [-6, 0, 0], head: [0, 18, 0] };
  const act = track([
    { t: 0, pose: SHOCK },
    { t: T_STOOD - 0.05, d: 0.35, pose: { ...SHOCK, mouth: 0.3, smile: 0.1, brow: [1, 0.2] } },
    { t: L(1) - 0.05, d: 0.35, pose: POINT },
    { t: T_BOOM - 0.05, d: 0.18, pose: SHOCK },
    { t: L(2) + 0.2, d: 0.4, pose: { ...REST, shL: [40, 0, 50], elL: 30, shR: [40, 0, 50], elR: 30, brow: [0.8, 0], smile: 0.3, head: [0, 14, 0] } }, // shows the size with both arms
    { t: L(3) - 0.05, d: 0.35, pose: { ...POINT, smile: 0.2, brow: [0.9, 0.3] } },
    { t: L(4) - 0.05, d: 0.3, pose: { ...REST, shR: [120, -10, 30], elR: 20, head: [-18, 10, 0], brow: [1, 0], mouth: 0.4 } },                            // watches it fly
    { t: T_TALK - 0.1, d: 0.35, pose: { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, brow: [1, 0.3], smile: 0.8, head: [-4, 18, 6] } }, // can you believe it
    { t: L(5) - 0.05, d: 0.35, pose: { ...REST, shR: [70, 0, 30], elR: 110, head: [0, 10, 0], brow: [0.7, 0.3], smile: 0 } },                                // finger to his own forehead
    { t: L(6) - 0.05, d: 0.35, pose: POINT },
    { t: T_CHG - 0.1, d: 0.25, pose: { ...SHOCK, spine: [-10, 0, 0] } },
    { t: L(7) - 0.05, d: 0.4, pose: { ...REST, shL: [24, 0, 38], shR: [24, 0, 38], elL: 75, elR: 75, smile: 0.8, brow: [0.6, 0] } },
    { t: T_MUS - 0.1, d: 0.4, pose: { ...POINT, smile: 0.9 } },
  ]);

  const mean = (t) => clamp((t - T_NO) * 2.5) * (t < L(7) + 0.1 ? 1 : 0);    // personality flip

  /** one frame */
  function show(t, o) {
    blip.group.position.set(BX, 0, BZ); blip.group.rotation.y = o.turn ?? -0.15;
    const s = blip.update(t, PLAN, {}), f = blip.current, h = f.human, hit = impAt(t, HITS, 5);
    if (o.flashK != null) { blip.flash.visible = false; blip.ring.material.opacity *= 0.5; f.mats.forEach((m) => { if (!m.uniforms && m.emissive) m.emissiveIntensity *= 0.25 + 0.75 * o.flashK; }); }
    const w = Math.sin(t * 2.2);
    if (s.form === 'human') {
      let q = { spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [6, 0, 12], shR: [6, 0, 12], elL: 24, elR: 24 }, face = { lid: 0, smile: 0.8 };
      if (t < L(1) - 0.08) {                                       // knocked back, then stands up with a thumbs up
        const k = t < T_SHOT ? 0.35 : 1 - eo(seg(t, T_STOOD - 0.1, T_STOOD + 0.35)), up = eob(seg(t, T_STOOD + 0.1, T_STOOD + 0.5));
        q = { spine: [-16 * k - 14 * hit, 0, 5 * k], head: [-12 * k - 20 * hit, 0, 0], shL: [10 + 40 * k, 0, 20 + 40 * k], shR: [10 + 40 * k + 90 * up, 0, 20 + 40 * k + 10 * up], elL: 30, elR: 30 + 70 * up, knL: 18 * k, knR: 18 * k };
        face = { lid: hit > 0.2 ? 0.9 : k > 0.5 ? 0.4 : 0, smile: up > 0.5 ? 1 : -0.4 };
      } else if (t < T_BOOM) {                                     // tamping
        const b = Math.abs(Math.sin((t - L(1)) * 5.5)); q = { spine: [8, 0, 0], head: [14, 0, 0], shR: [34 + 12 * b, 0, -8], elR: 40 - 10 * b, shL: [34 + 12 * b, 0, -8], elL: 40 - 10 * b };
        face = { lid: 0.2, smile: 0.6 };
      } else if (t < L(4) - 0.08) {                                 // stunned with an iron through his head
        q = { spine: [-6 - 14 * hit, w * 2, 3], head: [-8 - 20 * hit, 0, 4], shL: [14, 0, 26], shR: [14, 0, 26], elL: 30, elR: 30 }; face = { lid: 0.35, smile: -0.2 };
      } else if (t < L(5)) {                                       // talking within minutes
        const tk = t > T_TALK - 0.1 ? 1 : 0; q = { spine: [0, w * 2, 0], head: [-3 + 4 * Math.sin(t * 9) * tk, w * 5, 0], shL: [10, 0, 12], shR: [30 * tk + 6, 0, 30 * tk + 12], elL: 24, elR: 24 + 70 * tk }; face = { lid: 0, smile: tk ? 0.6 + 0.5 * Math.abs(Math.sin(t * 11)) : 0.4 };
      } else {                                                     // the personality flip
        const m = mean(t); q = { spine: [6 * m, 0, 0], head: [8 * m, -18 * m, 0], shL: [6 + 20 * m, 0, 12 + 10 * m], shR: [6 + 70 * m, 0, 12 + 30 * m], elL: 24 + 60 * m, elR: 24 + 80 * m + 20 * Math.sin(t * 14) * m }; face = { lid: 0.35 * m, smile: lerp(0.9, -1, m) };
      }
      h.pose(q); f.face.set(face); f.group.position.y = 0;
    }
    if (s.form === 'xray') {
      f.diaG.visible = false; f.bladder.visible = false; f.ring.visible = false; f.larynx.visible = false; f.gut.visible = false; f.kidneys.forEach((k) => (k.visible = false)); f.gas.forEach((g) => (g.visible = false));
      h.pose({ spine: [0, w * 2, 0], head: [-3, w * 3, 0], shL: [4, 0, 20], shR: [4, 0, 20], elL: 16, elR: 16 });
    }
    // tunnel and lobe only after the iron has passed
    tunnel.visible = (t > T_TOP && t < L(4) + 0.5) || t > L(5) - 0.1; tunM.opacity = t < L(4) ? 0.85 * clamp((t - T_TOP) * 3) : 0.85;
    hole.visible = t > T_TOP; lobeM.opacity = o.lobe ? o.lobe : 0;
    blip.group.updateMatrixWorld(true);
    placeRod(t, h); rod.updateMatrixWorld(true);
    // blast at the feet on the boom
    const bl = imp(t - T_BOOM, 4); blastL.intensity = 14 * bl;
    smoke.forEach((m, i) => { const age = t - T_BOOM - hash(i) * 0.15; m.visible = age > 0 && age < 1.3 && t < L(2) + 0.4; if (!m.visible) return; m.position.set(BX + 0.06 + (hash(i + 2) - 0.5) * 0.3 + Math.sin(age * 2 + i) * 0.05, 0.05 + age * 0.45 * (0.6 + hash(i + 5)), BZ + 0.3 + (hash(i + 4) - 0.5) * 0.25); m.scale.setScalar(0.4 + age * 0.6); });
    rocks.forEach((r) => (r.visible = t > L(1) - 0.1 && t < L(3) - 0.1));
    ped.visible = t > T_SKULL - 0.4; spot.intensity = 0;
    ST.setMood(Math.max(s.xray * (o.xk ?? 1), o.mood ?? 0.15) - 0.1 * hit);
    // host
    const p0 = drag(act, t), pz = alive(addPose(p0, { spine: [-6 * hit, 0, 0], head: [-6 * hit, 0, 0], lid: -0.4 * hit, squash: 0.05 * hit }), t, { seed: 6, talk: mouthFor(t) }); host.pose(pz); hostBreathe(host, t); host.belly(0); host.group.position.set(HX - 0.03 * hit, 0, 0);
    // camera
    if (o.aim) Object.assign(o, o.aim());
    const at = o.at.clone(), pos = o.pos.clone(), shake = s.kick + (o.shake || 0) + 1.1 * hit + 0.8 * bl;
    pos.x += Math.sin(t * 83) * 0.012 * shake; pos.y += Math.cos(t * 97) * 0.012 * shake;
    cam.position.copy(pos); cam.lookAt(at);
    E.render(ST.scene, cam, { ...LOOK, focus: pos.distanceTo(o.focus || at), bloom: LOOK.bloom + 0.12 * hit + s.xray * 0.15, bloomThreshold: lerp(0.78, 0.5, s.xray), exposure: 1.02 + 0.1 * hit, ...(o.look || {}) });
    return { ...s, hit, bl, h };
  }
  const flash2d = (k, col = '255,236,214') => { if (k > 0.02) { ctx.fillStyle = `rgba(${col},${Math.min(0.2, k * 0.2)})`; ctx.fillRect(0, 0, W, H); } };
  const WIDE = (k) => ({ pos: lerpV(V3(0.03, 1.02, 4.45), V3(0.06, 1.0, 4.1), k), at: V3(0.04, 0.9, 0), focus: V3(0.04, 0.9, 0.05), look: { aperture: 0.0016 } });
  const HEADCAM = (h, k, d0 = 0.95, d1 = 0.72) => { const c0 = h.head.localToWorld(V3(0.01, 0.17, 0.02)); return { pos: lerpV(c0.clone().add(V3(0.32, 0.06, d0)), c0.clone().add(V3(0.22, 0.04, d1)), k), at: c0, focus: c0 }; };

  // 1 · hook: the iron is already through his head; rewind, fire again, he stands up
  add({ id: 'S00', at: 0, note: 'two-shot: Blip with an iron rod through his head from frame 1; on "shot" it rewinds and fires through again (shake); on "stood up" he straightens and gives a thumbs up', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), mood: 0.2 }); blit(); flash2d(s.hit);
    pill('IRON ROD THROUGH HIS SKULL', 540, 300, 1 + 0.1 * s.hit, '#FFFFFF', 'rgba(190,16,24,0.95)', 56);
    if (t > T_STOOD - 0.05) pill('…AND STOOD UP', 540, 1150, popIn(t - T_STOOD + 0.05), GRN, DARK, 80);
  } });
  cue(T_SHOT - 0.3, 'whoosh', { dur: 0.25, gain: 0.5 }); cue(T_SHOT - 0.02, 'zip', { gain: 0.8 }); cue(T_SHOT + 0.05, 'slam', { gain: 0.9 }); cue(T_SHOT + 0.07, 'thud', { gain: 0.6 }); cue(T_STOOD + 0.1, 'pop');

  // 2 · 1848, blasting rock for a railroad
  add({ id: 'S01', at: cut(1), note: 'two-shot: Blip (no rod in head) tamps powder into a rock with the iron; "1848" and "PHINEAS GAGE"; on "railroad" BOOM, orange blast, smoke, the iron shoots up through his head', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), mood: 0.25 }); blit(); flash2d(Math.max(s.hit, s.bl));
    pill('1848', 540, 300, popIn(t - T_YEAR + 0.05), '#111', YEL, 96);
    if (t > T_NAME - 0.1) pill('PHINEAS GAGE · RAILROAD WORKER', 540, 430, popIn(t - T_NAME + 0.1), '#FFFFFF', DARK, 46);
    if (t > T_BOOM - 0.02) pill('BOOM', 540, 1150, popIn(t - T_BOOM) * (1 + 0.15 * imp(t - T_BOOM, 5)), '#111', '#FF9F1C', 110);
  } });
  for (let i = 0; i < 6; i++) { const tt = L(1) + 0.1 + i * 0.57; if (tt < T_BOOM - 0.2) cue(tt, 'tock', { gain: 0.35 }); }
  cue(T_BOOM, 'slam', { gain: 1 }); cue(T_BOOM + 0.02, 'thud', { gain: 0.9 }); cue(T_BOOM + 0.08, 'zip', { gain: 0.7 }); cue(T_BOOM + 0.1, 'sizzle', { dur: 0.9, gain: 0.4 });

  // 3 · the size of the iron
  add({ id: 'S02', at: cut(2), note: 'closer two-shot on Blip with the iron through his head; a length bar alongside the rod: "1.1 METERS", then "6 KG"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.2, 1.12, 3.35), V3(0.24, 1.1, 2.95), eio(lt / d)), at: V3(0.2, 1.0, 0), focus: V3(BX, 1.1, BZ), mood: 0.2 }); blit();
    const p = path(s.h), tip = rod.position.clone(), tail = tip.clone().addScaledVector(p.dir, -ROD_L), [x0, y0] = screen(tip, cam), [x1, y1] = screen(tail, cam);
    const k = eo(seg(t, T_METER - 0.2, T_METER + 0.4));
    if (k > 0) { const nx = (y1 - y0), ny = -(x1 - x0), nl = Math.hypot(nx, ny), ox = nx / nl * 70, oy = ny / nl * 70; ctx.save(); ctx.strokeStyle = YEL; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(x0 + ox, y0 + oy); ctx.lineTo(lerp(x0, x1, k) + ox, lerp(y0, y1, k) + oy); ctx.stroke();
      for (const [a, b] of [[x0, y0], [lerp(x0, x1, k), lerp(y0, y1, k)]]) { ctx.beginPath(); ctx.moveTo(a + ox * 0.6, b + oy * 0.6); ctx.lineTo(a + ox * 1.4, b + oy * 1.4); ctx.stroke(); } ctx.restore(); }
    if (t > T_METER - 0.1) pill('1.1 METERS', 540, 300, popIn(t - T_METER + 0.1), '#111', YEL, 90);
    if (t > T_KG - 0.1) pill('6 KG · 13 LB', 540, 1150, popIn(t - T_KG + 0.1), '#FFFFFF', DARK, 84);
  } });
  cue(T_METER - 0.2, 'slide', { dur: 0.6, gain: 0.5 }); cue(T_KG, 'thud', { gain: 0.7 });

  // 4 · the path in x-ray: in under the cheek, out the top
  add({ id: 'S03', at: cut(3), note: 'x-ray head close-up: the iron slides in slow motion, tip at the cheek on "in", out the top of the skull by "head"; labels IN and OUT; a red tunnel stays behind', draw(lt, d, t, blit) {
    const k = eio(lt / d), s = show(t, { flashK: 0.3, aim: () => HEADCAM(XF.human, k), look: { aperture: 0.0012 } }); blit();
    const [ex, ey] = screen(XF.human.head.localToWorld(ENTRY.clone()), cam), [tx, ty] = screen(XF.human.head.localToWorld(EXIT.clone()), cam);
    label('IN', 860, 1060, ex, ey, eob(seg(t, T_CHEEK - 0.1, T_CHEEK + 0.2)));
    if (t > T_TOP - 0.1) label('OUT', 820, 360, tx, ty, eob(seg(t, T_TOP - 0.1, T_TOP + 0.2)));
    if (t > T_HEAD) pill('STRAIGHT THROUGH', 540, 1150, popIn(t - T_HEAD), RED, DARK, 70);
  } });
  cue(T_IN - 0.05, 'slide', { dur: T_HEAD - T_IN + 0.2, gain: 0.5 }); cue(T_CHEEK, 'pop'); cue(T_TOP, 'pop');

  // 5 · 25 m away, and he was talking
  add({ id: 'S04', at: cut(4), note: 'two-shot: the iron keeps going, tumbles up and away out of frame; "25 M AWAY"; Blip blinks, then chats away with a big grin; "TALKING IN MINUTES"', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), flashK: 0.2 }); blit();
    if (t > T_LAND - 0.05) pill('LANDED 25 M AWAY', 540, 300, popIn(t - T_LAND + 0.05), '#111', YEL, 70);
    if (t > T_TALK - 0.1) { pill('TALKING WITHIN MINUTES', 540, 1150, popIn(t - T_TALK + 0.1), GRN, DARK, 64);
      const [bx, by] = screen(s.h.head.localToWorld(V3(0.12, 0.3, 0)), cam), k = popIn(t - T_TALK); ctx.save(); ctx.translate(bx + 70, by - 40); ctx.scale(k, k); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#111'; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-80, -50, 160, 90, 40); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#111';
        for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.sin(t * 8 - i)); ctx.beginPath(); ctx.arc(-40 + i * 40, -5, 12, 0, 7); ctx.fill(); } ctx.restore(); }
  } });
  cue(L(4), 'whoosh', { dur: 0.5, gain: 0.6 }); cue(T_AWAY + 0.15, 'thud', { gain: 0.35 }); cue(T_LAND, 'pop'); cue(T_TALK, 'boing', { gain: 0.4 });

  // 6 · the frontal lobe
  add({ id: 'S05', at: cut(5), note: 'x-ray head close: the red tunnel through the front of the brain; the frontal lobe lights up red on "frontal lobe"; "CONTROLS WHO YOU ARE"', draw(lt, d, t, blit) {
    const k = eio(lt / d), lb = eo(seg(t, T_LOBE - 0.1, T_LOBE + 0.4)) * (0.55 + 0.25 * Math.sin(t * 7));
    const s = show(t, { flashK: 0.25, lobe: lb, aim: () => HEADCAM(XF.human, k, 0.8, 0.6), look: { aperture: 0.0012 } }); blit();
    const [lx, ly] = screen(XF.human.head.localToWorld(V3(0.03, 0.21, 0.06)), cam);
    label('FRONTAL LOBE', 820, 420, lx, ly, eob(seg(t, T_LOBE - 0.1, T_LOBE + 0.2)));
    if (t > T_TORE - 0.1) pill('TORN THROUGH', 540, 300, popIn(t - T_TORE + 0.1), '#FFFFFF', 'rgba(170,16,24,0.92)', 64);
    if (t > T_CTRL - 0.1) pill('CONTROLS WHO YOU ARE', 540, 1150, popIn(t - T_CTRL + 0.1), '#111', YEL, 62);
  } });
  cue(T_TORE, 'sizzle', { dur: 0.7, gain: 0.5 }); cue(T_LOBE, 'heartbeat', { gain: 0.6 }); cue(T_CTRL, 'pop');

  // 7 · "no longer Gage"
  add({ id: 'S06', at: cut(6), note: 'closer two-shot: Blip smiling, then on "no longer Gage" his face flips to a scowl and he shakes a fist; host recoils; quote pill and "PERSONALITY CHANGED"', draw(lt, d, t, blit) {
    const s = show(t, { pos: lerpV(V3(0.12, 1.06, 3.7), V3(0.16, 1.04, 3.3), eio(lt / d)), at: V3(0.1, 0.95, 0), focus: V3(BX, 1.1, BZ), mood: 0.25 + 0.25 * mean(t) }); blit();
    if (mean(t) > 0.02) { ctx.fillStyle = `rgba(160,10,20,${0.12 * mean(t)})`; ctx.fillRect(0, 0, W, H); }
    if (t > T_NO - 0.05) pill('“NO LONGER GAGE”', 540, 300, popIn(t - T_NO + 0.05), '#111', YEL, 76);
    if (t > T_PERS - 0.1) pill('PERSONALITY CHANGED', 540, 1150, popIn(t - T_PERS + 0.1) * (1 + 0.03 * Math.sin(t * 20)), '#FFFFFF', 'rgba(170,16,24,0.92)', 64);
  } });
  cue(T_NO, 'boing', { gain: 0.5 }); cue(T_CHG, 'slam', { gain: 0.5 });

  // 8 · lived 12 more years; the skull and the iron are in a museum (loops back into the hook)
  add({ id: 'S07', at: cut(7), note: 'two-shot under a spotlight: Blip turns x-ray (the hole in the skull and the tunnel show); "LIVED 12 MORE YEARS"; the iron drops onto a pedestal; "HARVARD MUSEUM"', draw(lt, d, t, blit) {
    const s = show(t, { ...WIDE(eio(lt / d)), flashK: 0.15, xk: 0.62 }); blit();
    if (t > T_12 - 0.1) pill('LIVED 12 MORE YEARS', 540, 300, popIn(t - T_12 + 0.1), '#111', YEL, 70);
    if (t > T_MUS - 0.1) pill('SKULL + ROD · HARVARD MUSEUM', 540, 1150, popIn(t - T_MUS + 0.1), '#FFFFFF', DARK, 50);
  } });
  cue(T_12, 'pop'); cue(T_SKULL + 0.2, 'thud', { gain: 0.6 }); cue(T_MUS, 'sparkle', { dur: 1.0, gain: 0.5 });

  return { shots: S, cues: CUES };
}
