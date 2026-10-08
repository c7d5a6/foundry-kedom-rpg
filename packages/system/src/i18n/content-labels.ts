/**
 * Forge-exported catalog strings under KEDOM.Content.* / Creation.*.
 * Packs stay English; UI localizes by slug at display time.
 */

export type ContentKind = "Region" | "Culture" | "Background" | "Class" | "Talent";

/** Pack/forge slugs that differ from older Creation.* draft leaves. */
const CREATION_SLUG_ALIASES: Readonly<
  Partial<Record<ContentKind, Readonly<Record<string, string>>>>
> = {
  Region: { nirland: "nerland" },
};

function localizePath(path: string, fallback: string): string {
  if (typeof game === "undefined" || !game.i18n?.localize) return fallback;
  const v = game.i18n.localize(path);
  if (!v || v === path) return fallback;
  return v;
}

function aliasSlug(kind: ContentKind, slug: string): string {
  return CREATION_SLUG_ALIASES[kind]?.[slug] ?? slug;
}

/** Localized catalog label; falls back to Creation.* then pack/English name. */
export function localizeContentLabel(kind: ContentKind, slug: string, fallback: string): string {
  if (!slug) return fallback;
  const leaf = aliasSlug(kind, slug);
  const fromContent = localizePath(`KEDOM.Content.${kind}.${slug}.label`, "");
  if (fromContent) return fromContent;
  if (leaf !== slug) {
    const aliased = localizePath(`KEDOM.Content.${kind}.${leaf}.label`, "");
    if (aliased) return aliased;
  }
  if (kind === "Talent") return fallback;
  const fromCreation = localizePath(`KEDOM.Creation.${kind}.${leaf}`, "");
  if (fromCreation) return fromCreation;
  if (leaf !== slug) {
    const aliasedCreation = localizePath(`KEDOM.Creation.${kind}.${slug}`, "");
    if (aliasedCreation) return aliasedCreation;
  }
  return fallback;
}

/** Localized catalog description HTML; falls back to pack English HTML. */
export function localizeContentDescription(
  kind: ContentKind,
  slug: string,
  fallbackHtml: string,
): string {
  if (!slug) return fallbackHtml;
  const leaf = aliasSlug(kind, slug);
  const fromContent = localizePath(`KEDOM.Content.${kind}.${slug}.description`, "");
  if (fromContent) return fromContent;
  if (leaf !== slug) {
    const aliased = localizePath(`KEDOM.Content.${kind}.${leaf}.description`, "");
    if (aliased) return aliased;
  }
  return fallbackHtml;
}
