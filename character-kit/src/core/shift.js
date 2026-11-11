// Shape-shifting Blip. He charges up (glow + shake), flashes, and pops into whatever the narrator is talking about:
// a human, an x-ray of that human, or an animal. Every form keeps Blip's colours, eyes and glowing antenna, so the
// audience always knows it is still him.
//   const blip = new Shifter({ forms: ['human', 'xray', 'octopus', 'shark', 'cat'] });   scene.add(blip.group)
//   const plan = [{ t: Wd('heart', 1), form: 'xray' }, { t: Wd('octopus', 2), form: 'octopus' }, ...];   // word → form
//   const s = blip.update(t, plan, { blip: { ...Buddy.set() args } });      // every frame; pure function of t
//   s = { form, since (s after the last change), charge 0..1, flash 0..1, kick 0..1 (camera punch), xray 0..1 }
//   Shifter.cues(plan, cue) adds the sounds. Add your own animal with Shifter.FORMS.name = (c) => ({ group, cy, animate(t) }).
import * as THREE from 'three';
import { sphere, ellipsoid, capsule, smin, smax, mesh, rgb } from './sdf.js';
import { Buddy, VINYL } from './host.js';
import { Human } from './human.js';
import { xrayMaterial, insides } from './sets.js';
import { spring, wobble, bump } from './motion.js';
import { clamp, lerp, seg, eo, eio } from './lib.js';

const D = THREE.MathUtils.degToRad;
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const G = (parent, pos = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };
const M = (parent, geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
const INK = () => new THREE.MeshStandardMaterial({ color: '#0A0E12', roughness: 0.3, envMapIntensity: 0.25 });
const GLINT = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });

/** Blip's face on any surface: two glossy eyes with glints, cheeks, a smile. Returns { eyes, set({ lid, look, smile }) } */
function face(parent, pos, c, { gap = 0.066, r = 0.03, curve = 0.4, cheeks = true, mouth = true, mouthY = -0.05, mouthZ = 0.03 } = {}) {
  const g = G(parent, pos), eyes = [];
  for (const s of [-1, 1]) {
    const e = G(g, [s * gap, 0, 0]); e.rotation.y = s * curve; eyes.push(e);
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), INK()); b.scale.set(r, r, r * 0.37); e.add(b);
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.32, 14, 10), GLINT); h1.position.set(r * 0.3, r * 0.37, r * 0.28); e.add(h1);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 10, 8), GLINT); h2.position.set(-r * 0.33, -r * 0.33, r * 0.3); e.add(h2);
    if (cheeks) { const ch = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: c.cheek, roughness: 0.7, transparent: true, opacity: 0.85 })); ch.scale.set(r * 0.73, r * 0.43, r * 0.13); ch.position.set(s * gap * 1.7, -r * 1.65, -r * 0.35); ch.rotation.y = s * curve * 1.6; g.add(ch); }
  }
  let sm = null;
  if (mouth) { const arc = 2.2; sm = new THREE.Mesh(new THREE.TorusGeometry(r * 0.66, r * 0.14, 8, 24, arc), new THREE.MeshStandardMaterial({ color: '#0D3A4A', roughness: 0.5 })); sm.rotation.z = Math.PI + (Math.PI - arc) / 2; sm.position.set(0, mouthY + r * 0.5, mouthZ); g.add(sm); }
  return { group: g, eyes, set({ lid = 0, look = [0, 0], smile = 1 } = {}) { const open = clamp(1 - lid, 0.08, 1.35); eyes.forEach((e, i) => { e.scale.set(1, open, 1); e.position.set((i ? 1 : -1) * gap + look[0] * r * 0.4, look[1] * r * 0.33, 0); }); if (sm) sm.scale.y = smile || 0.001; } };
}
/** the glitch spark: springy stalk + glowing ball. Returns the pivot group (rotate z for follow-through) */
function antenna(parent, pos, c, s = 1) {
  const a = G(parent, pos); a.scale.setScalar(s);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.01, 0), new THREE.Vector3(0.004, 0.035, 0), new THREE.Vector3(0.022, 0.066, 0), new THREE.Vector3(0.046, 0.078, 0)]);
  M(a, new THREE.TubeGeometry(curve, 20, 0.008, 8), new THREE.MeshStandardMaterial({ color: c.dark, roughness: 0.4 }));
  const sp = M(a, new THREE.SphereGeometry(0.027, 20, 14), new THREE.MeshStandardMaterial({ color: c.glow, emissive: c.glow, emissiveIntensity: 1.6, roughness: 0.3 })); sp.position.set(0.052, 0.082, 0); sp.castShadow = false;
  return a;
}
const blinkAt = (t, seed) => { const P = 2.7, n = Math.floor(t / P), k = (t - n * P - hash(n + seed) * 1.6) / 0.16; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };

