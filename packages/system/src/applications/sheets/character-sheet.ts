import {
  ABILITY_KEYS,
  LUCK_SCORE_MAX,
  LUCK_SCORE_MIN,
  PROFICIENCY_SPECIALIZATION_SLOTS,
  PROFICIENCY_TIERS,
  SAVE_ABILITY,
  SAVE_KEYS,
  SKILL_ABILITY,
  SKILL_KEYS,
  type ProficiencyTier,
  type SaveKey,
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
import { localizePersistedSpecLabel } from "../../config/creation-spec-labels.ts";
import { localizeContentDescription, localizeContentLabel } from "../../i18n/content-labels.ts";
import type {
  CharacterData,
  SaveFields,
  SkillFields,
  SkillSpecialization,
} from "../../data/actor/character.ts";
import { formatSignedBonus } from "../../rolls/build-skill-check.ts";
import { rollAttack } from "../../rolls/attack-roll.ts";
import { rollDamage } from "../../rolls/damage-roll.ts";
import { rollLuckSave } from "../../rolls/luck-save.ts";
import { rollSaveCheck } from "../../rolls/save-check.ts";
import { prepareSkillCheck, rollSkillCheck } from "../../rolls/skill-check.ts";
import { rollStrainSave } from "../../rolls/strain-save.ts";
import { previewWeaponRollBonuses } from "../../rolls/attack-roll.ts";
import { previewWoundLuckBonus, takeWound } from "../../rolls/wound-roll.ts";
import { type ArmorDataFields } from "../../data/item/armor.ts";
import { normalizeWeaponSkill, type WeaponDataFields } from "../../data/item/weapon.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

type AbilityView = { value: number; mod?: number };

const SHEET_MODES = Object.freeze({ PLAY: "play", EDIT: "edit" } as const);
type SheetMode = (typeof SHEET_MODES)[keyof typeof SHEET_MODES];

const SHEET_TABS = Object.freeze({
  SKILLS: "skills",
  COMBAT: "combat",
  TALENTS: "talents",
  NOTES: "notes",
  EFFECTS: "effects",
} as const);
type SheetTab = (typeof SHEET_TABS)[keyof typeof SHEET_TABS];

function isSheetTab(value: string | undefined): value is SheetTab {
  return (
    value === SHEET_TABS.SKILLS ||
    value === SHEET_TABS.COMBAT ||
    value === SHEET_TABS.TALENTS ||
    value === SHEET_TABS.NOTES ||
    value === SHEET_TABS.EFFECTS
  );
}

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

  /** Primary sheet tab — instance UI state. */
  #primaryTab: SheetTab = SHEET_TABS.SKILLS;

  get isPlayMode(): boolean {
    return this.#mode === SHEET_MODES.PLAY;
  }

  get isEditMode(): boolean {
    return this.#mode === SHEET_MODES.EDIT;
  }

  static override DEFAULT_OPTIONS = {
    ...ActorSheetV2.DEFAULT_OPTIONS,
    classes: ["kedom", "sheet", "actor", "character", "vertical-tabs"],
    position: { width: 800, height: 740 },
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
      changeSheetTab: CharacterSheet.#onChangeSheetTab,
      rollSkill: CharacterSheet.#onRollSkill,
      rollSave: CharacterSheet.#onRollSave,
      rollLuckSave: CharacterSheet.#onRollLuckSave,
      rollStrainSave: CharacterSheet.#onRollStrainSave,
      takeWound: CharacterSheet.#onTakeWound,
      rollAttack: CharacterSheet.#onRollAttack,
      rollDamage: CharacterSheet.#onRollDamage,
      editWeapon: CharacterSheet.#onEditWeapon,
      deleteWeapon: CharacterSheet.#onDeleteWeapon,
      editArmor: CharacterSheet.#onEditArmor,
      deleteArmor: CharacterSheet.#onDeleteArmor,
      createTalent: CharacterSheet.#onCreateTalent,
      editTalent: CharacterSheet.#onEditTalent,
      deleteTalent: CharacterSheet.#onDeleteTalent,
      createActorEffect: CharacterSheet.#onCreateActorEffect,
      editEffect: CharacterSheet.#onEditEffect,
      deleteEffect: CharacterSheet.#onDeleteEffect,
      toggleEffect: CharacterSheet.#onToggleEffect,
      openEffectSource: CharacterSheet.#onOpenEffectSource,
      openIdentityItem: CharacterSheet.#onOpenIdentityItem,
      editResource: CharacterSheet.#onEditResource,
      rollSpecialization: CharacterSheet.#onRollSpecialization,
      toggleSpecialization: CharacterSheet.#onToggleSpecialization,
      addSpecialization: CharacterSheet.#onAddSpecialization,
      removeSpecialization: CharacterSheet.#onRemoveSpecialization,
    },
  };

  static override PARTS = {
    tabs: {
      template: "systems/kedom/templates/actor/character-tabs.hbs",
      classes: ["kedom-sheet-tabs-part", "tabs-right"],
    },
    header: {
      template: "systems/kedom/templates/actor/character-header.hbs",
      classes: ["kedom-sheet-header-part"],
    },
    body: {
      template: "systems/kedom/templates/actor/character.hbs",
      classes: ["kedom-sheet-body"],
    },
  };

  protected override _configureRenderOptions(
    options: foundry.applications.api.ApplicationV2.RenderOptions & { mode?: SheetMode },
  ): void {
    super._configureRenderOptions(options);
    if (options.mode && this.isEditable) this.#mode = options.mode;
  }

  /**
   * Clamp sheet position so external tab strip (dnd5e-style overhang) stays on-screen.
   * Without this, overflow:visible + outside tabs can shove other UI (chat) around.
   */
  protected override _updatePosition(
    position: foundry.applications.api.ApplicationV2.Position,
  ): foundry.applications.api.ApplicationV2.Position {
    const pos = super._updatePosition(position);
    const rightOverhang =
      this.element?.querySelector<HTMLElement>(".kedom-sheet-tabs-part.tabs-right")?.offsetWidth ??
      0;
    if (!rightOverhang) return pos;
    const { clientWidth } = this.element.ownerDocument.documentElement;
    const sheetWidth = typeof pos.width === "number" ? pos.width : (this.element?.offsetWidth ?? 0);
    pos.left = Math.clamp(pos.left ?? 0, 0, Math.max(clientWidth - sheetWidth - rightOverhang, 0));
    if (typeof pos.width === "number") {
      pos.width = Math.min(pos.width, Math.max(clientWidth - (pos.left ?? 0) - rightOverhang, 0));
    }
    return pos;
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
        min: key === "lck" ? LUCK_SCORE_MIN : 3,
        max: key === "lck" ? LUCK_SCORE_MAX : 18,
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
      const baseDice = Math.max(1, Math.floor(skill.baseDice ?? 2));
      const defaultAdvantage = Math.floor(skill.defaultAdvantage ?? 0);
      const hasNonDefaultRoll = baseDice !== 2 || defaultAdvantage !== 0;
      const rollHintParts: string[] = [];
      if (baseDice !== 2) {
        rollHintParts.push(
          game.i18n.format("KEDOM.Sheet.SkillBaseDiceHint", { dice: String(baseDice) }),
        );
      }
      if (defaultAdvantage > 0) {
        rollHintParts.push(game.i18n.localize("KEDOM.Sheet.SkillAdvHint"));
      } else if (defaultAdvantage < 0) {
        rollHintParts.push(game.i18n.localize("KEDOM.Sheet.SkillDisadvHint"));
      }
      const rollHint = rollHintParts.join(" ");

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
            label: localizePersistedSpecLabel(key, s.slug, s.label),
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
        baseDice,
        defaultAdvantage,
        hasNonDefaultRoll,
        rollHint,
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
    }).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

    const attrs = system.attributes as {
      hp: { value: number; max: number };
      strain: { value: number };
      wounds: { value: number; notes?: string };
      strainLimit?: number;
      resolve?: number;
      wounded?: boolean;
    };
    const hpMax = attrs.hp.max ?? 0;
    const hpValue = attrs.hp.value ?? 0;
    const strainLimit = attrs.strainLimit ?? 0;
    const strainValue = attrs.strain.value ?? 0;
    const hpPct = hpMax > 0 ? Math.min(100, Math.round((hpValue / hpMax) * 100)) : 0;
    const woundValue = attrs.wounds.value ?? 0;
    const resources = {
      hp: {
        value: hpValue,
        max: hpMax,
        pct: hpPct,
      },
      strain: {
        value: strainValue,
        limit: strainLimit,
        pct: strainLimit > 0 ? Math.min(100, Math.round((strainValue / strainLimit) * 100)) : 0,
      },
      wounds: {
        value: woundValue,
      },
      wounded: attrs.wounded ?? woundValue >= 1,
      resolve: attrs.resolve ?? 0,
    };

    const combatData = system.combat as {
      ac: number;
    };
    const combat = {
      ac: combatData.ac ?? 0,
      woundLuckSigned: formatSignedBonus(previewWoundLuckBonus(this.actor)),
    };

    const weapons = this.actor.items
      .filter((item) => (item.type as string) === "weapon")
      .map((item) => {
        const wsys = item.system as unknown as WeaponDataFields;
        const skill = normalizeWeaponSkill(wsys.skill);
        const preview = previewWeaponRollBonuses(this.actor, item);
        const attackTotal = preview?.attackBonus ?? Math.floor(wsys.attackBonus ?? 0);
        const damageTotal = preview?.damageBonus ?? 0;
        return {
          id: item.id,
          name: item.name,
          skill,
          skillLabel: game.i18n.localize(`KEDOM.Skill.${skill}`),
          damageFormula: wsys.damageFormula || "1d6",
          attackTotalSigned: formatSignedBonus(attackTotal),
          damageTotalSigned: formatSignedBonus(damageTotal),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

    const armor = this.actor.items
      .filter((item) => (item.type as string) === "armor")
      .map((item) => {
        const asys = item.system as unknown as ArmorDataFields;
        const woundBonus = Math.floor(asys.woundBonus ?? 0);
        return {
          id: item.id,
          name: item.name,
          woundBonus,
          woundBonusSigned: woundBonus !== 0 ? formatSignedBonus(woundBonus) : "",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

    const savesData = system.saves as Record<SaveKey | "luck", SaveFields>;
    const saveView = (
      key: SaveKey | "luck",
      abilityKey: (typeof SAVE_ABILITY)[SaveKey] | "lck",
    ) => {
      const save = savesData[key]!;
      const proficiency = save.proficiency as ProficiencyTier;
      const mod = save.mod ?? 0;
      return {
        key,
        label: game.i18n.localize(`KEDOM.Save.${key}`),
        abilityKey,
        abilityAbbr: game.i18n.localize(`KEDOM.Ability.${abilityKey}.abbr`),
        proficiency,
        proficiencyLetter: proficiencyLetterFromLabel(proficiency),
        proficiencyLabel: game.i18n.localize(`KEDOM.Proficiency.${proficiency}`),
        proficiencyClass: `kedom-skill--${proficiency}`,
        bonusSigned: formatSignedBonus(mod),
        rollAction: key === "luck" ? "rollLuckSave" : "rollSave",
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
    };
    const saves = SAVE_KEYS.map((key) => saveView(key, SAVE_ABILITY[key]));
    const luckSave = saveView("luck", "lck");

    const enrichedWoundsNotes = await TextEditor.enrichHTML(attrs.wounds.notes ?? "", {
      secrets: this.actor.isOwner,
      relativeTo: this.actor,
    });

    const detailsRaw =
      (
        system as CharacterData & {
          details?: {
            level?: number;
            culture?: string;
            background?: string;
            class?: string;
            notes?: string;
          };
        }
      ).details ?? {};

    const enrichedNotes = await TextEditor.enrichHTML(detailsRaw.notes ?? "", {
      secrets: this.actor.isOwner,
      relativeTo: this.actor,
    });

    const tabs = [
      {
        id: SHEET_TABS.SKILLS,
        label: game.i18n.localize("KEDOM.Sheet.Tab.skills"),
        icon: "fa-solid fa-book",
        active: this.#primaryTab === SHEET_TABS.SKILLS,
      },
      {
        id: SHEET_TABS.COMBAT,
        label: game.i18n.localize("KEDOM.Sheet.Tab.combat"),
        icon: "fa-solid fa-shield-halved",
        active: this.#primaryTab === SHEET_TABS.COMBAT,
      },
      {
        id: SHEET_TABS.TALENTS,
        label: game.i18n.localize("KEDOM.Sheet.Tab.talents"),
        icon: "fa-solid fa-star",
        active: this.#primaryTab === SHEET_TABS.TALENTS,
      },
      {
        id: SHEET_TABS.NOTES,
        label: game.i18n.localize("KEDOM.Sheet.Tab.notes"),
        icon: "fa-solid fa-scroll",
        active: this.#primaryTab === SHEET_TABS.NOTES,
      },
      {
        id: SHEET_TABS.EFFECTS,
        label: game.i18n.localize("KEDOM.Sheet.Tab.effects"),
        icon: "fa-solid fa-bolt",
        active: this.#primaryTab === SHEET_TABS.EFFECTS,
      },
    ];

    const level = Math.max(1, Math.floor(detailsRaw.level ?? 1));
    const culture = (detailsRaw.culture ?? "").trim();
    const background = (detailsRaw.background ?? "").trim();
    const className = (detailsRaw.class ?? "").trim();
    const regionSlug = (detailsRaw.region ?? "").trim();

    const originItems = this.actor.items.filter((item) => (item.type as string) === "origin");
    const findOrigin = (subType: string, label: string, slugHint = "") => {
      const bySlug = slugHint
        ? originItems.find((item) => {
            const sys = item.system as unknown as { subType?: string; slug?: string };
            return sys.subType === subType && (sys.slug ?? "") === slugHint;
          })
        : undefined;
      if (bySlug) return bySlug;
      return originItems.find((item) => {
        const sys = item.system as unknown as { subType?: string };
        if (sys.subType !== subType) return false;
        if (!label) return true;
        return item.name === label;
      });
    };

    const identityTip = async (
      kind: "Region" | "Culture" | "Background" | "Class",
      displayLabel: string,
      item: Item.Implementation | undefined,
      slugHint = "",
    ): Promise<{ label: string; tooltipHtml: string; itemId: string | null } | null> => {
      if (!displayLabel && !slugHint) return null;
      const sys = item?.system as unknown as { slug?: string; description?: string } | undefined;
      const slug = (slugHint || sys?.slug || "").trim();
      const label = slug
        ? localizeContentLabel(kind, slug, displayLabel || item?.name || slug)
        : displayLabel;
      if (!label) return null;
      const itemId = item?.id ?? null;
      const packDesc = sys?.description ?? "";
      const raw = slug ? localizeContentDescription(kind, slug, packDesc) : packDesc;
      const plain = raw.replace(/<[^>]*>/g, "").trim();
      if (!plain) return { label, tooltipHtml: "", itemId };
      const tooltipHtml = await TextEditor.enrichHTML(raw, {
        secrets: this.actor.isOwner,
        relativeTo: item,
      });
      return { label, tooltipHtml, itemId };
    };

    const regionItem = findOrigin("region", "", regionSlug);
    const raceItem = findOrigin("race", culture);
    const backgroundItem = findOrigin("background", background);
    const classItem = findOrigin("class", className);
    const raceSlug = (
      (raceItem?.system as unknown as { slug?: string } | undefined)?.slug ?? ""
    ).trim();
    const backgroundSlug = (
      (backgroundItem?.system as unknown as { slug?: string } | undefined)?.slug ?? ""
    ).trim();
    const classSlug = (
      (classItem?.system as unknown as { slug?: string } | undefined)?.slug ?? ""
    ).trim();
    const identityParts = (
      await Promise.all([
        identityTip("Region", regionItem?.name ?? regionSlug, regionItem, regionSlug),
        identityTip("Culture", culture, raceItem, raceSlug),
        identityTip("Background", background, backgroundItem, backgroundSlug),
        identityTip("Class", className, classItem, classSlug),
      ])
    ).filter((p): p is { label: string; tooltipHtml: string; itemId: string | null } => p !== null);

    const regionSys = regionItem?.system as unknown as { bannerImg?: string } | undefined;
    const sheetBannerImg = (regionSys?.bannerImg ?? "").trim();

    const talentItems = this.actor.items
      .filter((item) => (item.type as string) === "talent")
      .sort((a, b) => a.name.localeCompare(b.name));
    const talents = await Promise.all(
      talentItems.map(async (item) => {
        const system = item.system as unknown as { description?: string };
        const enrichedDescription = await TextEditor.enrichHTML(system.description ?? "", {
          secrets: this.actor.isOwner,
          relativeTo: item,
        });
        return {
          id: item.id,
          name: item.name,
          img: item.img,
          enrichedDescription,
          hasDescription: Boolean((system.description ?? "").replace(/<[^>]*>/g, "").trim()),
        };
      }),
    );

    const actorEffects: {
      id: string;
      name: string;
      img: string;
      disabled: boolean;
      sourceName: string;
      parentIsActor: boolean;
      parentItemId: string | null;
    }[] = [];
    const itemEffects: typeof actorEffects = [];
    for (const effect of this.actor.allApplicableEffects()) {
      const parent = effect.parent;
      const parentIsActor = parent === this.actor;
      const parentItem =
        !parentIsActor && parent && "documentName" in parent && parent.documentName === "Item"
          ? (parent as Item.Implementation)
          : null;
      const row = {
        id: effect.id ?? "",
        name: effect.name,
        img: effect.img || "icons/svg/aura.svg",
        disabled: effect.disabled,
        sourceName: parentItem?.name ?? (effect as { sourceName?: string }).sourceName ?? "",
        parentIsActor,
        parentItemId: parentItem?.id ?? null,
      };
      if (!row.id) continue;
      if (parentIsActor) actorEffects.push(row);
      else itemEffects.push(row);
    }
    const byDisabledThenName = (
      a: (typeof actorEffects)[number],
      b: (typeof actorEffects)[number],
    ) => Number(a.disabled) - Number(b.disabled) || a.name.localeCompare(b.name);
    actorEffects.sort(byDisabledThenName);
    itemEffects.sort(byDisabledThenName);

    return Object.assign(context, {
      actor: this.actor,
      system,
      systemFields: this.actor.system.schema.fields,
      abilities,
      skills,
      saves,
      luckSave,
      resources,
      combat,
      weapons,
      armor,
      talents,
      actorEffects,
      itemEffects,
      level,
      identityParts,
      sheetBannerImg,
      tabs,
      primaryTab: this.#primaryTab,
      isSkillsTab: this.#primaryTab === SHEET_TABS.SKILLS,
      isCombatTab: this.#primaryTab === SHEET_TABS.COMBAT,
      isTalentsTab: this.#primaryTab === SHEET_TABS.TALENTS,
      isNotesTab: this.#primaryTab === SHEET_TABS.NOTES,
      isEffectsTab: this.#primaryTab === SHEET_TABS.EFFECTS,
      enrichedWoundsNotes,
      enrichedNotes,
      editable: this.isEditable,
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
    this.element.classList.toggle("tab-skills", this.#primaryTab === SHEET_TABS.SKILLS);
    this.element.classList.toggle("tab-combat", this.#primaryTab === SHEET_TABS.COMBAT);
    this.element.classList.toggle("tab-talents", this.#primaryTab === SHEET_TABS.TALENTS);
    this.element.classList.toggle("tab-notes", this.#primaryTab === SHEET_TABS.NOTES);
    this.element.classList.toggle("tab-effects", this.#primaryTab === SHEET_TABS.EFFECTS);
    this.#applySheetBanner(
      typeof (context as { sheetBannerImg?: unknown }).sheetBannerImg === "string"
        ? (context as { sheetBannerImg: string }).sheetBannerImg
        : "",
    );
    this.#placeExternalTabs();
    this.#renderModeToggle();
    this.#bindMeterEditors();
  }

  /** Region `bannerImg` overrides the default CSS banner; empty keeps the fallback art. */
  #applySheetBanner(bannerImg: string): void {
    const trimmed = bannerImg.trim();
    if (trimmed) {
      const escaped = trimmed.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
      this.element.style.setProperty("--kedom-sheet-banner-image", `url("${escaped}")`);
    } else {
      this.element.style.removeProperty("--kedom-sheet-banner-image");
    }
  }

  /** Move tab strip outside `.window-content` (dnd5e-style external nav). */
  #placeExternalTabs(): void {
    const tabs = this.element.querySelector(".kedom-sheet-tabs-part");
    if (!(tabs instanceof HTMLElement)) return;
    if (tabs.parentElement === this.element) return;
    this.element.append(tabs);
  }

  #meterAbort: AbortController | null = null;

  /** Tidy-style: blur closes inline current-value editor on HP/Strain meters. */
  #bindMeterEditors(): void {
    this.#meterAbort?.abort();
    this.#meterAbort = new AbortController();
    const { signal } = this.#meterAbort;
    for (const input of this.element.querySelectorAll<HTMLInputElement>(
      ".kedom-meter__edit-value",
    )) {
      input.addEventListener(
        "blur",
        () => {
          input.closest(".kedom-meter")?.classList.remove("is-editing");
        },
        { signal },
      );
      input.addEventListener(
        "keydown",
        (ev) => {
          if (ev.key === "Enter" || ev.key === "Escape") {
            ev.preventDefault();
            input.blur();
          }
        },
        { signal },
      );
    }
  }

  /** Last play/edit thumb side — survives header remounts so both slide directions animate. */
  #modeToggleWasEdit: boolean | null = null;

  /** Tidy-style lock/feather play/edit toggle in the sheet window header. */
  #renderModeToggle(): void {
    const header = this.element.querySelector(".window-header");
    if (!(header instanceof HTMLElement)) return;

    let toggle = header.querySelector<HTMLButtonElement>(".kedom-mode-toggle");
    if (!this.isEditable) {
      toggle?.remove();
      this.#modeToggleWasEdit = null;
      return;
    }

    const wantEdit = this.isEditMode;
    let created = false;
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "kedom-mode-toggle header-control";
      toggle.dataset.action = "toggleMode";
      toggle.innerHTML =
        '<span class="kedom-mode-toggle__track" aria-hidden="true">' +
        '<span class="kedom-mode-toggle__thumb"><i class="fa-solid fa-lock"></i></span>' +
        "</span>";
      toggle.addEventListener("dblclick", (event) => event.stopPropagation());
      toggle.addEventListener("pointerdown", (event) => event.stopPropagation());
      // Remount: start at previous side so left can transition both directions.
      const startEdit = this.#modeToggleWasEdit ?? wantEdit;
      toggle.classList.toggle("is-edit", startEdit);
      header.prepend(toggle);
      created = true;
    }

    const hint = game.i18n.localize("KEDOM.Sheet.Mode.toggleHint");
    toggle.title = hint;
    toggle.setAttribute("aria-label", hint);
    toggle.setAttribute("aria-pressed", wantEdit ? "true" : "false");

    const icon = toggle.querySelector(".kedom-mode-toggle__thumb i");
    if (icon) {
      icon.className = wantEdit ? "fa-solid fa-feather" : "fa-solid fa-lock";
    }

    const applySide = (): void => {
      toggle?.classList.toggle("is-edit", wantEdit);
      this.#modeToggleWasEdit = wantEdit;
    };

    if (created && this.#modeToggleWasEdit !== null && this.#modeToggleWasEdit !== wantEdit) {
      requestAnimationFrame(() => {
        requestAnimationFrame(applySide);
      });
    } else {
      applySide();
    }
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

  static async #onChangeSheetTab(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const tab = target.dataset.tab;
    if (!isSheetTab(tab)) return;
    if (this.#primaryTab === tab) return;
    this.#primaryTab = tab;
    await this.render();
  }

  static async #onCreateTalent(this: CharacterSheet): Promise<void> {
    if (!this.isEditable || !this.actor) return;
    // @ts-expect-error fvtt-types: talent Item subtype
    const created = await this.actor.createEmbeddedDocuments("Item", [
      {
        name: game.i18n.localize("KEDOM.Talent.NewTalent"),
        type: "talent",
        img: "icons/svg/upgrade.svg",
        system: {
          description: "",
          grants: { skills: [], specializations: [], abilities: [] },
        },
      },
    ]);
    const item = Array.isArray(created) ? created[0] : created;
    if (item) await item.sheet?.render(true);
  }

  static async #onEditTalent(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.actor) return;
    const itemId = target.dataset.itemId;
    if (!itemId) return;
    const talent = this.actor.items.get(itemId);
    if (!talent || (talent.type as string) !== "talent") return;
    await talent.sheet?.render(true);
  }

  static async #onDeleteTalent(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.isEditable || !this.actor) return;
    const itemId = target.dataset.itemId;
    if (!itemId) return;
    const talent = this.actor.items.get(itemId);
    if (!talent || (talent.type as string) !== "talent") return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("KEDOM.Sheet.Action.deleteOwnedItem") },
      content: `<p>${game.i18n.format("KEDOM.Sheet.DeleteOwnedItemConfirm", {
        name: talent.name,
      })}</p>`,
    });
    if (!confirmed) return;
    await talent.delete();
  }

  static async #onCreateActorEffect(this: CharacterSheet): Promise<void> {
    if (!this.isEditable || !this.actor) return;
    const created = await this.actor.createEmbeddedDocuments("ActiveEffect", [
      {
        name: game.i18n.localize("KEDOM.Sheet.NewEffect"),
        img: "icons/svg/aura.svg",
        transfer: false,
        origin: this.actor.uuid,
        disabled: false,
        changes: [],
      },
    ]);
    const effect = Array.isArray(created) ? created[0] : created;
    if (effect) await effect.sheet?.render(true);
  }

  static #findApplicableEffect(
    this: CharacterSheet,
    effectId: string,
  ): ActiveEffect.Implementation | undefined {
    for (const effect of this.actor.allApplicableEffects()) {
      if (effect.id === effectId) return effect;
    }
    return undefined;
  }

  static async #onEditEffect(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const effectId = target.dataset.effectId;
    if (!effectId) return;
    const effect = CharacterSheet.#findApplicableEffect.call(this, effectId);
    if (!effect) return;
    const parent = effect.parent;
    if (parent && parent !== this.actor && "sheet" in parent) {
      await (parent as Item.Implementation).sheet?.render(true);
      return;
    }
    await effect.sheet?.render(true);
  }

  static async #onDeleteEffect(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.isEditable || !this.actor) return;
    const effectId = target.dataset.effectId;
    if (!effectId) return;
    const effect = this.actor.effects.get(effectId);
    if (!effect) {
      ui.notifications.warn(game.i18n.localize("KEDOM.Sheet.EffectDeleteFromItem"));
      return;
    }
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("KEDOM.Sheet.Action.deleteEffect") },
      content: `<p>${game.i18n.format("KEDOM.Sheet.DeleteEffectConfirm", {
        name: effect.name,
      })}</p>`,
    });
    if (!confirmed) return;
    await effect.delete();
  }

  static async #onToggleEffect(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.isEditable) return;
    const effectId = target.dataset.effectId;
    if (!effectId) return;
    const effect = CharacterSheet.#findApplicableEffect.call(this, effectId);
    if (!effect) return;
    await effect.update({ disabled: !effect.disabled });
  }

  static async #onOpenEffectSource(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const itemId = target.dataset.itemId;
    if (!itemId || !this.actor) return;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    await item.sheet?.render(true);
  }

  static async #onOpenIdentityItem(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const itemId = target.dataset.itemId;
    if (!itemId || !this.actor) return;
    const item = this.actor.items.get(itemId);
    if (!item || (item.type as string) !== "origin") return;
    await item.sheet?.render(true);
  }

  static async #onTakeWound(this: CharacterSheet): Promise<void> {
    if (this.isEditMode || !this.actor) return;
    await takeWound(this.actor);
  }

  static async #onRollAttack(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (this.isEditMode || !this.actor) return;
    const itemId = target.dataset.itemId;
    if (!itemId) return;
    const weapon = this.actor.items.get(itemId);
    if (!weapon || (weapon.type as string) !== "weapon") return;
    await rollAttack(this.actor, weapon);
  }

  static async #onRollDamage(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (this.isEditMode || !this.actor) return;
    const itemId = target.dataset.itemId;
    if (!itemId) return;
    const weapon = this.actor.items.get(itemId);
    if (!weapon || (weapon.type as string) !== "weapon") return;
    await rollDamage(this.actor, weapon);
  }

  static async #onEditWeapon(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.actor) return;
    const itemId = target.dataset.itemId;
    if (!itemId) return;
    const weapon = this.actor.items.get(itemId);
    if (!weapon || (weapon.type as string) !== "weapon") return;
    await weapon.sheet?.render(true);
  }

  static async #onDeleteWeapon(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.isEditable || !this.actor) return;
    const itemId = target.dataset.itemId;
    if (!itemId) return;
    const weapon = this.actor.items.get(itemId);
    if (!weapon || (weapon.type as string) !== "weapon") return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("KEDOM.Sheet.Action.deleteWeapon") },
      content: `<p>${game.i18n.format("KEDOM.Sheet.DeleteWeaponConfirm", {
        name: weapon.name,
      })}</p>`,
    });
    if (!confirmed) return;
    await weapon.delete();
  }

  static async #onEditArmor(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.actor) return;
    const itemId = target.dataset.itemId;
    if (!itemId) return;
    const armorItem = this.actor.items.get(itemId);
    if (!armorItem || (armorItem.type as string) !== "armor") return;
    await armorItem.sheet?.render(true);
  }

  static async #onDeleteArmor(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.isEditable || !this.actor) return;
    const itemId = target.dataset.itemId;
    if (!itemId) return;
    const armorItem = this.actor.items.get(itemId);
    if (!armorItem || (armorItem.type as string) !== "armor") return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("KEDOM.Sheet.Action.deleteArmor") },
      content: `<p>${game.i18n.format("KEDOM.Sheet.DeleteArmorConfirm", {
        name: armorItem.name,
      })}</p>`,
    });
    if (!confirmed) return;
    await armorItem.delete();
  }

  static async #onRollSkill(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (this.isEditMode) return;
    const skillKey = target.dataset.skillKey;
    if (!skillKey || !this.actor) return;
    await rollSkillCheck(this.actor, skillKey, {
      configure: event.ctrlKey || event.metaKey,
    });
  }

  static async #onRollSave(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (this.isEditMode) return;
    const saveKey = target.dataset.saveKey as SaveKey | undefined;
    if (!saveKey || !this.actor) return;
    await rollSaveCheck(this.actor, saveKey, {
      configure: event.ctrlKey || event.metaKey,
    });
  }

  static async #onRollLuckSave(this: CharacterSheet, event: PointerEvent): Promise<void> {
    if (this.isEditMode || !this.actor) return;
    await rollLuckSave(this.actor, {
      configure: event.ctrlKey || event.metaKey,
    });
  }

  static async #onRollStrainSave(this: CharacterSheet): Promise<void> {
    if (this.isEditMode || !this.actor) return;
    await rollStrainSave(this.actor);
  }

  static #onEditResource(this: CharacterSheet, event: PointerEvent, target: HTMLElement): void {
    if (!this.isEditable) return;
    if (event.target instanceof HTMLInputElement) return;
    const meter = target.closest(".kedom-meter") ?? target;
    if (!(meter instanceof HTMLElement) || !meter.classList.contains("kedom-meter")) return;
    const input = meter.querySelector<HTMLInputElement>(".kedom-meter__edit-value");
    if (!input) return;
    meter.classList.add("is-editing");
    input.focus();
    input.select();
  }

  static async #onRollSpecialization(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (this.isEditMode) return;
    const skillKey = target.dataset.skillKey;
    const specializationSlug = target.dataset.specializationSlug;
    if (!skillKey || !specializationSlug || !this.actor) return;
    await rollSkillCheck(this.actor, skillKey, {
      specializationSlug,
      configure: event.ctrlKey || event.metaKey,
    });
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
