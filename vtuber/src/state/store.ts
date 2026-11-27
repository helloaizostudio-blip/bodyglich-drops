import { createStore } from './createStore';
import type { ExpressionName } from '../expressions/presets';

export type Quality = 'low' | 'medium' | 'high';
export type Background = 'gradient' | 'transparent' | 'green' | 'solid';
export type CameraPreset = 'face' | 'bust' | 'upper' | 'full';
export type EyeMode = 'camera' | 'mouse' | 'wander';

/** Persisted, user-editable settings. Shared with the pop-out stream window. */
export interface Settings {
  expression: ExpressionName;
  expressionIntensity: number;
  transitionSpeed: number;
  autoBlink: boolean;
  idleMotion: boolean;
  idleIntensity: number;
  breathing: boolean;
  talkMotion: boolean;
  eyeMode: EyeMode;

  quality: Quality;
  maxFps: 30 | 60 | 0;
  background: Background;
  bgColor: string;
  cameraPreset: CameraPreset;
  fov: number;
  modelRotation: number;

  lipSyncGain: number;
  vadThreshold: number;
  autoExpressionFromVoice: boolean;

  streamTitle: string;
  showLive: boolean;
  showStats: boolean;
  viewers: number;
  subscribers: number;
  showMicStatus: boolean;

  wsUrl: string;
  hairColor: string;
  eyeColor: string;
  mirrorTracking: boolean;
}

export const defaultSettings: Settings = {
  expression: 'neutral',
  expressionIntensity: 1,
  transitionSpeed: 6,
  autoBlink: true,
  idleMotion: true,
  idleIntensity: 1,
  breathing: true,
  talkMotion: true,
  eyeMode: 'camera',

  quality: 'high',
  maxFps: 60,
  background: 'gradient',
  bgColor: '#1a1026',
  cameraPreset: 'bust',
  fov: 30,
  modelRotation: 0,

  lipSyncGain: 1.4,
  vadThreshold: 0.12,
  autoExpressionFromVoice: false,

  streamTitle: 'Just chatting ♡',
  showLive: true,
  showStats: true,
  viewers: 128,
  subscribers: 2048,
  showMicStatus: true,

  wsUrl: 'ws://localhost:8787',
  hairColor: '#5a3a2e',
  eyeColor: '#3f8fe0',
  mirrorTracking: true,
};

const SETTINGS_KEY = 'vtuber-studio.settings.v1';

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return { ...defaultSettings };
}

export const settings = createStore<Settings>(loadSettings());

let saveTimer = 0;
settings.subscribe((s) => {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, 250);
});

export interface ModelInfo {
  kind: 'placeholder' | 'vrm';
  name: string;
  author?: string;
  version?: string;
  license?: string;
  supported: string[];
  missing: string[];
  springBones: number;
}

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Runtime status — not persisted. Updated sparingly (on transitions only). */
export interface Status {
  model: ModelInfo | null;
  loading: string | null;
  micActive: boolean;
  audioPlaying: boolean;
  ttsSpeaking: boolean;
  speaking: boolean;
  trackingActive: boolean;
  trackingLoading: boolean;
  wsStatus: WsStatus;
  streamMode: boolean;
  isPopout: boolean;
  fps: number;
  liveSince: number | null;
  /** URL-forced background (e.g. ?transparent=1 for OBS) — not persisted or synced. */
  bgOverride: Background | null;
}

export const status = createStore<Status>({
  model: null,
  loading: null,
  micActive: false,
  audioPlaying: false,
  ttsSpeaking: false,
  speaking: false,
  trackingActive: false,
  trackingLoading: false,
  wsStatus: 'disconnected',
  streamMode: false,
  isPopout: false,
  fps: 0,
  liveSince: null,
  bgOverride: null,
});

export interface Toast {
  id: number;
  kind: 'info' | 'error' | 'success';
  text: string;
}
export const toasts = createStore<{ list: Toast[] }>({ list: [] });
let toastId = 0;
export function toast(text: string, kind: Toast['kind'] = 'info', ms = 5000) {
  if (toasts.get().list.some((t) => t.text === text)) return;
  const id = ++toastId;
  toasts.set((s) => ({ list: [...s.list.slice(-3), { id, kind, text }] }));
  window.setTimeout(() => toasts.set((s) => ({ list: s.list.filter((t) => t.id !== id) })), ms);
}
