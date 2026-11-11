// Body Glitch cast, v2: a smooth vinyl-toy host and his sidekick, sculpted from SDFs like everything else in Deep Dive.
//   const host = new Host({ hoodie, trim, tee, pants, shoes, skin, hair, badge: '?' });   scene.add(host.group)
//   host.pose({ ...same joints as Human..., lid, look, brow: [raise, tilt], mouth, smile, squash })
//   const blip = new Buddy({ color, glow, scale });   blip.set({ y, squash, tilt, turn, armL, armR, lid, look, mouth, lean })
// Host is a drop-in for Human in shots (same pose() joints, .spine, .hips, .parts[0] = torso, setBodyMaterial()).
// Sizes: host is 1.58 m tall, face at y 1.35, chest at y 1.0. Buddy is 0.42 m x scale.
import * as THREE from 'three';
import { sphere, ellipsoid, capsule, smin, smax, mesh, rgb } from './sdf.js';

const D = THREE.MathUtils.degToRad;
const cache = new Map();
const sculpt = (key, f, bounds, step, color) => { if (!cache.has(key)) cache.set(key, mesh(f, bounds, step, color)); return cache.get(key); };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

/** soft vinyl: matte with a velvet edge and a faint clear coat, so the shapes read smooth under studio light */
export const VINYL = (o = {}) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.66, sheen: 0.22, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffe9dc'), clearcoat: 0.08, clearcoatRoughness: 0.6, ...o });
const GLOSS = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, ...o });

