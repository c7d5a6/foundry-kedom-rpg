import { describe, expect, it } from "vitest";
import { getKedomCheckFlags } from "./check-flags.ts";
import { getKedomFlag } from "../types/accessors.ts";

const msg = (flags: unknown) => ({ flags }) as unknown as ChatMessage.Implementation;

describe("getKedomFlag", () => {
  it("reads a keyed Kedom flag or returns undefined", () => {
    expect(getKedomFlag(msg({ kedom: { wound: { a: 1 } } }), "wound")).toEqual({ a: 1 });
    expect(getKedomFlag(msg({}), "wound")).toBeUndefined();
    expect(getKedomFlag({}, "wound")).toBeUndefined();
  });
});

describe("getKedomCheckFlags", () => {
  it("accepts known kinds only", () => {
    expect(getKedomCheckFlags(msg({ kedom: { check: { kind: "skill" } } }))).toMatchObject({
      kind: "skill",
    });
    expect(getKedomCheckFlags(msg({ kedom: { check: { kind: "bogus" } } }))).toBeNull();
    expect(getKedomCheckFlags(msg({}))).toBeNull();
  });
});
