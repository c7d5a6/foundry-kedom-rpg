import {
  ABILITY_KEYS,
  PROFICIENCY_SPECIALIZATION_SLOTS,
  PROFICIENCY_TIERS,
  SKILL_ABILITY,
  SKILL_KEYS,
  type ProficiencyTier,
  type SkillKey,
} from "../../config/kedom.ts";
import {
  SKILL_FIXED_SPECIALIZATIONS,
  SKILL_FREE_PARAMETER,
  SKILL_SPECIALIZATION_KIND,
  allowsFreeSpecialization,
  freeParameterSpecializationSlug,
  freeSpecializationSlug,
  hasFixedSpecializationCatalog,
  specializationSlug,
} from "../../config/specializations.ts";
import type {
  CharacterData,
  SkillFields,
  SkillSpecialization,
} from "../../data/actor/character.ts";
import { formatSignedBonus } from "../../rolls/build-skill-check.ts";
import { prepareSkillCheck, rollSkillCheck } from "../../rolls/skill-check.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

type AbilityView = { value: number; mod?: number };

const SHEET_MODES = Object.freeze({ PLAY: "play", EDIT: "edit" } as const);
type SheetMode = (typeof SHEET_MODES)[keyof typeof SHEET_MODES];

function localizeSpecLabel(skillKey: SkillKey, leaf: string): string {
  const path = `KEDOM.Specialization.${skillKey}.${leaf}`;
  const v = game.i18n.localize(path);
  return !v || v === path ? leaf : v;
}

function proficiencyLetterFromLabel(tier: ProficiencyTier): string {
  const label = game.i18n.localize(`KEDOM.Proficiency.${tier}`);
  const first = Array.from(label)[0] ?? "";
  return first.toLocaleUpperCase(game.i18n.lang);
}

function isSpecializationSelected(spec: SkillSpecialization): boolean {
  return spec.selected !== false;
}

function countSelectedSpecializations(skill: SkillFields): number {
  return skill.specializations.filter(isSpecializationSelected).length;
}

function specializationSlots(proficiency: string): number {
  return PROFICIENCY_SPECIALIZATION_SLOTS[proficiency as ProficiencyTier] ?? 0;
}

