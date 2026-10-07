import { describe, expect, it } from "vitest";
import {
  buildSpecialization,
  entryNeedsPlayerSpecialization,
  grantFromSpec,
  isGrantBlocked,
  mergeSkillGrants,
  resolveConcreteEntry,
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

describe("entryNeedsPlayerSpecialization", () => {
  it("is true for fixed/free skills with no authored spec", () => {
    expect(entryNeedsPlayerSpecialization({ kind: "skill", skillKey: "notice" })).toBe(true);
    expect(entryNeedsPlayerSpecialization({ kind: "skill", skillKey: "craft" })).toBe(true);
  });

  it("is false when a specialization is authored or skill has none", () => {
    expect(
      entryNeedsPlayerSpecialization({ kind: "skill", skillKey: "notice", specLabel: "awareness" }),
    ).toBe(false);
    expect(entryNeedsPlayerSpecialization({ kind: "skill", skillKey: "shoot" })).toBe(false);
    expect(entryNeedsPlayerSpecialization({ kind: "anySkill" })).toBe(false);
  });
});

describe("resolveConcreteEntry", () => {
  it("blocks a concrete skill that needs a specialization until the player picks one", () => {
    expect(resolveConcreteEntry({ kind: "skill", skillKey: "craft" }, null)).toBeNull();
    expect(
      resolveConcreteEntry({ kind: "skill", skillKey: "craft" }, { skillKey: "craft", specLabel: null }),
    ).toBeNull();
    const done = resolveConcreteEntry(
      { kind: "skill", skillKey: "craft" },
      { skillKey: "craft", specLabel: "Smithing" },
    );
    expect(done?.specialization?.label).toBe("Smithing");
  });

  it("returns authored concrete grants without a pick", () => {
    const g = resolveConcreteEntry(
      { kind: "skill", skillKey: "craft", specLabel: "Smithing" },
      null,
    );
    expect(g?.specialization?.label).toBe("Smithing");
  });
});

describe("buildSpecialization", () => {
  it("accepts full catalog slugs from pack export", () => {
    const g = buildSpecialization("notice", "notice.awareness");
    expect(g.slug).toBe("notice.awareness");
  });

  it("accepts English freeform labels", () => {
    const g = buildSpecialization("craft", "Smithing");
    expect(g.slug).toBe("craft.smithing");
    expect(g.label).toBe("Smithing");
  });
});

describe("resolveRolledEntry", () => {
  it("returns a concrete skill when not blocked", () => {
    const result = resolveRolledEntry({ kind: "skill", skillKey: "shoot" }, [], null);
    expect(result.needsAnySkill).toBe(false);
    expect(result.grant?.skillKey).toBe("shoot");
    expect(result.substituted).toBe(false);
  });

  it("requires a specialization for a concrete skill with none authored", () => {
    const waiting = resolveRolledEntry({ kind: "skill", skillKey: "notice" }, [], null);
    expect(waiting.needsSpecialization).toBe(true);
    expect(waiting.grant).toBeNull();
    const done = resolveRolledEntry(
      { kind: "skill", skillKey: "notice" },
      [],
      { skillKey: "notice", specLabel: "awareness" },
    );
    expect(done.grant?.specialization?.slug).toBe("notice.awareness");
    expect(done.needsSpecialization).toBe(false);
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

  it("rejects a substitute that repeats an owned specialization", () => {
    const owned = [grantFromSpec({ skillKey: "notice", specLabel: "Awareness" })];
    const result = resolveRolledEntry(
      { kind: "skill", skillKey: "notice", specLabel: "Awareness" },
      owned,
      { skillKey: "notice", specLabel: "awareness" },
    );
    expect(result.grant).toBeNull();
    expect(result.substituted).toBe(true);
    expect(result.needsSpecialization).toBe(true);
    expect(result.needsAnySkill).toBe(false);
  });

  it("accepts a substitute with a different specialization of the same skill", () => {
    const owned = [grantFromSpec({ skillKey: "notice", specLabel: "Awareness" })];
    const result = resolveRolledEntry(
      { kind: "skill", skillKey: "notice", specLabel: "Awareness" },
      owned,
      { skillKey: "notice", specLabel: "detail" },
    );
    expect(result.substituted).toBe(true);
    expect(result.grant?.skillKey).toBe("notice");
    expect(result.grant?.specialization?.slug).toBe("notice.detail");
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
