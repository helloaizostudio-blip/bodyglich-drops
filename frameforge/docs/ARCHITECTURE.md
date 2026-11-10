# FRAMEFORGE architecture

## 1. Architecture recommendation

One Next.js application (App Router) that is both the UI and the backend, backed by PostgreSQL and a
file-storage adapter, deployed as a single container.

```
Browser (phone / tablet / desktop)
   │  React server components (reads) · server actions (writes) · direct file uploads
   ▼
Next.js server ── src/server/actions     validated, authenticated mutations
   │           ── src/server/services    domain logic (episodes, characters, scenes, story, render…)
   │           ── src/server/providers   swappable AI adapters (text · image · video · voice)
   │           ── src/server/storage     local disk or S3-compatible bucket
   │           ── src/server/render      ffmpeg timeline renderer
   ▼
PostgreSQL (Drizzle ORM, SQL migrations in /drizzle)        File storage (media never in the DB)
```

Why this shape:

- **One deployable unit** is the simplest thing to run and update from a phone, and it still keeps
  frontend, backend and integrations in separate folders with one-way dependencies
  (`app → actions → services → providers/storage/db`).
- **Server actions + server components** remove a hand-written REST layer. Every action goes through
  one wrapper (`src/server/action.ts`) that authenticates, validates input with zod, returns typed
  errors and refreshes the page data.
- **Adapters at every external edge** (AI providers, storage, renderer) so services can be swapped
  without touching pages.
- **A container, not serverless**, because the studio needs things serverless hosts lack: ffmpeg,
  long-running generations and renders, and (optionally) a local disk.

## 2. Technology choices

| Concern | Choice | Reason |
| --- | --- | --- |
| Framework | Next.js 16, React 19, TypeScript (strict) | Preferred stack; server components + actions |
| Styling | Tailwind CSS 4 with a small in-house component kit (`src/components/ui`) | Consistent look, no heavy UI dependency |
| Database | PostgreSQL via Drizzle ORM | Typed schema, plain SQL migrations |
| Zero-config database | Embedded Postgres (PGlite) when `DATABASE_URL` is unset | Same SQL and migrations; lets the app run on one container with a volume |
| Migrations | `drizzle-kit generate`; applied automatically at startup | No terminal step on deploy |
| File storage | Adapter: local disk or any S3-compatible bucket, direct browser uploads with progress, HTTP range streaming | Large media never passes through server actions, the DB or localStorage |
| Auth | Built-in email + password (scrypt), DB sessions, httpOnly cookie, first-run owner setup | No third-party account needed |
| Secrets | Provider keys encrypted with AES-256-GCM using `APP_SECRET`; never returned to the browser | Keys can be entered from a phone safely |
| AI text | Official Anthropic SDK (Claude), streaming, structured outputs, tool use | Stories, review, assistant |
| AI image / video / voice | Thin REST adapters built from OpenAI's OpenAPI spec and the ElevenLabs SDK source | No invented endpoints |
| Rendering | ffmpeg child process (argument arrays, temp dirs, cancellable, progress) | Real MP4 export |
| Background work | Jobs table + in-process execution (`after()` for images, provider polling for video, child process for renders) | No queue infrastructure needed at this scale |
| Drag and drop | dnd-kit, plus tap-to-move buttons | Reordering that works on touch screens |

## 3. Database structure

All tables are in `src/db/schema.ts`; the generated SQL is in `drizzle/`.

- **Identity**: `users`, `sessions`, `projects` (one studio workspace per channel), `settings`, `activity`.
- **Characters**: `characters` (profile + consistency rules + `profile_reference_id`),
  `character_references` (kind: original / expression / outfit / variation, `is_locked`),
  `outfits`, `character_relationships`, `voice_profiles`.
- **World**: `locations`, `location_images`, `location_characters`.
- **Episodes**: `episodes` (stage, target length, render settings), `episode_characters`,
  `scripts` (nine editable sections, generator inputs, last review).