// ═════════════════════════ FORMS ═════════════════════════
// A form builder gets the colours c = { color, belly, dark, glow, cheek } and returns { group (feet on y 0, faces +z),
// cy (height of its middle, where the flash sits), animate(t) }. Keep extra handles on the object for shots to act with.
export const FORMS = {
  /** a small smooth person in Blip's colours (the engine's Human, so it takes pose() and matches the x-ray exactly) */
  human(c) {
    const h = new Human({ skin: c.belly, shirt: c.color, pants: c.dark, shoes: c.darker, face: false, scale: 0.6 });
    const f = face(h.head, [0, 0.152, 0.106], c, { gap: 0.043, r: 0.021, curve: 0.38, mouthY: -0.062, mouthZ: 0.004 }), an = antenna(h.head, [0, 0.275, 0], c, 0.8);
    return { group: h.group, cy: 0.62, human: h, face: f, antenna: an, animate(t) {
      const w = Math.sin(t * 2.2);
      h.pose({ spine: [0, w * 3, 0], head: [-3, w * 4, w * 2], shL: [6, 0, 12 + w * 2], shR: [6, 0, 12 - w * 2], elL: 24, elR: 24 }); f.set({ lid: blinkAt(t, 3) }); an.rotation.z = D(w * 6);
    } };
  },
  /** the same person as x-ray glass: skeleton, lungs, stomach and a beating heart. Needs a dark stage (studio.setMood) */
  xray(c) {
    const h = new Human({ skin: c.belly, shirt: c.color, pants: c.dark, shoes: c.darker, face: false, scale: 0.6 }), xm = xrayMaterial('#4FD1E8', 1.15);
    h.setAllMaterial(xm); h.parts.forEach((p) => (p.castShadow = false));
    const I = insides(); h.spine.add(I.group);
    const bone = new THREE.MeshStandardMaterial({ color: '#E6F7FF', emissive: '#7FDDF2', emissiveIntensity: 0.28, roughness: 0.4 });
    const skull = M(h.head, new THREE.SphereGeometry(1, 28, 20), new THREE.MeshStandardMaterial({ color: '#E6F7FF', emissive: '#7FDDF2', emissiveIntensity: 0.28, roughness: 0.4, transparent: true, opacity: 0.28, depthWrite: false })); skull.scale.set(0.082, 0.098, 0.092); skull.position.set(0, 0.165, -0.008); skull.castShadow = false;
    const jaw = M(h.head, new THREE.SphereGeometry(1, 24, 16), bone); jaw.scale.set(0.058, 0.05, 0.06); jaw.position.set(0, 0.085, 0.02); jaw.castShadow = false;
    for (const s of [-1, 1]) {                                                                             // arm + leg bones
      for (const [par, len] of [[h.arm[s < 0 ? 'L' : 'R'].sh, 0.25], [h.arm[s < 0 ? 'L' : 'R'].el, 0.24], [h.leg[s < 0 ? 'L' : 'R'].hip, 0.38], [h.leg[s < 0 ? 'L' : 'R'].kn, 0.36]]) { const b = M(par, new THREE.CapsuleGeometry(0.013, len, 6, 10), bone); b.position.y = -len / 2 - 0.01; b.castShadow = false; }
    }
    // intestines: one long coil under the stomach, and a pool of gas bubbles the shot can place anywhere in the body
    const gp = []; for (let r = 0; r < 5; r++) for (let k = 0; k < 5; k++) { const u = k / 4, x = (r % 2 ? 1 - u : u) * 0.17 - 0.085; gp.push(new THREE.Vector3(x * (1 - 0.12 * Math.abs(r - 2)), 0.1 - r * 0.036 - 0.01 * Math.sin(u * Math.PI), 0.035 + 0.012 * Math.sin(u * Math.PI))); }
    const gutCurve = new THREE.CatmullRomCurve3(gp, false, 'catmullrom', 0.4);
    const gut = M(h.spine, new THREE.TubeGeometry(gutCurve, 160, 0.019, 10), new THREE.MeshPhysicalMaterial({ color: '#F0A0AC', roughness: 0.4, clearcoat: 0.6, emissive: '#E87A8C', emissiveIntensity: 0.22, transparent: true, opacity: 0.8 })); gut.castShadow = false;
    const gasM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#D6FF4A').multiplyScalar(0.8) }), bloodM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF7A6A').multiplyScalar(1.0) }), gg = new THREE.SphereGeometry(0.011, 12, 8), gas = [];
    for (let i = 0; i < 40; i++) { const b = new THREE.Mesh(gg, gasM); b.visible = false; h.spine.add(b); gas.push(b); }
    // urinary system: kidneys, ureters, a bladder that fills (scale it), the ring of muscle under it, and a brain to message
    const organM = (col, o = {}) => new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.35, clearcoat: 0.8, emissive: col, emissiveIntensity: 0.3, ...o });
    const bladder = M(h.spine, new THREE.SphereGeometry(0.04, 32, 24), organM('#FFD23F', { transparent: true, opacity: 0.88, depthWrite: false })); bladder.position.set(0, -0.085, 0.045); bladder.castShadow = false;
    const ring = M(h.spine, new THREE.TorusGeometry(0.017, 0.0075, 10, 32), organM('#FF5A5A')); ring.rotation.x = Math.PI / 2; ring.position.set(0, -0.135, 0.045); ring.castShadow = false;
    const kidneys = [];
    for (const s of [-1, 1]) {
      const k = M(h.spine, new THREE.SphereGeometry(1, 20, 14), organM('#C8524F')); k.scale.set(0.022, 0.036, 0.018); k.position.set(s * 0.075, 0.15, -0.045); k.rotation.z = s * 0.25; k.castShadow = false; kidneys.push(k);
      const u = M(h.spine, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.06, 0.14, -0.04), new THREE.Vector3(s * 0.05, 0.03, -0.01), new THREE.Vector3(s * 0.025, -0.06, 0.035)]), 20, 0.0045, 6), organM('#FFD23F')); u.castShadow = false;
    }
    const brain = M(h.head, new THREE.SphereGeometry(1, 24, 16), organM('#F2A3C0')); brain.scale.set(0.068, 0.052, 0.074); brain.position.set(0, 0.19, -0.012); brain.castShadow = false;
    const sigM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFF3A0').multiplyScalar(1.3) });
    // diaphragm: a thin muscle dome under the lungs (scale y to flatten it on a hiccup), and the voice box in the throat
    const diaG = G(h.spine, [0, 0.235, 0.0]);
    const diaphragm = M(diaG, mesh((p) => { const e = ellipsoid(p, [0, 0, 0], [0.15, 0.075, 0.115]); return smax(Math.abs(e) - 0.006, -(p[1] + 0.002), 0.004); }, [[-0.17, -0.02, -0.13], [0.17, 0.09, 0.13]], 0.004), organM('#E8505A', { transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    diaphragm.castShadow = false;
    const larynx = M(h.spine, new THREE.TorusGeometry(0.019, 0.006, 10, 28), organM('#7FE0F0')); larynx.rotation.x = Math.PI / 2; larynx.position.set(0, 0.545, 0.03); larynx.castShadow = false;
    const f = face(h.head, [0, 0.152, 0.106], c, { gap: 0.043, r: 0.021, curve: 0.38, cheeks: false, mouth: false }), an = antenna(h.head, [0, 0.275, 0], c, 0.8);
    return { group: h.group, cy: 0.62, human: h, heart: I.heart, gut, gutCurve, gas, gasM, bloodM, sigM, bladder, ring, kidneys, brain, diaphragm, diaG, larynx, lungs: I.lungs, stomach: I.stomach, face: f, antenna: an, xm, isXray: true, animate(t) {
      const w = Math.sin(t * 2.2), beat = Math.pow(Math.max(0, Math.sin(t * 7.6)), 6) + 0.5 * Math.pow(Math.max(0, Math.sin(t * 7.6 - 0.9)), 6);
      h.pose({ spine: [0, w * 3, 0], head: [-3, w * 4, 0], shL: [4, 0, 20], shR: [4, 0, 20], elL: 16, elR: 16 }); f.set({ lid: blinkAt(t, 3) });
      I.heart.scale.setScalar(1 + beat * 0.22); I.heart.material.emissiveIntensity = 0.5 + beat * 1.6; I.lungs.forEach((l) => l.scale.setScalar(1 + Math.sin(t * 1.9) * 0.05));
    } };
  },
  octopus(c) {
    const g = new THREE.Group(), body = G(g, [0, 0.06, 0]), mat = VINYL({ roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.15 }), B = rgb(c.color), BL = rgb(c.belly), BD = rgb(c.dark);
    M(body, mesh((p) => smin(ellipsoid(p, [0, 0.3, -0.03], [0.18, 0.2, 0.19]), ellipsoid(p, [0, 0.15, 0.02], [0.165, 0.1, 0.155]), 0.08), [[-0.24, 0.0, -0.27], [0.24, 0.55, 0.22]], 0.006, (p) => mixc(mixc(BD, B, sstep(0.05, 0.2, p[1])), BL, sstep(0.1, 0.05, Math.hypot(p[0], p[1] - 0.1, (p[2] - 0.17) * 1.2)))), mat);
    const tg = mesh((p) => { let d = capsule(p, [0, 0, 0], [0.1, -0.06, 0], 0.05, 0.04); d = smin(d, capsule(p, [0.1, -0.06, 0], [0.2, -0.085, 0], 0.04, 0.03), 0.03); return smin(d, capsule(p, [0.2, -0.085, 0], [0.27, -0.04, 0], 0.03, 0.02), 0.025); }, [[-0.07, -0.15, -0.07], [0.31, 0.07, 0.07]], 0.006, (p) => mixc(B, BL, sstep(-0.02, -0.07, p[1]) * 0.7));
    const arms = []; for (let i = 0; i < 8; i++) { const a = G(body, [0, 0.09, 0]); a.rotation.y = (i + 0.5) / 8 * Math.PI * 2; const j = G(a, [0.09, 0, 0]); M(j, tg, mat); arms.push(j); }
    const f = face(body, [0, 0.22, 0.165], c, { r: 0.032, gap: 0.068 }), an = antenna(body, [0, 0.495, -0.03], c);
    return { group: g, cy: 0.3, body, arms, face: f, antenna: an, animate(t) {
      arms.forEach((a, i) => { a.rotation.z = Math.sin(t * 3.4 + i * 0.9) * 0.3 + 0.05; a.rotation.y = Math.sin(t * 2.1 + i * 1.7) * 0.2; });
      const b = Math.sin(t * 3.4); body.scale.set(1 - b * 0.03, 1 + b * 0.05, 1 - b * 0.03); body.position.y = 0.06 + (b * 0.5 + 0.5) * 0.03; f.set({ lid: blinkAt(t, 5) }); an.rotation.z = D(Math.sin(t * 3.4 - 0.8) * 14);
    } };
  },
  shark(c) {
    const g = new THREE.Group(), body = G(g, [0, 0.5, 0]), mat = VINYL({ roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.15 }), B = rgb(c.color), BD = rgb(c.dark), WH = [0.9, 0.95, 0.96];
    M(body, mesh((p) => {
      let d = ellipsoid(p, [0, 0, 0], [0.135, 0.145, 0.3]);
      d = smin(d, ellipsoid(p, [0, -0.015, 0.22], [0.095, 0.09, 0.17]), 0.08);                             // snout
      d = smin(d, ellipsoid(p, [0, 0.16 - (p[2] + 0.02) * 0.35, -0.04], [0.022, 0.13, 0.085]), 0.03);      // dorsal fin, swept back
      for (const s of [-1, 1]) d = smin(d, ellipsoid(p, [s * 0.17, -0.07 - Math.abs(p[0]) * 0.25, 0.02], [0.12, 0.022, 0.065]), 0.03); // pectorals
      return d;
    }, [[-0.33, -0.22, -0.34], [0.33, 0.33, 0.42]], 0.0065, (p) => mixc(mixc(B, BD, sstep(0.05, 0.2, p[1])), WH, sstep(-0.02, -0.055, p[1]))), mat);
    const tail = G(body, [0, 0, -0.26]);
    M(tail, mesh((p) => smin(ellipsoid(p, [0, 0, -0.09], [0.05, 0.06, 0.13]), ellipsoid(p, [0, 0.03 + Math.abs(p[1] - 0.03) * 0.0, -0.21 - Math.abs(p[1] - 0.02) * 0.35], [0.018, 0.17, 0.055]), 0.035), [[-0.08, -0.2, -0.36], [0.08, 0.24, 0.06]], 0.006, () => B), mat);
    const f = face(body, [0, 0.035, 0.265], c, { gap: 0.078, r: 0.026, curve: 0.75, cheeks: false, mouth: false }), an = antenna(body, [0, 0.105, 0.2], c, 0.85);
    // a big friendly grin with two rows of tiny teeth
    const grin = G(body, [0, -0.062, 0.3]); grin.rotation.x = 0.5; const arc = 2.5, gm = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.007, 8, 28, arc), new THREE.MeshStandardMaterial({ color: '#0D3A4A', roughness: 0.5 })); gm.rotation.z = Math.PI + (Math.PI - arc) / 2; gm.position.y = 0.04; grin.add(gm);
    for (let i = 0; i < 7; i++) { const a = Math.PI + (Math.PI - arc) / 2 + (i + 0.5) / 7 * arc, th = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 8), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.3 })); th.position.set(Math.cos(a) * 0.06, 0.04 + Math.sin(a) * 0.06 + 0.008, 0.004); grin.add(th); }
    return { group: g, cy: 0.5, body, tail, face: f, antenna: an, animate(t) {
      const w = Math.sin(t * 5); tail.rotation.y = w * 0.5; body.rotation.set(Math.sin(t * 1.7) * 0.06, -w * 0.09, Math.sin(t * 2.5) * 0.05); body.position.y = 0.5 + Math.sin(t * 1.7) * 0.035; f.set({ lid: blinkAt(t, 7) }); an.rotation.z = D(-w * 10);
    } };
  },
  /** a herring: slim fish that swims on the spot and lets a stream of bubbles go from its tail end */
  fish(c) {
    const g = new THREE.Group(), body = G(g, [0, 0.42, 0]), mat = VINYL({ roughness: 0.36, clearcoat: 0.5, clearcoatRoughness: 0.25, sheen: 0.2 }), B = rgb(c.color), BD = rgb(c.dark), SV = [0.86, 0.95, 0.97];
    M(body, mesh((p) => {
      let d = ellipsoid(p, [0, 0, 0.02], [0.082, 0.125, 0.25]);
      d = smin(d, ellipsoid(p, [0, 0.12, -0.02], [0.016, 0.07, 0.085]), 0.03);                             // dorsal fin
      for (const s of [-1, 1]) d = smin(d, ellipsoid(p, [s * 0.09, -0.05, 0.08], [0.05, 0.016, 0.05]), 0.02);
      return d;
    }, [[-0.17, -0.16, -0.27], [0.17, 0.22, 0.3]], 0.006, (p) => mixc(mixc(B, BD, sstep(0.04, 0.13, p[1])), SV, sstep(0.0, -0.045, p[1]))), mat);
    const tail = G(body, [0, 0, -0.2]);
    M(tail, mesh((p) => smin(ellipsoid(p, [0, 0, -0.05], [0.035, 0.05, 0.09]), ellipsoid(p, [0, 0, -0.16 - Math.abs(p[1]) * 0.3], [0.014, 0.14, 0.05]), 0.03), [[-0.06, -0.17, -0.3], [0.06, 0.17, 0.05]], 0.006, () => B), mat);
    const f = face(body, [0, 0.03, 0.215], c, { gap: 0.066, r: 0.028, curve: 0.8, cheeks: false, mouthY: -0.07, mouthZ: 0.045 }), an = antenna(body, [0, 0.105, 0.14], c, 0.8);
    const bm = new THREE.MeshPhysicalMaterial({ color: '#DFF8FF', roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.9, emissive: '#CFF4FF', emissiveIntensity: 0.9 }), bubbles = [];
    for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), bm); g.add(b); bubbles.push(b); }
    return { group: g, cy: 0.42, body, tail, face: f, antenna: an, bubbles, animate(t) {
      const w = Math.sin(t * 6); tail.rotation.y = w * 0.55; body.rotation.set(Math.sin(t * 1.5) * 0.05, -w * 0.1, 0); body.position.y = 0.42 + Math.sin(t * 1.5) * 0.03; f.set({ lid: blinkAt(t, 11) }); an.rotation.z = D(-w * 10);
      bubbles.forEach((b, i) => { const k = ((t * 1.3 + i / 12) % 1), burst = Math.sin(t * 2.6 + i) > -0.3 ? 1 : 0; b.visible = burst > 0; b.position.set(Math.sin(i * 2.4 + k * 6) * 0.03 * k * 3, 0.36 + k * 0.5, -0.3 - k * 0.12 + Math.cos(i * 1.7) * 0.04); b.scale.setScalar((0.5 + hash(i) * 0.9) * Math.sin(Math.min(1, k * 4) * Math.PI / 2) * (1 - k * k)); });
    } };
  },
  /** a tadpole: big round head-body, wiggling tail with a fin, feathery gills either side (gills.scale to breathe) */
  tadpole(c) {
    const g = new THREE.Group(), body = G(g, [0, 0.3, 0]), mat = VINYL({ roughness: 0.36, clearcoat: 0.5, clearcoatRoughness: 0.25, sheen: 0.2 }), B = rgb(c.color), BL = rgb(c.belly), BD = rgb(c.dark);
    M(body, mesh((p) => smin(ellipsoid(p, [0, 0, 0.02], [0.17, 0.15, 0.2]), ellipsoid(p, [0, -0.02, -0.12], [0.11, 0.1, 0.12]), 0.06), [[-0.2, -0.18, -0.26], [0.2, 0.18, 0.25]], 0.006, (p) => mixc(mixc(BD, B, sstep(-0.02, 0.1, p[1])), BL, sstep(-0.02, -0.08, p[1]))), mat);
    const tail = G(body, [0, -0.01, -0.2]), segs = [];
    let par = tail; for (let i = 0; i < 4; i++) { const sg = G(par, i ? [0, 0, -0.09] : [0, 0, 0]); const w = 1 - i * 0.2; M(sg, mesh((p) => smin(capsule(p, [0, 0, 0], [0, 0, -0.1], 0.045 * w, 0.038 * w), ellipsoid(p, [0, 0, -0.05], [0.01, 0.085 * w, 0.06]), 0.02), [[-0.06, -0.1, -0.16], [0.06, 0.1, 0.06]], 0.005, () => mixc(B, BL, 0.25 * i / 3)), mat); segs.push(sg); par = sg; }
    const gills = [], gm = new THREE.MeshStandardMaterial({ color: '#FF8FA3', roughness: 0.5, emissive: '#FF8FA3', emissiveIntensity: 0.3 });
    for (const s of [-1, 1]) { const gg = G(body, [s * 0.15, 0.02, -0.03]); for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.07, 6, 10), gm); f.position.set(s * 0.04, 0.03 - i * 0.03, -0.01 * i); f.rotation.z = s * (1.1 + i * 0.25); f.castShadow = true; gg.add(f); } gills.push(gg); }
    const f = face(body, [0, 0.05, 0.19], c, { gap: 0.075, r: 0.034, curve: 0.5, mouthY: -0.08, mouthZ: 0.02 }), an = antenna(body, [0, 0.14, 0.06], c, 0.9);
    return { group: g, cy: 0.3, body, tail, segs, gills, face: f, antenna: an, animate(t) {
      segs.forEach((sg, i) => (sg.rotation.y = Math.sin(t * 8 - i * 0.9) * (0.28 + i * 0.08)));
      body.rotation.set(Math.sin(t * 1.6) * 0.04, Math.sin(t * 8) * 0.05, 0); body.position.y = 0.3 + Math.sin(t * 1.6) * 0.025;
      gills.forEach((gg, i) => gg.scale.setScalar(1 + 0.18 * Math.sin(t * 5 + i))); f.set({ lid: blinkAt(t, 13) }); an.rotation.z = D(Math.sin(t * 8) * 8);
    } };
  },
  cat(c) {
    const g = new THREE.Group(), mat = VINYL({ roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4, sheen: 0.3 }), B = rgb(c.color), BL = rgb(c.belly), BD = rgb(c.dark);
    M(g, mesh((p) => {
      let d = ellipsoid(p, [0, 0.165, -0.03], [0.145, 0.175, 0.155]);
      for (const s of [-1, 1]) { d = smin(d, ellipsoid(p, [s * 0.062, 0.035, 0.105], [0.045, 0.04, 0.062]), 0.03); d = smin(d, ellipsoid(p, [s * 0.11, 0.05, -0.02], [0.06, 0.055, 0.1]), 0.04); }   // front paws, haunches
      return smax(d, -(p[1] - 0.001), 0.012);
    }, [[-0.2, -0.02, -0.21], [0.2, 0.37, 0.19]], 0.006, (p) => mixc(mixc(BD, B, sstep(0.0, 0.14, p[1])), BL, sstep(0.1, 0.05, Math.hypot(p[0], p[1] - 0.15, (p[2] - 0.13) * 1.3)))), mat);
    const head = G(g, [0, 0.33, 0.035]);
    M(head, mesh((p) => {
      let d = ellipsoid(p, [0, 0.08, 0], [0.16, 0.128, 0.132]);
      for (const s of [-1, 1]) d = smin(d, capsule(p, [s * 0.09, 0.15, -0.01], [s * 0.125, 0.25, -0.02], 0.052, 0.01), 0.02);            // ears
      return smin(d, ellipsoid(p, [0, 0.045, 0.118], [0.05, 0.034, 0.03]), 0.03);                                                    // muzzle
    }, [[-0.2, -0.07, -0.16], [0.2, 0.29, 0.17]], 0.0055, (p) => mixc(mixc(B, BL, sstep(0.05, 0.02, Math.hypot(p[0] * 0.9, p[1] - 0.045, (p[2] - 0.13)))), [1, 0.62, 0.72], Math.max(...[-1, 1].map((s) => sstep(0.03, 0.015, Math.hypot(p[0] - s * 0.108, p[1] - 0.185)) * sstep(-0.012, 0.0, p[2]))) * 0.8)), mat);
    const nose = M(head, new THREE.SphereGeometry(0.012, 14, 10), new THREE.MeshStandardMaterial({ color: '#FF8FA3', roughness: 0.4 })); nose.scale.set(1.2, 0.8, 0.8); nose.position.set(0, 0.062, 0.149); nose.castShadow = false;
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { const w = M(head, new THREE.CylinderGeometry(0.0022, 0.0012, 0.1, 6), new THREE.MeshStandardMaterial({ color: '#E8FBFF', roughness: 0.4 })); w.rotation.set(0, s * 0.35, Math.PI / 2 + s * (i ? 0.22 : -0.08)); w.position.set(s * 0.1, 0.05 - i * 0.022, 0.118); w.castShadow = false; }
    const f = face(head, [0, 0.105, 0.115], c, { gap: 0.064, r: 0.03, curve: 0.42, mouth: false }), an = antenna(head, [0, 0.2, 0], c, 0.9);
    const tail = G(g, [0, 0.06, -0.16]);
    M(tail, mesh((p) => { let d = capsule(p, [0, 0, 0], [0.02, 0.05, -0.1], 0.036, 0.034); d = smin(d, capsule(p, [0.02, 0.05, -0.1], [0.03, 0.2, -0.13], 0.034, 0.03), 0.03); return smin(d, capsule(p, [0.03, 0.2, -0.13], [0.0, 0.3, -0.08], 0.03, 0.026), 0.03); }, [[-0.06, -0.05, -0.19], [0.08, 0.35, 0.05]], 0.006, (p) => mixc(B, BD, sstep(0.2, 0.3, p[1]))), mat);
    return { group: g, cy: 0.3, head, tail, face: f, antenna: an, animate(t) {
      tail.rotation.set(0, 0, Math.sin(t * 2.6) * 0.35); head.rotation.set(Math.sin(t * 1.3) * 0.04, Math.sin(t * 0.9) * 0.12, Math.sin(t * 1.7) * 0.1); f.set({ lid: Math.max(blinkAt(t, 9), 0.12) }); an.rotation.z = D(Math.sin(t * 2.6) * 8);
    } };
  },
};

