import type {
  AssetCategory,
  AssetKind,
  CharacterRoleType,
  EpisodeStage,
  LocationCategory,
  ReferenceKind,
  SceneStatus,
  ScriptSectionKey,
} from "@/db/schema";

export const BRAND = {
  name: "FRAMEFORGE",
  subtitle: "AI Animation Production Studio",
};

export const STAGE_LABELS: Record<EpisodeStage, string> = {
  idea: "Idea",
  script: "Script",
  storyboard: "Storyboard",
  assets: "Assets",
  animation: "Animation",
  editing: "Editing",
  published: "Published",
};

export const ROLE_TYPE_LABELS: Record<CharacterRoleType, string> = {
  main: "Main Cast",
  supporting: "Supporting",
  other: "Others",
};

export const REFERENCE_KIND_LABELS: Record<ReferenceKind, string> = {
  original: "Original reference",
  expression: "Expression",
  outfit: "Outfit",
  variation: "Variation",
};

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  character: "Characters",
  outfit: "Character outfits",
  expression: "Expressions",
  background: "Backgrounds",
  prop: "Props",
  storyboard: "Storyboards",
  generated_image: "Generated images",
  animation_clip: "Animation clips",
  voiceover: "Voiceovers",
  music: "Music",
  sfx: "Sound effects",
  final_video: "Final videos",
};

/** Which media kinds make sense in each category (used to validate uploads). */
export const ASSET_CATEGORY_KINDS: Record<AssetCategory, AssetKind[]> = {
  character: ["image"],
  outfit: ["image"],
  expression: ["image"],
  background: ["image"],
  prop: ["image"],
  storyboard: ["image"],
  generated_image: ["image"],
  animation_clip: ["video"],
  voiceover: ["audio"],
  music: ["audio"],
  sfx: ["audio"],
  final_video: ["video"],
};

export const LOCATION_CATEGORY_LABELS: Record<LocationCategory, string> = {
  house: "House",
  street: "Street",
  school: "School",
  shop: "Shop",
  park: "Park",
  office: "Office",
  fantasy: "Fantasy world",
  other: "Other",
};

export const SCENE_STATUS_LABELS: Record<SceneStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  in_progress: "In progress",
  done: "Done",
};

export const SCRIPT_SECTION_LABELS: Record<ScriptSectionKey, string> = {
  title: "Episode title",
  hook: "Opening hook",
  concept: "Story concept",
  characterRoles: "Character roles",
  script: "Full script",
  dialogue: "Character dialogue",
  sceneBreakdown: "Scene breakdown",
  ending: "Ending",
  thumbnailConcept: "Thumbnail concept",
};

export const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"] as const;

export const ACCEPT_BY_KIND: Record<AssetKind, string> = {
  image: "image/png,image/jpeg,image/webp,image/gif,image/avif",
  video: "video/mp4,video/webm,video/quicktime,video/x-matroska",
  audio: "audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/aac,audio/flac,audio/webm,audio/x-m4a",
  other: "",
};
