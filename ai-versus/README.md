# AI Versus Studio

Automated generator for short vertical videos in the format **"What would different AIs do if…?"**
Five tiny chibi mascots (ChatGPT, Claude, Gemini, Grok, Meta AI) face the same situation, and each
one answers in its own personality and voice. The video ends right after the last answer, with a
short "Which AI had the best answer?" card. It adds no other footage.

> The answers are **fictional, comedic interpretations** written by Claude. They are not real
> outputs of those products. Every video carries a small "Fictional parody · not real AI outputs"
> label (you can turn it off in Settings). The mascots are original designs inspired by each brand's
> colours; none of them use a real logo.

**Sample:** [`samples/flooding-elevator/flooding-elevator.mp4`](samples/flooding-elevator/flooding-elevator.mp4),
"What Would Five AIs Do If They Were Trapped In A Flooding Elevator?" It runs 49.1 s at 1080×1920,
30 fps, H.264 + AAC, and passed all 72 QC checks. The full report is in
`samples/flooding-elevator/report.json`.

---

## Workflow

1. **Idea Generator:** Claude proposes 10 situations and scores each one for visual, story, humour
   and clarity. You can also add your own topics, which Claude scores the same way.
2. **You approve one topic.** This is the only manual step.
3. The BullMQ worker then runs these stages automatically:

| Stage | What happens |
|---|---|
| `script` | Claude (structured output) writes the hook, the narrator intro, five different answers in cast order (with mood, emphasis words and how the listeners react), the outro and a background prompt. The script is checked for length, order and banned content, and Claude retries up to 3 times. |
| `characters` | Loads the five permanent characters from the library. If a library is empty, it imports the bundled reference sheets, or generates new ones with fal.ai. |
| `background` | fal.ai draws one 9:16 environment for the topic. Optionally, image-to-video turns it into an ambient loop. |
| `voices` | ElevenLabs reads every line with each character's own voice and returns character-level timestamps. The audio is trimmed, loudness-normalised (−16 LUFS) and sped up with one shared, pitch-preserving tempo so the video fits the 30–50 s target. |
| `timeline` | Places scenes using the real audio durations: intro → ChatGPT → Claude → Gemini → Grok → Meta AI → ending. |
| `render` | The layered 2D renderer draws each scene and encodes it with FFmpeg (one clip per scene). Then the soundtrack is mixed and everything is assembled. |
| `qc` | About 70 automated checks (listed below). If a scene fails, only that scene is re-voiced and/or re-rendered, up to 2 retries. |
| `export` | Copies the MP4 plus a JSON with the script, timeline and QC report to `outputs/`. It is also stored at `projects/<id>/final.mp4`. |

---

## Quick start

Requirements: Node 20+, FFmpeg/ffprobe, Redis.

```bash
cd ai-versus
npm install
cp .env.example .env          # add ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, FAL_KEY
redis-server &                # or point REDIS_URL at a managed Redis
npm run worker                # terminal 1 – production worker
npm run dev                   # terminal 2 – dashboard on http://localhost:3000
```

To rebuild the reference sample without any API keys (it uses the bundled script, voices and
background):

```bash
npm run sample                # → samples/flooding-elevator/flooding-elevator.mp4 + report.json
npm test                      # unit tests
npm run typecheck
```

Production: `npm run build && npm start` for the dashboard. Run `npm run worker` as a separate
long-lived process; scale it by running more workers or raising `WORKER_CONCURRENCY`.

---

## Dashboard

| Section | Features |
|---|---|
| **Idea Generator** (`/`) | Generate 10 scored ideas (with an optional theme), add and score manual topics, approve or reject. Approving queues production and opens the project. |
| **Character Library** (`/characters`) | All expressions and turnaround views for each character. Generate sheets with fal.ai (core 2×2, 9 expressions, or front/¾/side), upload your own sheets or identity references, lock a design, and set the ElevenLabs voice (picker with preview, stability, similarity, style, speed). |
| **Video Production** (`/production`) | Live stage progress for every project, plus QC state and spend. |
| **Video Preview** (`/projects/:id`) | Video player, per-stage logs, and each AI's line with its audio. Buttons: **Rewrite answer** (Claude, with an optional note), **Re-voice**, **Re-render**, **New background**, **Rewrite whole script**, **Resume/retry**. Also shows the full QC report and per-call costs. **Export MP4** downloads the file. |
| **Settings** (`/settings`) | API keys (stored server-side and never sent back to the browser), provider model ids, cost limits, video quality (CRF, preset, music level, SFX, disclaimer), min/max duration, script language and TTS language. |

API routes live under `src/app/api/*`: `ideas`, `ideas/:id/approve|reject`, `projects`,
`projects/:id`, `projects/:id/run`, `characters`, `characters/:id`, `characters/:id/sheet`,
`characters/:id/generate`, `voices`, `settings`, `health`, and `files/*` (range requests supported).

---

## Character design & consistency

- **Permanent character bible:** `src/lib/characters.ts`. It holds each character's design
  prompt, colours, personality, speaking style and default voice. Every generation reuses it.
