import * as THREE from 'three';
import type { AvatarRig, FaceWeights, FramingAnchors } from './types';
import type { BodyPose } from '../animation/IdleAnimator';
import type { ModelInfo } from '../state/store';
import { FaceCanvas, FACE_PHI, FACE_THETA0, FACE_THETA1 } from './FaceCanvas';
import { buildHairGeometry, createHairMaterial, createOutlineMaterial, type StrandSpec } from './hairGeometry';
import { clamp, rand, Spring } from '../utils/math';

const R = 0.1; // head radius (m)
const SUPPORTED = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight'];

/** Anime-style head shaping: tapered jaw, pointed chin, slightly narrow skull. */
function deformHead(geo: THREE.BufferGeometry, radius: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const y = v.y / radius;
    if (y < 0.1) {
      const t = (0.1 - y) / 1.1;
      const s = 1 - 0.4 * t * t;
      v.x *= s;
      v.z *= 1 - 0.1 * t * t;
      v.z += radius * 0.07 * t * t * Math.max(0, v.z / radius);
      v.y -= radius * 0.02 * t * t;
    }
    v.x *= 0.94;
    v.y *= 0.95;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
}

/** Point on the head sphere given azimuth (0 = front, + = character's left / screen right) and polar angle. */
function sph(az: number, polar: number, r: number) {
  return new THREE.Vector3(r * Math.sin(polar) * Math.sin(az), r * Math.cos(polar), r * Math.sin(polar) * Math.cos(az));
}

/**
 * TEMPORARY PLACEHOLDER AVATAR.
 *
 * A procedural stylised bust used only when no .vrm model is loaded, so the
 * animation, expression and lip-sync pipeline can be exercised end-to-end.
 * It is *not* a production character — load a VRM for real streaming.
 */
export class PlaceholderAvatar implements AvatarRig {
  readonly kind = 'placeholder' as const;
  readonly root = new THREE.Group();
  readonly info: ModelInfo = {
    kind: 'placeholder',
    name: 'Placeholder (procedural)',
    author: 'Generated in code',
    version: 'n/a',
    supported: SUPPORTED,
    missing: [],
    springBones: 0,
  };

  private hips = new THREE.Group();
  private spine = new THREE.Group();
  private chest = new THREE.Group();
  private neck = new THREE.Group();
  private head = new THREE.Group();
  private headInner = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private face = new FaceCanvas();
  private hair: ReturnType<typeof createHairMaterial>;
  private weights: FaceWeights = {};
  private lookTarget: THREE.Object3D | null = null;
  private swayX = new Spring(28, 5);
  private swayZ = new Spring(28, 5);
  private swayY = new Spring(40, 6);
  private prevHead = new THREE.Euler();
  private time = 0;
  private disposables: { dispose(): void }[] = [];
  private torsoMesh!: THREE.Mesh;
  private hairLineMat: THREE.MeshBasicMaterial | null = null;

  constructor(hairColor = '#5a3a2e', eyeColor = '#3f8fe0') {
    this.root.name = 'PlaceholderAvatar';
    this.hair = createHairMaterial(hairColor);
    this.face.eyeColor = eyeColor;
    this.build();
    this.setHairColor(hairColor);
  }

  private track<T extends { dispose(): void }>(o: T): T {
    this.disposables.push(o);
    return o;
  }

