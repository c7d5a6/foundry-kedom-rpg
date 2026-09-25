import { describe, expect, it } from "vitest";
import { luckSaveDiceTerm, skillCheckDiceTerm } from "./advantage.ts";

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

describe("luckSaveDiceTerm", () => {
  it("uses 1d20 for a straight roll", () => {
    expect(luckSaveDiceTerm(0)).toBe("1d20");
  });

  it("adds dice and keeps highest 1 for advantage", () => {
    expect(luckSaveDiceTerm(1)).toBe("2d20kh1");
    expect(luckSaveDiceTerm(2)).toBe("3d20kh1");
  });

  it("adds dice and keeps lowest 1 for disadvantage", () => {
    expect(luckSaveDiceTerm(-1)).toBe("2d20kl1");
  });
});
