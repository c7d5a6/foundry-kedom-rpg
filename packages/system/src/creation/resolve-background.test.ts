import { describe, expect, it } from "vitest";
import {
  grantFromSpec,
  isGrantBlocked,
  mergeSkillGrants,
  resolveRolledEntry,
  resolveRolledGrowth,
} from "./resolve-background.ts";

describe("isGrantBlocked", () => {
  it("blocks exact skill+spec duplicates", () => {
    const owned = [grantFromSpec({ skillKey: "craft", specLabel: "Smithing" })];
    expect(isGrantBlocked(owned, grantFromSpec({ skillKey: "craft", specLabel: "Smithing" }))).toBe(
      true,
    );
    expect(isGrantBlocked(owned, grantFromSpec({ skillKey: "craft", specLabel: "Armorer" }))).toBe(
      false,
    );
  });

  it("blocks a third copy of the same skill", () => {
    const owned = [
      grantFromSpec({ skillKey: "craft", specLabel: "Smithing" }),
      grantFromSpec({ skillKey: "craft", specLabel: "Armorer" }),
    ];
    expect(isGrantBlocked(owned, grantFromSpec({ skillKey: "craft", specLabel: "Repair" }))).toBe(
      true,
    );
  });

  it("blocks same skill with no specialization twice", () => {
    const owned = [grantFromSpec({ skillKey: "shoot" })];
    expect(isGrantBlocked(owned, grantFromSpec({ skillKey: "shoot" }))).toBe(true);
  });
});

describe("resolveRolledEntry", () => {
  it("returns a concrete skill when not blocked", () => {
    const result = resolveRolledEntry({ kind: "skill", skillKey: "shoot" }, [], null);
    expect(result.needsAnySkill).toBe(false);
    expect(result.grant?.skillKey).toBe("shoot");
    expect(result.substituted).toBe(false);
  });

  it("asks for any skill when rolled skill+spec is already owned", () => {
    const owned = [grantFromSpec({ skillKey: "shoot" })];
    const result = resolveRolledEntry({ kind: "skill", skillKey: "shoot" }, owned, null);
    expect(result.needsAnySkill).toBe(true);
    expect(result.grant).toBeNull();
    expect(result.rolledGrant?.skillKey).toBe("shoot");
  });

  it("allows same skill with a different specialization", () => {
    const owned = [grantFromSpec({ skillKey: "craft", specLabel: "Smithing" })];
    const result = resolveRolledEntry(
      { kind: "skill", skillKey: "craft", specLabel: "Armorer" },
      owned,
      null,
    );
    expect(result.needsAnySkill).toBe(false);
    expect(result.grant?.specialization?.label).toBe("Armorer");
  });

  it("accepts a substitute skill when blocked", () => {
    const owned = [grantFromSpec({ skillKey: "shoot" })];
    const result = resolveRolledEntry(
      { kind: "skill", skillKey: "shoot" },
      owned,
      { skillKey: "exert", specLabel: null },
    );
    expect(result.substituted).toBe(true);
    expect(result.grant?.skillKey).toBe("exert");
    expect(result.rolledGrant?.skillKey).toBe("shoot");
  });

  it("asks for combat pick on anyCombat without pick", () => {
    const result = resolveRolledEntry({ kind: "anyCombat" }, [], null);
    expect(result.needsCombatPick).toBe(true);
  });

  it("substitutes any skill when combat pick is blocked", () => {
    const owned = [grantFromSpec({ skillKey: "punch" })];
    const waiting = resolveRolledEntry(
      { kind: "anyCombat" },
      owned,
      { skillKey: "punch", specLabel: null },
    );
    expect(waiting.needsAnySkill).toBe(true);
    const done = resolveRolledEntry(
      { kind: "anyCombat" },
      owned,
      { skillKey: "lore", specLabel: "History" },
    );
    expect(done.grant?.skillKey).toBe("lore");
    expect(done.substituted).toBe(true);
  });
});

describe("resolveRolledGrowth (compat)", () => {
  it("still works with skill-key sets", () => {
    const result = resolveRolledGrowth(
      { kind: "skill", skillKey: "shoot" },
      new Set(["shoot"]),
      "exert",
    );
    expect(result.grant?.skillKey).toBe("exert");
  });
});

describe("mergeSkillGrants", () => {
  it("sets apprentice for a single grant", () => {
    const merged = mergeSkillGrants([grantFromSpec({ skillKey: "shoot" })]);
    expect(merged.proficiency.shoot).toBe("apprentice");
  });

  it("sets trained and merges specializations when the same skill is granted twice", () => {
    const a = grantFromSpec({ skillKey: "craft", specLabel: "Smithing" });
    const b = grantFromSpec({ skillKey: "craft", specLabel: "Armorer" });
    const merged = mergeSkillGrants([a, b]);
    expect(merged.proficiency.craft).toBe("trained");
    expect(merged.specializations.craft).toHaveLength(2);
  });
});
