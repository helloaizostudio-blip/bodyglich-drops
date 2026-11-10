import { notFound } from "next/navigation";
import { requireCtx } from "@/server/auth";
import { consistencyProfileText, getCharacterDetail, listCharacters } from "@/server/services/characters";
import { CharacterDetailView } from "./character-detail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCtx();
  const detail = await getCharacterDetail(ctx, (await params).id);
  return { title: detail?.character.name ?? "Character" };
}

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCtx();
  const { id } = await params;
  const [detail, all] = await Promise.all([getCharacterDetail(ctx, id), listCharacters(ctx)]);
  if (!detail) notFound();
  return (
    <CharacterDetailView
      detail={detail}
      profileText={consistencyProfileText(detail.character, detail.outfits)}
      others={all.filter((c) => c.id !== id).map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
