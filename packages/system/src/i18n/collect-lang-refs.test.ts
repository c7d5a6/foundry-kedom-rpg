import { describe, expect, it } from "vitest";
import {
  collectLangRefs,
  configDrivenLangKeys,
  expandTemplateLangKey,
} from "./collect-lang-refs.ts";
import { flattenLang } from "./flatten-lang.ts";

describe("flattenLang", () => {
  it("flattens nested leaves to dotted paths", () => {
    const flat = flattenLang({
      KEDOM: { Chat: { Dice: "dice", Total: "Total" } },
      TYPES: { Actor: { character: "Character" } },
    });
    expect(flat.get("KEDOM.Chat.Dice")).toBe("dice");
    expect(flat.get("TYPES.Actor.character")).toBe("Character");
  });
});

describe("collectLangRefs", () => {
  it("picks static keys from TS and Handlebars forms", () => {
    const source = `
      game.i18n.format("KEDOM.Chat.UnknownSkill", { skill });
      label: "KEDOM.Sheet.Character",
      {{localize "KEDOM.Sheet.Abilities"}}
    `;
    const { keys, errors } = collectLangRefs(source);
    expect(errors).toEqual([]);
    expect(keys).toEqual([
      "KEDOM.Chat.UnknownSkill",
      "KEDOM.Sheet.Abilities",
      "KEDOM.Sheet.Character",
    ]);
  });

  it("expands known template patterns from config enums", () => {
    const source = "const s = `KEDOM.Skill.${key}`;";
    const { keys, errors } = collectLangRefs(source);
    expect(errors).toEqual([]);
    expect(keys).toEqual([...expandTemplateLangKey("KEDOM.Skill.${key}")].sort());
    expect(keys.length).toBeGreaterThan(1);
  });

  it("reports unhandled template patterns", () => {
    const { errors } = collectLangRefs("`KEDOM.Mystery.${x}`");
    expect(errors.length).toBe(1);
  });
});

describe("configDrivenLangKeys", () => {
  it("includes ability label and abbr for every ability", () => {
    const keys = configDrivenLangKeys();
    expect(keys).toContain("KEDOM.Ability.mgh.label");
    expect(keys).toContain("KEDOM.Ability.mgh.abbr");
    expect(keys).toContain("KEDOM.Skill.survive");
    expect(keys).toContain("KEDOM.Outcome.cost");
  });
});
