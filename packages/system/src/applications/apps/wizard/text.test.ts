import { describe, expect, it } from "vitest";
import { isFilled, prefixKeys } from "./text.ts";

describe("isFilled", () => {
  it("rejects null, undefined and the empty string", () => {
    expect(isFilled(null)).toBe(false);
    expect(isFilled(undefined)).toBe(false);
    expect(isFilled("")).toBe(false);
  });

  it("accepts any non-empty string, including whitespace", () => {
    expect(isFilled("a")).toBe(true);
    expect(isFilled(" ")).toBe(true);
  });
});

describe("prefixKeys", () => {
  it("prefixes and capitalises every key, keeping values", () => {
    expect(prefixKeys("roll2", { label: "x", needsCombat: false, specUI: null })).toEqual({
      roll2Label: "x",
      roll2NeedsCombat: false,
      roll2SpecUI: null,
    });
  });
});
