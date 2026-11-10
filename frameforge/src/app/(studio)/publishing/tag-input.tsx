"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { mergeTags } from "./limits";

/** Chip input for video tags: type a tag and press Enter or comma (or tap Add). Pasting a comma-separated list adds them all. */
export function TagInput({
  label,
  value,
  onChange,
  hint,
  error,
}: {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const commit = (text: string) => {
    const next = mergeTags(value, text.split(/[,\n]/));
    if (next.length !== value.length) onChange(next);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-navy-800">
        {label}
      </label>
      <div className={cn("flex flex-col gap-2 rounded-xl bg-white p-2 ring-1 ring-inset ring-line transition-shadow focus-within:ring-2 focus-within:ring-brand-500", error && "!ring-bad-600")}>
        {value.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {value.map((tag) => (
              <li key={tag} className="flex h-10 max-w-full items-center rounded-full bg-brand-100 pl-3.5 text-[13px] font-semibold text-navy-800">
                <span className="truncate">{tag}</span>
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => onChange(value.filter((t) => t !== tag))}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-navy-600 hover:bg-brand-200 hover:text-navy-900"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-center gap-1.5">
          <input
            id={id}
            value={draft}
            enterKeyHint="done"
            autoCapitalize="none"
            autoComplete="off"
            placeholder={value.length ? "Add another tag…" : "Type a tag, then press Enter or comma"}
            className="h-10 min-w-0 flex-1 rounded-lg bg-transparent px-1.5 text-ink placeholder:text-faint focus:outline-none"
            onChange={(e) => {
              // Mobile keyboards do not always report the comma key, so commas are detected in the text itself.
              if (/[,\n]/.test(e.target.value)) commit(e.target.value);
              else setDraft(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(draft);
              } else if (e.key === "Backspace" && !draft && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            onBlur={() => draft.trim() && commit(draft)}
          />
          <button
            type="button"
            onClick={() => commit(draft)}
            disabled={!draft.trim()}
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-brand-700 hover:bg-brand-100 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden /> Add
          </button>
        </div>
      </div>
      {error ? <p className="text-xs font-medium text-bad-700">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
