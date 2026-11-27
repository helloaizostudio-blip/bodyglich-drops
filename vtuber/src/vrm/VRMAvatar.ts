import * as THREE from 'three';
import { VRMUtils, type VRM, type VRMHumanBoneName } from '@pixiv/three-vrm';
import type { AvatarRig, FaceWeights, FramingAnchors } from '../character/types';
import type { BodyPose } from '../animation/IdleAnimator';
import type { ModelInfo } from '../state/store';
import { VISEMES, VRM_EMOTION_PRESETS } from '../expressions/presets';

const WANTED = [...VRM_EMOTION_PRESETS, ...VISEMES, 'blink', 'blinkLeft', 'blinkRight'];

/** Wraps a loaded VRM in the AvatarRig interface. */
export class VRMAvatar implements AvatarRig {
  readonly kind = 'vrm' as const;
  readonly root: THREE.Object3D;
  readonly info: ModelInfo;
  private available = new Set<string>();
  private lastSet = new Set<string>();
  private rest = new Map<string, THREE.Quaternion>();
  private tmpEuler = new THREE.Euler();
  private tmpQuat = new THREE.Quaternion();

  constructor(public readonly vrm: VRM, name: string) {
    this.root = vrm.scene;
    const mgr = vrm.expressionManager;
    if (mgr) for (const e of mgr.expressions) this.available.add(e.expressionName);

    const meta = vrm.meta as unknown as Record<string, unknown>;
    const metaName = (meta.name ?? meta.title) as string | undefined;
    const authors = (meta.authors as string[] | undefined)?.join(', ') ?? (meta.author as string | undefined);
    const license = (meta.licenseUrl ?? meta.licenseName ?? meta.otherLicenseUrl) as string | undefined;
    const springCount = vrm.springBoneManager?.joints.size ?? 0;

    this.info = {
      kind: 'vrm',
      name: metaName || name,
      author: authors,
      version: (meta.metaVersion as string | undefined) === '1' ? 'VRM 1.0' : 'VRM 0.x',
      license,
      supported: [...this.available].sort(),
      missing: [
        ...WANTED.filter((n) => !this.available.has(n)),
      ],
      springBones: springCount,
    };

    // Natural A-pose instead of T-pose.
    this.captureRest();
    vrm.springBoneManager?.reset();
  }

  private bone(name: VRMHumanBoneName) {
    return this.vrm.humanoid?.getNormalizedBoneNode(name) ?? null;
  }

  private captureRest() {
    const set = (name: VRMHumanBoneName, x: number, y: number, z: number) => {
      const b = this.bone(name);
      if (!b) return;
      b.rotation.set(x, y, z);
      this.rest.set(name, b.quaternion.clone());
    };
    set('leftUpperArm', 0, 0, -1.2);
    set('rightUpperArm', 0, 0, 1.2);
    set('leftLowerArm', 0, -0.25, 0);
    set('rightLowerArm', 0, 0.25, 0);
    set('leftHand', 0, 0, -0.1);
    set('rightHand', 0, 0, 0.1);
    for (const n of ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head', 'leftShoulder', 'rightShoulder'] as VRMHumanBoneName[]) {
      const b = this.bone(n);
      if (b) this.rest.set(n, b.quaternion.clone());
    }
  }

  supports(expression: string) {
    return this.available.has(expression);
  }

  setFace(weights: FaceWeights) {
    const mgr = this.vrm.expressionManager;
    if (!mgr) return;
    for (const name of this.lastSet) if (!(name in weights)) mgr.setValue(name, 0);
    this.lastSet.clear();
    for (const [name, v] of Object.entries(weights)) {
      if (!this.available.has(name)) continue;
      mgr.setValue(name, Math.min(1, Math.max(0, v)));
      this.lastSet.add(name);
    }
  }

  private applyRot(name: VRMHumanBoneName, e: { x: number; y: number; z: number }) {
    const b = this.bone(name);
    const rest = this.rest.get(name);
    if (!b || !rest) return;
    this.tmpEuler.set(e.x, e.y, e.z, 'YXZ');
    this.tmpQuat.setFromEuler(this.tmpEuler);
    b.quaternion.copy(rest).multiply(this.tmpQuat);
  }

  setPose(p: BodyPose) {
    // Split head motion across neck + head so it bends naturally.
    this.applyRot('neck', { x: p.head.x * 0.4 + p.neck.x, y: p.head.y * 0.4 + p.neck.y, z: p.head.z * 0.4 + p.neck.z });
    this.applyRot('head', { x: p.head.x * 0.6, y: p.head.y * 0.6, z: p.head.z * 0.6 });
    this.applyRot('spine', p.spine);
    const hasUpper = !!this.bone('upperChest');
    this.applyRot('chest', hasUpper ? { x: p.chest.x * 0.5, y: p.chest.y, z: p.chest.z } : p.chest);
    if (hasUpper) this.applyRot('upperChest', { x: p.chest.x * 0.5, y: 0, z: 0 });
    // Breathing lifts the shoulders slightly.
    const sh = p.breath * 0.035;
    this.applyRot('leftShoulder', { x: 0, y: 0, z: sh });
    this.applyRot('rightShoulder', { x: 0, y: 0, z: -sh });
    this.applyRot('leftUpperArm', { x: p.armSway, y: 0, z: 0 });
    this.applyRot('rightUpperArm', { x: -p.armSway, y: 0, z: 0 });
    const hips = this.bone('hips');
    if (hips) {
      const restY = (hips.userData.restY ??= hips.position.y) as number;
      hips.position.y = restY + p.bob;
    }
  }

  setLookTarget(target: THREE.Object3D | null) {
    if (!this.vrm.lookAt) return;
    this.vrm.lookAt.target = target ?? undefined;
    this.vrm.lookAt.autoUpdate = !!target;
  }

  update(dt: number) {
    this.vrm.update(dt);
  }

  getAnchors(): FramingAnchors {
    const pos = (n: VRMHumanBoneName, fallbackY: number) => {
      const node = this.vrm.humanoid?.getRawBoneNode(n);
      const v = new THREE.Vector3(0, fallbackY, 0);
      if (node) node.getWorldPosition(v);
      return v;
    };
    this.root.updateMatrixWorld(true);
    const head = pos('head', 1.4).add(new THREE.Vector3(0, 0.07, 0));
    const box = new THREE.Box3().setFromObject(this.root);
    const height = Math.max(box.isEmpty() ? 0 : box.max.y, head.y + 0.12);
    return { head, chest: pos('chest', 1.2), hips: pos('hips', 0.9), height };
  }

  dispose() {
    this.root.removeFromParent();
    VRMUtils.deepDispose(this.root);
  }
}
