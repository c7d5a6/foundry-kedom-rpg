import { describe, expect, it } from "vitest";
import {
  resolveFromFocus,
  strainLimitFromFocus,
  strainSaveBand,
} from "./strain.ts";

describe("strainLimitFromFocus / resolveFromFocus", () => {
  it("uses Focus modifier, not score", () => {
    expect(strainLimitFromFocus(0)).toBe(10);
    expect(strainLimitFromFocus(1)).toBe(11);
    expect(strainLimitFromFocus(-1)).toBe(9);
    expect(resolveFromFocus(0)).toBe(10);
    expect(resolveFromFocus(2)).toBe(8);
    expect(resolveFromFocus(-2)).toBe(12);
  });
});

describe("strainSaveBand", () => {
  it("classifies harm / failure / success", () => {
    expect(strainSaveBand(5, 8, 12)).toBe("harm");
    expect(strainSaveBand(10, 8, 12)).toBe("failure");
    expect(strainSaveBand(13, 8, 12)).toBe("success");
  });
});
