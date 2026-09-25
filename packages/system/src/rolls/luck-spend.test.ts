import { describe, expect, it } from "vitest";
import { luckCostToNextOutcome, outcomeRank } from "./luck-spend.ts";

describe("outcomeRank", () => {
  it("orders failure < cost < success", () => {
    expect(outcomeRank({ kind: "failure", degree: 3 })).toBeLessThan(
      outcomeRank({ kind: "failure", degree: 1 }),
    );
    expect(outcomeRank({ kind: "failure", degree: 1 })).toBeLessThan(
      outcomeRank({ kind: "cost", degree: 1 }),
    );
    expect(outcomeRank({ kind: "cost", degree: 1 })).toBeLessThan(
      outcomeRank({ kind: "success", degree: 1 }),
    );
    expect(outcomeRank({ kind: "success", degree: 1 })).toBeLessThan(
      outcomeRank({ kind: "success", degree: 2 }),
    );
  });
});

describe("luckCostToNextOutcome", () => {
  it("costs 1 Luck from trained F1 (10) to Cost", () => {
    expect(luckCostToNextOutcome(10, "trained")).toEqual({
      cost: 1,
      nextOutcome: { kind: "cost", degree: 1 },
    });
  });

  it("costs 1 Luck from trained Cost (15) to Success 1", () => {
    expect(luckCostToNextOutcome(15, "trained")).toEqual({
      cost: 1,
      nextOutcome: { kind: "success", degree: 1 },
    });
  });

  it("costs multiple Luck when the next band is farther", () => {
    expect(luckCostToNextOutcome(11, "trained")).toEqual({
      cost: 5,
      nextOutcome: { kind: "success", degree: 1 },
    });
  });

  it("returns null at the top of the trained ladder", () => {
    expect(luckCostToNextOutcome(27, "trained")).toBeNull();
  });

  it("improves legendary failure degrees before Cost", () => {
    expect(luckCostToNextOutcome(10, "legendary")).toEqual({
      cost: 1,
      nextOutcome: { kind: "failure", degree: 2 },
    });
  });
});