// ═════════════════════════ SHIFTER ═════════════════════════
export class Shifter {
  /** o = { color, belly, glow, cheek, scale, forms: [...names from FORMS], charge (s before the word), settle (s after) } */
  constructor(o = {}) {
    const c = { color: '#17A9C9', belly: '#7FDDEC', dark: '#0F7896', darker: '#0A566E', glow: '#FFD43B', cheek: '#FF8FA3', scale: 1.25, forms: Object.keys(FORMS), charge: 0.24, settle: 0.42, ...o };
    this.o = c; this.group = new THREE.Group();
    this.buddy = new Buddy({ color: c.color, belly: c.belly, glow: c.glow, cheek: c.cheek, scale: 1 });
    this.forms = { blip: { group: this.buddy.group, cy: 0.22, buddy: this.buddy } };
    for (const n of c.forms) this.forms[n] = FORMS[n](c);
    this.buddy.spark.material.userData.dyn = true;
    this.glowCol = new THREE.Color(c.glow).lerp(new THREE.Color('#FFFFFF'), 0.45);
    for (const f of Object.values(this.forms)) {
      f.holder = G(this.group); f.holder.add(f.group); f.holder.scale.setScalar(c.scale); f.holder.visible = false; f.mats = new Set();
      f.group.traverse((m) => { if (m.isMesh && m.material && (m.material.emissive || m.material.uniforms?.uS)) f.mats.add(m.material); });
      f.mats.forEach((m) => { m.userData.e0 = m.emissive ? m.emissive.clone() : null; m.userData.i0 = m.emissiveIntensity ?? 0; });
      if (f.heart) f.heart.material.userData.dyn = true;
    }
    // the transformation effect: a flash ball, a ring of sparks and a burst of light
    this.fx = G(this.group);
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: this.glowCol.clone().multiplyScalar(3), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); this.fx.add(this.flash);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 64), new THREE.MeshBasicMaterial({ color: this.glowCol.clone().multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); this.ring.rotation.x = Math.PI / 2; this.fx.add(this.ring);
    this.sparks = []; const sg = new THREE.SphereGeometry(0.02, 10, 8), sm = new THREE.MeshBasicMaterial({ color: this.glowCol.clone().multiplyScalar(2.6) });
    for (let i = 0; i < 18; i++) { const s = new THREE.Mesh(sg, sm); this.fx.add(s); this.sparks.push(s); }
    this.light = new THREE.PointLight(c.glow, 0, 4, 1.6); this.fx.add(this.light);
  }
  /** the form showing at time t and the change in progress. plan = [{ t, form }] in time order (before the first: 'blip'; an entry may carry its own shorter `charge`) */
  state(t, plan) {
    const { charge, settle } = this.o; let cur = 'blip', hit = -1e9, n = -1, next = null;
    for (let i = 0; i < plan.length; i++) { if (plan[i].t <= t) { cur = plan[i].form; hit = plan[i].t; n = i; } else { next = plan[i]; break; } }
    const since = t - hit, ch = next ? eio(seg(t, next.t - (next.charge ?? charge), next.t)) : 0, arrive = clamp(since / settle);
    return { form: cur, next: next && next.form, n, since, charge: ch, arrive, flash: Math.max(since < 0.2 ? 1 - eo(since / 0.2) : 0, ch * ch * 0.4), kick: since < 0.6 ? Math.exp(-since * 7) * (1 - Math.exp(-since * 60)) : 0,
      xray: cur === 'xray' ? eo(clamp(since / 0.25)) : n >= 1 && plan[n - 1].form === 'xray' ? 1 - eo(clamp(since / 0.3)) : 0 };
  }
  /**
   * Call every frame. opts.blip = Buddy.set() args for the Blip form (hops, waves...). Other forms run their own idle
   * animation; pose them further through blip.forms.<name> after this call. Returns state() for camera, 2D and mood.
   */
  update(t, plan, opts = {}) {
    const s = this.state(t, plan), c = this.o;
    for (const [name, f] of Object.entries(this.forms)) f.holder.visible = name === s.form;
    const f = this.forms[s.form]; this.current = f;
    if (s.form === 'blip') this.buddy.set(opts.blip || {}); else f.animate(t);
    // glow: charging up before the change, cooling down after it
    const g = Math.max(s.charge, s.since < 0.45 ? 1 - eo(s.since / 0.45) : 0);
    f.mats.forEach((m) => {
      if (m.uniforms?.uS) { m.uniforms.uS.value = 1.15 + g * 1.6; return; }
      const base = m.userData.dyn ? m.emissiveIntensity : m.userData.i0;                                   // dyn = animated every frame (spark, heart)
      m.emissive.copy(m.userData.e0).lerp(this.glowCol, Math.min(1, g * 1.4)); m.emissiveIntensity = lerp(base, 1.5, g);
    });
    // scale: shiver and shrink while charging, spring out of the flash on arrival (stretch first, then settle)
    const sh = s.charge * 0.035, pop = s.arrive < 1 ? spring(s.arrive) : 1, st = s.since < 0.5 ? wobble(s.since / 0.5, 2, 4) * 0.22 : 0, k = (0.45 + 0.55 * pop) * (1 - s.charge * 0.3);
    f.holder.scale.set(k * c.scale * (1 - st * 0.5 + s.charge * 0.12), k * c.scale * (1 + st - s.charge * 0.2), k * c.scale * (1 - st * 0.5 + s.charge * 0.12));
    f.holder.position.set(Math.sin(t * 91) * sh, 0, Math.cos(t * 77) * sh);
    // effect
    const cy = f.cy * c.scale, a = s.since, on = a >= 0 && a < 0.55; this.fx.position.y = cy;
    this.flash.visible = s.flash > 0.01; this.flash.scale.setScalar((0.14 + 0.24 * (a < 0.2 ? eo(clamp(a / 0.1)) : 0)) * c.scale); this.flash.material.opacity = Math.min(0.75, s.flash * 0.8);
    this.ring.visible = on; if (on) { this.ring.scale.setScalar(0.15 + eo(a / 0.55) * 1.1 * c.scale); this.ring.material.opacity = 1 - a / 0.55; this.ring.position.y = -cy + 0.03; }
    this.sparks.forEach((p, i) => { p.visible = on; if (!on) return; const th = hash(i) * 6.283, ph = (hash(i + 40) - 0.35) * 2.2, r = eo(a / 0.55) * (0.45 + hash(i + 80) * 0.5) * c.scale; p.position.set(Math.cos(th) * Math.cos(ph) * r, Math.sin(ph) * r - a * a * 0.9, Math.sin(th) * Math.cos(ph) * r); p.scale.setScalar((1 - a / 0.55) * (0.6 + hash(i + 9) * 1.2)); });
    this.light.intensity = s.flash * 7;
    this.group.updateMatrixWorld(true);
    return s;
  }
  /** sound for every change in the plan: a rising sparkle while he charges, a whoosh + pop on the change */
  static cues(plan, cue, charge = 0.24) { for (const p of plan) { cue(p.t - (p.charge ?? charge), 'zip', { gain: 0.55 }); cue(p.t - 0.02, 'whoosh'); cue(p.t, 'pop'); cue(p.t + 0.02, 'sparkle', { dur: 0.7, gain: 0.6 }); } }
}
Shifter.FORMS = FORMS;
