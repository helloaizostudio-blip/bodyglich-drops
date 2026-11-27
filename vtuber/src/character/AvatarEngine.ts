import * as THREE from 'three';
import { Stage } from './Stage';
import { CameraRig } from './CameraRig';
import { PlaceholderAvatar } from './PlaceholderAvatar';
import type { AvatarRig } from './types';
import { VRMAvatar } from '../vrm/VRMAvatar';
import { loadVRM } from '../vrm/loadVRM';
import { ExpressionController } from '../expressions/ExpressionController';
import { VISEMES } from '../expressions/presets';
import { BlinkController } from '../animation/BlinkController';
import { IdleAnimator, zeroPose, type BodyPose } from '../animation/IdleAnimator';
import { TalkAnimator } from '../animation/TalkAnimator';
import { LipSync } from '../audio/LipSync';
import { audioEngine } from '../audio/AudioEngine';
import { BrowserTTS } from '../audio/BrowserTTS';
import { FaceTracker } from '../tracking/FaceTracker';
import { settings, status, type Settings } from '../state/store';
import { clamp, lerp } from '../utils/math';

/**
 * The real-time core. Owns the Three.js scene and runs a single
 * requestAnimationFrame loop that composes:
 *
 *   idle motion + talk motion + expression pose + (optional) face tracking
 *   emotion weights + lip-sync visemes + blinking
 *
 * and pushes the result into whichever AvatarRig is loaded (VRM or the
 * placeholder). React never re-renders per frame — UI reads status via the
 * store, which is only updated on state transitions.
 */
export class AvatarEngine {
  readonly stage: Stage;
  readonly cam: CameraRig;
  readonly expressions = new ExpressionController();
  readonly blink = new BlinkController();
  readonly idle = new IdleAnimator();
  readonly talk = new TalkAnimator();
  readonly lipSync = new LipSync();
  readonly tracker = new FaceTracker();
  readonly tts = new BrowserTTS((v) => status.set({ ttsSpeaking: v }));
  avatar: AvatarRig | null = null;

  private lookTarget = new THREE.Object3D();
  private pointer = new THREE.Vector2();
  private raf = 0;
  private last = performance.now();
  private accum = 0;
  private fpsFrames = 0;
  private fpsTime = 0;
  private time = 0;
  private resizeObs: ResizeObserver;
  private unsub: () => void;
  private pose: BodyPose = zeroPose();
  private loadToken = 0;
  private anchors: ReturnType<AvatarRig['getAnchors']> | null = null;
  /** Live audio level 0..1 for meters (read by UI via rAF, not React state). */
  level = 0;
  speaking = false;

  constructor(private canvas: HTMLCanvasElement, private container: HTMLElement) {
    this.stage = new Stage(canvas);
    this.cam = new CameraRig(canvas);
    this.stage.scene.add(this.lookTarget);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.resize();

    canvas.addEventListener('pointermove', this.onPointer);
    window.addEventListener('pointermove', this.onPointer);

    this.applySettings(settings.get(), null);
    const unsubSettings = settings.subscribe((s, prev) => this.applySettings(s, prev));
    const unsubStatus = status.subscribe((s, prev) => {
      if (s.bgOverride !== prev.bgOverride) this.refreshBackground();
    });
    this.unsub = () => {
      unsubSettings();
      unsubStatus();
    };
    this.raf = requestAnimationFrame(this.loop);
  }

  private onPointer = (e: PointerEvent) => {
    const r = this.container.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.stage.renderer.setSize(w, h, false);
    this.cam.resize(w, h);
  }

