import {
  localizeContentDescription,
  localizeContentLabel,
} from "../../../../i18n/content-labels.ts";
import { enrichHTML } from "../../../enrich.ts";

export interface IdentityPart {
  label: string;
  tooltipHtml: string;
  itemId: string | null;
}

export interface CharacterDetails {
  level?: number;
  culture?: string;
  background?: string;
  class?: string;
  region?: string;
  notes?: string;
}

/** Origin tooltips are enriched HTML; cache them across renders (keyed by content). */
export type TipCache = Map<string, string>;

/** Header identity chips (region, culture, background, class) and the region banner. */
export async function buildIdentity(
  actor: Actor.Implementation,
  detailsRaw: CharacterDetails,
  tipCache: TipCache,
) {
  const level = Math.max(1, Math.floor(detailsRaw.level ?? 1));
  const culture = (detailsRaw.culture ?? "").trim();
  const background = (detailsRaw.background ?? "").trim();
  const className = (detailsRaw.class ?? "").trim();
  const regionSlug = (detailsRaw.region ?? "").trim();

  const originItems = actor.items.filter((item) => (item.type as string) === "origin");
  const findOrigin = (
    subType: string,
    label: string,
    slugHint = "",
    contentKind?: "Region" | "Culture" | "Background" | "Class",
  ) => {
    const bySlug = slugHint
      ? originItems.find((item) => {
          const sys = item.system as unknown as { subType?: string; slug?: string };
          return sys.subType === subType && (sys.slug ?? "") === slugHint;
        })
      : undefined;
    if (bySlug) return bySlug;
    return originItems.find((item) => {
      const sys = item.system as unknown as { subType?: string; slug?: string };
      if (sys.subType !== subType) return false;
      if (!label) return true;
      if (item.name === label) return true;
      // Pack item names may differ from localized details labels.
      if (contentKind) {
        const slug = (sys.slug ?? "").trim();
        if (slug && localizeContentLabel(contentKind, slug, item.name ?? slug) === label) {
          return true;
        }
      }
      return false;
    });
  };

  const identityTip = async (
    kind: "Region" | "Culture" | "Background" | "Class",
    displayLabel: string,
    item: Item.Implementation | undefined,
    slugHint = "",
  ): Promise<{ label: string; tooltipHtml: string; itemId: string | null } | null> => {
    if (!displayLabel && !slugHint) return null;
    const sys = item?.system as unknown as { slug?: string; description?: string } | undefined;
    const slug = (slugHint || sys?.slug || "").trim();
    const label = slug
      ? localizeContentLabel(kind, slug, displayLabel || item?.name || slug)
      : displayLabel;
    if (!label) return null;
    const itemId = item?.id ?? null;
    const packDesc = sys?.description ?? "";
    const raw = slug ? localizeContentDescription(kind, slug, packDesc) : packDesc;
    const plain = raw.replace(/<[^>]*>/g, "").trim();
    if (!plain) return { label, tooltipHtml: "", itemId };
    const cacheKey = `${game.i18n.lang}|${String(actor.isOwner)}|${item?.uuid ?? ""}|${raw}`;
    let tooltipHtml = tipCache.get(cacheKey);
    if (tooltipHtml === undefined) {
      tooltipHtml = await enrichHTML(raw, {
        secrets: actor.isOwner,
        relativeTo: item,
      });
      if (tipCache.size >= 50) tipCache.clear();
      tipCache.set(cacheKey, tooltipHtml);
    }
    return { label, tooltipHtml, itemId };
  };

  const regionItem = findOrigin("region", "", regionSlug, "Region");
  const raceItem = findOrigin("race", culture, "", "Culture");
  const backgroundItem = findOrigin("background", background, "", "Background");
  const raceSlug = (
    (raceItem?.system as unknown as { slug?: string } | undefined)?.slug ?? ""
  ).trim();
  const backgroundSlug = (
    (backgroundItem?.system as unknown as { slug?: string } | undefined)?.slug ?? ""
  ).trim();

  // Full class: one origin. Adventurer: two partial origins (details.class is "A / B").
  const classOriginItems = originItems.filter((item) => {
    const sys = item.system as unknown as { subType?: string };
    return sys.subType === "class";
  });
  const classLabelParts = className
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const orderedClassItems = (() => {
    if (classOriginItems.length <= 1) return classOriginItems;
    if (!classLabelParts.length) return classOriginItems;
    const remaining = [...classOriginItems];
    const ordered: Item.Implementation[] = [];
    for (const part of classLabelParts) {
      const idx = remaining.findIndex((item) => {
        const sys = item.system as unknown as { slug?: string };
        if (item.name === part) return true;
        const slug = (sys.slug ?? "").trim();
        return Boolean(slug && localizeContentLabel("Class", slug, item.name ?? slug) === part);
      });
      if (idx >= 0) ordered.push(remaining.splice(idx, 1)[0]!);
    }
    return [...ordered, ...remaining];
  })();

  const classTips =
    orderedClassItems.length > 0
      ? await Promise.all(
          orderedClassItems.map((item) => {
            const sys = item.system as unknown as { slug?: string };
            const slug = (sys.slug ?? "").trim();
            return identityTip("Class", item.name ?? "", item, slug);
          }),
        )
      : [await identityTip("Class", className, undefined, "")];

  const identityParts = (
    await Promise.all([
      identityTip("Region", regionItem?.name ?? regionSlug, regionItem, regionSlug),
      identityTip("Culture", culture, raceItem, raceSlug),
      identityTip("Background", background, backgroundItem, backgroundSlug),
      ...classTips,
    ])
  ).filter((p): p is { label: string; tooltipHtml: string; itemId: string | null } => p !== null);

  const regionSys = regionItem?.system as unknown as { bannerImg?: string } | undefined;
  const sheetBannerImg = (regionSys?.bannerImg ?? "").trim();
  return { level, identityParts, sheetBannerImg };
}