  private build() {
    const skin = this.track(
      new THREE.MeshPhysicalMaterial({
        color: '#ffe2d6',
        roughness: 0.62,
        sheen: 0.5,
        sheenColor: new THREE.Color('#ff9fb0'),
        sheenRoughness: 0.6,
        emissive: new THREE.Color('#3a1612'),
        emissiveIntensity: 0.25,
      }),
    );
    const cloth = this.track(
      new THREE.MeshPhysicalMaterial({ color: '#f4f1f8', roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.3 }),
    );
    const dark = this.track(new THREE.MeshPhysicalMaterial({ color: '#2b1d3d', roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#b06bff') }));
    const chrome = this.track(new THREE.MeshStandardMaterial({ color: '#d8dbe6', metalness: 1, roughness: 0.18 }));
    const accent = this.track(new THREE.MeshStandardMaterial({ color: '#ff4f86', emissive: new THREE.Color('#ff2f6d'), emissiveIntensity: 2.2 }));

    // Hierarchy & joints (world coords)
    this.root.add(this.hips);
    this.hips.position.set(0, 0.92, 0);
    this.hips.add(this.spine);
    this.spine.position.set(0, 0.04, 0); // 0.96
    this.spine.add(this.chest);
    this.chest.position.set(0, 0.18, 0); // 1.14
    this.chest.add(this.neck);
    this.neck.position.set(0, 0.2, -0.005); // 1.34
    this.neck.add(this.head);
    this.head.position.set(0, 0.05, 0.005); // 1.39
    this.head.add(this.headInner);
    this.headInner.position.set(0, 0.078, 0.012); // head centre ≈ 1.468

    const add = (parent: THREE.Object3D, mesh: THREE.Object3D, worldY: number, parentWorldY: number) => {
      mesh.position.y += worldY - parentWorldY;
      parent.add(mesh);
      return mesh;
    };

    // Torso (lathe, elliptical cross-section)
    const torsoProfile = [
      [0.0, 0.9], [0.112, 0.9], [0.118, 0.96], [0.108, 1.03], [0.118, 1.09], [0.134, 1.15], [0.136, 1.2], [0.122, 1.25], [0.09, 1.29], [0.05, 1.315], [0.034, 1.33],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const torsoGeo = this.track(new THREE.LatheGeometry(torsoProfile, 48));
    this.torsoMesh = new THREE.Mesh(torsoGeo, skin);
    this.torsoMesh.scale.z = 0.7;
    add(this.spine, this.torsoMesh, 0, 0.96);

    // Outfit: glossy white halter top + dark skirt
    const topProfile = [
      [0.0, 0.93], [0.116, 0.93], [0.121, 0.97], [0.112, 1.03], [0.122, 1.09], [0.139, 1.15], [0.141, 1.19], [0.1, 1.215],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const top = new THREE.Mesh(this.track(new THREE.LatheGeometry(topProfile, 48)), cloth);
    top.scale.z = 0.72;
    add(this.spine, top, 0, 0.96);
    const skirtProfile = [[0.118, 0.97], [0.124, 0.92], [0.16, 0.82], [0.2, 0.72]].map(([r, y]) => new THREE.Vector2(r, y));
    const skirt = new THREE.Mesh(this.track(new THREE.LatheGeometry(skirtProfile, 24)), dark);
    skirt.scale.z = 0.75;
    add(this.hips, skirt, 0, 0.92);

    // Halter straps
    for (const s of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.018, 1.33, 0.03),
        new THREE.Vector3(s * 0.04, 1.275, 0.062),
        new THREE.Vector3(s * 0.062, 1.213, 0.066),
      ]);
      const strap = new THREE.Mesh(this.track(new THREE.TubeGeometry(curve, 12, 0.006, 6)), cloth);
      add(this.chest, strap, 0, 1.14);
    }

    // Shoulders and arms
    for (const s of [-1, 1]) {
      const shoulder = new THREE.Mesh(this.track(new THREE.CapsuleGeometry(0.032, 0.08, 6, 16)), skin);
      shoulder.rotation.z = Math.PI / 2 + s * 0.22;
      shoulder.scale.set(1, 1, 0.85);
      shoulder.position.set(s * 0.1, 0, 0);
      add(this.chest, shoulder, 1.268, 1.14);
      const arm = s < 0 ? this.armR : this.armL;
      arm.position.set(s * 0.165, 1.255 - 1.14, 0);
      this.chest.add(arm);
      const upper = new THREE.Mesh(this.track(new THREE.CapsuleGeometry(0.03, 0.2, 6, 16)), skin);
      upper.position.set(0, -0.12, 0);
      arm.add(upper);
      const fore = new THREE.Mesh(this.track(new THREE.CapsuleGeometry(0.025, 0.2, 6, 16)), skin);
      fore.position.set(0, -0.36, 0.02);
      fore.rotation.x = -0.15;
      arm.add(fore);
      arm.rotation.z = s * 0.1;
    }

    // Neck + choker
    const neckMesh = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.031, 0.036, 0.15, 24)), skin);
    add(this.neck, neckMesh, 1.385, 1.34);
    const choker = new THREE.Mesh(this.track(new THREE.TorusGeometry(0.035, 0.008, 12, 40)), cloth);
    choker.rotation.x = Math.PI / 2 + 0.15;
    add(this.neck, choker, 1.345, 1.34);
    const gem = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.006, 16, 12)), accent);
    gem.position.z = 0.04;
    add(this.neck, gem, 1.338, 1.34);

    // Head
    const headGeo = this.track(new THREE.SphereGeometry(R, 64, 48));
    deformHead(headGeo, R);
    this.headInner.add(new THREE.Mesh(headGeo, skin));
    const skinLine = this.track(createOutlineMaterial(0.0012, '#7a4a52'));
    this.headInner.add(new THREE.Mesh(headGeo, skinLine));
    const torsoLine = new THREE.Mesh(torsoGeo, skinLine);
    torsoLine.scale.z = 0.7;
    add(this.spine, torsoLine, 0, 0.96);

    // Face shell with canvas-drawn anime features
    const faceGeo = this.track(
      new THREE.SphereGeometry(R * 1.004, 48, 48, Math.PI / 2 - FACE_PHI, FACE_PHI * 2, FACE_THETA0, FACE_THETA1 - FACE_THETA0),
    );
    deformHead(faceGeo, R * 1.004);
    const faceMat = this.track(
      new THREE.MeshStandardMaterial({
        map: this.face.texture,
        transparent: true,
        roughness: 0.5,
        emissive: new THREE.Color('#ffffff'),
        emissiveMap: this.face.texture,
        emissiveIntensity: 0.28,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    const faceMesh = new THREE.Mesh(faceGeo, faceMat);
    faceMesh.renderOrder = 1;
    this.headInner.add(faceMesh);

    // Hair cap
    const capGeo = this.track(new THREE.SphereGeometry(R * 1.075, 64, 32, 0, Math.PI * 2, 0, 0.62 * Math.PI));
    const capColor = new Float32Array(capGeo.attributes.position.count * 3).fill(0.7);
    capGeo.setAttribute('color', new THREE.BufferAttribute(capColor, 3));
    capGeo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(capGeo.attributes.position.count), 1));
    const cap = new THREE.Mesh(capGeo, this.hair.mat);
    cap.rotation.x = -0.6;
    cap.scale.x = 0.97;
    this.headInner.add(cap);

    const hairGeo = this.track(buildHairGeometry(this.makeStrands()));
    this.headInner.add(new THREE.Mesh(hairGeo, this.hair.mat));
    const hairLine = this.track(createOutlineMaterial(0.0011, '#2a1418', this.hair.uniforms));
    this.hairLineMat = hairLine;
    this.headInner.add(new THREE.Mesh(hairGeo, hairLine));

    // Headphones (inspired by the reference: white shell, chrome ring, glowing accent)
    const phones = new THREE.Group();
    const band = new THREE.Mesh(this.track(new THREE.TorusGeometry(R * 1.2, 0.0085, 12, 64, Math.PI)), cloth);
    band.scale.x = 0.95;
    phones.add(band);
    for (const s of [-1, 1]) {
      const cup = new THREE.Group();
      cup.position.set(s * R * 1.13, -0.005, 0);
      const shell = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.043, 0.04, 0.032, 40)), cloth);
      shell.rotation.z = Math.PI / 2;
      cup.add(shell);
      const ring = new THREE.Mesh(this.track(new THREE.TorusGeometry(0.03, 0.0045, 12, 40)), chrome);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = s * 0.017;
      cup.add(ring);
      const core = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.024, 0.024, 0.004, 32)), dark);
      core.rotation.z = Math.PI / 2;
      core.position.x = s * 0.0165;
      cup.add(core);
      const led = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.004, 12, 8)), accent);
      led.position.set(s * 0.019, 0.016, 0.012);
      cup.add(led);
      phones.add(cup);
    }
    phones.rotation.x = -0.12;
    phones.position.set(0, 0.002, -0.004);
    this.headInner.add(phones);
  }

  private makeStrands(): StrandSpec[] {
    const strands: StrandSpec[] = [];
    const jitter = (v: number) => v + rand(-1, 1) * 0.004;

    // Bangs: fall over the forehead with a central parting gap.
    const bangCount = 28;
    for (let i = 0; i < bangCount; i++) {
      const u = i / (bangCount - 1) * 2 - 1; // -1..1
      const az = u * 0.95;
      const len = 0.4 + Math.abs(u) * 0.15 + rand(0, 0.025) + (Math.abs(u) < 0.2 ? -0.02 : 0);
      const pts = [
        sph(az * 0.6, 0.12 * Math.PI, R * 1.07),
        sph(az * 0.85, 0.3 * Math.PI, R * 1.14),
        sph(az, 0.4 * Math.PI, R * 1.13),
        sph(az * 1.03 + u * 0.03, (len - 0.02) * Math.PI, R * 1.085),
        sph(az * 1.06 + (u > 0 ? -0.06 : 0.06), len * Math.PI + 0.06, R * 1.05),
      ].map((p) => p.set(jitter(p.x), p.y, p.z));
      strands.push({ points: pts, width: 0.026 + rand(0, 0.008), thickness: 0.005, outward: new THREE.Vector3(Math.sin(az), 0.2, Math.cos(az)) });
    }

    // Side locks framing the face, falling to the chest.
    for (const s of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const az = s * (1.0 + i * 0.07);
        const zf = 0.55 + (6 - i) * 0.03;
        const tipY = -3.0 - rand(0, 0.5) - i * 0.06;
        const pts = [
          sph(az * 0.8, 0.18 * Math.PI, R * 1.07),
          sph(az, 0.38 * Math.PI, R * 1.13),
          sph(az * 1.02, 0.58 * Math.PI, R * 1.14),
          new THREE.Vector3(s * R * (1.0 + i * 0.03), -R * 1.2, R * (zf - 0.15)),
          new THREE.Vector3(s * R * (1.02 + i * 0.04), -R * 2.0, R * zf),
          new THREE.Vector3(s * R * (0.95 + i * 0.05), (tipY + 0.5) * R, R * (zf + 0.15)),
          new THREE.Vector3(s * R * (0.85 + i * 0.05), tipY * R, R * (zf + 0.2)),
        ].map((p) => p.set(jitter(p.x), p.y, jitter(p.z)));
        strands.push({ points: pts, width: 0.022 + rand(0, 0.006), thickness: 0.006, outward: new THREE.Vector3(s, 0, 0.4) });
      }
    }

    // Long back hair curtain.
    const backCount = 52;
    for (let i = 0; i < backCount; i++) {
      const u = i / (backCount - 1); // 0..1 across the back
      const az = Math.PI * (0.52 + u * 0.96); // side-back → back → other side-back
      const sx = Math.sin(az);
      const sz = Math.cos(az);
      const tipY = -(5.2 + rand(0, 1.0) - Math.abs(sx) * 0.6);
      const curtainX = sx * R * 1.55;
      const pts = [
        sph(az, (0.12 + rand(0, 0.08)) * Math.PI, R * 1.07),
        sph(az, 0.42 * Math.PI, R * 1.15),
        sph(az, 0.68 * Math.PI, R * 1.17),
        new THREE.Vector3(sx * R * 1.25, -R * 1.25, Math.min(sz * R * 1.15, -R * 0.55)),
        new THREE.Vector3(curtainX * 1.02, -R * 2.2, -R * (1.25 + Math.abs(sz) * 0.1)),
        new THREE.Vector3(curtainX * 1.12, -R * 3.6, -R * (1.35 + Math.abs(sz) * 0.08)),
        new THREE.Vector3(curtainX * 1.08, tipY * R, -R * 1.15),
      ].map((p) => p.set(jitter(p.x), p.y, jitter(p.z)));
      strands.push({ points: pts, width: 0.024 + rand(0, 0.008), thickness: 0.006, outward: new THREE.Vector3(sx, 0, sz) });
    }
    return strands;
  }

  setHairColor(color: string) {
    this.hair.mat.color.set(color);
    this.face.browColor = '#' + new THREE.Color(color).multiplyScalar(0.75).getHexString();
    this.hairLineMat?.color.set(new THREE.Color(color).multiplyScalar(0.5));
  }
  setEyeColor(color: string) {
    this.face.eyeColor = color;
  }

  supports(expression: string) {
    return SUPPORTED.includes(expression);
  }

  setFace(weights: FaceWeights) {
    this.weights = weights;
  }

  setLookTarget(target: THREE.Object3D | null) {
    this.lookTarget = target;
  }

  setPose(p: BodyPose) {
    this.neck.rotation.set(p.head.x * 0.4 + p.neck.x, p.head.y * 0.4 + p.neck.y, p.head.z * 0.4 + p.neck.z, 'YXZ');
    this.head.rotation.set(p.head.x * 0.6, p.head.y * 0.6, p.head.z * 0.6, 'YXZ');
    this.spine.rotation.set(p.spine.x, p.spine.y, p.spine.z);
    this.chest.rotation.set(p.chest.x, p.chest.y, p.chest.z);
    const br = p.breath;
    this.torsoMesh.scale.set(1 + br * 0.012, 1, 0.7 * (1 + br * 0.02));
    this.chest.position.y = 0.18 + br * 0.003;
    this.armL.rotation.set(p.armSway, 0, 0.1 + br * 0.01);
    this.armR.rotation.set(-p.armSway, 0, -0.1 - br * 0.01);
    this.hips.position.y = 0.92 + p.bob;
  }

  private tmpV = new THREE.Vector3();

  update(dt: number) {
    this.time += dt;
    const w = this.weights;
    const g = (k: string) => clamp(w[k] ?? 0);

    // Gaze from look target, in head space.
    let lookX = 0;
    let lookY = 0;
    if (this.lookTarget) {
      this.root.updateMatrixWorld();
      this.lookTarget.getWorldPosition(this.tmpV);
      this.headInner.worldToLocal(this.tmpV);
      const az = Math.atan2(this.tmpV.x, this.tmpV.z);
      const el = Math.atan2(this.tmpV.y, Math.hypot(this.tmpV.x, this.tmpV.z));
      lookX = clamp(az / 0.6, -1, 1);
      lookY = clamp(el / 0.5, -1, 1);
    }

    this.face.draw({
      blinkL: clamp(g('blink') + g('blinkLeft')),
      blinkR: clamp(g('blink') + g('blinkRight')),
      lookX,
      lookY,
      happy: g('happy'),
      angry: g('angry'),
      sad: g('sad'),
      surprised: g('surprised'),
      relaxed: g('relaxed'),
      aa: g('aa'),
      ih: g('ih'),
      ou: g('ou'),
      ee: g('ee'),
      oh: g('oh'),
    });

    // Hair secondary motion: lag behind head rotation / bob.
    const hr = this.head.rotation;
    const nr = this.neck.rotation;
    const ry = hr.y + nr.y;
    const rz = hr.z + nr.z;
    const rx = hr.x + nr.x;
    const lagY = this.swayX.step(ry, dt) - ry;
    const lagZ = this.swayZ.step(rz, dt) - rz;
    const lagX = this.swayY.step(rx + this.hips.position.y * 4, dt) - (rx + this.hips.position.y * 4);
    this.hair.uniforms.uSway.value.set(lagY * 0.35 - lagZ * 0.3, lagX * 0.06, -lagX * 0.12);
    this.hair.uniforms.uTime.value = this.time;
    this.prevHead.copy(hr);
  }

  getAnchors(): FramingAnchors {
    this.root.updateMatrixWorld(true);
    const head = new THREE.Vector3();
    this.headInner.getWorldPosition(head);
    return { head, chest: new THREE.Vector3(0, 1.15, 0), hips: new THREE.Vector3(0, 0.92, 0), height: 1.6 };
  }

  dispose() {
    this.root.removeFromParent();
    this.disposables.forEach((d) => d.dispose());
    this.hair.mat.dispose();
    this.face.dispose();
  }
}
