/** Sections of the Audio Studio. Plain module so both the server page and the client UI can use it. */
export const AUDIO_TABS = ["dialogue", "voices", "cues", "library"] as const;
export type AudioTab = (typeof AUDIO_TABS)[number];
