import { afterEach, describe, expect, it } from "vitest";
import {
  clearOriginsCatalogCache,
  culturePercents,
  loadOriginsCatalog,
} from "./origins-catalog.ts";

describe("culturePercents", () => {
  it("sums to 100 with remainder on the last positive weight", () => {
    expect(culturePercents([1, 1, 1])).toEqual([33, 33, 34]);
    expect(culturePercents([50, 30, 20])).toEqual([50, 30, 20]);
    expect(culturePercents([1, 0, 1])).toEqual([50, 0, 50]);
  });

  it("returns zeros when total weight is zero", () => {
    expect(culturePercents([0, 0])).toEqual([0, 0]);
  });
});

describe("loadOriginsCatalog", () => {
  afterEach(() => {
    clearOriginsCatalogCache();
  });

  it("falls back to draft when packs are empty", async () => {
    const catalog = await loadOriginsCatalog();
    expect(catalog.fromPacks).toBe(false);
    expect(catalog.regions.length).toBeGreaterThan(0);
    expect(catalog.backgrounds.size).toBeGreaterThan(0);
    expect(catalog.classes).toEqual([]);

    const nerland = catalog.regions.find((r) => r.slug === "nerland");
    expect(nerland).toBeDefined();
    const pctSum = nerland!.cultures.reduce((a, c) => a + c.percent, 0);
    expect(pctSum).toBe(100);

    const human = nerland!.cultures.find((c) => c.slug === "human_nerlander");
    expect(human?.backgroundSlugs.length).toBeGreaterThan(0);
    expect(human?.classSlugs).toContain("warrior");
  });
});
