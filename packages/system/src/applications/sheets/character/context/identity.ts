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

type OriginKind = "Region" | "Culture" | "Background" | "Class";
interface IdentityPartData {
  label: string;
  tooltipHtml: string;
  itemId: string | null;
}

interface OriginSystemSlice {
  subType?: string;
  slug?: string;
}

function originSlug(item: Item.Implementation): string {
  return ((item.system as unknown as OriginSystemSlice).slug ?? "").trim();
}

function findOriginItem(
  originItems: Item.Implementation[],
  subType: string,
  label: string,
  slugHint = "",
  contentKind?: OriginKind,
): Item.Implementation | undefined {
  const bySlug =
    slugHint !== ""
      ? originItems.find((item) => {
          const sys = item.system as unknown as OriginSystemSlice;
          return sys.subType === subType && (sys.slug ?? "") === slugHint;
        })
      : undefined;
  if (bySlug) return bySlug;
  return originItems.find((item) => {
    const sys = item.system as unknown as OriginSystemSlice;
    if (sys.subType !== subType) return false;
    if (label === "") return true;
    if (item.name === label) return true;
    // Pack item names may differ from localized details labels.
    if (contentKind) {
      const slug = (sys.slug ?? "").trim();
      if (slug !== "" && localizeContentLabel(contentKind, slug, item.name) === label) {
        return true;
      }
    }
    return false;
  });
}

async function buildIdentityTip(
  actor: Actor.Implementation,
  tipCache: TipCache,
  kind: OriginKind,
  displayLabel: string,
  item: Item.Implementation | undefined,
  slugHint = "",
): Promise<IdentityPartData | null> {
  if (displayLabel === "" && slugHint === "") return null;
  const sys = item?.system as unknown as { slug?: string; description?: string } | undefined;
  const slug = (slugHint !== "" ? slugHint : (sys?.slug ?? "")).trim();
  const fallbackName = item?.name !== undefined && item.name !== "" ? item.name : slug;
  const label =
    slug !== ""
      ? localizeContentLabel(kind, slug, displayLabel !== "" ? displayLabel : fallbackName)
      : displayLabel;
  if (label === "") return null;
  const itemId = item?.id ?? null;
  const packDesc = sys?.description ?? "";
  const raw = slug !== "" ? localizeContentDescription(kind, slug, packDesc) : packDesc;
  const plain = raw.replace(/<[^>]*>/g, "").trim();
  if (plain === "") return { label, tooltipHtml: "", itemId };
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
}

/** Full class: one origin. Adventurer: two partial origins (details.class is "A / B"). */
function orderClassItems(
  classOriginItems: Item.Implementation[],
  classLabelParts: string[],
): Item.Implementation[] {
  if (classOriginItems.length <= 1) return classOriginItems;
  if (classLabelParts.length === 0) return classOriginItems;
  const remaining = [...classOriginItems];
  const ordered: Item.Implementation[] = [];
  for (const part of classLabelParts) {
    const idx = remaining.findIndex((item) => {
      if (item.name === part) return true;
      const slug = originSlug(item);
      return slug !== "" && localizeContentLabel("Class", slug, item.name) === part;
    });
    if (idx >= 0) {
      const [found] = remaining.splice(idx, 1);
      if (found !== undefined) ordered.push(found);
    }
  }
  return [...ordered, ...remaining];
}

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
  const tip = (
    kind: OriginKind,
    displayLabel: string,
    item: Item.Implementation | undefined,
    slugHint = "",
  ) => buildIdentityTip(actor, tipCache, kind, displayLabel, item, slugHint);

  const regionItem = findOriginItem(originItems, "region", "", regionSlug, "Region");
  const raceItem = findOriginItem(originItems, "race", culture, "", "Culture");
  const backgroundItem = findOriginItem(originItems, "background", background, "", "Background");
  const raceSlug = (
    (raceItem?.system as unknown as { slug?: string } | undefined)?.slug ?? ""
  ).trim();
  const backgroundSlug = (
    (backgroundItem?.system as unknown as { slug?: string } | undefined)?.slug ?? ""
  ).trim();

  const classOriginItems = originItems.filter((item) => {
    const sys = item.system as unknown as { subType?: string };
    return sys.subType === "class";
  });
  const classLabelParts = className
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const orderedClassItems = orderClassItems(classOriginItems, classLabelParts);

  const classTips =
    orderedClassItems.length > 0
      ? await Promise.all(
          orderedClassItems.map((item) => tip("Class", item.name, item, originSlug(item))),
        )
      : [await tip("Class", className, undefined, "")];

  const headTips = await Promise.all([
    tip("Region", regionItem?.name ?? regionSlug, regionItem, regionSlug),
    tip("Culture", culture, raceItem, raceSlug),
    tip("Background", background, backgroundItem, backgroundSlug),
  ]);
  const identityParts = [...headTips, ...classTips].filter(
    (p): p is IdentityPartData => p !== null,
  );

  const regionSys = regionItem?.system as unknown as { bannerImg?: string } | undefined;
  const sheetBannerImg = (regionSys?.bannerImg ?? "").trim();
  return { level, identityParts, sheetBannerImg };
}
