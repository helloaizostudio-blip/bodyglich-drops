import { Briefcase, Castle, House, MapPin, School, Signpost, Store, Trees, type LucideIcon } from "lucide-react";
import type { LocationCategory } from "@/db/schema";
import { LOCATION_CATEGORY_LABELS } from "@/lib/constants";
import { cn, fileUrl } from "@/lib/utils";

export const LOCATION_CATEGORY_ICONS: Record<LocationCategory, LucideIcon> = {
  house: House,
  street: Signpost,
  school: School,
  shop: Store,
  park: Trees,
  office: Briefcase,
  fantasy: Castle,
  other: MapPin,
};

const GRADIENTS: Record<LocationCategory, string> = {
  house: "from-brand-400 to-brand-600",
  street: "from-navy-700 to-navy-900",
  school: "from-brand-500 to-navy-700",
  shop: "from-lav-600 to-brand-500",
  park: "from-brand-400 to-navy-600",
  office: "from-navy-600 to-navy-800",
  fantasy: "from-lav-600 to-navy-800",
  other: "from-brand-500 to-brand-700",
};

/** The location's cover image, or a neutral category placeholder when it has no images yet. */
export function LocationCover({
  name,
  category,
  coverAssetId,
  className,
}: {
  name: string;
  category: LocationCategory;
  coverAssetId: string | null;
  className?: string;
}) {
  if (coverAssetId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fileUrl(coverAssetId)} alt={name} loading="lazy" decoding="async" className={cn("bg-brand-100 object-cover", className)} />;
  }
  const Icon = LOCATION_CATEGORY_ICONS[category];
  return (
    <div className={cn("relative grid place-items-center overflow-hidden bg-gradient-to-br text-white", GRADIENTS[category], className)}>
      <span className="absolute -right-6 -top-8 size-24 rounded-full bg-white/10" aria-hidden />
      <span className="absolute -bottom-10 -left-6 size-28 rounded-full bg-white/10" aria-hidden />
      <span className="relative flex flex-col items-center gap-1.5">
        <Icon className="size-7 opacity-90" aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">{LOCATION_CATEGORY_LABELS[category]}</span>
      </span>
    </div>
  );
}