function roundRect(s, x, y, w, h, r) { s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
function badgeTex(text, bg, fg) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.roundRect(8, 8, 240, 240, 56); g.fill(); g.fillStyle = fg; g.font = '900 170px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ═════════════════════════ HOST ═════════════════════════
export class Host {
  constructor(o = {}) {
    const c = { skin: '#E9B08C', hoodie: '#2E3038', trim: '#FF9A1F', tee: '#DDD8CE', pants: '#23252D', shoes: '#F5F3EE', sole: '#FF9A1F', hair: '#221A17', frames: '#141416', badge: '?', glasses: true, ...o };
    this.o = c; const K = JSON.stringify(c);
    const S = rgb(c.skin), HO = rgb(c.hoodie), HD = mixc(rgb(c.hoodie), [0, 0, 0], 0.28), TR = rgb(c.trim), TE = rgb(c.tee), PA = rgb(c.pants), SO = rgb(c.shoes), SL = rgb(c.sole), HA = rgb(c.hair);
    this.mat = VINYL(); this.parts = [];
    const add = (parent, geo, pos = [0, 0, 0], mat = this.mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.position.set(...pos); parent.add(m); if (mat === this.mat) this.parts.push(m); return m; };
    const G = (parent, pos) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };

    this.group = new THREE.Group(); this.root = G(this.group, [0, 0, 0]); this.root.scale.setScalar(c.scale || 1);
    this.hips = G(this.root, [0, 0.72, 0]);
    this.spine = G(this.hips, [0, 0.02, 0]);
    // torso: open hoodie over a tee, hood resting behind the neck. parts[0] (scale it to breathe)
    const teeW = (y) => 0.01 + 0.1 * sstep(0.1, 0.37, y);
    add(this.spine, sculpt('h-torso' + K, (p) => {
      let d = ellipsoid(p, [0, 0.245, 0], [0.172, 0.15, 0.122]);
      d = smin(d, ellipsoid(p, [0, 0.09, 0.006], [0.163, 0.15, 0.122]), 0.09);
      d = smin(d, ellipsoid(p, [0, -0.035, 0.002], [0.168, 0.062, 0.126]), 0.05);                         // hem band
      d = smin(d, capsule(p, [-0.135, 0.335, -0.004], [0.135, 0.335, -0.004], 0.064), 0.07);              // shoulders
      d = smin(d, ellipsoid(p, [0, 0.365, -0.075], [0.125, 0.07, 0.07]), 0.04);                           // hood
      d = smin(d, capsule(p, [0, 0.34, 0.004], [0, 0.47, 0.008], 0.05, 0.046), 0.035);                    // neck
      return d;
    }, [[-0.27, -0.13, -0.19], [0.27, 0.5, 0.17]], 0.0055, (p) => {
      const ax = Math.abs(p[0]), neck = capsule(p, [0, 0.34, 0.004], [0, 0.5, 0.008], 0.052);
      let col = mixc(HD, HO, sstep(-0.05, -0.03, p[1]));                                                   // darker hem
      if (p[2] > 0.0) {
        const w = teeW(p[1]), open = sstep(0.1, 0.13, p[1]);
        col = mixc(col, TR, sstep(0.012, 0.007, Math.abs(ax - w)) * (p[1] < 0.385 ? 1 : 0));              // zip + lapel trim
        col = mixc(col, TE, sstep(w - 0.004, w - 0.009, ax) * open);                                       // tee
      }
      return mixc(col, S, sstep(0.006, -0.002, neck) * sstep(0.372, 0.384, p[1]));
    }));
    for (const s of [-1, 1]) {                                                                              // drawstrings
      const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.085, 6, 12), new THREE.MeshStandardMaterial({ color: c.trim, roughness: 0.5 }));
      st.position.set(s * 0.062, 0.265, 0.121); st.rotation.set(0.1, 0, s * -0.1); st.castShadow = true; this.spine.add(st);
    }
    if (c.badge) {
      const b = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), new THREE.MeshStandardMaterial({ map: badgeTex(c.badge, c.trim, '#1b1b1f'), roughness: 0.4, transparent: true }));
      b.position.set(0.105, 0.2, 0.116); b.rotation.set(-0.05, 0.5, 0); this.spine.add(b); this.badge = b;
    }
    add(this.hips, sculpt('h-pelvis' + c.pants, (p) => ellipsoid(p, [0, -0.03, 0], [0.152, 0.095, 0.112]), [[-0.18, -0.15, -0.14], [0.18, 0.09, 0.14]], 0.007, () => PA));

    // head: big, smooth, almost no detail; the acting comes from the eyes, brows and mouth
    this.head = G(this.spine, [0, 0.43, 0]);
    add(this.head, sculpt('h-head' + c.skin, (p) => {
      let d = ellipsoid(p, [0, 0.19, 0], [0.158, 0.172, 0.16]);
      d = smin(d, ellipsoid(p, [0, 0.112, 0.014], [0.15, 0.112, 0.142]), 0.07);                            // cheeks + jaw
      for (const s of [-1, 1]) d = smin(d, ellipsoid(p, [s * 0.158, 0.15, -0.012], [0.02, 0.04, 0.03]), 0.016); // ears
      d = smin(d, ellipsoid(p, [0, 0.137, 0.156], [0.02, 0.022, 0.022]), 0.022);                           // nose
      return d;
    }, [[-0.2, -0.03, -0.19], [0.2, 0.39, 0.2]], 0.0045, () => S));
    add(this.head, sculpt('h-hair' + c.hair, (p) => {
      let d = ellipsoid(p, [0, 0.2, -0.014], [0.171, 0.186, 0.176]);
      const front = sstep(-0.05, 0.13, p[2]), side = sstep(0.09, 0.16, Math.abs(p[0]));
      d = smax(d, -(p[1] - (0.1 + 0.172 * front - 0.02 * side)), 0.03);                                    // hairline: nape → temples → forehead
      d = smin(d, ellipsoid(p, [0.008, 0.335, -0.01], [0.135, 0.062, 0.14]), 0.05);                        // volume on top
      for (let i = 0; i < 4; i++) {                                                                        // big swept locks, left to right
        const u = i / 3 - 0.5, x0 = u * 0.2 - 0.03, x1 = u * 0.25 + 0.035;
        d = smin(d, capsule(p, [x0, 0.345, -0.01], [x1, 0.288, 0.135 - Math.abs(u) * 0.05], 0.058, 0.04), 0.035);
      }
      d = smin(d, capsule(p, [-0.1, 0.33, 0.06], [-0.158, 0.25, 0.07], 0.04, 0.026), 0.02);                // the two side sweeps
      d = smin(d, capsule(p, [0.11, 0.33, 0.05], [0.166, 0.262, 0.062], 0.04, 0.028), 0.02);
      return d;
    }, [[-0.23, 0.06, -0.21], [0.23, 0.43, 0.21]], 0.0045, () => HA), [0, 0, 0], VINYL({ roughness: 0.48, sheen: 0.25, sheenColor: new THREE.Color('#6a5a55'), clearcoat: 0.2 }));

    // face rig
    const ink = new THREE.MeshStandardMaterial({ color: '#0B0B0D', roughness: 0.3, envMapIntensity: 0.25 }), glint = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    this.eyes = []; this.brows = [];
    for (const s of [-1, 1]) {
      const e = G(this.head, [s * 0.06, 0.176, 0.157]); e.rotation.y = s * 0.33; this.eyes.push(e);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), ink); ball.scale.set(0.0185, 0.026, 0.009); e.add(ball);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 16, 12), glint); hl.position.set(0.006, 0.01, 0.0075); e.add(hl);
      const br = G(this.head, [s * 0.062, 0.243, 0.15]); br.rotation.y = s * 0.36;
      const bm = new THREE.Mesh(new THREE.CapsuleGeometry(0.0062, 0.036, 8, 16), new THREE.MeshStandardMaterial({ color: c.hair, roughness: 0.6 })); bm.rotation.z = Math.PI / 2; br.add(bm); this.brows.push(br);
    }
    const mo = G(this.head, [0, 0.083, 0.1585]); mo.rotation.x = 0.16; this.mouthG = mo;
    const arc = 2.1, lipM = new THREE.MeshStandardMaterial({ color: '#7A3B33', roughness: 0.6 });
    this.smileM = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0042, 10, 32, arc), lipM); this.smileM.rotation.z = Math.PI + (Math.PI - arc) / 2; this.smileM.position.y = 0.026; mo.add(this.smileM);
    this.openM = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshStandardMaterial({ color: '#4A1B1F', roughness: 0.5 })); mo.add(this.openM);
    this.tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: '#E0707C', roughness: 0.5 })); mo.add(this.tongue);

    if (c.glasses) {
      const gl = G(this.head, [0, 0.176, 0.176]), fm = GLOSS(c.frames, { roughness: 0.3 }); this.glasses = gl;
      for (const s of [-1, 1]) {
        const sh = roundRect(new THREE.Shape(), -0.05, -0.039, 0.1, 0.078, 0.024); sh.holes.push(roundRect(new THREE.Path(), -0.039, -0.028, 0.078, 0.056, 0.016));
        const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 3, curveSegments: 10 }), fm);
        rim.position.set(s * 0.064, 0, -0.004); rim.rotation.y = s * 0.2; rim.castShadow = true; gl.add(rim);
        const lens = new THREE.Mesh(new THREE.ShapeGeometry(roundRect(new THREE.Shape(), -0.04, -0.029, 0.08, 0.058, 0.017)), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.025, roughness: 0.3, depthWrite: false }));
        lens.position.set(s * 0.064, 0, 0.001); lens.rotation.y = s * 0.2; gl.add(lens);
        const a = new THREE.Vector3(s * 0.113, 0.012, -0.012), b = new THREE.Vector3(s * 0.166, 0.004, -0.18), temple = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, a.distanceTo(b)), fm);
        temple.position.copy(a).add(b).multiplyScalar(0.5); temple.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize()); gl.add(temple);
      }
      const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.022, 6, 12), fm); bridge.rotation.z = Math.PI / 2; bridge.position.set(0, 0.012, 0.004); gl.add(bridge);
    }

    // arms: sleeve, cuff, mitten hand with a thumb
    this.arm = {};
    for (const s of [-1, 1]) {
      const k = s < 0 ? 'L' : 'R', sh = G(this.spine, [s * 0.19, 0.33, -0.004]);
      add(sh, sculpt('h-uarm' + c.hoodie, (p) => capsule(p, [0, 0, 0], [0, -0.2, 0], 0.062, 0.054), [[-0.09, -0.27, -0.09], [0.09, 0.08, 0.09]], 0.0055, () => HO));
      const el = G(sh, [0, -0.2, 0]);
      add(el, sculpt('h-farm' + s + K, (p) => {
        let d = capsule(p, [0, 0, 0], [0, -0.15, 0.003], 0.054, 0.05);
        d = smin(d, ellipsoid(p, [0, -0.168, 0.003], [0.054, 0.024, 0.054]), 0.012);                       // cuff
        d = smin(d, ellipsoid(p, [0, -0.232, 0.006], [0.043, 0.052, 0.036]), 0.02);                        // hand
        return smin(d, capsule(p, [-s * 0.03, -0.205, 0.016], [-s * 0.05, -0.235, 0.03], 0.016, 0.014), 0.014); // thumb
      }, [[-0.09, -0.3, -0.08], [0.09, 0.07, 0.09]], 0.005, (p) => mixc(mixc(HO, HD, sstep(-0.15, -0.158, p[1])), S, sstep(-0.19, -0.197, p[1]))));
      this.arm[k] = { sh, el };
    }
    // legs: tapered trousers into chunky sneakers with a coloured sole
    this.leg = {};
    for (const s of [-1, 1]) {
      const k = s < 0 ? 'L' : 'R', hip = G(this.hips, [s * 0.076, -0.03, 0]);
      add(hip, sculpt('h-thigh' + c.pants, (p) => capsule(p, [0, 0, 0], [0, -0.32, 0.004], 0.078, 0.064), [[-0.1, -0.4, -0.1], [0.1, 0.09, 0.1]], 0.0065, () => PA));
      const kn = G(hip, [0, -0.32, 0.004]);
      add(kn, sculpt('h-shin' + c.pants + c.shoes + c.sole, (p) => {
        let d = capsule(p, [0, 0, 0], [0, -0.26, -0.004], 0.064, 0.054);
        d = smin(d, ellipsoid(p, [0, -0.318, 0.036], [0.066, 0.056, 0.118]), 0.03);
        return smax(d, -(p[1] + 0.37), 0.012);
      }, [[-0.1, -0.39, -0.1], [0.1, 0.08, 0.18]], 0.0055, (p) => mixc(mixc(PA, SO, sstep(-0.265, -0.275, p[1])), SL, sstep(-0.338, -0.346, p[1]))));
      this.leg[k] = { hip, kn };
    }
    this.pose({});
  }
  /**
   * Pose in degrees, same joints as Human: spine/head [x, y, z] · shL/shR [forward, twist, out] · elL/elR bend ·
   * hipL/hipR [forward, twist, out] · knL/knR bend. Face: lid (-0.4 wide … 0 … 1 closed) · look [x, y] (-1..1) ·
   * brow [raise -1..1, tilt -1 angry … 1 worried] or { L: [..], R: [..] } · mouth 0..1 open · smile -1..1 ·
   * squash (-0.3 squashed … 0 … 0.3 stretched, volume kept) · headSquash (same, head only).
   */
  pose(q = {}) {
    const r3 = (g, a = [0, 0, 0]) => g.rotation.set(D(a[0] || 0), D(a[1] || 0), D(a[2] || 0));
    r3(this.spine, q.spine); r3(this.head, q.head);
    r3(this.arm.L.sh, [-(q.shL?.[0] ?? 0), q.shL?.[1] ?? 0, -(q.shL?.[2] ?? 7)]); this.arm.L.el.rotation.set(-D(q.elL ?? 12), 0, 0);
    r3(this.arm.R.sh, [-(q.shR?.[0] ?? 0), q.shR?.[1] ?? 0, q.shR?.[2] ?? 7]); this.arm.R.el.rotation.set(-D(q.elR ?? 12), 0, 0);
    r3(this.leg.L.hip, [-(q.hipL?.[0] ?? 0), q.hipL?.[1] ?? 0, -(q.hipL?.[2] ?? 2)]); this.leg.L.kn.rotation.set(D(q.knL ?? 2), 0, 0);
    r3(this.leg.R.hip, [-(q.hipR?.[0] ?? 0), q.hipR?.[1] ?? 0, q.hipR?.[2] ?? 2]); this.leg.R.kn.rotation.set(D(q.knR ?? 2), 0, 0);
    // face
    const lid = q.lid ?? 0, open = cl(1 - lid, 0.07, 1.4), lx = cl(q.look?.[0] ?? 0, -1, 1), ly = cl(q.look?.[1] ?? 0, -1, 1);
    this.eyes.forEach((e, i) => { const s = i ? 1 : -1; e.scale.set(1 + (1 - Math.min(open, 1)) * 0.25, open, 1); e.position.set(s * 0.06 + lx * 0.009, 0.176 + ly * 0.008, 0.157); });
    this.brows.forEach((b, i) => { const s = i ? 1 : -1, v = (q.brow && !Array.isArray(q.brow) ? q.brow[i ? 'R' : 'L'] : q.brow) || [0, 0]; b.position.y = 0.243 + (v[0] || 0) * 0.017 - Math.max(0, lid) * 0.006; b.rotation.z = -s * (v[1] || 0) * 0.42; });
    const m = cl(q.mouth ?? 0, 0, 1), sm = cl(q.smile ?? 0.5, -1, 1), closed = 1 - sstep(0.04, 0.16, m);
    this.smileM.visible = closed > 0.01; this.smileM.scale.set(0.75 + 0.25 * Math.abs(sm), sm * closed || 0.001, 1); this.smileM.position.y = 0.026 * sm * closed;
    this.openM.visible = m > 0.04; this.openM.scale.set(0.022 + 0.008 * Math.max(0, sm) - 0.003 * m, 0.004 + 0.019 * m, 0.006); this.openM.position.y = -0.008 * m;
    this.tongue.visible = m > 0.6; this.tongue.scale.set(0.012, 0.007 * m, 0.003); this.tongue.position.set(0, -0.008 * m - 0.013 * m, 0.0045);
    // squash and stretch (volume preserving)
    const sq = q.squash ?? 0, hs = q.headSquash ?? 0, inv = (v) => 1 / Math.sqrt(1 + v);
    this.group.scale.set(inv(sq), 1 + sq, inv(sq)); this.head.scale.set(inv(hs), 1 + hs, inv(hs));
    this.group.updateMatrixWorld(true);
  }
  /** walking pose at phase ph (radians); extra = more joints to merge (face etc.) */
  walk(ph, amt = 1, extra = {}) { const s = Math.sin(ph) * amt; this.pose({ hipL: [s * 28, 0, 2], hipR: [-s * 28, 0, 2], knL: Math.max(0, -Math.sin(ph + 0.6)) * 46 * amt + 4, knR: Math.max(0, Math.sin(ph + 0.6)) * 46 * amt + 4, shL: [-s * 24, 0, 7], shR: [s * 24, 0, 7], elL: 22, elR: 22, spine: [3, s * 5, 0], head: [-2, -s * 3, 0], ...extra }); this.hips.position.y = 0.72 - Math.abs(Math.cos(ph)) * 0.014 * amt; }
  /** swap the body (not the head) to another material, e.g. x-ray glass; null restores */
  setBodyMaterial(m) { this.parts.forEach((p) => { if (p.parent !== this.head) { p.material = m || this.mat; p.castShadow = !m; } }); if (this.badge) this.badge.visible = !m; }
  setAllMaterial(m) { this.parts.forEach((p) => (p.material = m || this.mat)); }
}

