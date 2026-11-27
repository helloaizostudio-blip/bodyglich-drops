import type * as THREE from 'three';
import type { BodyPose } from '../animation/IdleAnimator';
import type { ModelInfo } from '../state/store';

/** Weights over VRM expression names (presets + custom). */
export type FaceWeights = Record<string, number>;

export interface FramingAnchors {
  head: THREE.Vector3;
  chest: THREE.Vector3;
  hips: THREE.Vector3;
  height: number;
}

/**
 * Common interface implemented by both real VRM avatars and the procedural
 * placeholder, so the animation pipeline is identical for both.
 */
export interface AvatarRig {
  readonly kind: 'vrm' | 'placeholder';
  readonly root: THREE.Object3D;
  readonly info: ModelInfo;
  supports(expression: string): boolean;
  setFace(weights: FaceWeights): void;
  setPose(pose: BodyPose): void;
  /** World-space point the eyes should look at (null = straight ahead). */
  setLookTarget(target: THREE.Object3D | null): void;
  update(dt: number): void;
  getAnchors(): FramingAnchors;
  dispose(): void;
}
