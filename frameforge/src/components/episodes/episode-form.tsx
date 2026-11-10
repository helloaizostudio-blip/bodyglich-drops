"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createEpisode } from "@/server/actions/episodes";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { useRun } from "@/components/ui/use-run";
import { CharacterAvatar } from "@/components/ui/media";
import { cn } from "@/lib/utils";

export type CastOption = { id: string; name: string; profileAssetId: string | null };

/** Multi-select of library characters, shown as tappable portrait chips. */
export function CastPicker({ options, value, onChange, emptyHint }: { options: CastOption[]; value: string[]; onChange: (ids: string[]) => void; emptyHint?: string }) {
  if (!options.length) return <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-[13px] text-muted">{emptyHint ?? "No characters yet — add your cast in Character Lab."}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((c) => {
        const on = value.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== c.id) : [...value, c.id])}
            className={cn(
              "flex h-11 items-center gap-2 rounded-full pl-1 pr-3.5 text-[13px] font-semibold transition-colors",
              on ? "bg-brand-600 text-white" : "bg-white text-navy-800 ring-1 ring-inset ring-line hover:bg-brand-100",
            )}
          >
            <CharacterAvatar name={c.name} assetId={c.profileAssetId} className="size-9" rounded="rounded-full" />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

export const DURATION_OPTIONS = [
  { label: "30 seconds (Short)", value: 30 },
  { label: "60 seconds (Short)", value: 60 },
  { label: "3 minutes", value: 180 },
  { label: "5 minutes", value: 300 },
  { label: "8 minutes", value: 480 },
  { label: "10 minutes", value: 600 },
  { label: "15 minutes", value: 900 },
];

export function NewEpisodeButton({
  cast,
  label = "Create Episode",
  variant = "primary",
  size = "md",
  className,
  defaultOpen = false,
}: {
  cast: CastOption[];
  label?: string;
  variant?: "primary" | "secondary" | "navy";
  size?: "sm" | "md" | "lg";
  className?: string;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useRun();
  const [open, setOpen] = useState(defaultOpen);
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [duration, setDuration] = useState(180);
  const [characterIds, setCharacterIds] = useState<string[]>([]);

  const submit = async () => {
    const ep = await run(
      createEpisode({ title, logline, format: duration <= 60 ? "short" : "long", targetDurationSec: duration, characterIds }),
      "Episode created",
    );
    if (ep) {
      setOpen(false);
      setTitle("");
      setLogline("");
      setCharacterIds([]);
      router.push(`/episodes/${ep.id}`);
    }
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create episode"
        description="Start a new Blockheads episode. You can change everything later."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={pending} disabled={!title.trim()}>
              Create episode
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <TextField label="Working title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Blockheads Go on a Space Trip" autoFocus maxLength={160} />
          <TextAreaField label="Idea / logline" value={logline} onChange={(e) => setLogline(e.target.value)} placeholder="One or two sentences about what happens." hint="Optional — Story Engine can develop this into a full script." />
          <SelectField label="Target length" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </SelectField>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-navy-800">Cast</span>
            <CastPicker options={cast} value={characterIds} onChange={setCharacterIds} />
          </div>
        </form>
      </Modal>
    </>
  );
}