  applySettings(s: Settings, prev: Settings | null) {
    const changed = (k: keyof Settings) => !prev || prev[k] !== s[k];
    if (changed('expression')) this.expressions.set(s.expression);
    if (changed('expressionIntensity')) this.expressions.setIntensity(s.expressionIntensity);
    this.expressions.speed = s.transitionSpeed;
    this.blink.enabled = s.autoBlink;
    this.idle.enabled = s.idleMotion;
    this.idle.intensity = s.idleIntensity;
    this.idle.breathing = s.breathing;
    this.talk.enabled = s.talkMotion;
    this.lipSync.gain = s.lipSyncGain;
    this.lipSync.threshold = s.vadThreshold;
    this.tracker.mirror = s.mirrorTracking;
    if (changed('quality')) this.stage.setQuality(s.quality);
    if (changed('background') || changed('bgColor')) this.refreshBackground();
    if (changed('fov')) this.cam.setFov(s.fov);
    if (changed('cameraPreset')) this.cam.frame(s.cameraPreset);
    if (this.avatar && changed('modelRotation')) this.avatar.root.rotation.y = THREE.MathUtils.degToRad(s.modelRotation);
    if (this.avatar instanceof PlaceholderAvatar) {
      if (changed('hairColor')) this.avatar.setHairColor(s.hairColor);
      if (changed('eyeColor')) this.avatar.setEyeColor(s.eyeColor);
    }
  }

  private disposed = false;

  private refreshBackground() {
    const s = settings.get();
    this.stage.setBackground(status.get().bgOverride ?? s.background, s.bgColor);
  }

  private setAvatar(rig: AvatarRig) {
    if (this.disposed) {
      rig.dispose();
      return;
    }
    this.avatar?.dispose();
    this.avatar = rig;
    rig.root.rotation.y = THREE.MathUtils.degToRad(settings.get().modelRotation);
    this.stage.scene.add(rig.root);
    this.expressions.setSupportCheck((n) => rig.supports(n));
    rig.setLookTarget(this.lookTarget);
    // Settle one frame so bones/anchors are valid before framing.
    rig.setPose(this.pose);
    rig.update(0);
    this.anchors = rig.getAnchors();
    this.cam.setAnchors(this.anchors);
    this.stage.setQuality(settings.get().quality);
    status.set({ model: rig.info });
  }

  usePlaceholder() {
    this.loadToken++;
    const s = settings.get();
    this.setAvatar(new PlaceholderAvatar(s.hairColor, s.eyeColor));
  }

  async loadVRM(source: File | Blob | string, name: string): Promise<void> {
    const token = ++this.loadToken;
    status.set({ loading: `Loading ${name}…` });
    try {
      const vrm = await loadVRM(source, (f) => status.set({ loading: `Loading ${name}… ${Math.round(f * 100)}%` }));
      if (token !== this.loadToken) {
        vrm.scene.removeFromParent();
        return; // superseded by a newer load
      }
      this.setAvatar(new VRMAvatar(vrm, name));
    } finally {
      if (token === this.loadToken) status.set({ loading: null });
    }
  }

  async startTracking() {
    status.set({ trackingLoading: true });
    try {
      await this.tracker.start();
      status.set({ trackingActive: true });
    } finally {
      status.set({ trackingLoading: false });
    }
  }

  stopTracking() {
    this.tracker.stop();
    status.set({ trackingActive: false });
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dtRaw = Math.min(0.1, (now - this.last) / 1000);
    const maxFps = settings.get().maxFps;
    this.accum += dtRaw;
    this.last = now;
    if (maxFps && this.accum < 1 / maxFps - 0.002) return;
    const dt = Math.min(0.1, this.accum);
    this.accum = 0;
    this.tick(dt);

    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      status.set({ fps: Math.round(this.fpsFrames / this.fpsTime) });
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  };

