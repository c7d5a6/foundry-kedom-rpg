import { describe, expect, it } from "vitest";
import {
  bodyPartFromRoll,
  clampWoundTableTotal,
  lookupWoundEffectIndex,
  woundTableColumnIndex,
  woundTableRowIndex,
  WOUND_EFFECT_TABLE,
  WOUND_TABLE_TOTAL_MAX,
  WOUND_TABLE_TOTAL_MIN,
} from "../config/wound-table.ts";

describe("woundTableColumnIndex", () => {
  it("maps 1–10 and caps at 11+", () => {
    expect(woundTableColumnIndex(1)).toBe(0);
    expect(woundTableColumnIndex(10)).toBe(9);
    expect(woundTableColumnIndex(11)).toBe(10);
    expect(woundTableColumnIndex(99)).toBe(10);
  });
});

describe("clampWoundTableTotal / woundTableRowIndex", () => {
  it("clamps totals below −3 and above 30", () => {
    expect(clampWoundTableTotal(-10)).toBe(WOUND_TABLE_TOTAL_MIN);
    expect(clampWoundTableTotal(-3)).toBe(-3);
    expect(clampWoundTableTotal(0)).toBe(0);
    expect(clampWoundTableTotal(30)).toBe(30);
    expect(clampWoundTableTotal(99)).toBe(WOUND_TABLE_TOTAL_MAX);
  });

  it("maps clamped totals to row indices", () => {
    expect(woundTableRowIndex(-10)).toBe(0);
    expect(woundTableRowIndex(WOUND_TABLE_TOTAL_MIN)).toBe(0);
    expect(woundTableRowIndex(0)).toBe(3);
    expect(woundTableRowIndex(20)).toBe(23);
    expect(woundTableRowIndex(WOUND_TABLE_TOTAL_MAX)).toBe(WOUND_EFFECT_TABLE.length - 1);
    expect(woundTableRowIndex(99)).toBe(WOUND_EFFECT_TABLE.length - 1);
  });
});

describe("lookupWoundEffectIndex", () => {
  it("reads known cells from the source matrix", () => {
    expect(lookupWoundEffectIndex(-3, 1)).toBe(20);
    expect(lookupWoundEffectIndex(-2, 1)).toBe(19);
    expect(lookupWoundEffectIndex(1, 1)).toBe(10);
    expect(lookupWoundEffectIndex(1, 3)).toBe(18);
    expect(lookupWoundEffectIndex(20, 1)).toBe(1);
    expect(lookupWoundEffectIndex(20, 11)).toBe(18);
    expect(lookupWoundEffectIndex(30, 1)).toBe(1);
    expect(lookupWoundEffectIndex(30, 10)).toBe(15);
    expect(lookupWoundEffectIndex(18, 11)).toBe(20);
    expect(lookupWoundEffectIndex(13, 2)).toBe(6);
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