- **Storyboard / animation**: `scenes` (one row is a storyboard panel *and* an animation shot: location,
  action, camera, motion, prompts, visual / background / clip assets, status), `scene_characters`,
  `dialogue_lines` (speaker, text, voiceover asset).
- **Media**: `assets` (category, kind, storage key, dimensions, duration, source), `asset_links`
  (manual attachments to episodes / scenes), `audio_cues` (music and effects on a timeline).
- **AI**: `provider_configs` (encrypted key, model settings, verification status),
  `generation_jobs` (text / image / video / voice / render with status, progress, error, usage, result asset),
  `prompt_templates`, `assistant_messages` (one conversation per episode).
- **Distribution**: `publishing_records`, `analytics_entries`.

Relationships that matter: scenes belong to episodes; scenes ↔ characters and episodes ↔ characters
are many-to-many; every media pointer is a foreign key to `assets` with `ON DELETE SET NULL` (or
cascade for join rows), so deleting a file never leaves a broken reference; everything is scoped to a
project.

A storyboard is the ordered set of an episode's `scenes`, and a "video clip" is an `assets` row in the
`animation_clip` category referenced by `scenes.clip_asset_id` — there are no separate tables for
those two concepts because they would only duplicate these rows.

## 4. Implementation plan and milestones

| Phase | Scope | State |
| --- | --- | --- |
| 1 — Foundation | Layout, responsive navigation, database, auth, dashboard, Character Lab, Asset Library, episodes | Built, browser-tested on phone and desktop viewports |
| 2 — Story production | Story Engine, script editor, scene management, Storyboard Studio, World Builder | Built, browser-tested |
| 3 — AI generation | Provider adapter layer, Claude integration, image generation, prompt management, job tracking, assistant | Built; tested end to end against local stand-in servers, **not** against live paid APIs |
| 4 — Animation | Video adapter, Animation Studio, Audio Studio, Video Editor, ffmpeg renderer | Built; renderer verified with ffprobe and in the browser |
| 5 — Publishing | Publishing Center, analytics, final checks | Manual workflow built; YouTube API integration not started |

Next milestones, in suggested order:

1. Verify each provider adapter with a real key and a small budget; fix anything the live APIs disagree with.
2. YouTube Data API adapter (OAuth, resumable upload behind an explicit confirmation) and YouTube Analytics import.
3. Server-side thumbnails for the Asset Library.
4. More video and image adapters (each is one file plus one catalog entry — see below).
5. Team members and roles.

## 5. Key design decisions

- **Originals are protected in the data model, not just the UI.** `character_references.kind = 'original'`
  rows are locked on insert; the server refuses to remove, retype or delete a locked reference;
  `characters.profile_reference_id` is only written by the explicit "use as profile image" action and
  only accepts originals. Generated assets are stored with `source = 'generated'` and can only be
  attached as variation / expression / outfit.
- **Nothing is reported as done unless it is.** Generation and render results exist only as
  `generation_jobs` rows whose status comes from the real call; failed calls store the real error.
  A provider cannot be used until its verification call has succeeded.
- **Prompts are assembled from studio data.** Scene and image prompts are built deterministically
  from the channel style guide, the location profile and each character's Consistency Profile, so they
  work with no AI connected and stay consistent when one is.
- **Progress is computed, not typed.** An episode's percentage comes from its script, scenes,
  visuals, clips, voiceovers, final video and publishing record.
- **The assistant acts through tools.** It reads live data with read tools and changes data only
  through a small set of write tools (script sections, storyboard scenes, scene prompts, stage, new
  episode). It cannot generate media or publish.

## Adding a provider adapter

1. Describe it in `src/lib/provider-catalog.ts` (name, key variable, model options, setup steps, and
   which official document its request shapes come from).
2. Implement the capability interface from `src/server/providers/types.ts`
   (`TextProvider`, `ImageProvider`, `VideoProvider` or `VoiceProvider`) plus a free `verify` call.
3. Register the factory and verifier in `src/server/providers/index.ts`.

No page or service changes are needed; Settings picks up the new entry automatically.
