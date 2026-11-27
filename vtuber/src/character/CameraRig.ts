import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraPreset } from '../state/store';
import type { FramingAnchors } from './types';
import { damp } from '../utils/math';

/** Perspective camera with orbit controls and smooth preset framing. */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private goalPos: THREE.Vector3 | null = null;
  private goalTarget: THREE.Vector3 | null = null;
  private anchors: FramingAnchors | null = null;
  preset: CameraPreset = 'bust';

  constructor(dom: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    this.camera.position.set(0, 1.4, 1.2);
    this.controls = new OrbitControls(this.camera, dom);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.25;
    this.controls.maxDistance = 6;
    this.controls.target.set(0, 1.35, 0);
    this.controls.addEventListener('start', () => {
      this.goalPos = this.goalTarget = null; // user takes over
    });
  }

  setAnchors(a: FramingAnchors) {
    this.anchors = a;
    this.frame(this.preset, true);
  }

  setFov(fov: number) {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.frame(this.preset);
  }

  frame(preset: CameraPreset, instant = false) {
    this.preset = preset;
    const a = this.anchors;
    if (!a) return;
    const fovScale = Math.tan(THREE.MathUtils.degToRad(30) / 2) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    let target: THREE.Vector3;
    let dist: number;
    switch (preset) {
      case 'face':
        target = a.head.clone().add(new THREE.Vector3(0, -0.02, 0));
        dist = 0.62;
        break;
      case 'bust':
        target = a.head.clone().add(new THREE.Vector3(0, -0.13, 0));
        dist = 1.05;
        break;
      case 'upper':
        target = a.chest.clone().lerp(a.head, 0.35);
        dist = 1.75;
        break;
      case 'full':
        target = new THREE.Vector3(0, a.height * 0.52, 0);
        dist = a.height * 2.3;
        break;
    }
    dist *= fovScale;
    // Keep the lens near eye level for portrait presets so the face isn't viewed from below.
    const eyeY = a.head.y - 0.02;
    const pos = new THREE.Vector3(target.x, preset === 'full' ? target.y + 0.1 : lerpN(target.y, eyeY, 0.85), target.z + dist);
    if (instant) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.goalPos = this.goalTarget = null;
    } else {
      this.goalPos = pos;
      this.goalTarget = target;
    }
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  update(dt: number) {
    if (this.goalPos && this.goalTarget) {
      const k = damp(5, dt);
      this.camera.position.lerp(this.goalPos, k);
      this.controls.target.lerp(this.goalTarget, k);
      if (this.camera.position.distanceTo(this.goalPos) < 0.001) this.goalPos = this.goalTarget = null;
    }
    this.controls.update();
  }

  dispose() {
    this.controls.dispose();
  }
}

const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
