"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, Search, Sparkles, Users } from "lucide-react";
import type { Asset, CharacterRoleType } from "@/db/schema";
import { CHARACTER_ROLE_TYPES } from "@/db/schema";
import type { CharacterCard } from "@/server/services/characters";
import { addStarterCast, createCharacter } from "@/server/actions/characters";
import { ROLE_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Chip, ChipRow, EmptyState, PageHeader } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { CharacterAvatar, AssetThumb } from "@/components/ui/media";
import { UploadButton } from "@/components/ui/upload";
import { useRun } from "@/components/ui/use-run";
import { PaletteSwatches } from "@/components/ui/palette-input";
import { CharacterFields, emptyCharacter, useCharacterForm } from "./character-form";

export function CharacterLibrary({ characters, channelName, openNew }: { characters: CharacterCard[]; channelName: string; openNew: boolean }) {
  const router = useRouter();
  const { run, pending } = useRun();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<CharacterRoleType | "all">("all");
  const [creating, setCreating] = useState(openNew);
  const [image, setImage] = useState<Asset | null>(null);
  const form = useCharacterForm(emptyCharacter);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return characters.filter(
      (c) =>
        (filter === "all" || c.roleType === filter) &&
        (!needle || [c.name, c.tagline, c.mainRole, c.description].some((f) => f.toLowerCase().includes(needle))),
    );
  }, [characters, q, filter]);

  const create = async () => {
    const c = await run(createCharacter({ ...form.values, profileAssetId: image?.id }), "Character added");
    if (c) {
      setCreating(false);
      form.reset(emptyCharacter);
      setImage(null);
      router.push(`/characters/${c.id}`);
    }
  };

  return (
    <>
      <PageHeader
        title="Character Lab"
        subtitle={`Manage your ${channelName} cast`}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Add Character
          </Button>
        }
      >
        {characters.length ? (
          <div className="flex flex-col gap-3">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search characters…" className="pl-10" aria-label="Search characters" />
            </div>
            <ChipRow>
              <Chip active={filter === "all"} onClick={() => setFilter("all")}>
                All ({characters.length})
              </Chip>
              {CHARACTER_ROLE_TYPES.map((r) => (
                <Chip key={r} active={filter === r} onClick={() => setFilter(r)}>
                  {ROLE_TYPE_LABELS[r]} ({characters.filter((c) => c.roleType === r).length})
                </Chip>
              ))}
            </ChipRow>
          </div>
        ) : null}
      </PageHeader>

      {characters.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Bring in your cast"
          action={
            <>
              <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Add Character
              </Button>
              <Button variant="secondary" loading={pending} icon={<Sparkles className="size-4" />} onClick={() => run(addStarterCast({}), "Starter cast added — now upload your art")}>
                Add Blockheads starter cast
              </Button>
            </>
          }
        >
          Add each character with your own original artwork. FRAMEFORGE keeps those originals locked as the reference for every future image and animation. The starter cast adds
          eight empty, editable profiles (Zash, Potato, Alex, Bacon, Riya, Dev, Mr. Block, The Cook) — names only, no artwork.
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState icon={<Search />} title="No characters match">
          Try a different search or filter.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
          {visible.map((c) => (
            <li key={c.id}>
              <Link
                href={`/characters/${c.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-pop"
              >
                <div className="relative">
                  <CharacterAvatar name={c.name} assetId={c.profileAssetId} className="aspect-square w-full" rounded="rounded-none" />
                  {!c.profileAssetId ? (
                    <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-full bg-navy-950/70 px-2 py-1 text-[10.5px] font-semibold text-white backdrop-blur">
                      <ImagePlus className="size-3" /> Add original art
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <h3 className="truncate text-[15px] font-bold text-navy-900">{c.name}</h3>
                  <p className="truncate text-xs text-muted">{c.tagline || ROLE_TYPE_LABELS[c.roleType]}</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-[11px] font-semibold text-faint">
                      {c.referenceCount} reference{c.referenceCount === 1 ? "" : "s"}
                    </span>
                    <PaletteSwatches colors={c.palette.slice(0, 4)} size="size-4" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add character"
        description="Start with the essentials — you can complete the full profile afterwards."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={create} loading={pending} disabled={!form.values.name.trim()}>
              Add character
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4 rounded-2xl bg-brand-50 p-3 ring-1 ring-line/70">
            {image ? <AssetThumb asset={image} className="size-20 shrink-0 rounded-2xl" /> : <CharacterAvatar name={form.values.name || "?"} className="size-20 shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-bold text-navy-900">Original character image</p>
              <p className="mb-2 text-xs text-muted">Your own artwork. It is saved as a locked original reference.</p>
              <UploadButton category="character" multiple={false} size="sm" variant="secondary" onUploaded={(a) => setImage(a[0] ?? null)}>
                {image ? "Replace image" : "Upload image"}
              </UploadButton>
            </div>
          </div>
          <CharacterFields values={form.values} set={form.set} compact />
        </div>
      </Modal>
    </>
  );
}
