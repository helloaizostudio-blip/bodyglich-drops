"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy, Lock, LockOpen, Pencil, Plus, ShieldCheck, Shirt, Star, Trash2, UserRound, Users2 } from "lucide-react";
import type { Asset, Outfit, ReferenceKind } from "@/db/schema";
import { REFERENCE_KINDS } from "@/db/schema";
import type { CharacterDetail, ReferenceWithAsset } from "@/server/services/characters";
import {
  addCharacterReference,
  addRelationship,
  deleteCharacter,
  deleteOutfit,
  deleteRelationship,
  removeCharacterReference,
  saveOutfit,
  setProfileReference,
  updateCharacter,
  updateCharacterReference,
} from "@/server/actions/characters";
import { REFERENCE_KIND_LABELS, ROLE_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { Badge, Card, Notice, SectionTitle } from "@/components/ui/misc";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { AssetPlayer, AssetThumb, CharacterAvatar } from "@/components/ui/media";
import { UploadButton } from "@/components/ui/upload";
import { PaletteSwatches } from "@/components/ui/palette-input";
import { useRun } from "@/components/ui/use-run";
import { useToast } from "@/components/ui/toast";
import { CharacterFields, useCharacterForm } from "../character-form";

const UPLOAD_CATEGORY: Record<ReferenceKind, "character" | "expression" | "outfit" | "generated_image"> = {
  original: "character",
  expression: "expression",
  outfit: "outfit",
  variation: "character",
};

const KIND_HELP: Record<ReferenceKind, string> = {
  original: "Your canonical artwork. Locked by default and used as the source of truth for every generation.",
  expression: "Faces and emotions: happy, shocked, angry, crying…",
  outfit: "Alternative clothing looks for special episodes.",
  variation: "Extra poses, angles and generated variations. These never replace an original.",
};

export function CharacterDetailView({ detail, profileText, others }: { detail: CharacterDetail; profileText: string; others: { id: string; name: string }[] }) {
  const { character: c, references, outfits, relationships } = detail;
  const router = useRouter();
  const toast = useToast();
  const { run, pending } = useRun();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeRefId, setActiveRefId] = useState<string | null>(null);
  const activeRef = references.find((r) => r.id === activeRefId) ?? null;
  const [outfitModal, setOutfitModal] = useState<Outfit | "new" | null>(null);
  const [relOpen, setRelOpen] = useState(false);
  const form = useCharacterForm(c);

  const addRefs = async (assets: Asset[], kind: ReferenceKind) => {
    for (const asset of assets) {
      await run(addCharacterReference({ characterId: c.id, assetId: asset.id, kind, label: asset.name }));
    }
  };

  const facts: { label: string; value: string }[] = [
    { label: "Main role", value: c.mainRole },
    { label: "Description", value: c.description },
    { label: "Personality", value: c.personality },
    { label: "Visual characteristics", value: c.visualTraits },
    { label: "Signature clothing", value: c.signatureClothing },
    { label: "Voice", value: c.voiceDescription },
  ];
  const missing = facts.filter((f) => !f.value.trim()).length;
  const originals = references.filter((r) => r.kind === "original");

  return (
    <div className="flex flex-col gap-5">
      <Link href="/characters" className="-mb-2 flex w-fit items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ChevronLeft className="size-4" /> Character Lab
      </Link>

      {/* Header */}
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <CharacterAvatar name={c.name} assetId={detail.profileAssetId} className="aspect-square w-28 shrink-0 sm:w-36" rounded="rounded-3xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={c.roleType === "main" ? "blue" : c.roleType === "supporting" ? "lav" : "gray"}>{ROLE_TYPE_LABELS[c.roleType]}</Badge>
            <PaletteSwatches colors={c.palette} />
          </div>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight text-navy-900">{c.name}</h1>
          {c.tagline ? <p className="text-sm font-semibold text-muted">{c.tagline}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(true)}>
              Edit profile
            </Button>
            <Button size="sm" variant="ghost" className="!text-bad-700 hover:!bg-bad-100" icon={<Trash2 className="size-3.5" />} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        </div>
      </Card>

      {originals.length === 0 ? (
        <Notice
          tone="warn"
          icon={<ShieldCheck />}
          title="No original reference yet"
          action={
            <UploadButton category="character" size="sm" variant="navy" onUploaded={(a) => addRefs(a, "original")}>
              Upload original art
            </UploadButton>
          }
        >
          Upload {c.name}&apos;s real artwork so every storyboard and generation stays on-model. Until then FRAMEFORGE only shows a neutral initials placeholder — it never invents a design.
        </Notice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5 lg:gap-5">
        {/* Profile facts */}
        <Card className="p-5 lg:col-span-3">
          <SectionTitle
            action={
              missing ? (
                <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-brand-700 hover:underline">
                  {missing} field{missing === 1 ? "" : "s"} to fill in
                </button>
              ) : null
            }
          >
            <span className="flex items-center gap-2">
              <UserRound className="size-[18px] text-brand-600" /> Profile
            </span>
          </SectionTitle>
          <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className={cn(f.label === "Description" && "sm:col-span-2")}>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">{f.label}</dt>
                <dd className={cn("mt-0.5 whitespace-pre-wrap text-sm leading-relaxed", f.value ? "text-navy-800" : "italic text-faint")}>{f.value || "Not set"}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Consistency profile */}
        <Card className="flex flex-col p-5 lg:col-span-2">
          <SectionTitle
            action={
              <Button
                size="sm"
                variant="secondary"
                icon={<Copy className="size-3.5" />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(profileText);
                    toast.success("Consistency profile copied");
                  } catch {
                    toast.error("Could not copy — select the text manually.");
                  }
                }}
              >
                Copy
              </Button>
            }
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-[18px] text-brand-600" /> Consistency Profile
            </span>
          </SectionTitle>
          <p className="mb-2.5 text-xs leading-relaxed text-muted">
            Built from this profile and reused automatically in every image and animation prompt featuring {c.name}, together with the locked original reference.
          </p>
          <pre className="flex-1 whitespace-pre-wrap rounded-2xl bg-navy-900 p-3.5 font-mono text-[11.5px] leading-relaxed text-brand-100">{profileText}</pre>
        </Card>
      </div>

      {/* Reference images by kind */}
      {REFERENCE_KINDS.map((kind) => {
        const list = references.filter((r) => r.kind === kind);
        return (
          <Card key={kind} className="p-5">
            <SectionTitle
              action={
                <UploadButton category={UPLOAD_CATEGORY[kind]} size="sm" variant="secondary" onUploaded={(a) => addRefs(a, kind)}>
                  Upload
                </UploadButton>
              }
            >
              {kind === "original" ? "Original references" : kind === "expression" ? "Expressions" : kind === "outfit" ? "Outfit images" : "Variations"}
              <span className="ml-2 text-xs font-medium text-muted">{list.length}</span>
            </SectionTitle>
            <p className="-mt-1.5 mb-3 text-xs text-muted">{KIND_HELP[kind]}</p>
            {list.length ? (
              <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                {list.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setActiveRefId(r.id)}
                      className="group relative block w-full overflow-hidden rounded-2xl ring-1 ring-line transition hover:ring-2 hover:ring-brand-500"
                    >
                      <AssetThumb asset={r.asset} className="aspect-square w-full" />
                      <span className="absolute left-1.5 top-1.5 flex gap-1">
                        {r.id === c.profileReferenceId ? (
                          <span className="grid size-6 place-items-center rounded-full bg-brand-600 text-white shadow" title="Profile image">
                            <Star className="size-3.5 fill-current" />
                          </span>
                        ) : null}
                        {r.isLocked ? (
                          <span className="grid size-6 place-items-center rounded-full bg-navy-900/85 text-white shadow" title="Locked original">
                            <Lock className="size-3" />
                          </span>
                        ) : null}
                      </span>
                      {r.label ? <span className="block truncate bg-white px-2 py-1 text-left text-[11px] font-semibold text-navy-800">{r.label}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-brand-200 px-4 py-5 text-center text-[13px] text-muted">Nothing uploaded yet.</p>
            )}
          </Card>
        );
      })}

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {/* Outfits */}
        <Card className="p-5">
          <SectionTitle
            action={
              <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => setOutfitModal("new")}>
                Add outfit
              </Button>
            }
          >
            <span className="flex items-center gap-2">
              <Shirt className="size-[18px] text-brand-600" /> Outfit variations
            </span>
          </SectionTitle>
          {outfits.length ? (
            <ul className="flex flex-col gap-2">
              {outfits.map((o) => (
                <li key={o.id} className="flex items-start gap-3 rounded-2xl bg-brand-50 p-3 ring-1 ring-line/70">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-navy-900">
                      {o.name} {o.isSignature ? <Badge tone="navy">Signature</Badge> : null}
                    </p>
                    {o.description ? <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{o.description}</p> : null}
                    <p className="mt-1 text-[11px] font-semibold text-faint">{references.filter((r) => r.outfitId === o.id).length} linked image(s)</p>
                  </div>
                  <IconButton label={`Edit ${o.name}`} onClick={() => setOutfitModal(o)}>
                    <Pencil className="size-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">Describe alternative looks (pyjamas, space suit, school uniform) so they can be reused across episodes.</p>
          )}
        </Card>

        {/* Relationships */}
        <Card className="p-5">
          <SectionTitle
            action={
              <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => setRelOpen(true)} disabled={!others.length}>
                Add
              </Button>
            }
          >
            <span className="flex items-center gap-2">
              <Users2 className="size-[18px] text-brand-600" /> Relationships
            </span>
          </SectionTitle>
          {relationships.length ? (
            <ul className="flex flex-col gap-2">
              {relationships.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-brand-50 p-3 ring-1 ring-line/70">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="text-navy-900">
                      {r.direction === "out" ? (
                        <>
                          <span className="font-semibold">{r.relationship}</span> of{" "}
                          <Link href={`/characters/${r.otherId}`} className="font-bold text-brand-700 hover:underline">
                            {r.otherName}
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link href={`/characters/${r.otherId}`} className="font-bold text-brand-700 hover:underline">
                            {r.otherName}
                          </Link>{" "}
                          is {c.name}&apos;s <span className="font-semibold">{r.relationship}</span>
                        </>
                      )}
                    </p>
                    {r.notes ? <p className="mt-0.5 text-[13px] text-muted">{r.notes}</p> : null}
                  </div>
                  <IconButton label="Remove relationship" disabled={pending} onClick={() => run(deleteRelationship({ id: r.id, characterId: c.id }))}>
                    <Trash2 className="size-4 text-bad-600" />
                  </IconButton>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">{others.length ? "Record how this character relates to the rest of the cast — Story Engine uses it when writing." : "Add more characters to define relationships."}</p>
          )}
        </Card>
      </div>

      {/* Edit profile */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title={`Edit ${c.name}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={!form.values.name.trim()}
              onClick={async () => {
                const ok = await run(updateCharacter({ id: c.id, ...form.values }), "Profile saved");
                if (ok) setEditing(false);
              }}
            >
              Save profile
            </Button>
          </>
        }
      >
        <CharacterFields values={form.values} set={form.set} />
      </Modal>

      <ReferenceModal
        reference={activeRef}
        isProfile={activeRef?.id === c.profileReferenceId}
        outfits={outfits}
        characterName={c.name}
        onClose={() => setActiveRefId(null)}
      />

      <OutfitModal key={typeof outfitModal === "string" ? "new" : outfitModal?.id ?? "none"} state={outfitModal} characterId={c.id} onClose={() => setOutfitModal(null)} />

      <RelationshipModal open={relOpen} onClose={() => setRelOpen(false)} characterId={c.id} characterName={c.name} others={others} />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${c.name}?`}
        typeToConfirm={c.name}
        message={
          <>
            This removes the character profile, outfits, relationships and its links to scenes. The uploaded images stay safe in your Asset Library.
          </>
        }
        confirmLabel="Delete character"
        onConfirm={async () => {
          const ok = await run(deleteCharacter({ id: c.id }), "Character deleted");
          if (ok) router.push("/characters");
        }}
      />
    </div>
  );
}

function ReferenceModal({
  reference,
  isProfile,
  outfits,
  characterName,
  onClose,
}: {
  reference: ReferenceWithAsset | null;
  isProfile: boolean;
  outfits: Outfit[];
  characterName: string;
  onClose: () => void;
}) {
  const { run, pending } = useRun();
  const [label, setLabel] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  if (reference && seen !== reference.id) {
    setSeen(reference.id);
    setLabel(reference.label);
  }
  if (!reference) return null;
  const r = reference;

  return (
    <>
      <Modal open onClose={onClose} title={r.label || REFERENCE_KIND_LABELS[r.kind]} description={`${REFERENCE_KIND_LABELS[r.kind]} for ${characterName}`}>
        <div className="flex flex-col gap-4">
          <AssetPlayer asset={r.asset} />
          <div className="flex flex-wrap gap-2">
            {isProfile ? (
              <Badge tone="blue">
                <Star className="size-3 fill-current" /> Profile image
              </Badge>
            ) : null}
            {r.isLocked ? (
              <Badge tone="navy">
                <Lock className="size-3" /> Locked
              </Badge>
            ) : null}
          </div>
          <TextField label="Label" value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => label !== r.label && run(updateCharacterReference({ id: r.id, label }))} maxLength={120} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Type"
              value={r.kind}
              disabled={pending || r.isLocked}
              hint={r.isLocked ? "Unlock to change the type." : undefined}
              onChange={async (e) => {
                await run(updateCharacterReference({ id: r.id, kind: e.target.value as ReferenceKind }));
                onClose();
              }}
            >
              {REFERENCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {REFERENCE_KIND_LABELS[k]}
                </option>
              ))}
            </SelectField>
            {outfits.length ? (
              <SelectField label="Linked outfit" value={r.outfitId ?? ""} disabled={pending} onChange={(e) => run(updateCharacterReference({ id: r.id, outfitId: e.target.value || null }))}>
                <option value="">None</option>
                {outfits.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </SelectField>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {r.kind === "original" && !isProfile ? (
              <Button
                variant="secondary"
                size="sm"
                loading={pending}
                icon={<Star className="size-3.5" />}
                onClick={async () => {
                  const ok = await run(setProfileReference({ referenceId: r.id }), "Profile image updated");
                  if (ok) onClose();
                }}
              >
                Use as profile image
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              loading={pending}
              icon={r.isLocked ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
              onClick={async () => {
                await run(updateCharacterReference({ id: r.id, isLocked: !r.isLocked }), r.isLocked ? "Reference unlocked" : "Reference locked");
                onClose();
              }}
            >
              {r.isLocked ? "Unlock" : "Lock"}
            </Button>
            <Button variant="ghost" size="sm" className="!text-bad-700 hover:!bg-bad-100" disabled={r.isLocked} icon={<Trash2 className="size-3.5" />} onClick={() => setConfirmRemove(true)}>
              Remove
            </Button>
          </div>
          {r.isLocked ? <p className="-mt-2 text-xs text-muted">Locked references can&apos;t be removed, retyped or deleted from the Asset Library.</p> : null}
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove this reference?"
        message={`The image is detached from ${characterName} but stays in your Asset Library.`}
        confirmLabel="Remove"
        onConfirm={async () => {
          const ok = await run(removeCharacterReference({ id: r.id }), "Reference removed");
          if (ok) {
            setConfirmRemove(false);
            onClose();
          }
        }}
      />
    </>
  );
}

function OutfitModal({ state, characterId, onClose }: { state: Outfit | "new" | null; characterId: string; onClose: () => void }) {
  const { run, pending } = useRun();
  const existing = state && state !== "new" ? state : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [isSignature, setIsSignature] = useState(existing?.isSignature ?? false);
  if (!state) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? "Edit outfit" : "Add outfit"}
      size="sm"
      footer={
        <>
          {existing ? (
            <Button
              variant="ghost"
              className="mr-auto !text-bad-700 hover:!bg-bad-100"
              disabled={pending}
              onClick={async () => {
                const ok = await run(deleteOutfit({ id: existing.id, characterId }), "Outfit deleted");
                if (ok) onClose();
              }}
            >
              Delete
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={pending}
            disabled={!name.trim()}
            onClick={async () => {
              const ok = await run(saveOutfit({ id: existing?.id, characterId, name, description, isSignature }), "Outfit saved");
              if (ok) onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label="Outfit name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Space suit" maxLength={120} autoFocus />
        <TextAreaField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Colours, materials, accessories…" />
        <label className="flex items-center gap-2.5 text-sm font-medium text-navy-800">
          <input type="checkbox" className="size-5 accent-brand-600" checked={isSignature} onChange={(e) => setIsSignature(e.target.checked)} />
          This is the signature outfit
        </label>
      </div>
    </Modal>
  );
}

function RelationshipModal({
  open,
  onClose,
  characterId,
  characterName,
  others,
}: {
  open: boolean;
  onClose: () => void;
  characterId: string;
  characterName: string;
  others: { id: string; name: string }[];
}) {
  const { run, pending } = useRun();
  const [otherId, setOtherId] = useState(others[0]?.id ?? "");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const other = others.find((o) => o.id === otherId);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add relationship"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={pending}
            disabled={!relationship.trim() || !otherId}
            onClick={async () => {
              const ok = await run(addRelationship({ characterId, relatedCharacterId: otherId, relationship, notes }), "Relationship added");
              if (ok) {
                setRelationship("");
                setNotes("");
                onClose();
              }
            }}
          >
            Add
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectField label="Other character" value={otherId} onChange={(e) => setOtherId(e.target.value)}>
          {others.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label={`${characterName} is ${other?.name ?? "their"}'s…`}
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder="e.g. best friend, rival, little brother"
          maxLength={120}
        />
        <TextAreaField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Running jokes, history, how they talk to each other." />
      </div>
    </Modal>
  );
}
