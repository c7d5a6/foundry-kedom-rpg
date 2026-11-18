import { describe, expect, it } from "vitest";
import { isNonEmpty } from "./guards.ts";

describe("isNonEmpty", () => {
  it("treats missing and empty strings alike, as truthiness did", () => {
    expect(isNonEmpty(undefined)).toBe(false);
    expect(isNonEmpty(null)).toBe(false);
    expect(isNonEmpty("")).toBe(false);
    expect(isNonEmpty(" ")).toBe(true);
    expect(isNonEmpty("x")).toBe(true);
  });
});
