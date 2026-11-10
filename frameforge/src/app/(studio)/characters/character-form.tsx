"use client";

import { useState } from "react";
import type { Character } from "@/db/schema";
import { CHARACTER_ROLE_TYPES } from "@/db/schema";
import { ROLE_TYPE_LABELS } from "@/lib/constants";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { PaletteInput } from "@/components/ui/palette-input";

export type CharacterFormValues = Pick<
  Character,
  | "name"
  | "tagline"
  | "roleType"
  | "mainRole"
  | "description"
  | "personality"
  | "signatureClothing"
  | "visualTraits"
  | "voiceDescription"
  | "palette"
  | "consistencyRules"
  | "avoidRules"
>;

export const emptyCharacter: CharacterFormValues = {
  name: "",
  tagline: "",
  roleType: "main",
  mainRole: "",
  description: "",
  personality: "",
  signatureClothing: "",
  visualTraits: "",
  voiceDescription: "",
  palette: [],
  consistencyRules: "",
  avoidRules: "",
};

export function useCharacterForm(initial: CharacterFormValues) {
  const [values, setValues] = useState<CharacterFormValues>(initial);
  const set = <K extends keyof CharacterFormValues>(key: K, value: CharacterFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  return { values, set, reset: setValues };
}

export function CharacterFields({ values, set, compact }: { values: CharacterFormValues; set: ReturnType<typeof useCharacterForm>["set"]; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Character name" value={values.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="e.g. Zash" />
        <TextField label="Tagline" value={values.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={120} placeholder="e.g. The Goofy One" />
        <SelectField label="Cast group" value={values.roleType} onChange={(e) => set("roleType", e.target.value as CharacterFormValues["roleType"])}>
          {CHARACTER_ROLE_TYPES.map((r) => (
            <option key={r} value={r}>
              {ROLE_TYPE_LABELS[r]}
            </option>
          ))}
        </SelectField>
        <TextField label="Main role in stories" value={values.mainRole} onChange={(e) => set("mainRole", e.target.value)} maxLength={200} placeholder="e.g. Leader who starts every plan" />
      </div>
      <TextAreaField label="Description" value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="Who is this character?" />
      {compact ? null : (
        <>
          <TextAreaField label="Personality" value={values.personality} onChange={(e) => set("personality", e.target.value)} placeholder="How they act, talk and react." />
          <TextAreaField
            label="Visual characteristics"
            value={values.visualTraits}
            onChange={(e) => set("visualTraits", e.target.value)}
            placeholder="Face, hair, body shape, proportions, art style details."
          />
          <TextAreaField label="Signature clothing" value={values.signatureClothing} onChange={(e) => set("signatureClothing", e.target.value)} placeholder="The outfit they are recognised by." />
          <PaletteInput label="Colour palette" value={values.palette} onChange={(v) => set("palette", v)} />
          <TextAreaField label="Voice description" value={values.voiceDescription} onChange={(e) => set("voiceDescription", e.target.value)} placeholder="Pitch, energy, accent, catchphrases." />
          <TextAreaField
            label="Always keep (consistency rules)"
            value={values.consistencyRules}
            onChange={(e) => set("consistencyRules", e.target.value)}
            hint="Included in every generation prompt for this character."
            placeholder="e.g. Black hoodie with white crown logo, messy black hair, thick eyebrows."
          />
          <TextAreaField
            label="Never change"
            value={values.avoidRules}
            onChange={(e) => set("avoidRules", e.target.value)}
            placeholder="e.g. Never change hair colour, never remove the glasses, never make him realistic."
          />
        </>
      )}
    </div>
  );
}
