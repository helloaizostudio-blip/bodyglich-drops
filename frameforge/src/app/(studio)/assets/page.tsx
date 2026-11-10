import { requireCtx } from "@/server/auth";
import { assetCategoryCounts, getAsset, listAssets } from "@/server/services/assets";
import { resolveCurrentEpisode } from "@/server/services/episodes";
import { ASSET_CATEGORIES, type AssetCategory } from "@/db/schema";
import { AssetLibrary } from "./asset-library";

export const metadata = { title: "Asset Library" };

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; asset?: string; upload?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const category = ASSET_CATEGORIES.includes(sp.category as AssetCategory) ? (sp.category as AssetCategory) : undefined;
  const [assets, counts, { all: episodes }, selected] = await Promise.all([
    listAssets(ctx, { q: sp.q, category }),
    assetCategoryCounts(ctx),
    resolveCurrentEpisode(ctx),
    sp.asset ? getAsset(ctx, sp.asset) : null,
  ]);
  return (
    <AssetLibrary
      assets={assets}
      counts={counts}
      q={sp.q ?? ""}
      category={category ?? null}
      selected={selected}
      openUpload={sp.upload === "1"}
      episodes={episodes.map((e) => ({ id: e.id, title: e.title, number: e.number }))}
    />
  );
}
