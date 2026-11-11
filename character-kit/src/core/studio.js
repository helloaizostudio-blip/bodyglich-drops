// The Body Glitch studio: a dark glossy stage in front of one huge soft glowing backdrop, so the host reads as a clean
// silhouette with a coloured rim. studio(E, { tint, tint2, floor }) → { scene, lights, glow }. People stand on y = 0, face +z.
import * as THREE from 'three';
import { lightRig } from './engine.js';

function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

export function studio(E, o = {}) {
  const c = { tint: '#FFB21F', tint2: '#FF6A2B', dark: '#101014', props: true, ...o };
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.22; scene.background = new THREE.Color(c.dark);
  // backdrop: cloudy two-tone glow, brightest behind the host
  const glowT = tex(512, 512, (g, w, h) => {
    g.fillStyle = c.tint2; g.fillRect(0, 0, w, h);
    const blob = (x, y, r, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalAlpha = 1; };
    blob(256, 300, 330, c.tint, 1); blob(120, 180, 190, '#FFFFFF', 0.28); blob(400, 360, 210, '#FFFFFF', 0.2); blob(330, 120, 200, c.tint2, 0.55); blob(90, 420, 180, c.tint2, 0.5);
    const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0.25)'); v.addColorStop(0.3, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 5.2, 48, 1, true, Math.PI * 0.62, Math.PI * 0.76), new THREE.MeshBasicMaterial({ map: glowT, side: THREE.BackSide, color: new THREE.Color(1.0, 1.0, 1.0) }));
  wall.position.set(0, 2.3, 3.4); scene.add(wall);
  // floor: dark and glossy, with the backdrop's glow pooling on it (a painted reflection)
  const floorT = tex(512, 512, (g, w, h) => {
    g.fillStyle = c.dark; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c.tint); gr.addColorStop(0.42, 'rgba(0,0,0,0)'); g.globalAlpha = 0.6; g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sp = g.createRadialGradient(256, 250, 0, 256, 250, 190); sp.addColorStop(0, c.tint); sp.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 0.2; g.fillStyle = sp; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), std('#ffffff', 0.34, { map: floorT, metalness: 0.15 })); floor.rotation.x = -Math.PI / 2; floor.position.z = -1; floor.receiveShadow = true; scene.add(floor);
  // stage marks + the dark header with a light strip (frames the top of a 9:16 shot)
  const lineM = new THREE.MeshBasicMaterial({ color: new THREE.Color(c.tint).multiplyScalar(0.9), transparent: true, opacity: 0.55 });
  for (const [w, d, x, z] of [[6, 0.012, 0, -0.9], [0.012, 3.2, 0.95, 0.4]]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineM); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.002, z); scene.add(l); }
  const header = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, 0.4), std(c.dark, 0.9)); header.position.set(0, 3.75, -2.2); scene.add(header);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(16, 0.035, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(c.tint).multiplyScalar(2.2) })); strip.position.set(0, 2.9, -1.98); scene.add(strip);
  if (c.props) {
    const black = std('#16161a', 0.5), sh = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
    // softbox on a stand, back right
    const box = new THREE.Group(); box.position.set(1.2, 0, -1.9); box.rotation.y = -0.7; scene.add(box);
    const pole = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.9, 12), black)); pole.position.y = 0.95; box.add(pole);
    for (let i = 0; i < 3; i++) { const leg = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 8), black)); leg.position.set(Math.sin(i * 2.094) * 0.22, 0.2, Math.cos(i * 2.094) * 0.22); leg.rotation.set(Math.cos(i * 2.094) * 0.75, 0, -Math.sin(i * 2.094) * 0.75); box.add(leg); }
    const hood = sh(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.3), black)); hood.position.set(0, 1.9, 0); box.add(hood);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.15, 0.7) })); face.position.set(0, 1.9, 0.152); box.add(face);
    // an apple box and a stool, back left
    const crate = sh(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.4), std('#2a2a30', 0.7))); crate.position.set(-1.0, 0.15, -1.7); crate.rotation.y = 0.4; scene.add(crate);
    const seat = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 32), std(c.tint2, 0.5))); seat.position.set(-0.7, 0.68, -2.3); scene.add(seat);
    for (let i = 0; i < 4; i++) { const leg = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.68, 8), black)); leg.position.set(-0.7 + Math.sin(i * 1.571 + 0.78) * 0.14, 0.34, -2.3 + Math.cos(i * 1.571 + 0.78) * 0.14); scene.add(leg); }
  }
  // light: big soft key from the front-left, backdrop-coloured rims from both back corners, low coloured bounce
  const L = lightRig(scene, { key: '#FFF2E2', keyI: 2.3, keyPos: [-2.2, 3.6, 3.6], target: [0, 0.9, 0], rimCol: c.tint, rimI: 2.0, sky: '#FFF6EA', ground: c.tint2, hemiI: 0.3, shadowBox: 2.6 });
  L.key.shadow.radius = 9;
  const rim2 = new THREE.DirectionalLight(c.tint, 1.6); rim2.position.set(3, 2.6, -3); scene.add(rim2);
  const fill = new THREE.DirectionalLight('#DDE8FF', 0.45); fill.position.set(3, 1.6, 3.5); scene.add(fill);
  return { scene, lights: L, glow: wall, update() {} };
}