- **Bundled reference sheets:** `assets/characters/<id>/`
  - `sheet-core.png` is a 2×2 grid (neutral / talking / blink / surprised). It drives the animation.
  - `sheet-full.png` is a 4×3 grid: happy, sad, angry, confused, surprised, talking, thinking,
    neutral, blink, plus front, three-quarter and side views.
- **Sheet slicer:** `src/lib/pipeline/sheets.ts`. It cuts panels apart, removes grid lines and white
  backgrounds, then lines every panel up with the neutral one using the lower body, which never
  changes between expressions. Swapping sprites from frame to frame therefore only changes the face.
  Expressions from other sheets are rescaled onto the same canvas and feet anchor. The match score
  is stored and checked in QC (all five characters are at ≥ 99%).
- **Locking** a character blocks its core sheet from being regenerated.

## Animation

`src/lib/render/renderer.ts` draws every frame on a Skia canvas (`@napi-rs/canvas`) and streams raw
frames into FFmpeg (libx264, yuv420p, CRF 18).

- **Mouth:** driven by the real voice: an RMS envelope at 30 fps, with fast attack and slow release.
  The mouth flaps while there is sound and stays open on loud syllables.
- **Blinks:** on a seeded random schedule for each character.
- **Speaking body:** squashes and stretches, bobs, sways and leans with the voice energy and the
  line's mood. Emphasis words add a hop and a punch-zoom.
- **Listeners:** the four non-speakers stand dimmed in the back row, turned slightly toward the
  speaker. They idle and blink, and two of them react (surprised, happy or confused) partway
  through the line, following the script.
- **Intro:** title card, all five characters with name labels, a surprised reaction when the water
  rises, and a slight camera shake.
- **Ending:** staggered happy hops and the "Which AI had the best answer?" card.
- **Environment layers:** animated water (wave edge, foam, caustics, ripples around the legs, water
  level slowly rising), drips, a flickering emergency light, plus particle sets for fire, snow,
  space, sand and zombie fog.
- **Captions:** 1–3 words at a time, word-synced, the active word in yellow and emphasis words in
  the speaker's colour, kept inside mobile-safe margins.
- **Card and waveform:** each answer gets a character card (portrait, name, "AI n of 5") with a live
  waveform from the real envelope.
- **Transitions:** a wipe in the next speaker's colour, with a whoosh.

Each scene renders to its own clip, so changing one answer re-renders only that scene. A content hash
decides which scenes changed.

## Audio

- Voices come from ElevenLabs `/v1/text-to-speech/{voice}/with-timestamps` (model `eleven_v3` by
  default, so delivery tags like `[sarcastic]` work). The narrator and each character have their own
  persistent voice.
- Captions use the ElevenLabs character timestamps. For audio imported without them (like the
  sample), word times are estimated by matching punctuation breaks in the text to pauses in the audio.
- Music and SFX are **synthesised procedurally**: a light marimba/pad loop, whooshes, pops, a chime,
  and bubbles or crackle ambience. No third-party audio can slip in. The music ducks under dialogue,
  and the mix ends with a soft limiter.

## Quality control

`src/lib/pipeline/qc.ts` checks, before export:

- **Script:** all five characters and answers are present, the narrator intro exists, and the
  script contains no superhero or movie content.
- **Per scene, voice and captions:** the TTS text equals the scripted line, captions match the line
  word for word and stay inside the voice window, and the mouth envelope is in sync with the audio.
- **Audio:** no overlapping voices and no clipping.
- **Characters:** each one was rendered with the current library sprites, and its expression sprites
  are aligned.
- **Scene clips:** H.264 at 1080×1920, the expected duration, decode without errors, and contain no
  black frames.
- **Final file:** H.264 1080×1920, 30 fps, AAC audio, duration between 30 and 50 s, ends exactly at
  the timeline end, contains only generated scenes, and has no black frames.

## Costs

Every paid call is checked against the per-video and monthly limits **before** it runs, then
recorded. The default limit is $3 per video. Pricing assumptions can be edited in Settings. A typical
video makes 1 Claude script call, 1 fal image (plus an optional image-to-video clip) and about 800
ElevenLabs characters.

## Storage

- Local by default: documents in `data/db`, media in `data/media`, work files in `data/work`.
- With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set, documents go to a `docs` table and media
  to the `media` bucket, with a local cache for rendering. Run `supabase/schema.sql` first.

## How the sample was produced

This build environment had no Anthropic, ElevenLabs or fal.ai API keys, so the reference sample's
source assets were made with the tools available here:

- Claude wrote the script.
- ElevenLabs produced the voices, using the same voice ids as the library defaults.
- Higgsfield (GPT Image) produced the elevator background and the character sheets.

Those sources are in `samples/flooding-elevator/source/` and `assets/characters/`. Everything after
that ran through this codebase's real pipeline: slicing, audio processing, timing, animation,
captions, mix, assembly, QC and export.

## Known limitations

- The Anthropic, ElevenLabs and fal.ai integrations follow each provider's documented API, but they
  were not run live here because no keys were available. Use **Settings → Providers** to change the
  fal model ids if an endpoint changes.
- There are no separate arm rigs. "Gestures" are whole-body motion: lean, hop, sway, and
  squash/stretch on emphasis.
- Image-to-video backgrounds are optional and off by default, to save cost. The renderer loops the
  clip under the characters.
