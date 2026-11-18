import { describe, expect, it } from "vitest";
import type {
  CatalogBackground,
  CatalogClass,
  CatalogCulture,
  CatalogItemPayload,
  OriginsCatalog,
} from "../../../creation/origins-catalog.ts";
import { buildAbilityData, buildOriginItems, buildSkillData } from "./actor-data.ts";

function payload(name: string): CatalogItemPayload {
  return { name, type: "origin", img: "x.svg", system: {} };
}

function catalogOf(fromPacks: boolean): OriginsCatalog {
  return {
    fromPacks,
    regions: [],
    backgrounds: new Map(),
    classes: [],
    talents: new Map(),
    originBySlug: new Map([["reg", payload("Region pack")]]),
    talentBySlug: new Map([
      ["t1", payload("Talent 1")],
      ["t2", payload("Talent 2")],
    ]),
  };
}

const culture = { name: "Culture", description: "c", talentSlug: "t1" } as CatalogCulture;
const background = { name: "Background", description: "b" } as CatalogBackground;
const fullClass = {
  slug: "fighter",
  name: "Fighter",
  description: "f",
  isFull: true,
} as CatalogClass;

const input = {
  regionKey: "reg",
  cultureKey: "cul",
  backgroundKey: "bg",
  region: undefined,
  regionLabel: "Region",
  culture,
  background,
  fullClass,
  partials: [],
  talentSlugs: ["t1", "t2"],
};

describe("buildAbilityData", () => {
  it("defaults missing abilities to 10", () => {
    const data = buildAbilityData({ mgh: 14, dex: null });
    expect(data.mgh).toEqual({ value: 14 });
    expect(data.dex).toEqual({ value: 10 });
    expect(data.kno).toEqual({ value: 10 });
  });
});

describe("buildSkillData", () => {
  it("omits untouched skills and keeps proficiency and specializations", () => {
    const data = buildSkillData({
      proficiency: { arcana: "trained" },
      specializations: {},
    } as unknown as Parameters<typeof buildSkillData>[0]);
    expect(Object.keys(data)).toEqual(["arcana"]);
    expect(data.arcana).toEqual({ proficiency: "trained" });
  });
});

describe("buildOriginItems", () => {
  it("reuses pack payloads, stubs missing ones and de-duplicates talents", () => {
    const items = buildOriginItems(catalogOf(true), input);
    expect(items.map((i) => i.name)).toEqual([
      "Region pack",
      "Culture",
      "Background",
      "Fighter",
      "Talent 1",
      "Talent 2",
    ]);
  });

  it("builds stubs only (no talents) for the static catalog", () => {
    const items = buildOriginItems(catalogOf(false), input);
    expect(items.map((i) => i.name)).toEqual(["Region", "Culture", "Background", "Fighter"]);
    expect(items[0]?.system).toMatchObject({ subType: "region", slug: "reg", description: "" });
  });
});