  private tick(dt: number) {
    this.time += dt;
    const s = settings.get();
    const rig = this.avatar;

    // --- audio → lip-sync --------------------------------------------------
    this.lipSync.setExternal(this.tts.frame(dt));
    const ctx = audioEngine.ctx;
    const lip = this.lipSync.process(audioEngine.analyser, ctx?.sampleRate ?? 48000, dt);
    this.level = lip.level;
    if (lip.speaking !== this.speaking) {
      this.speaking = lip.speaking;
      status.set({ speaking: lip.speaking });
    }

    // --- tracking ----------------------------------------------------------
    const track = this.tracker.active ? this.tracker.update(dt) : null;
    const tc = track?.confidence ?? 0;

    // --- face weights ------------------------------------------------------
    const emotion = this.expressions.update(dt);
    const w: Record<string, number> = { ...emotion };
    if (s.autoExpressionFromVoice && lip.speaking) w.happy = Math.max(w.happy ?? 0, 0.3 * s.expressionIntensity);
    if (this.expressions.expression === 'laughing' && w.aa) w.aa *= 0.45 + 0.55 * Math.abs(Math.sin(this.time * 13));

    const talkingMouth = Math.max(...VISEMES.map((v) => lip.visemes[v]));
    for (const v of VISEMES) {
      const emo = (w[v] ?? 0) * (1 - clamp(talkingMouth * 3));
      const tv = track ? (track.weights[v] ?? 0) * tc : 0;
      w[v] = Math.max(emo, lip.visemes[v], tv);
    }
    if (track && tc > 0.01) {
      for (const k of ['happy', 'angry', 'sad', 'surprised']) w[k] = Math.max(w[k] ?? 0, (track.weights[k] ?? 0) * tc);
      const bl = this.blink.update(dt);
      w.blinkLeft = lerp(bl, track.weights.blinkLeft ?? 0, tc);
      w.blinkRight = lerp(bl, track.weights.blinkRight ?? 0, tc);
    } else {
      const suppress = clamp((w.surprised ?? 0) * 0.8 + clamp((w.happy ?? 0) - 0.8) * 4);
      w.blink = this.blink.update(dt, suppress);
    }

    // --- body pose ---------------------------------------------------------
    const p = this.pose;
    p.head.x = p.head.y = p.head.z = 0;
    p.neck.x = p.neck.y = p.neck.z = 0;
    p.spine.x = p.spine.y = p.spine.z = 0;
    p.chest.x = p.chest.y = p.chest.z = 0;
    p.bob = 0;
    p.armSway = 0;
    this.idle.update(dt, p, lip.speaking ? lip.level : 0);
    const t = this.talk.update(dt, lip.level, lip.speaking);
    const ho = this.expressions.headOffset;
    const em = this.expressions.motion(this.time);
    p.head.x += t.x + ho.x + em.x;
    p.head.y += t.y + ho.y + em.y;
    p.head.z += t.z + ho.z + em.z;
    p.bob += em.bob;
    if (s.eyeMode === 'mouse') {
      p.head.y += this.pointer.x * 0.22;
      p.head.x += -this.pointer.y * 0.12;
    }
    if (track && tc > 0.01) {
      p.head.x = lerp(p.head.x, track.head.x, tc);
      p.head.y = lerp(p.head.y, track.head.y, tc);
      p.head.z = lerp(p.head.z, track.head.z, tc);
      p.spine.y += track.head.y * 0.15 * tc;
    }

    // --- gaze --------------------------------------------------------------
    if (rig) {
      const anchors = this.anchors ?? rig.getAnchors();
      const cam = this.cam.camera;
      const eo = this.idle.eyeOffset;
      if (s.eyeMode === 'mouse') {
        const v = new THREE.Vector3(this.pointer.x, this.pointer.y, 0.5).unproject(cam);
        const dir = v.sub(cam.position).normalize();
        const dist = (anchors.head.z + 0.6 - cam.position.z) / (dir.z || -1e-3);
        this.lookTarget.position.copy(cam.position).addScaledVector(dir, Math.abs(dist));
      } else {
        const base = s.eyeMode === 'camera' ? cam.position : anchors.head.clone().add(new THREE.Vector3(0, 0, 1.2));
        const d = base.distanceTo(anchors.head);
        const scale = (s.eyeMode === 'wander' ? 0.5 : 0.12) * d;
        this.lookTarget.position.set(base.x + eo.x * scale, base.y + eo.y * scale, base.z);
      }
      rig.setFace(w);
      rig.setPose(p);
      rig.update(dt);
    }

    this.cam.update(dt);
    this.stage.renderer.render(this.stage.scene, this.cam.camera);
  }

  /** Capture the current frame as a PNG (respects transparency). */
  snapshot(): string {
    this.stage.renderer.render(this.stage.scene, this.cam.camera);
    return this.canvas.toDataURL('image/png');
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.unsub();
    this.resizeObs.disconnect();
    this.canvas.removeEventListener('pointermove', this.onPointer);
    window.removeEventListener('pointermove', this.onPointer);
    this.tracker.stop();
    this.tts.stop();
    this.avatar?.dispose();
    this.cam.dispose();
    this.stage.dispose();
  }
}
