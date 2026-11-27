# Aiko Studio — 3D anime VTuber app

React + TypeScript + Vite + Three.js + `@pixiv/three-vrm`. Loads a VRM avatar and brings it to life with
breathing, blinking, eye saccades, head motion, 8 blended expressions, audio-driven lip-sync, optional webcam
face tracking, a stream overlay and a WebSocket control bridge.

```bash
npm install
npm run dev        # http://localhost:5173
npm run bridge     # optional: WebSocket/HTTP control bridge on :8787
npm run build      # typecheck + production build into dist/
```

## The avatar: you need a VRM file

**No production character is bundled.** Without a model the app shows a clearly labelled **procedural
placeholder** (stylised bust, canvas-drawn anime eyes, tapered hair strands, headphones). It exists only so you
can test the animation, expression and lip-sync pipeline. It is not a finished premium avatar.

To get the character you described (adult anime woman, long brown hair, blue eyes):

1. Make one in **VRoid Studio** (free, Windows/macOS) and choose *Export → VRM* (VRM 0.x or 1.0 both work).
   Or commission one, or download one whose licence allows streaming from VRoid Hub / BOOTH.
2. Drag the `.vrm` onto the stage, or use **Model → Upload**. It's cached in IndexedDB for reloads.
3. To auto-load it (needed for OBS), copy it to `public/models/me.vrm` and open `/?model=/models/me.vrm`.

The **Try three-vrm sample** button fetches pixiv's public sample model at runtime (it isn't bundled). Check
its licence (shown in Model info) before you stream with it.

What you get from a VRM: MToon toon shading, spring-bone hair and clothing physics, humanoid bones (natural
A-pose, breathing, head and neck motion), preset expressions and eye look-at. Expressions the model doesn't
define are skipped and listed under *Model info → Missing*.

## Features

| Area | What it does |
|---|---|
| Idle | Breathing, random blinks (with occasional double blinks), noise-based head and torso drift, eye micro-saccades |
| Expressions | Neutral, Happy, Excited, Surprised, Confused, Sad, Angry, Laughing. Smooth cross-fades, intensity, head pose and procedural motion. Keys 1–8. A model's custom clip with the same name (e.g. `excited`) is used if present |
| Voice | Mic input (never played back or uploaded), audio-file playback, analyser-based loudness and formant visemes (`aa ih ou ee oh`), voice activity detection with hysteresis, talking head nods |
| TTS | Browser speechSynthesis. Lip-sync here is **approximate**, because browsers don't expose TTS audio |
| Tracking | Optional MediaPipe Face Landmarker: head rotation, blinks, mouth and smile. Runs locally |
| Camera | Face / bust / waist / full framing, orbit, pan and zoom, FOV, model rotation |
| Graphics | Low / medium / high (pixel ratio, soft shadows), 30 / 60 / unlimited FPS cap, PNG snapshot |
| Stream | Fullscreen stream mode (S / Esc), pop-out window synced over BroadcastChannel, transparent / green / studio backgrounds, LIVE badge and timer, demo viewer and sub counters, mic status, title, chat lines |

## OBS

- **Browser source:** `http://localhost:5173/?mode=stream&transparent=1&model=/models/me.vrm`, 1920×1080.
  OBS has its own browser storage, so use `&model=`. Mic lip-sync inside OBS needs OBS launched with
  `--use-fake-ui-for-media-stream`. Otherwise drive speech through the bridge.
- **Window capture:** use *Stream → Pop-out window*, set the green background and add a Chroma Key filter. Start
  the mic inside the pop-out.

## Live bridge and AI voice (`server/bridge.mjs`)

The browser never holds API keys. Your server does, and it pushes JSON to the avatar over WebSocket:

```bash
curl -X POST localhost:8787/command -d '{"type":"expression","name":"happy"}'
curl -X POST localhost:8787/command -d '{"type":"speak","text":"Hello chat!"}'        # browser TTS
curl -X POST localhost:8787/command -d '{"type":"speak","url":"https://…/line.mp3"}'  # real audio → accurate lip-sync
curl -X POST localhost:8787/command -d '{"type":"stats","viewers":42,"subscribers":1300}'
curl -X POST localhost:8787/command -d '{"type":"chat","user":"mika","text":"hi!"}'
```

Other messages: `{"type":"speak","audio":"<base64 wav/mp3>"}`, `stop`, `title`, `camera`.

To add an AI assistant, implement `generateReply()` in the bridge: call your LLM and TTS provider with keys
from environment variables, then broadcast `expression` and `speak` (base64 audio). Set `BRIDGE_TOKEN` to require
`Authorization: Bearer …` on the HTTP API, and `BRIDGE_ORIGINS` to restrict WebSocket origins.

**Twitch / YouTube aren't connected.** The counters are demo values. Real numbers and chat need your own
credentials, used server-side in the bridge. For Twitch that means a registered app (Client ID + secret), an OAuth
user token with the right scopes, and EventSub / Helix for viewers, followers and subs, or IRC/EventSub for chat.
Forward the results as `stats` / `chat` messages.

## Face tracking assets

The MediaPipe WASM runtime is copied into `public/mediapipe/wasm` automatically (`predev` / `prebuild`). The
`face_landmarker.task` model (~3.7 MB) downloads from Google's CDN on first use. For offline use, put it in
`public/mediapipe/`.

## Project structure

```
src/
  character/    AvatarEngine (frame loop), Stage, CameraRig, PlaceholderAvatar, FaceCanvas, hairGeometry
  vrm/          loadVRM, VRMAvatar (AvatarRig adapter), modelLibrary (upload/URL/cache)
  animation/    IdleAnimator, BlinkController, TalkAnimator
  expressions/  presets, ExpressionController (blending + fallbacks)
  audio/        AudioEngine (Web Audio graph), LipSync, BrowserTTS, VoiceProvider contract
  tracking/     FaceTracker (MediaPipe)
  livestream/   LiveClient (WebSocket), bridge message handling, WindowSync
  components/   UI (top bar, viewport, overlay, panels)
  hooks/ state/ utils/ styles/
server/bridge.mjs   reference WebSocket + HTTP relay
```

Performance: one rAF loop outside React. UI subscribes to store slices (`useSyncExternalStore`) that change only
on transitions, and meters write to the DOM directly. Skinned meshes are optimised with
`removeUnnecessaryVertices` / `combineSkeletons`.
