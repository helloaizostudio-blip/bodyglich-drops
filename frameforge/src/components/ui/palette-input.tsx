"use client";

import { Plus, X } from "lucide-react";

/** Editable list of hex swatches (character / location colour palettes). */
export function PaletteInput({ label, value, onChange, max = 8 }: { label: string; value: string[]; onChange: (v: string[]) => void; max?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-navy-800">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((c, i) => (
          <div key={i} className="relative">
            <label className="block size-11 overflow-hidden rounded-xl ring-1 ring-line" style={{ background: c }}>
              <span className="sr-only">Colour {i + 1}</span>
              <input
                type="color"
                value={c}
                onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
                className="size-full cursor-pointer opacity-0"
              />
            </label>
            <button
              type="button"
              aria-label={`Remove colour ${c}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-navy-900 text-white shadow"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {value.length < max ? (
          <button
            type="button"
            onClick={() => onChange([...value, "#63A9FF"])}
            aria-label="Add colour"
            className="grid size-11 place-items-center rounded-xl border-2 border-dashed border-brand-200 text-brand-600 hover:border-brand-400"
          >
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PaletteSwatches({ colors, size = "size-5" }: { colors: string[]; size?: string }) {
  if (!colors.length) return null;
  return (
    <div className="flex -space-x-1">
      {colors.map((c, i) => (
        <span key={i} className={`${size} rounded-full ring-2 ring-white`} style={{ background: c }} title={c} />
      ))}
    </div>
  );
}
