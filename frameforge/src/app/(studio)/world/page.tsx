import { requireCtx } from "@/server/auth";
import { getLocationDetail, listLocations } from "@/server/services/locations";
import { listCharacters } from "@/server/services/characters";
import { WorldLibrary } from "./world-library";

export const metadata = { title: "World Builder" };

export default async function WorldPage({ searchParams }: { searchParams: Promise<{ location?: string | string[]; new?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const locationId = Array.isArray(sp.location) ? sp.location[0] : sp.location;
  const [locations, characters, detail] = await Promise.all([listLocations(ctx), listCharacters(ctx), locationId ? getLocationDetail(ctx, locationId) : null]);
  const cast = characters.map((c) => ({ id: c.id, name: c.name, profileAssetId: c.profileAssetId }));
  return <WorldLibrary locations={locations} cast={cast} locationId={locationId ?? null} detail={detail} openNew={sp.new === "1"} />;
}
