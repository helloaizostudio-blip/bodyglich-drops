import * as THREE from 'three';

export interface StrandSpec {
  points: THREE.Vector3[];
  width: number;
  thickness: number;
  /** direction considered "outward" for orienting the flat ribbon */
  outward?: THREE.Vector3;
}

/**
 * Builds all hair strands into one merged geometry of tapered, flattened
 * tubes. Each vertex carries `aT` (0 at root → 1 at tip) used by the
 * hair shader for secondary motion, plus a root→tip colour gradient.
 */
export function buildHairGeometry(strands: StrandSpec[], samples = 22, radial = 7): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const tArr: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();
  const out = new THREE.Vector3();
  const p = new THREE.Vector3();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (const s of strands) {
    const curve = new THREE.CatmullRomCurve3(s.points, false, 'centripetal');
    const base = pos.length / 3;
    const tint = 0.92 + Math.random() * 0.16;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      curve.getPointAt(t, p);
      curve.getTangentAt(t, tangent).normalize();
      out.copy(s.outward ?? p).setY(s.outward ? s.outward.y : 0);
      if (out.lengthSq() < 1e-6) out.set(0, 0, 1);
      out.normalize();
      side.crossVectors(tangent, out).normalize();
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      up.crossVectors(side, tangent).normalize();
      const taper = Math.pow(1 - Math.pow(t, 1.25), 0.9) * 0.97 + 0.03;
      const rootEase = t < 0.06 ? 0.75 + (t / 0.06) * 0.25 : 1;
      const w = s.width * taper * rootEase;
      const th = s.thickness * (0.5 + taper * 0.5);
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        n.copy(side).multiplyScalar(ca * th).addScaledVector(up, sa * w).normalize();
        v.copy(p).addScaledVector(side, ca * w).addScaledVector(up, sa * th);
        pos.push(v.x, v.y, v.z);
        nor.push(n.x, n.y, n.z);
        tArr.push(t);
        const shadeV = (0.78 + 0.35 * t) * tint;
        col.push(shadeV, shadeV, shadeV);
      }
    }
    for (let i = 0; i < samples; i++) {
      for (let j = 0; j < radial; j++) {
        const a = base + i * (radial + 1) + j;
        const b = a + radial + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(tArr, 1));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Hair material with GPU secondary motion (sway + wind), weighted towards tips. */
export function createHairMaterial(color: string) {
  const uniforms = {
    uSway: { value: new THREE.Vector3() },
    uTime: { value: 0 },
  };
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.42,
    metalness: 0.0,
    sheen: 0.6,
    sheenRoughness: 0.35,
    sheenColor: new THREE.Color('#ffc7d9'),
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSway = uniforms.uSway;
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aT;\nuniform vec3 uSway;\nuniform float uTime;',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float w = aT * aT;
        transformed += uSway * w;
        transformed.x += sin(uTime * 1.3 + position.y * 18.0 + position.z * 9.0) * 0.0025 * w;
        transformed.z += cos(uTime * 1.1 + position.y * 14.0) * 0.002 * w;`,
      );
  };
  return { mat, uniforms };
}

/**
 * Inverted-hull outline material (classic anime line-art look). Pushes
 * vertices along their normals and renders back faces only. Optionally
 * shares the hair sway uniforms so outlines move with the strands.
 */
export function createOutlineMaterial(thickness: number, color: string, sway?: ReturnType<typeof createHairMaterial>['uniforms']) {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uThickness = { value: thickness };
    let head = '#include <common>\nuniform float uThickness;';
    let body = `#include <begin_vertex>\ntransformed += normalize(normal) * uThickness${sway ? ' * (1.0 - aT * 0.85)' : ''};`;
    if (sway) {
      shader.uniforms.uSway = sway.uSway;
      shader.uniforms.uTime = sway.uTime;
      head += '\nattribute float aT;\nuniform vec3 uSway;\nuniform float uTime;';
      body += `
        float w = aT * aT;
        transformed += uSway * w;
        transformed.x += sin(uTime * 1.3 + position.y * 18.0 + position.z * 9.0) * 0.0025 * w;
        transformed.z += cos(uTime * 1.1 + position.y * 14.0) * 0.002 * w;`;
    }
    shader.vertexShader = shader.vertexShader.replace('#include <common>', head).replace('#include <begin_vertex>', body);
  };
  return mat;
}
