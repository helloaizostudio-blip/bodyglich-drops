import * as THREE from 'three';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { clamp, damp } from '../utils/math';
import { describeError } from '../utils/errors';

const REMOTE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export interface TrackingFrame {
  weights: Record<string, number>;
  head: { x: number; y: number; z: number };
  confidence: number;
}

/**
 * Optional webcam face tracking via MediaPipe Face Landmarker.
 * Maps ARKit-style blendshapes onto VRM expressions and the head transform
 * onto the neck/head bones. Video never leaves the browser.
 */
export class FaceTracker {
  private landmarker: FaceLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private lastVideoTime = -1;
  mirror = true;
  readonly frame: TrackingFrame = { weights: {}, head: { x: 0, y: 0, z: 0 }, confidence: 0 };
  private mat = new THREE.Matrix4();
  private euler = new THREE.Euler();
  private lastSeen = 0;

  get active() {
    return !!this.stream;
  }
  get videoElement() {
    return this.video;
  }

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires https:// or localhost.');
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const base = import.meta.env.BASE_URL;
    let fileset;
    try {
      fileset = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
    } catch (e) {
      throw new Error(`Could not load MediaPipe runtime (${describeError(e)}). Run "npm run dev" so the WASM files are copied to public/.`);
    }
    // Prefer a self-hosted model if present; otherwise use Google's CDN.
    let modelPath = REMOTE_MODEL;
    try {
      const local = `${base}mediapipe/face_landmarker.task`;
      const head = await fetch(local, { method: 'HEAD' });
      if (head.ok && !head.headers.get('content-type')?.includes('text/html')) modelPath = local;
    } catch {
      /* use remote */
    }
    const create = (delegate: 'GPU' | 'CPU') =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: modelPath, delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
    try {
      this.landmarker = await create('GPU').catch(() => create('CPU'));
    } catch (e) {
      throw new Error(`Could not load the face model (${describeError(e)}). Download face_landmarker.task into public/mediapipe/ for offline use.`);
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
    } catch (e) {
      this.landmarker.close();
      this.landmarker = null;
      throw new Error(`Camera: ${describeError(e)}`);
    }
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.srcObject = this.stream;
    await this.video.play();
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.landmarker?.close();
    this.landmarker = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
    this.frame.confidence = 0;
  }

  /** Call every render frame; runs detection when a new video frame is available. */
  update(dt: number): TrackingFrame | null {
    const v = this.video;
    if (!this.landmarker || !v || v.readyState < 2) return null;
    if (v.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = v.currentTime;
      const res = this.landmarker.detectForVideo(v, performance.now());
      const shapes = res.faceBlendshapes?.[0]?.categories;
      const m = res.facialTransformationMatrixes?.[0];
      if (shapes && m) {
        this.lastSeen = performance.now();
        const s: Record<string, number> = {};
        for (const c of shapes) s[c.categoryName] = c.score;
        const L = this.mirror ? 'Right' : 'Left';
        const Rr = this.mirror ? 'Left' : 'Right';
        const target: Record<string, number> = {
          blinkLeft: clamp((s[`eyeBlink${L}`] - 0.25) * 1.8),
          blinkRight: clamp((s[`eyeBlink${Rr}`] - 0.25) * 1.8),
          aa: clamp(s.jawOpen * 1.6),
          ou: clamp(s.mouthPucker * 1.3),
          oh: clamp(s.mouthFunnel * 1.5),
          ee: clamp(((s.mouthStretchLeft ?? 0) + (s.mouthStretchRight ?? 0)) * 1.2),
          happy: clamp(((s.mouthSmileLeft + s.mouthSmileRight) / 2 - 0.15) * 1.6),
          surprised: clamp((s.browInnerUp - 0.3) * 1.5) * clamp(1 - s.mouthSmileLeft),
          angry: clamp(((s.browDownLeft + s.browDownRight) / 2 - 0.2) * 1.6),
          sad: clamp(((s.mouthFrownLeft + s.mouthFrownRight) / 2) * 2),
        };
        const k = damp(25, dt);
        for (const [key, val] of Object.entries(target)) {
          const cur = this.frame.weights[key] ?? 0;
          this.frame.weights[key] = cur + (val - cur) * k;
        }
        this.mat.fromArray(m.data);
        this.euler.setFromRotationMatrix(this.mat, 'YXZ');
        const sgn = this.mirror ? -1 : 1;
        const hk = damp(18, dt);
        this.frame.head.x += (clamp(this.euler.x, -0.6, 0.6) - this.frame.head.x) * hk;
        this.frame.head.y += (clamp(this.euler.y * sgn, -0.8, 0.8) - this.frame.head.y) * hk;
        this.frame.head.z += (clamp(this.euler.z * sgn, -0.5, 0.5) - this.frame.head.z) * hk;
      }
    }
    // Fade out tracking influence if the face is lost.
    const lost = performance.now() - this.lastSeen > 500;
    this.frame.confidence += ((lost ? 0 : 1) - this.frame.confidence) * damp(6, dt);
    return this.frame;
  }
}
