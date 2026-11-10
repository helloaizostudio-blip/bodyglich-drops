"use client";

import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import type { Asset } from "@/db/schema";
import type { VoiceProfileView } from "@/server/services/audio";
import { saveVoiceProfile } from "@/server/actions/audio";
import { cn } from "@/lib/utils";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { TextAreaField, TextField } from "@/components/ui/field";
import { AssetField } from "@/components/ui/asset-picker";
import { CharacterAvatar } from "@/components/ui/media";
import { useRun } from "@/components/ui/use-run";
import { MiniAudio } from "./audio-bits";

export type VoiceCharacter = {
  id: string;
  name: string;
  tagline: string;
  profileAssetId: string | null;
  /** Free-text voice notes from Character Lab, offered as a starting point. */
  voiceDescription: string;
  inEpisode: boolean;
};

export function VoiceProfilesPanel({ characters, profiles, episodeId }: { characters: VoiceCharacter[]; profiles: Record<string, VoiceProfileView>; episodeId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!characters.length) {
    return (
      <EmptyState icon={<Users />} title="No characters yet" action={<LinkButton href="/characters">Open Character Lab</LinkButton>}>
        Voice profiles belong to characters. Add your cast in Character Lab and each character gets a voice profile here.
      </EmptyState>
    );
  }

  const inEpisode = characters.filter((c) => c.inEpisode);
  const rest = characters.filter((c) => !c.inEpisode);
  const group = (title: string, list: VoiceCharacter[]) =>
    list.length ? (
      <section>
        <h2 className="mb-2.5 text-[17px] font-bold text-navy-900">
          {title} <span className="ml-1 text-xs font-medium text-muted">{list.length}</span>
        </h2>
        <ul className="flex flex-col gap-2.5">
          {list.map((c) => (
            <li key={c.id}>
              <VoiceProfileCard character={c} profile={profiles[c.id] ?? null} episodeId={episodeId} open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} />
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] leading-relaxed text-muted">
        One voice profile per character, shared by every episode: how the character sounds, an optional reference clip, and the voice to use once a voice provider is connected.
      </p>
      {group("In this episode", inEpisode)}
      {group(inEpisode.length ? "Rest of the cast" : "Cast", rest)}
    </div>
  );
}

function VoiceProfileCard({
  character,
  profile,
  episodeId,
  open,
  onToggle,
}: {
  character: VoiceCharacter;
  profile: VoiceProfileView | null;
  episodeId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const { run, pending } = useRun();
  const saved = {
    description: profile?.description ?? "",
    providerId: profile?.providerId ?? "",
    providerVoiceId: profile?.providerVoiceId ?? "",
    sampleAssetId: profile?.sampleAssetId ?? null,
  };
  // An empty profile starts from the Character Lab voice notes — as a suggestion that is only
  // stored when the user presses Save.
  const suggestion = saved.description.trim() ? "" : character.voiceDescription.trim();
  const [description, setDescription] = useState(saved.description.trim() ? saved.description : suggestion);
  const [providerId, setProviderId] = useState(saved.providerId);
  const [providerVoiceId, setProviderVoiceId] = useState(saved.providerVoiceId);
  const [sample, setSample] = useState<Asset | null>(profile?.sample ?? null);

  const dirty =
    description.trim() !== saved.description.trim() ||
    providerId.trim() !== saved.providerId.trim() ||
    providerVoiceId.trim() !== saved.providerVoiceId.trim() ||
    (sample?.id ?? null) !== saved.sampleAssetId;
  const showingSuggestion = !!suggestion && description.trim() === suggestion;
  const hasProfile = !!profile && !!(saved.description.trim() || saved.providerVoiceId.trim() || saved.sampleAssetId);
  const panelId = `voice-${character.id}`;

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-brand-50 sm:p-4">
        <CharacterAvatar name={character.name} assetId={character.profileAssetId} className="size-12 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-[15px] font-bold text-navy-900">{character.name}</span>
            {hasProfile ? <Badge tone="ok">Voice profile saved</Badge> : <Badge tone="gray">No voice profile</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">{saved.description.trim() || character.tagline || "Tap to describe this character's voice"}</span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div id={panelId} className="flex flex-col gap-4 border-t border-line/70 p-4 sm:p-5">
          <TextAreaField
            label="Voice description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Pitch, pace, accent, energy, catchphrases…"
            hint={showingSuggestion ? `Suggested from ${character.name}'s Character Lab profile — not saved until you press Save.` : undefined}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Voice provider"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              maxLength={120}
              placeholder="e.g. elevenlabs"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              hint="Used when a voice provider is connected in Settings."
            />
            <TextField
              label="Provider voice ID"
              value={providerVoiceId}
              onChange={(e) => setProviderVoiceId(e.target.value)}
              maxLength={200}
              placeholder="The voice's ID at that provider"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              hint="Used when a voice provider is connected in Settings."
            />
          </div>
          <div>
            <AssetField
              label="Voice sample (optional)"
              asset={sample}
              onChange={setSample}
              kind="audio"
              categories={["voiceover"]}
              uploadCategory="voiceover"
              episodeId={episodeId}
              hint="A short reference clip of how this character should sound."
            />
            {sample ? <MiniAudio assetId={sample.id} label={`Voice sample: ${sample.name}`} className="mt-2" /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              loading={pending}
              disabled={!dirty}
              onClick={() => run(saveVoiceProfile({ characterId: character.id, description, providerId, providerVoiceId, sampleAssetId: sample?.id ?? null }), `${character.name}'s voice profile saved`)}
            >
              Save voice profile
            </Button>
            {dirty ? <span className="text-xs font-semibold text-warn-700">Unsaved changes</span> : profile ? <span className="text-xs text-muted">Saved</span> : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