// ═════════════════════════ BUDDY (Blip, the glitch cell) ═════════════════════════
export class Buddy {
  constructor(o = {}) {
    const c = { color: '#17A9C9', belly: '#7FDDEC', glow: '#FFD43B', cheek: '#FF8FA3', scale: 1.25, ...o };
    this.o = c; const B = rgb(c.color), BL = rgb(c.belly), BD = mixc(rgb(c.color), [0, 0.05, 0.2], 0.35);
    this.mat = VINYL({ roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.15, sheenColor: new THREE.Color('#bff4ff') });
    const M = (parent, geo, mat = this.mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    const G = (parent, pos) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };
    this.group = new THREE.Group(); this.root = G(this.group, [0, 0, 0]); this.root.scale.setScalar(c.scale);
    this.body = G(this.root, [0, 0.03, 0]);                                                                 // pivots at the feet for tilts and squash
    M(this.body, sculpt('b-body' + c.color + c.belly, (p) => {
      let d = ellipsoid(p, [0, 0.215, 0], [0.178, 0.185, 0.165]);
      d = smin(d, ellipsoid(p, [0, 0.125, 0.004], [0.2, 0.125, 0.182]), 0.09);
      return smin(d, capsule(p, [0, 0.38, 0], [0, 0.415, 0], 0.03, 0.014), 0.04);                           // little peak the antenna grows from
    }, [[-0.24, -0.03, -0.22], [0.24, 0.46, 0.22]], 0.005, (p) => mixc(mixc(BD, B, sstep(0.0, 0.16, p[1])), BL, sstep(0.105, 0.06, Math.hypot(p[0] * 0.9, p[1] - 0.11, (p[2] - 0.2) * 1.1)))));
    // antenna: springy stalk with a glowing tip (the "glitch spark")
    this.antenna = G(this.body, [0, 0.415, 0]);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.01, 0), new THREE.Vector3(0.004, 0.035, 0), new THREE.Vector3(0.022, 0.066, 0), new THREE.Vector3(0.046, 0.078, 0)]);
    M(this.antenna, new THREE.TubeGeometry(curve, 24, 0.008, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(...BD), roughness: 0.4 }));
    this.spark = M(this.antenna, new THREE.SphereGeometry(0.027, 24, 16), new THREE.MeshStandardMaterial({ color: c.glow, emissive: c.glow, emissiveIntensity: 1.6, roughness: 0.3 })); this.spark.position.set(0.052, 0.082, 0); this.spark.castShadow = false;
    // face
    const ink = new THREE.MeshStandardMaterial({ color: '#0A0E12', roughness: 0.3, envMapIntensity: 0.25 }), glint = new THREE.MeshBasicMaterial({ color: '#FFFFFF' }); this.eyes = [];
    for (const s of [-1, 1]) {
      const e = G(this.body, [s * 0.066, 0.238, 0.153]); e.rotation.set(-0.1, s * 0.4, 0); this.eyes.push(e);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), ink); ball.scale.set(0.03, 0.03, 0.011); e.add(ball);
      const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 16, 12), glint); h1.position.set(0.009, 0.011, 0.0085); e.add(h1);
      const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.004, 12, 8), glint); h2.position.set(-0.01, -0.01, 0.009); e.add(h2);
      const ch = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: c.cheek, roughness: 0.7, transparent: true, opacity: 0.85 })); ch.scale.set(0.022, 0.013, 0.004); ch.position.set(s * 0.112, 0.188, 0.142); ch.rotation.y = s * 0.66; this.body.add(ch);
    }
    const mo = G(this.body, [0, 0.188, 0.189]); mo.rotation.x = -0.05; const arc = 2.2;
    this.smileM = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0042, 10, 28, arc), new THREE.MeshStandardMaterial({ color: '#0D3A4A', roughness: 0.5 })); this.smileM.rotation.z = Math.PI + (Math.PI - arc) / 2; this.smileM.position.y = 0.016; mo.add(this.smileM);
    this.openM = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshStandardMaterial({ color: '#0D3A4A', roughness: 0.5 })); mo.add(this.openM);
    // arms + feet
    this.arms = [], this.feet = [];
    for (const s of [-1, 1]) {
      const a = G(this.body, [s * 0.178, 0.185, 0.01]);
      M(a, sculpt('b-arm' + c.color, (p) => capsule(p, [0, 0.005, 0], [0, -0.075, 0], 0.03, 0.036), [[-0.06, -0.13, -0.06], [0.06, 0.05, 0.06]], 0.005, () => B)); this.arms.push(a);
      const f = G(this.root, [s * 0.085, 0.032, 0.03]);
      M(f, sculpt('b-foot' + c.color, (p) => smax(ellipsoid(p, [0, 0, 0], [0.058, 0.04, 0.082]), -(p[1] + 0.03), 0.01), [[-0.08, -0.05, -0.11], [0.08, 0.06, 0.11]], 0.005, () => BD)); this.feet.push(f);
    }
    this.set({});
  }
  /**
   * y (m, lift off the floor) · squash (-0.35 … 0.35, volume kept) · tilt [x, z] degrees (leans from the feet) ·
   * turn (deg) · armL/armR (deg out from the side; 150 = up in the air) · lid (-0.3 wide … 1 closed) · look [x, y] ·
   * mouth 0..1 · smile -1..1 · lean (deg, antenna follow-through) · glow (spark brightness) · feet (0..1 tucked up when airborne)
   */
  set(q = {}) {
    const sq = q.squash ?? 0, inv = 1 / Math.sqrt(1 + sq), y = q.y ?? 0, tuck = q.feet ?? cl(y / 0.08, 0, 1);
    this.root.position.y = y; this.root.rotation.y = D(q.turn ?? 0);
    this.body.scale.set(inv, 1 + sq, inv); this.body.rotation.set(D(q.tilt?.[0] ?? 0), 0, D(q.tilt?.[1] ?? 0));
    this.arms.forEach((a, i) => { const s = i ? 1 : -1; a.rotation.set(0, 0, s * D((i ? q.armR : q.armL) ?? 14)); });
    this.feet.forEach((f, i) => { f.position.y = 0.032 + tuck * 0.012; f.rotation.x = tuck * 0.5; });
    const lid = q.lid ?? 0, open = cl(1 - lid, 0.08, 1.35), lx = cl(q.look?.[0] ?? 0, -1, 1), ly = cl(q.look?.[1] ?? 0, -1, 1);
    this.eyes.forEach((e, i) => { const s = i ? 1 : -1; e.scale.set(1 + (1 - Math.min(open, 1)) * 0.2, open, 1); e.position.set(s * 0.066 + lx * 0.012, 0.238 + ly * 0.01, 0.153); });
    const m = cl(q.mouth ?? 0, 0, 1), sm = cl(q.smile ?? 0.8, -1, 1), closed = 1 - sstep(0.04, 0.16, m);
    this.smileM.visible = closed > 0.01; this.smileM.scale.set(1, sm * closed || 0.001, 1); this.smileM.position.y = 0.016 * sm * closed;
    this.openM.visible = m > 0.04; this.openM.scale.set(0.019 - 0.004 * m, 0.004 + 0.022 * m, 0.006); this.openM.position.y = -0.008 * m;
    this.antenna.rotation.set(0, 0, D(q.lean ?? 0)); this.spark.material.emissiveIntensity = q.glow ?? 1.6;
    this.group.updateMatrixWorld(true);
  }
}
