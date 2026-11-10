CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"href" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"recorded_on" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"avg_view_duration_sec" real,
	"retention_pct" real,
	"source" text DEFAULT 'manual' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_links" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"episode_id" text,
	"scene_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"category" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"duration_sec" real,
	"source" text DEFAULT 'upload' NOT NULL,
	"job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "assistant_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"episode_id" text,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_cues" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"scene_id" text,
	"asset_id" text NOT NULL,
	"kind" text NOT NULL,
	"start_sec" real DEFAULT 0 NOT NULL,
	"volume" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_references" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"kind" text DEFAULT 'original' NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"outfit_id" text,
	"is_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"related_character_id" text NOT NULL,
	"relationship" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"role_type" text DEFAULT 'main' NOT NULL,
	"main_role" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"personality" text DEFAULT '' NOT NULL,
	"signature_clothing" text DEFAULT '' NOT NULL,
	"visual_traits" text DEFAULT '' NOT NULL,
	"voice_description" text DEFAULT '' NOT NULL,
	"palette" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"consistency_rules" text DEFAULT '' NOT NULL,
	"avoid_rules" text DEFAULT '' NOT NULL,
	"profile_reference_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dialogue_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"scene_id" text NOT NULL,
	"position" integer NOT NULL,
	"character_id" text,
	"speaker" text DEFAULT '' NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"audio_asset_id" text
);
--> statement-breakpoint
CREATE TABLE "episode_characters" (
	"episode_id" text NOT NULL,
	"character_id" text NOT NULL,
	CONSTRAINT "episode_characters_episode_id_character_id_pk" PRIMARY KEY("episode_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"logline" text DEFAULT '' NOT NULL,
	"format" text DEFAULT 'long' NOT NULL,
	"stage" text DEFAULT 'idea' NOT NULL,
	"target_duration_sec" integer DEFAULT 180 NOT NULL,
	"cover_asset_id" text,
	"render_settings" jsonb,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"kind" text NOT NULL,
	"purpose" text DEFAULT '' NOT NULL,
	"provider" text NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"episode_id" text,
	"scene_id" text,
	"character_id" text,
	"result_asset_id" text,
	"external_id" text,
	"progress" real,
	"error" text,
	"usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "location_characters" (
	"location_id" text NOT NULL,
	"character_id" text NOT NULL,
	CONSTRAINT "location_characters_location_id_character_id_pk" PRIMARY KEY("location_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "location_images" (
	"id" text PRIMARY KEY NOT NULL,
	"location_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"lighting" text DEFAULT '' NOT NULL,
	"time_of_day" text DEFAULT '' NOT NULL,
	"palette" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"consistency_notes" text DEFAULT '' NOT NULL,
	"cover_asset_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outfits" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_signature" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"channel_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'image' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"capability" text NOT NULL,
	"provider_id" text NOT NULL,
	"encrypted_key" text,
	"key_hint" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'unverified' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishing_records" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"thumbnail_asset_id" text,
	"video_asset_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"youtube_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publishing_records_episode_id_unique" UNIQUE("episode_id")
);
--> statement-breakpoint
CREATE TABLE "scene_characters" (
	"scene_id" text NOT NULL,
	"character_id" text NOT NULL,
	CONSTRAINT "scene_characters_scene_id_character_id_pk" PRIMARY KEY("scene_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"position" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"duration_sec" real DEFAULT 5 NOT NULL,
	"location_id" text,
	"location_text" text DEFAULT '' NOT NULL,
	"action" text DEFAULT '' NOT NULL,
	"camera" text DEFAULT '' NOT NULL,
	"motion" text DEFAULT '' NOT NULL,
	"aspect_ratio" text DEFAULT '16:9' NOT NULL,
	"visual_prompt" text DEFAULT '' NOT NULL,
	"animation_prompt" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"visual_asset_id" text,
	"background_asset_id" text,
	"clip_asset_id" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scripts" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"sections" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"inputs" jsonb,
	"review" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scripts_episode_id_unique" UNIQUE("episode_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"project_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_project_id_key_pk" PRIMARY KEY("project_id","key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voice_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"provider_id" text DEFAULT '' NOT NULL,
	"provider_voice_id" text DEFAULT '' NOT NULL,
	"sample_asset_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_profiles_character_id_unique" UNIQUE("character_id")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_entries" ADD CONSTRAINT "analytics_entries_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_links" ADD CONSTRAINT "asset_links_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_links" ADD CONSTRAINT "asset_links_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_links" ADD CONSTRAINT "asset_links_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_cues" ADD CONSTRAINT "audio_cues_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_cues" ADD CONSTRAINT "audio_cues_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_cues" ADD CONSTRAINT "audio_cues_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_references" ADD CONSTRAINT "character_references_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_references" ADD CONSTRAINT "character_references_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_references" ADD CONSTRAINT "character_references_outfit_id_outfits_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_relationships" ADD CONSTRAINT "character_relationships_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_relationships" ADD CONSTRAINT "character_relationships_related_character_id_characters_id_fk" FOREIGN KEY ("related_character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialogue_lines" ADD CONSTRAINT "dialogue_lines_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialogue_lines" ADD CONSTRAINT "dialogue_lines_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialogue_lines" ADD CONSTRAINT "dialogue_lines_audio_asset_id_assets_id_fk" FOREIGN KEY ("audio_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_characters" ADD CONSTRAINT "episode_characters_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_characters" ADD CONSTRAINT "episode_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_cover_asset_id_assets_id_fk" FOREIGN KEY ("cover_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_result_asset_id_assets_id_fk" FOREIGN KEY ("result_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_characters" ADD CONSTRAINT "location_characters_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_characters" ADD CONSTRAINT "location_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_images" ADD CONSTRAINT "location_images_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_images" ADD CONSTRAINT "location_images_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_cover_asset_id_assets_id_fk" FOREIGN KEY ("cover_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_configs" ADD CONSTRAINT "provider_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_records" ADD CONSTRAINT "publishing_records_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_records" ADD CONSTRAINT "publishing_records_thumbnail_asset_id_assets_id_fk" FOREIGN KEY ("thumbnail_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_records" ADD CONSTRAINT "publishing_records_video_asset_id_assets_id_fk" FOREIGN KEY ("video_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_visual_asset_id_assets_id_fk" FOREIGN KEY ("visual_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_background_asset_id_assets_id_fk" FOREIGN KEY ("background_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_clip_asset_id_assets_id_fk" FOREIGN KEY ("clip_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_profiles" ADD CONSTRAINT "voice_profiles_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_profiles" ADD CONSTRAINT "voice_profiles_sample_asset_id_assets_id_fk" FOREIGN KEY ("sample_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_project_idx" ON "activity" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "analytics_episode_idx" ON "analytics_entries" USING btree ("episode_id","recorded_on");--> statement-breakpoint
CREATE INDEX "asset_links_asset_idx" ON "asset_links" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "assets_project_idx" ON "assets" USING btree ("project_id","category");--> statement-breakpoint
CREATE INDEX "assistant_thread_idx" ON "assistant_messages" USING btree ("project_id","episode_id","created_at");--> statement-breakpoint
CREATE INDEX "char_refs_character_idx" ON "character_references" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "characters_project_idx" ON "characters" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "dialogue_scene_idx" ON "dialogue_lines" USING btree ("scene_id","position");--> statement-breakpoint
CREATE INDEX "episodes_project_idx" ON "episodes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "jobs_project_idx" ON "generation_jobs" USING btree ("project_id","kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_unique_idx" ON "provider_configs" USING btree ("project_id","capability","provider_id");--> statement-breakpoint
CREATE INDEX "scenes_episode_idx" ON "scenes" USING btree ("episode_id","position");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");