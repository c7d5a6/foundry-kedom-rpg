import { describe, expect, it } from "vitest";
import { resolveOutcome } from "./resolve-outcome.ts";

describe("resolveOutcome", () => {
  it("assigns rising success degrees above the first success (trained)", () => {
    expect(resolveOutcome({ total: 10, difficulty: "trained" })).toEqual({
      kind: "failure",
      degree: 1,
    });
    expect(resolveOutcome({ total: 12, difficulty: "trained" })).toEqual({
      kind: "cost",
      degree: 1,
    });
    expect(resolveOutcome({ total: 15, difficulty: "trained" })).toEqual({
      kind: "success",
      degree: 1,
    });
    expect(resolveOutcome({ total: 22, difficulty: "trained" })).toEqual({
      kind: "success",
      degree: 2,
    });
    expect(resolveOutcome({ total: 27, difficulty: "trained" })).toEqual({
      kind: "success",
      degree: 3,
    });
  });

  it("assigns rising failure degrees below the mildest failure (legendary)", () => {
    expect(resolveOutcome({ total: 10, difficulty: "legendary" })).toEqual({
      kind: "failure",
      degree: 3,
    });
    expect(resolveOutcome({ total: 12, difficulty: "legendary" })).toEqual({
      kind: "failure",
      degree: 2,
    });
    expect(resolveOutcome({ total: 18, difficulty: "legendary" })).toEqual({
      kind: "failure",
      degree: 1,
    });
    expect(resolveOutcome({ total: 24, difficulty: "legendary" })).toEqual({
      kind: "cost",
      degree: 1,
    });
    expect(resolveOutcome({ total: 30, difficulty: "legendary" })).toEqual({
      kind: "success",
      degree: 1,
    });
  });

  it("stacks success degrees on easy after the single failure band", () => {
    expect(resolveOutcome({ total: 9, difficulty: "easy" })).toEqual({
      kind: "failure",
      degree: 1,
    });
    expect(resolveOutcome({ total: 11, difficulty: "easy" })).toEqual({
      kind: "success",
      degree: 1,
    });
    expect(resolveOutcome({ total: 27, difficulty: "easy" })).toEqual({
      kind: "success",
      degree: 4,
    });
  });

  it("uses hard column cost in the middle band", () => {
    expect(resolveOutcome({ total: 14, difficulty: "hard" })).toEqual({
      kind: "failure",
      degree: 1,
    });
    expect(resolveOutcome({ total: 18, difficulty: "hard" })).toEqual({
      kind: "cost",
      degree: 1,
    });
    expect(resolveOutcome({ total: 26, difficulty: "hard" })).toEqual({
      kind: "success",
      degree: 1,
    });
    expect(resolveOutcome({ total: 27, difficulty: "hard" })).toEqual({
      kind: "success",
      degree: 2,
    });
  });
});