// @ts-expect-error fvtt-types: HandlebarsApplicationMixin(ActorSheetV2) hits excessive stack depth
export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static MODES = SHEET_MODES;

  /** Play vs edit — instance UI state, not persisted on the actor. */
  #mode: SheetMode = SHEET_MODES.PLAY;

  get isPlayMode(): boolean {
    return this.#mode === SHEET_MODES.PLAY;
  }

  get isEditMode(): boolean {
    return this.#mode === SHEET_MODES.EDIT;
  }

  static override DEFAULT_OPTIONS = {
    ...ActorSheetV2.DEFAULT_OPTIONS,
    classes: ["kedom", "sheet", "actor", "character"],
    position: { width: 720, height: 720 },
    window: {
      ...ActorSheetV2.DEFAULT_OPTIONS.window,
      resizable: true,
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      toggleMode: CharacterSheet.#onToggleMode,
      rollSkill: CharacterSheet.#onRollSkill,
      rollSpecialization: CharacterSheet.#onRollSpecialization,
      toggleSpecialization: CharacterSheet.#onToggleSpecialization,
      addSpecialization: CharacterSheet.#onAddSpecialization,
      removeSpecialization: CharacterSheet.#onRemoveSpecialization,
    },
  };

  static override PARTS = {
    body: {
      template: "systems/kedom/templates/actor/character.hbs",
      classes: ["scrollable", "kedom-sheet-body"],
      scrollable: [""],
    },
  };

  protected override _configureRenderOptions(
    options: foundry.applications.api.ApplicationV2.RenderOptions & { mode?: SheetMode },
  ): void {
    super._configureRenderOptions(options);
    if (options.mode && this.isEditable) this.#mode = options.mode;
  }

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
      const proficiency = skill.proficiency as ProficiencyTier;
      const kind = SKILL_SPECIALIZATION_KIND[key];
      const ownedBySlug = new Map(skill.specializations.map((s) => [s.slug, s]));
      const fixedLeaves = SKILL_FIXED_SPECIALIZATIONS[key] ?? [];
      const slots = specializationSlots(proficiency);
      const selectedCount = countSelectedSpecializations(skill);
      const overLimit = selectedCount > slots;
      const canSelectMore = selectedCount < slots;

      const skillCheck = this.actor ? prepareSkillCheck(this.actor, key) : null;
      const bonusSigned = skillCheck !== null ? formatSignedBonus(skillCheck.bonus) : "+0";

      type SpecTag = {
        slug: string;
        leaf?: string;
        label: string;
        skillKey: SkillKey;
        selected: boolean;
        isFree: boolean;
        bonusSigned: string | null;
        canSelect: boolean;
      };

      let specializationTags: SpecTag[] = [];
      if (hasFixedSpecializationCatalog(kind)) {
        specializationTags = fixedLeaves.map((leaf) => {
          const slug = specializationSlug(key, leaf);
          const owned = ownedBySlug.get(slug);
          const selected = owned !== undefined && isSpecializationSelected(owned);
          const specCheck =
            selected && this.actor
              ? prepareSkillCheck(this.actor, key, { specializationSlug: slug })
              : null;
          return {
            slug,
            leaf,
            label: localizeSpecLabel(key, leaf),
            skillKey: key,
            selected,
            isFree: false,
            bonusSigned: specCheck !== null ? formatSignedBonus(specCheck.bonus) : null,
            canSelect: selected || canSelectMore,
          };
        });
      }
      if (allowsFreeSpecialization(kind)) {
        const fixedSlugs = new Set(specializationTags.map((t) => t.slug));
        for (const s of skill.specializations) {
          if (fixedSlugs.has(s.slug)) continue;
          const selected = isSpecializationSelected(s);
          const specCheck =
            selected && this.actor
              ? prepareSkillCheck(this.actor, key, { specializationSlug: s.slug })
              : null;
          specializationTags.push({
            slug: s.slug,
            label: s.label,
            skillKey: key,
            selected,
            isFree: true,
            bonusSigned: specCheck !== null ? formatSignedBonus(specCheck.bonus) : null,
            canSelect: selected || canSelectMore,
          });
        }
      }

      specializationTags.sort((a, b) => {
        if (a.selected !== b.selected) return a.selected ? -1 : 1;
        return a.label.localeCompare(b.label, game.i18n.lang);
      });
      const lastSelectedIndex = specializationTags.findLastIndex((t) => t.selected);
      const tagsWithMod = specializationTags.map((tag, index) => ({
        ...tag,
        showMod: index === lastSelectedIndex,
      }));

      return {
        key,
        label: game.i18n.localize(`KEDOM.Skill.${key}`),
        abilityKey,
        abilityAbbr: game.i18n.localize(`KEDOM.Ability.${abilityKey}.abbr`),
        proficiency,
        proficiencyLetter: proficiencyLetterFromLabel(proficiency),
        proficiencyLabel: game.i18n.localize(`KEDOM.Proficiency.${proficiency}`),
        proficiencyClass: `kedom-skill--${proficiency}`,
        bonusSigned,
        allowsSpecialization: kind !== "none",
        allowsFreeAdd: allowsFreeSpecialization(kind),
        isFree: kind === "free",
        isFixed: kind === "fixed",
        isParameterized: kind === "parameterized",
        specializationTags: tagsWithMod,
        specializationSlots: slots,
        specializationSelectedCount: selectedCount,
        specializationOverLimit: overLimit,
        specializationOverLimitMessage: overLimit
          ? game.i18n.format("KEDOM.Sheet.SpecializationOverLimit", {
              selected: String(selectedCount),
              slots: String(slots),
            })
          : null,
        proficiencyOptions: PROFICIENCY_TIERS.map((value) => {
          const label = game.i18n.localize(`KEDOM.Proficiency.${value}`);
          return {
            value,
            label,
            letter: proficiencyLetterFromLabel(value),
            selected: value === proficiency,
            rankClass: `kedom-skill--${value}`,
          };
        }),
      };
    });

    return Object.assign(context, {
      actor: this.actor,
      system,
      abilities,
      skills,
      isPlay: this.isPlayMode,
      isEdit: this.isEditMode,
    });
  }

  protected override async _onRender(
    context: object,
    options: foundry.applications.api.ApplicationV2.RenderOptions,
  ): Promise<void> {
    await super._onRender(context, options);
    this.element.classList.toggle("mode-play", this.isPlayMode);
    this.element.classList.toggle("mode-edit", this.isEditMode);
    this.#renderModeToggle();
  }

  /** dnd5e-style play/edit slider in the sheet window header. */
  #renderModeToggle(): void {
    const header = this.element.querySelector(".window-header");
    if (!(header instanceof HTMLElement)) return;

    let toggle = header.querySelector<HTMLButtonElement>(".kedom-mode-slider");
    if (!this.isEditable) {
      toggle?.remove();
      return;
    }

    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "kedom-mode-slider";
      toggle.dataset.action = "toggleMode";
      toggle.innerHTML =
        '<span class="kedom-mode-slider__track" aria-hidden="true">' +
        '<span class="kedom-mode-slider__thumb"><i class="fa-solid fa-wrench"></i></span>' +
        "</span>";
      toggle.addEventListener("dblclick", (event) => event.stopPropagation());
      toggle.addEventListener("pointerdown", (event) => event.stopPropagation());
      header.prepend(toggle);
    }

    const hint = game.i18n.localize("KEDOM.Sheet.Mode.toggleHint");
    toggle.title = hint;
    toggle.setAttribute("aria-label", hint);
    toggle.setAttribute("aria-pressed", this.isEditMode ? "true" : "false");
    toggle.classList.toggle("is-edit", this.isEditMode);
  }

  /**
   * Actor.name is required and blank:false — an empty string cleans to undefined and
   * blows up submitOnChange. Never send a blank name wipe from incidental form submits.
   */
  protected override _processFormData(
    event: SubmitEvent | null,
    form: HTMLFormElement,
    formData: FormDataExtended,
  ) {
    const data = super._processFormData(event, form, formData) as Record<string, unknown>;
    if (typeof data.name !== "string" || data.name.trim() === "") {
      delete data.name;
    }
    return data;
  }

  static async #onToggleMode(this: CharacterSheet): Promise<void> {
    if (!this.isEditable) return;
    await this.render({
      mode: this.isPlayMode ? SHEET_MODES.EDIT : SHEET_MODES.PLAY,
    } as foundry.applications.api.ApplicationV2.RenderOptions);
  }

  static async #onRollSkill(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (this.isEditMode) return;
    const skillKey = target.dataset.skillKey;
    if (!skillKey || !this.actor) return;
    await rollSkillCheck(this.actor, skillKey);
  }

  static async #onRollSpecialization(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (this.isEditMode) return;
    const skillKey = target.dataset.skillKey;
    const specializationSlug = target.dataset.specializationSlug;
    if (!skillKey || !specializationSlug || !this.actor) return;
    await rollSkillCheck(this.actor, skillKey, { specializationSlug });
  }

  static async #onToggleSpecialization(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.isEditMode || !this.actor) return;
    const skillKey = target.dataset.skillKey as SkillKey | undefined;
    const slug = target.dataset.specializationSlug;
    if (!skillKey || !slug) return;

    const system = this.actor.system as CharacterData;
    const skill = (system.skills as Record<SkillKey, SkillFields>)[skillKey];
    if (!skill) return;

    const kind = SKILL_SPECIALIZATION_KIND[skillKey];
    const isFreeForm = target.dataset.free === "1";
    const existing = skill.specializations.find((s) => s.slug === slug);
    const currentlySelected = existing !== undefined && isSpecializationSelected(existing);

    if (currentlySelected) {
      if (kind === "fixed" || (kind === "parameterized" && !isFreeForm)) {
        await this.actor.update({
          [`system.skills.${skillKey}.specializations`]: skill.specializations.filter(
            (s) => s.slug !== slug,
          ),
        });
        return;
      }
      const specializations = skill.specializations.map((s) =>
        s.slug === slug ? { ...s, selected: false } : s,
      );
      await this.actor.update({ [`system.skills.${skillKey}.specializations`]: specializations });
      return;
    }

    const slots = specializationSlots(skill.proficiency);
    if (countSelectedSpecializations(skill) >= slots) {
      ui.notifications.warn(
        game.i18n.format("KEDOM.Sheet.SpecializationSelectBlocked", {
          slots: String(slots),
          proficiency: game.i18n.localize(`KEDOM.Proficiency.${skill.proficiency}`),
        }),
      );
      return;
    }

    if (kind === "fixed" || (kind === "parameterized" && !isFreeForm)) {
      const leaf = target.dataset.specializationLeaf;
      if (!leaf) return;
      const label = localizeSpecLabel(skillKey, leaf);
      await CharacterSheet.#appendSpecialization(this.actor, skillKey, slug, label, true);
      return;
    }

    if (!existing) return;
    const specializations = skill.specializations.map((s) =>
      s.slug === slug ? { ...s, selected: true } : s,
    );
    await this.actor.update({ [`system.skills.${skillKey}.specializations`]: specializations });
  }

  static async #onAddSpecialization(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const skillKey = target.dataset.skillKey as SkillKey | undefined;
    if (!skillKey || !this.actor || !this.isEditMode) return;
    const kind = SKILL_SPECIALIZATION_KIND[skillKey];
    if (!allowsFreeSpecialization(kind)) return;

    const label = await CharacterSheet.#promptFreeLabel(skillKey);
    if (label === null) return;
    const parameter = SKILL_FREE_PARAMETER[skillKey];
    const slug =
      parameter !== undefined
        ? freeParameterSpecializationSlug(skillKey, parameter, label)
        : freeSpecializationSlug(skillKey, label);
    const system = this.actor.system as CharacterData;
    const skill = (system.skills as Record<SkillKey, SkillFields>)[skillKey];
    if (!skill) return;
    if (skill.specializations.some((s) => s.slug === slug)) return;

    const slots = specializationSlots(skill.proficiency);
    const selected = countSelectedSpecializations(skill) < slots;
    await CharacterSheet.#appendSpecialization(this.actor, skillKey, slug, label, selected);
  }

  static async #onRemoveSpecialization(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const skillKey = target.dataset.skillKey as SkillKey | undefined;
    const slug = target.dataset.specializationSlug;
    if (!skillKey || !slug || !this.actor) return;
    if (!allowsFreeSpecialization(SKILL_SPECIALIZATION_KIND[skillKey])) return;
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
    selected: boolean,
  ): Promise<void> {
    const system = actor.system as CharacterData;
    const skill = (system.skills as Record<SkillKey, SkillFields>)[skillKey];
    if (!skill) return;
    if (skill.specializations.some((s) => s.slug === slug)) return;
    await actor.update({
      [`system.skills.${skillKey}.specializations`]: [
        ...skill.specializations,
        { slug, label, selected },
      ],
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
