// Copies the MediaPipe WASM runtime into public/ so face tracking works offline
// (the face landmarker *model* file is still fetched from Google's CDN unless you
// place it at public/mediapipe/face_landmarker.task).
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const dest = resolve(root, 'public/mediapipe/wasm');
if (!existsSync(src)) {
  console.warn('[copy-mediapipe] @mediapipe/tasks-vision not installed; face tracking disabled.');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('[copy-mediapipe] WASM runtime copied to public/mediapipe/wasm');
