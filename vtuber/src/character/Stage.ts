import * as THREE from 'three';
import type { Background, Quality } from '../state/store';

/** Renderer, lights and background — the "photo studio" around the avatar. */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  private gradient: THREE.CanvasTexture;
  private key: THREE.DirectionalLight;

  constructor(canvas: HTMLCanvasElement) {
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      });
    } catch {
      throw new Error('WebGL is not available. Enable hardware acceleration in your browser settings.');
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    // Soft three-point lighting with a pink rim, like a studio portrait.
    const hemi = new THREE.HemisphereLight('#fff1f6', '#4b2c5e', 1.1);
    this.scene.add(hemi);
    this.key = new THREE.DirectionalLight('#fff4ec', 2.2);
    this.key.position.set(1.2, 2.4, 2.2);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    const sc = this.key.shadow.camera;
    sc.left = sc.bottom = -1;
    sc.right = sc.top = 1;
    sc.near = 0.5;
    sc.far = 6;
    this.key.target.position.set(0, 1.2, 0);
    this.scene.add(this.key, this.key.target);
    const fill = new THREE.DirectionalLight('#d9c8ff', 0.7);
    fill.position.set(-2, 1.4, 1.5);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight('#ff8fc7', 2.4);
    rim.position.set(-1.4, 2, -2.2);
    this.scene.add(rim);
    const rim2 = new THREE.DirectionalLight('#b48cff', 1.2);
    rim2.position.set(1.8, 1.6, -1.8);
    this.scene.add(rim2);

    this.gradient = this.makeGradient();
  }

  private makeGradient() {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#8e5f8f');
    g.addColorStop(0.45, '#d07fa3');
    g.addColorStop(1, '#3a2148');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  setBackground(bg: Background, color: string) {
    this.renderer.setClearColor(0x000000, 0);
    switch (bg) {
      case 'transparent':
        this.scene.background = null;
        break;
      case 'green':
        this.scene.background = new THREE.Color('#00b140');
        break;
      case 'solid':
        this.scene.background = new THREE.Color(color);
        break;
      default:
        this.scene.background = this.gradient;
    }
  }

  setQuality(q: Quality) {
    const dpr = window.devicePixelRatio || 1;
    const ratio = q === 'low' ? Math.min(dpr, 1) * 0.75 : q === 'medium' ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
    this.renderer.setPixelRatio(ratio);
    const shadows = q === 'high';
    if (this.renderer.shadowMap.enabled !== shadows) {
      this.renderer.shadowMap.enabled = shadows;
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => (mm.needsUpdate = true));
      });
    }
  }

  dispose() {
    this.gradient.dispose();
    this.renderer.dispose();
  }
}
