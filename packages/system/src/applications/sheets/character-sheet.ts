import {
  ABILITY_KEYS,
  PROFICIENCY_TIERS,
  SKILL_ABILITY,
  SKILL_KEYS,
  type SkillKey,
} from "../../config/kedom.ts";
import type { CharacterData } from "../../data/actor/character.ts";
import { rollSkillCheck } from "../../rolls/skill-check.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

type AbilityView = { value: number; mod?: number };
type SkillView = { proficiency: string };

// @ts-expect-error fvtt-types: HandlebarsApplicationMixin(ActorSheetV2) hits excessive stack depth
export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static override DEFAULT_OPTIONS = {
    ...ActorSheetV2.DEFAULT_OPTIONS,
    classes: ["kedom", "sheet", "actor", "character"],
    position: { width: 560, height: 720 },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      rollSkill: CharacterSheet.#onRollSkill,
    },
  };

  static override PARTS = {
    body: {
      template: "systems/kedom/templates/actor/character.hbs",
      root: true,
    },
  };

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions,
  ) {
    const context = await super._prepareContext(options);
    const system = this.actor.system as CharacterData;
    const abilitiesData = system.abilities as Record<string, AbilityView>;
    const skillsData = system.skills as Record<SkillKey, SkillView>;

    const abilities = ABILITY_KEYS.map((key) => {
      const ability = abilitiesData[key]!;
      const mod = ability.mod ?? 0;
      return {
        key,
        label: game.i18n.localize(`KEDOM.Ability.${key}.label`),
        abbr: game.i18n.localize(`KEDOM.Ability.${key}.abbr`),
        value: ability.value,
        mod,
        modSigned: mod >= 0 ? `+${mod}` : String(mod),
      };
    });

    const skills = SKILL_KEYS.map((key) => {
      const abilityKey = SKILL_ABILITY[key];
      const proficiency = skillsData[key]!.proficiency;
      return {
        key,
        label: game.i18n.localize(`KEDOM.Skill.${key}`),
        abilityKey,
        abilityAbbr: game.i18n.localize(`KEDOM.Ability.${abilityKey}.abbr`),
        proficiency,
        proficiencyOptions: PROFICIENCY_TIERS.map((value) => ({
          value,
          label: game.i18n.localize(`KEDOM.Proficiency.${value}`),
          selected: value === proficiency,
        })),
      };
    });

    return Object.assign(context, {
      system,
      abilities,
      skills,
      cssClass: this.options.classes?.join(" ") ?? "kedom sheet actor character",
    });
  }

  static async #onRollSkill(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const skillKey = target.dataset.skillKey;
    if (!skillKey || !this.actor) return;
    await rollSkillCheck(this.actor, skillKey);
  }
}
