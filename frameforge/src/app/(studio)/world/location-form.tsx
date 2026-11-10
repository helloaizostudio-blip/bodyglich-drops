"use client";

import { useId, useState } from "react";
import type { Location } from "@/db/schema";
import { LOCATION_CATEGORIES } from "@/db/schema";
import { LOCATION_CATEGORY_LABELS } from "@/lib/constants";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { PaletteInput } from "@/components/ui/palette-input";
import { CastPicker, type CastOption } from "@/components/episodes/episode-form";

export type LocationFormValues = Pick<Location, "name" | "category" | "description" | "lighting" | "timeOfDay" | "palette" | "consistencyNotes"> & {
  characterIds: string[];
};

export const emptyLocation: LocationFormValues = {
  name: "",
  category: "other",
  description: "",
  lighting: "",
  timeOfDay: "",
  palette: [],
  consistencyNotes: "",
  characterIds: [],
};

const TIME_OF_DAY_SUGGESTIONS = ["Early morning", "Morning", "Midday", "Afternoon", "Golden hour", "Sunset", "Evening", "Night"];

export function useLocationForm(initial: LocationFormValues) {
  const [values, setValues] = useState<LocationFormValues>(initial);
  const set = <K extends keyof LocationFormValues>(key: K, value: LocationFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  return { values, set, reset: setValues };
}

export function LocationFields({ values, set, cast }: { values: LocationFormValues; set: ReturnType<typeof useLocationForm>["set"]; cast: CastOption[] }) {
  const listId = useId();
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Location name" value={values.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="e.g. Zash's bedroom" />
        <SelectField label="Category" value={values.category} onChange={(e) => set("category", e.target.value as LocationFormValues["category"])}>
          {LOCATION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {LOCATION_CATEGORY_LABELS[c]}
            </option>
          ))}
        </SelectField>
      </div>
      <TextAreaField
        label="Description"
        value={values.description}
        onChange={(e) => set("description", e.target.value)}
        maxLength={4000}
        placeholder="What the place looks like: layout, furniture, landmarks, mood."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Lighting"
          value={values.lighting}
          onChange={(e) => set("lighting", e.target.value)}
          maxLength={1000}
          placeholder="e.g. Warm lamp light, soft shadows"
        />
        <TextField
          label="Time of day"
          value={values.timeOfDay}
          onChange={(e) => set("timeOfDay", e.target.value)}
          maxLength={120}
          list={listId}
          placeholder="e.g. Golden hour"
          hint="Pick a suggestion or type your own."
        />
        <datalist id={listId}>
          {TIME_OF_DAY_SUGGESTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>
      <PaletteInput label="Colour palette" value={values.palette} onChange={(v) => set("palette", v)} />
      <TextAreaField
        label="Visual consistency notes"
        value={values.consistencyNotes}
        onChange={(e) => set("consistencyNotes", e.target.value)}
        maxLength={4000}
        hint="What must look the same every time this place appears. Included in the prompt block."
        placeholder="e.g. Blue striped wallpaper, window on the left wall, red beanbag in the corner."
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-navy-800">Characters usually found here</span>
        <CastPicker options={cast} value={values.characterIds} onChange={(ids) => set("characterIds", ids)} />
      </div>
    </div>
  );
}
