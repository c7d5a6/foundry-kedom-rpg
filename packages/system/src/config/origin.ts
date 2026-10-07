/** Origin item discriminator — race / background / class. */
export const ORIGIN_SUBTYPES = ["region", "race", "background", "class"] as const;
export type OriginSubtype = (typeof ORIGIN_SUBTYPES)[number];

export function normalizeOriginSubtype(raw: string | undefined): OriginSubtype {
  if (ORIGIN_SUBTYPES.includes(raw as OriginSubtype)) return raw as OriginSubtype;
  return "background";
}
