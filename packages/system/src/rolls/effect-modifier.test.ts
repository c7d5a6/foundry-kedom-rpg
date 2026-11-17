import { describe, expect, it } from "vitest";
import { effectDeltaModifiers } from "./effect-modifier.ts";

describe("effectDeltaModifiers", () => {
  it("returns nothing when derived matches expected or is missing", () => {
    expect(effectDeltaModifiers({ derived: 3, expected: 3, id: "x", label: "E" })).toEqual([]);
    expect(effectDeltaModifiers({ derived: undefined, expected: 3, id: "x", label: "E" })).toEqual(
      [],
    );
  });

  it("returns the signed difference as an effect modifier", () => {
    const [mod] = effectDeltaModifiers({
      derived: 5,
      expected: 3,
      id: "save.will.effects",
      label: "E",
    });
    expect(mod).toMatchObject({ value: 2, kind: "effect", label: "E" });
    const [neg] = effectDeltaModifiers({ derived: 1, expected: 3, id: "x", label: "E" });
    expect(neg?.value).toBe(-2);
  });
});
