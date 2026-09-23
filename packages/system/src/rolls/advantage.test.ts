import { describe, expect, it } from "vitest";
import { skillCheckDiceTerm } from "./advantage.ts";

describe("skillCheckDiceTerm", () => {
  it("uses 2d10 for a straight roll", () => {
    expect(skillCheckDiceTerm(0)).toBe("2d10");
  });

  it("adds dice and keeps highest 2 for advantage", () => {
    expect(skillCheckDiceTerm(1)).toBe("3d10kh2");
    expect(skillCheckDiceTerm(3)).toBe("5d10kh2");
  });

  it("adds dice and keeps lowest 2 for disadvantage", () => {
    expect(skillCheckDiceTerm(-1)).toBe("3d10kl2");
    expect(skillCheckDiceTerm(-2)).toBe("4d10kl2");
  });

  it("truncates non-integers toward zero", () => {
    expect(skillCheckDiceTerm(1.9)).toBe("3d10kh2");
    expect(skillCheckDiceTerm(-1.9)).toBe("3d10kl2");
  });
});
