import {
  ABILITY_KEYS,
  PROFICIENCY_TIERS,
  SKILL_ABILITY,
  SKILL_KEYS,
  type SkillKey,
} from "../../config/kedom.ts";
import {
  SKILL_FIXED_SPECIALIZATIONS,
  SKILL_SPECIALIZATION_KIND,
  freeSpecializationSlug,
  specializationSlug,
} from "../../config/specializations.ts";
import type { CharacterData, SkillFields } from "../../data/actor/character.ts";
import { rollSkillCheck } from "../../rolls/skill-check.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

type AbilityView = { value: number; mod?: number };

function localizeSpecLabel(skillKey: SkillKey, leaf: string): string {
  const path = `KEDOM.Specialization.${skillKey}.${leaf}`;
  const v = game.i18n.localize(path);
  return !v || v === path ? leaf : v;
}

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
      rollSpecialization: CharacterSheet.#onRollSpecialization,
      addSpecialization: CharacterSheet.#onAddSpecialization,
      removeSpecialization: CharacterSheet.#onRemoveSpecialization,
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
    const skillsData = system.skills as Record<SkillKey, SkillFields>;

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
      const skill = skillsData[key]!;
      const proficiency = skill.proficiency;
      const kind = SKILL_SPECIALIZATION_KIND[key];
      const ownedSlugs = new Set(skill.specializations.map((s) => s.slug));
      const fixedLeaves = SKILL_FIXED_SPECIALIZATIONS[key] ?? [];
      const availableFixed = fixedLeaves
        .filter((leaf) => !ownedSlugs.has(specializationSlug(key, leaf)))
        .map((leaf) => ({
          leaf,
          slug: specializationSlug(key, leaf),
          label: localizeSpecLabel(key, leaf),
        }));

      return {
        key,
        label: game.i18n.localize(`KEDOM.Skill.${key}`),
        abilityKey,
        abilityAbbr: game.i18n.localize(`KEDOM.Ability.${abilityKey}.abbr`),
        proficiency,
        proficiencyClass: `kedom-skill--${proficiency}`,
        allowsSpecialization: kind !== "none",
        isFree: kind === "free",
        isFixed: kind === "fixed",
        specializations: skill.specializations.map((s) => ({
          ...s,
          skillKey: key,
        })),
        availableFixed,
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

  static async #onRollSpecialization(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const skillKey = target.dataset.skillKey;
    const specializationSlug = target.dataset.specializationSlug;
    if (!skillKey || !specializationSlug || !this.actor) return;
    await rollSkillCheck(this.actor, skillKey, { specializationSlug });
  }

  static async #onAddSpecialization(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const skillKey = target.dataset.skillKey as SkillKey | undefined;
    if (!skillKey || !this.actor) return;
    const kind = SKILL_SPECIALIZATION_KIND[skillKey];
    if (kind === "none") return;

    if (kind === "fixed") {
      const root = target.closest(".kedom-skill");
      const select = root?.querySelector("select.kedom-skill__fixed-select");
      const leaf =
        target.dataset.specializationLeaf ??
        (select instanceof HTMLSelectElement ? select.value : undefined);
      if (!leaf) return;
      const slug = specializationSlug(skillKey, leaf);
      const label = localizeSpecLabel(skillKey, leaf);
      await CharacterSheet.#appendSpecialization(this.actor, skillKey, slug, label);
      return;
    }

    const label = await CharacterSheet.#promptFreeLabel(skillKey);
    if (label === null) return;
    const slug = freeSpecializationSlug(skillKey, label);
    await CharacterSheet.#appendSpecialization(this.actor, skillKey, slug, label);
  }

  static async #onRemoveSpecialization(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const skillKey = target.dataset.skillKey as SkillKey | undefined;
    const slug = target.dataset.specializationSlug;
    if (!skillKey || !slug || !this.actor) return;
    const system = this.actor.system as CharacterData;
    const skill = (system.skills as Record<SkillKey, SkillFields>)[skillKey];
    if (!skill) return;
    const specializations = skill.specializations.filter((s) => s.slug !== slug);
    await this.actor.update({ [`system.skills.${skillKey}.specializations`]: specializations });
  }

  static async #appendSpecialization(
    actor: Actor.Implementation,
    skillKey: SkillKey,
    slug: string,
    label: string,
  ): Promise<void> {
    const system = actor.system as CharacterData;
    const skill = (system.skills as Record<SkillKey, SkillFields>)[skillKey];
    if (!skill) return;
    if (skill.specializations.some((s) => s.slug === slug)) return;
    await actor.update({
      [`system.skills.${skillKey}.specializations`]: [...skill.specializations, { slug, label }],
    });
  }

  static async #promptFreeLabel(skillKey: SkillKey): Promise<string | null> {
    const skillLabel = game.i18n.localize(`KEDOM.Skill.${skillKey}`);
    try {
      const result = await foundry.applications.api.DialogV2.prompt({
        window: {
          title: game.i18n.format("KEDOM.Sheet.Action.addSpecialization", { skill: skillLabel }),
        },
        content: `<p><label>${game.i18n.localize("KEDOM.Sheet.SpecializationLabel")}
          <input type="text" name="label" autofocus /></label></p>`,
        ok: {
          label: game.i18n.localize("KEDOM.Sheet.Action.create"),
          callback: (_event, button) => {
            const form = button.form;
            if (!form) return "";
            const data = new FormData(form);
            return String(data.get("label") ?? "").trim();
          },
        },
      });
      if (typeof result !== "string" || result === "") return null;
      return result;
    } catch {
      return null;
    }
  }
}
