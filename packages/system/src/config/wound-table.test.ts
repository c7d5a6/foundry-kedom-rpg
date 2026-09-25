import { describe, expect, it } from "vitest";
import {
  bodyPartFromRoll,
  lookupWoundEffectIndex,
  woundTableColumnIndex,
  woundTableRowIndex,
} from "../config/wound-table.ts";

describe("woundTableColumnIndex", () => {
  it("maps 1–10 and caps at 11+", () => {
    expect(woundTableColumnIndex(1)).toBe(0);
    expect(woundTableColumnIndex(10)).toBe(9);
    expect(woundTableColumnIndex(11)).toBe(10);
    expect(woundTableColumnIndex(99)).toBe(10);
  });
});

describe("woundTableRowIndex", () => {
  it("bands 20+ and <=1", () => {
    expect(woundTableRowIndex(25)).toBe(0);
    expect(woundTableRowIndex(20)).toBe(0);
    expect(woundTableRowIndex(19)).toBe(1);
    expect(woundTableRowIndex(2)).toBe(18);
    expect(woundTableRowIndex(1)).toBe(19);
    expect(woundTableRowIndex(-3)).toBe(19);
  });
});

describe("lookupWoundEffectIndex", () => {
  it("reads known cells from the source matrix", () => {
    expect(lookupWoundEffectIndex(20, 1)).toBe(1);
    expect(lookupWoundEffectIndex(1, 1)).toBe(7);
    expect(lookupWoundEffectIndex(20, 11)).toBe(12);
    expect(lookupWoundEffectIndex(1, 3)).toBe(15);
  });
});

describe("bodyPartFromRoll", () => {
  it("maps d8 faces", () => {
    expect(bodyPartFromRoll(1)).toBe("leftArm");
    expect(bodyPartFromRoll(2)).toBe("rightArm");
    expect(bodyPartFromRoll(3)).toBe("leftLeg");
    expect(bodyPartFromRoll(4)).toBe("rightLeg");
    expect(bodyPartFromRoll(5)).toBe("body");
    expect(bodyPartFromRoll(6)).toBe("body");
    expect(bodyPartFromRoll(7)).toBe("body");
    expect(bodyPartFromRoll(8)).toBe("head");
  });
});
