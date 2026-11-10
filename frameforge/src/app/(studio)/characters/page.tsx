import { requireCtx } from "@/server/auth";
import { listCharacters } from "@/server/services/characters";
import { CharacterLibrary } from "./character-library";

export const metadata = { title: "Character Lab" };

export default async function CharactersPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const characters = await listCharacters(ctx);
  return <CharacterLibrary characters={characters} channelName={ctx.project.channelName} openNew={sp.new === "1"} />;
}
