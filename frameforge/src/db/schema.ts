import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  date,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Enumerations (stored as text, validated in TypeScript + zod)        */
/* ------------------------------------------------------------------ */

export const EPISODE_STAGES = [
  "idea",
  "script",
  "storyboard",
  "assets",
  "animation",
  "editing",
  "published",
] as const;
export type EpisodeStage = (typeof EPISODE_STAGES)[number];

export const CHARACTER_ROLE_TYPES = ["main", "supporting", "other"] as const;
export type CharacterRoleType = (typeof CHARACTER_ROLE_TYPES)[number];

export const REFERENCE_KINDS = ["original", "expression", "outfit", "variation"] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

export const ASSET_CATEGORIES = [
  "character",
  "outfit",
  "expression",
  "background",
  "prop",
  "storyboard",
  "generated_image",
  "animation_clip",
  "voiceover",
  "music",
  "sfx",
  "final_video",
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const ASSET_KINDS = ["image", "video", "audio", "other"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const LOCATION_CATEGORIES = [
  "house",
  "street",
  "school",
  "shop",
  "park",
  "office",
  "fantasy",
  "other",
] as const;
export type LocationCategory = (typeof LOCATION_CATEGORIES)[number];

export const SCENE_STATUSES = ["draft", "ready", "in_progress", "done"] as const;
export type SceneStatus = (typeof SCENE_STATUSES)[number];

export const JOB_KINDS = ["text", "image", "video", "voice", "render"] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export const JOB_STATUSES = ["queued", "running", "succeeded", "failed", "canceled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const PROVIDER_CAPABILITIES = ["text", "image", "video", "voice", "render", "youtube"] as const;
export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[number];

export const PUBLISH_STATUSES = ["draft", "ready", "scheduled", "published"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

/* ------------------------------------------------------------------ */
/* Users, sessions, projects                                           */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["owner", "member"] }).notNull().default("owner"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** A project is a studio workspace — one per channel (e.g. BLOCKHEADS). */
export const projects = pgTable("projects", {
  id: id(),
  name: text("name").notNull(),
  channelName: text("channel_name").notNull(),
  description: text("description").notNull().default(""),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Assets                                                              */
/* ------------------------------------------------------------------ */

export const assets = pgTable(
  "assets",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    category: text("category", { enum: ASSET_CATEGORIES }).notNull(),
    kind: text("kind", { enum: ASSET_KINDS }).notNull(),
    name: text("name").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationSec: real("duration_sec"),
    source: text("source", { enum: ["upload", "generated", "render"] }).notNull().default("upload"),
    jobId: text("job_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("assets_project_idx").on(t.projectId, t.category)],
);

/* ------------------------------------------------------------------ */
/* Characters                                                          */
/* ------------------------------------------------------------------ */

export const characters = pgTable(
  "characters",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tagline: text("tagline").notNull().default(""),
    roleType: text("role_type", { enum: CHARACTER_ROLE_TYPES }).notNull().default("main"),
    mainRole: text("main_role").notNull().default(""),
    description: text("description").notNull().default(""),
    personality: text("personality").notNull().default(""),
    signatureClothing: text("signature_clothing").notNull().default(""),
    visualTraits: text("visual_traits").notNull().default(""),
    voiceDescription: text("voice_description").notNull().default(""),
    palette: jsonb("palette").$type<string[]>().notNull().default([]),
    /** Consistency profile: what must always stay the same when generating this character. */
    consistencyRules: text("consistency_rules").notNull().default(""),
    /** Consistency profile: things generators must never change or add. */
    avoidRules: text("avoid_rules").notNull().default(""),
    /** The profile image. Only ever changed by an explicit user action. */
    profileReferenceId: text("profile_reference_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("characters_project_idx").on(t.projectId)],
);

export const outfits = pgTable("outfits", {
  id: id(),
  characterId: text("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  isSignature: boolean("is_signature").notNull().default(false),
  createdAt: createdAt(),
});

/**
 * Reference images for a character. `original` rows are the user's canonical art:
 * they are locked by default and are never replaced by generated variations.
 */
export const characterReferences = pgTable(
  "character_references",
  {
    id: id(),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: REFERENCE_KINDS }).notNull().default("original"),
    label: text("label").notNull().default(""),
    outfitId: text("outfit_id").references(() => outfits.id, { onDelete: "set null" }),
    isLocked: boolean("is_locked").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("char_refs_character_idx").on(t.characterId)],
);

export const characterRelationships = pgTable("character_relationships", {
  id: id(),
  characterId: text("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  relatedCharacterId: text("related_character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  relationship: text("relationship").notNull(),
  notes: text("notes").notNull().default(""),
});

/* ------------------------------------------------------------------ */
/* Locations (World Builder)                                           */
/* ------------------------------------------------------------------ */

export const locations = pgTable("locations", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category", { enum: LOCATION_CATEGORIES }).notNull().default("other"),
  description: text("description").notNull().default(""),
  lighting: text("lighting").notNull().default(""),
  timeOfDay: text("time_of_day").notNull().default(""),
  palette: jsonb("palette").$type<string[]>().notNull().default([]),
  consistencyNotes: text("consistency_notes").notNull().default(""),
  coverAssetId: text("cover_asset_id").references(() => assets.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const locationImages = pgTable("location_images", {
  id: id(),
  locationId: text("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  label: text("label").notNull().default(""),
  createdAt: createdAt(),
});

export const locationCharacters = pgTable(
  "location_characters",
  {
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.locationId, t.characterId] })],
);

/* ------------------------------------------------------------------ */
/* Episodes, scripts, scenes                                           */
/* ------------------------------------------------------------------ */

export type RenderSettings = {
  width: number;
  height: number;
  fps: number;
};

export const episodes = pgTable(
  "episodes",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    logline: text("logline").notNull().default(""),
    format: text("format", { enum: ["short", "long"] }).notNull().default("long"),
    stage: text("stage", { enum: EPISODE_STAGES }).notNull().default("idea"),
    targetDurationSec: integer("target_duration_sec").notNull().default(180),
    coverAssetId: text("cover_asset_id").references(() => assets.id, { onDelete: "set null" }),
    renderSettings: jsonb("render_settings").$type<RenderSettings>(),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("episodes_project_idx").on(t.projectId)],
);

export const episodeCharacters = pgTable(
  "episode_characters",
  {
    episodeId: text("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.episodeId, t.characterId] })],
);

export const SCRIPT_SECTIONS = [
  "title",
  "hook",
  "concept",
  "characterRoles",
  "script",
  "dialogue",
  "sceneBreakdown",
  "ending",
  "thumbnailConcept",
] as const;
export type ScriptSectionKey = (typeof SCRIPT_SECTIONS)[number];
export type ScriptSections = Partial<Record<ScriptSectionKey, string>>;

export type StoryInputs = {
  genre: string;
  targetDurationSec: number;
  characterIds: string[];
  tone: string;
  audience: string;
  setting: string;
  complexity: string;
  idea: string;
  storyType: string;
};

export type ScriptReview = {
  reviewedAt: string;
  model: string;
  summary: string;
  checks: { key: string; label: string; score: number; notes: string }[];
};

export const scripts = pgTable("scripts", {
  id: id(),
  episodeId: text("episode_id")
    .notNull()
    .unique()
    .references(() => episodes.id, { onDelete: "cascade" }),
  sections: jsonb("sections").$type<ScriptSections>().notNull().default({}),
  inputs: jsonb("inputs").$type<StoryInputs>(),
  review: jsonb("review").$type<ScriptReview>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Scenes double as storyboard panels and as animation shots — one row per scene of an episode. */
export const scenes = pgTable(
  "scenes",
  {
    id: id(),
    episodeId: text("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull().default(""),
    durationSec: real("duration_sec").notNull().default(5),
    locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }),
    locationText: text("location_text").notNull().default(""),
    action: text("action").notNull().default(""),
    camera: text("camera").notNull().default(""),
    motion: text("motion").notNull().default(""),
    aspectRatio: text("aspect_ratio").notNull().default("16:9"),
    visualPrompt: text("visual_prompt").notNull().default(""),
    animationPrompt: text("animation_prompt").notNull().default(""),
    status: text("status", { enum: SCENE_STATUSES }).notNull().default("draft"),
    visualAssetId: text("visual_asset_id").references(() => assets.id, { onDelete: "set null" }),
    backgroundAssetId: text("background_asset_id").references(() => assets.id, { onDelete: "set null" }),
    clipAssetId: text("clip_asset_id").references(() => assets.id, { onDelete: "set null" }),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("scenes_episode_idx").on(t.episodeId, t.position)],
);

export const sceneCharacters = pgTable(
  "scene_characters",
  {
    sceneId: text("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.sceneId, t.characterId] })],
);

export const dialogueLines = pgTable(
  "dialogue_lines",
  {
    id: id(),
    sceneId: text("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    characterId: text("character_id").references(() => characters.id, { onDelete: "set null" }),
    /** Free-text speaker used when the line is not tied to a library character (e.g. "Narrator"). */
    speaker: text("speaker").notNull().default(""),
    text: text("text").notNull().default(""),
    audioAssetId: text("audio_asset_id").references(() => assets.id, { onDelete: "set null" }),
  },
  (t) => [index("dialogue_scene_idx").on(t.sceneId, t.position)],
);

/** Manual attachments of library assets to episodes / scenes (usage tracking). */
export const assetLinks = pgTable(
  "asset_links",
  {
    id: id(),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    episodeId: text("episode_id").references(() => episodes.id, { onDelete: "cascade" }),
    sceneId: text("scene_id").references(() => scenes.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [index("asset_links_asset_idx").on(t.assetId)],
);

/* ------------------------------------------------------------------ */
/* Generation jobs + providers                                         */
/* ------------------------------------------------------------------ */

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: JOB_KINDS }).notNull(),
    purpose: text("purpose").notNull().default(""),
    provider: text("provider").notNull(),
    model: text("model").notNull().default(""),
    status: text("status", { enum: JOB_STATUSES }).notNull().default("queued"),
    prompt: text("prompt").notNull().default(""),
    params: jsonb("params").$type<Record<string, unknown>>().notNull().default({}),
    episodeId: text("episode_id").references(() => episodes.id, { onDelete: "set null" }),
    sceneId: text("scene_id").references(() => scenes.id, { onDelete: "set null" }),
    characterId: text("character_id").references(() => characters.id, { onDelete: "set null" }),
    resultAssetId: text("result_asset_id").references(() => assets.id, { onDelete: "set null" }),
    externalId: text("external_id"),
    progress: real("progress"),
    error: text("error"),
    usage: jsonb("usage").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("jobs_project_idx").on(t.projectId, t.kind, t.createdAt)],
);

export const providerConfigs = pgTable(
  "provider_configs",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    capability: text("capability", { enum: PROVIDER_CAPABILITIES }).notNull(),
    providerId: text("provider_id").notNull(),
    /** AES-256-GCM encrypted API key. Never sent to the browser. */
    encryptedKey: text("encrypted_key"),
    keyHint: text("key_hint"),
    config: jsonb("config").$type<Record<string, string>>().notNull().default({}),
    isActive: boolean("is_active").notNull().default(false),
    status: text("status", { enum: ["unverified", "connected", "error"] }).notNull().default("unverified"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    lastError: text("last_error"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("provider_unique_idx").on(t.projectId, t.capability, t.providerId)],
);

export const promptTemplates = pgTable("prompt_templates", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["image", "video", "text"] }).notNull().default("image"),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */

export const voiceProfiles = pgTable("voice_profiles", {
  id: id(),
  characterId: text("character_id")
    .notNull()
    .unique()
    .references(() => characters.id, { onDelete: "cascade" }),
  description: text("description").notNull().default(""),
  providerId: text("provider_id").notNull().default(""),
  providerVoiceId: text("provider_voice_id").notNull().default(""),
  sampleAssetId: text("sample_asset_id").references(() => assets.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

/** Music and sound-effect placements on an episode timeline. */
export const audioCues = pgTable("audio_cues", {
  id: id(),
  episodeId: text("episode_id")
    .notNull()
    .references(() => episodes.id, { onDelete: "cascade" }),
  sceneId: text("scene_id").references(() => scenes.id, { onDelete: "cascade" }),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["music", "sfx"] }).notNull(),
  /** Offset in seconds: from the scene start when sceneId is set, otherwise from the episode start. */
  startSec: real("start_sec").notNull().default(0),
  volume: real("volume").notNull().default(1),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Publishing + analytics                                              */
/* ------------------------------------------------------------------ */

export const publishingRecords = pgTable("publishing_records", {
  id: id(),
  episodeId: text("episode_id")
    .notNull()
    .unique()
    .references(() => episodes.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  visibility: text("visibility", { enum: ["private", "unlisted", "public"] }).notNull().default("private"),
  thumbnailAssetId: text("thumbnail_asset_id").references(() => assets.id, { onDelete: "set null" }),
  videoAssetId: text("video_asset_id").references(() => assets.id, { onDelete: "set null" }),
  status: text("status", { enum: PUBLISH_STATUSES }).notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  youtubeUrl: text("youtube_url").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const analyticsEntries = pgTable(
  "analytics_entries",
  {
    id: id(),
    episodeId: text("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    recordedOn: date("recorded_on").notNull(),
    views: integer("views").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    avgViewDurationSec: real("avg_view_duration_sec"),
    retentionPct: real("retention_pct"),
    source: text("source", { enum: ["manual", "youtube"] }).notNull().default("manual"),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("analytics_episode_idx").on(t.episodeId, t.recordedOn)],
);

/* ------------------------------------------------------------------ */
/* Settings, activity, assistant                                       */
/* ------------------------------------------------------------------ */

export const settings = pgTable(
  "settings",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.key] })],
);

export const activity = pgTable(
  "activity",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    href: text("href"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_project_idx").on(t.projectId, t.createdAt)],
);

export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Conversations are kept per episode so the assistant never loses the current episode. */
    episodeId: text("episode_id").references(() => episodes.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    /** Raw provider content blocks (text, tool_use, tool_result, thinking). */
    content: jsonb("content").$type<unknown>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("assistant_thread_idx").on(t.projectId, t.episodeId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Row types                                                           */
/* ------------------------------------------------------------------ */

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Outfit = typeof outfits.$inferSelect;
export type CharacterReference = typeof characterReferences.$inferSelect;
export type CharacterRelationship = typeof characterRelationships.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Script = typeof scripts.$inferSelect;
export type Scene = typeof scenes.$inferSelect;
export type DialogueLine = typeof dialogueLines.$inferSelect;
export type GenerationJob = typeof generationJobs.$inferSelect;
export type ProviderConfig = typeof providerConfigs.$inferSelect;
export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type AudioCue = typeof audioCues.$inferSelect;
export type PublishingRecord = typeof publishingRecords.$inferSelect;
export type AnalyticsEntry = typeof analyticsEntries.$inferSelect;
export type ActivityRow = typeof activity.$inferSelect;
