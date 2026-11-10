# FRAMEFORGE — AI Animation Production Studio

The production headquarters for the **BLOCKHEADS** YouTube channel: characters, stories, storyboards,
assets, animation, audio, editing and publishing in one mobile-first web app.

```
IDEA → SCRIPT → STORYBOARD → ASSETS → ANIMATION → EDITING → PUBLISHED
```

It is a real application, not a mock-up: data lives in PostgreSQL, uploads live in file storage, and
every button does something. Where an external service is needed and not connected, the app says so
instead of pretending.

## What works today

| Area | Status |
| --- | --- |
| Sign-in, first-run studio setup | Works. Email + password, one owner account per installation. |
| Dashboard, Episodes | Works. Progress is calculated from real work (script, scenes, visuals, clips, voiceovers, final video). |
| Character Lab | Works. Profiles, locked original references, expressions, outfits, variations, relationships, reusable Consistency Profile. |
| Asset Library | Works. Upload / preview / search / filter / rename / delete / attach / usage tracking for images, video and audio. |
| Story Engine | Script editor with autosave works with no setup. Idea, story, per-section regeneration and review need a text provider key. |
| Storyboard Studio | Works. Scenes, dialogue, drag or tap reordering, duplicate, visual references, animatic preview, print/PDF and JSON export. Visual prompts are built from your profiles with no AI call. "Break script into scenes" needs a text provider key. |
| World Builder | Works. Reusable locations with images, lighting, palette, time of day, linked characters. |
| Image Generator | Prompt building and saved prompts work with no setup. Generating needs an image provider key. |
| Animation Studio | Shot setup, prompt building, job queue and manual clip upload work. Generating needs a video provider key. |
| Audio Studio | Voice profiles, per-line voiceovers (upload), music and sound-effect cues work. Generating voices needs a voice provider key. |
| Video Editor | Works. Timeline, browser preview and a **real ffmpeg render** to MP4 (on hosts that have ffmpeg — the Dockerfile installs it). |
| Publishing Center | Works as a manual workflow: package editor, YouTube limit counters, JSON/text export, publish tracking. |
| Analytics | Works with manual entry. Nothing is invented. |
| AI assistant | Needs a text provider key. Reads and updates the open episode through studio tools. |

### Honest limits

- **Provider adapters are untested against live paid APIs.** Claude, GPT Image, Sora 2 and ElevenLabs
  adapters were written from the vendors' official SDK / OpenAPI specifications and exercised end to
  end against local stand-in servers, but no real key was used and no money was spent. Treat your
  first real generation with each provider as a test. A provider stays "Not connected" until its
  free verification call succeeds.
- **YouTube is not connected.** There is no YouTube Data API or Analytics adapter yet (it needs a
  Google Cloud OAuth client and Google's app verification). Publishing is a manual upload using the
  exported package; analytics are typed in from YouTube Studio. FRAMEFORGE never posts to YouTube.
- **The S3 storage driver and the Dockerfile were not run in the development sandbox** (no bucket or
  Docker daemon was available). Local-disk storage, the embedded database and a PostgreSQL
  connection were all tested.
- Renders drop the audio inside animation clips (voiceovers, music and effects are mixed in), music
  does not loop or fade, and a finished render is held in memory while it is saved.
- Asset thumbnails are the original files (no server-side resizing yet).
- One studio per installation; there are no team roles yet.

## Deploying from your phone

You need a host that runs a Docker container with a persistent disk. Railway, Render and Fly.io all
do this from a browser, with no terminal. The steps are the same everywhere (menu names differ):

1. Create a new project **from this GitHub repository**.
2. Set the service's **root directory** to `frameforge` — the host then builds the included `Dockerfile`
   (Node.js + ffmpeg).
3. Add a **persistent volume** mounted at `/data` (embedded database, uploads, secret).
4. Add the environment variable `APP_SECRET` with a long random value.
5. Deploy, open the public URL on your phone, and create your studio owner account.
6. Optional: in the browser menu choose **Add to Home screen** to use it like an app.

Recommended upgrades once you rely on it:

- **Managed PostgreSQL**: add the host's Postgres add-on and set `DATABASE_URL`. Migrations apply automatically.
- **Bucket storage**: set the `S3_*` variables to keep media off the server disk (see `.env.example`).

Serverless hosts (Vercel, Netlify) can run the app only with `DATABASE_URL` and S3 storage set, and
without video rendering (no ffmpeg) — a container host is the better fit.

## Connecting AI providers

Open **Settings → AI providers** in the app, paste a key, and tap **Save & verify**. Keys are
encrypted with `APP_SECRET` and never sent back to the browser. You can also supply keys as
environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`).

| Capability | Adapter | Used by |
| --- | --- | --- |
| Text | Claude (Anthropic) | Story Engine, script review, script → scenes, assistant |
| Image | GPT Image (OpenAI) | Image Generator |
| Video | Sora 2 (OpenAI) | Animation Studio |
| Voice | ElevenLabs | Audio Studio |
| Render | ffmpeg on your server | Video Editor |
| YouTube | none yet | — |

Generating content is billed by each provider to **your** account. Nothing is generated unless you
press a Generate button.

## Local development

```bash
cd frameforge
npm install
npm run dev        # http://localhost:3000
```

No configuration is required: without `DATABASE_URL` an embedded Postgres (PGlite) and local file
storage are created under `./.data`. Other scripts: `npm run build`, `npm run start`,
`npm run typecheck`, `npm run db:generate` (create a migration after editing `src/db/schema.ts`).

## Your characters stay yours

- Upload each character's real artwork as an **original reference**. Originals are locked the moment
  they are added: they cannot be removed, retyped or deleted from the Asset Library until you unlock them.
- The profile image only changes when you tap **Use as profile image** on an original.
- Generated images are saved as separate assets. They can be attached to a character as a variation,
  expression or outfit image — never as an original, and never as the profile image.
- Without uploaded art, a character shows a neutral initials placeholder. FRAMEFORGE does not invent designs.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
