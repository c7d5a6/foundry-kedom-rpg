import {
  ABILITY_KEYS,
  SKILL_KEYS,
  type SkillKey,
} from "../../config/kedom.ts";
import {
  CREATION_ABILITY_KEYS,
  CREATION_REPLACEABLE_ABILITY_KEYS,
  CULTURES_BY_REGION,
  REGIONS,
  getClass,
  getCulture,
  type CreationAbilityKey,
  type RegionKey,
} from "../../config/creation.ts";
import {
  backgroundsForRegion,
  getBackground,
} from "../../config/backgrounds-draft.ts";
import { localizeCreationSpecLabel } from "../../config/creation-spec-labels.ts";
import {
  SKILL_FIXED_SPECIALIZATIONS,
  SKILL_SPECIALIZATION_KIND,
  allowsFreeSpecialization,
  hasFixedSpecializationCatalog,
} from "../../config/specializations.ts";
import { postCreationRoll, postCreationRolls } from "../../creation/creation-rolls.ts";
import {
  COMBAT_SKILLS,
  MAX_SAME_SKILL,
  countSkill,
  formatGrantLabel,
  mergeSkillGrants,
  resolveConcreteEntry,
  resolveRolledEntry,
  skillNeedsSpecialization,
  type ResolvePick,
  type ResolvedSkillGrant,
} from "../../creation/resolve-background.ts";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const STEPS = [
  "abilities",
  "region",
  "culture",
  "background",
  "className",
  "confirm",
] as const;
type StepId = (typeof STEPS)[number];

type Draft = {
  stepIndex: number;
  name: string;
  abilitiesRolled: boolean;
  abilities: Record<CreationAbilityKey, number | null>;
  rolledAbilities: Record<CreationAbilityKey, number | null>;
  replacedAbility: Exclude<CreationAbilityKey, "lck"> | null;
  regionKey: RegionKey | null;
  cultureKey: string | null;
  backgroundKey: string | null;
  freeWild: ResolvePick;
  choiceIndex: number | null;
  choiceWild: ResolvePick;
  roll1: number | null;
  roll1Wild: ResolvePick;
  roll1OriginalLabel: string;
  roll2: number | null;
  roll2Wild: ResolvePick;
  roll2OriginalLabel: string;
  /** Extra free pick from any skill (after background table grants). */
  bonusFree: ResolvePick;
  classKey: string | null;
};

function emptyAbilities(): Record<CreationAbilityKey, number | null> {
  return { mgh: null, dex: null, kno: null, foc: null, pre: null, lck: null };
}

function emptyPick(): ResolvePick {
  return { skillKey: null, specLabel: null };
}

function localize(path: string, fallback?: string): string {
  const v = game.i18n.localize(path);
  if (!v || v === path) return fallback ?? path;
  return v;
}

function isCultureAvailable(regionKey: RegionKey, cultureKey: string): boolean {
  const c = getCulture(regionKey, cultureKey);
  return c?.available !== false;
}

export class CharacterCreateWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  #draft: Draft;
  #nameAbort: AbortController | null = null;

  constructor() {
    super();
    this.#draft = {
      stepIndex: 0,
      name: "",
      abilitiesRolled: false,
      abilities: emptyAbilities(),
      rolledAbilities: emptyAbilities(),
      replacedAbility: null,
      regionKey: null,
      cultureKey: null,
      backgroundKey: null,
      freeWild: emptyPick(),
      choiceIndex: null,
      choiceWild: emptyPick(),
      roll1: null,
      roll1Wild: emptyPick(),
      roll1OriginalLabel: "",
      roll2: null,
      roll2Wild: emptyPick(),
      roll2OriginalLabel: "",
      bonusFree: emptyPick(),
      classKey: null,
    };
  }

  static override DEFAULT_OPTIONS = {
    id: "kedom-character-create-wizard",
    classes: ["kedom", "kedom-create-wizard"],
    tag: "form",
    window: {
      title: "KEDOM.Creation.Wizard.Title",
      contentClasses: ["standard-form"],
      resizable: true,
    },
    position: { width: 580, height: 680 },
    form: {
      closeOnSubmit: false,
      submitOnChange: false,
    },
    actions: {
      next: CharacterCreateWizard.#onNext,
      back: CharacterCreateWizard.#onBack,
      rollAbilities: CharacterCreateWizard.#onRollAbilities,
      setFourteen: CharacterCreateWizard.#onSetFourteen,
      pickRegion: CharacterCreateWizard.#onPickRegion,
      pickCulture: CharacterCreateWizard.#onPickCulture,
      rollCulture: CharacterCreateWizard.#onRollCulture,
      pickBackground: CharacterCreateWizard.#onPickBackground,
      rollBackground: CharacterCreateWizard.#onRollBackground,
      setFreeWild: CharacterCreateWizard.#onSetFreeWild,
      pickChoice: CharacterCreateWizard.#onPickChoice,
      setChoiceWild: CharacterCreateWizard.#onSetChoiceWild,
      rollSkill1: CharacterCreateWizard.#onRollSkill1,
      setRoll1Wild: CharacterCreateWizard.#onSetRoll1Wild,
      rollSkill2: CharacterCreateWizard.#onRollSkill2,
      setRoll2Wild: CharacterCreateWizard.#onSetRoll2Wild,
      setBonusFree: CharacterCreateWizard.#onSetBonusFree,
      pickClass: CharacterCreateWizard.#onPickClass,
      finish: CharacterCreateWizard.#onFinish,
    },
  };

  static override PARTS = {
    body: {
      template: "systems/kedom/templates/apps/create-character/wizard.hbs",
      scrollable: [".kedom-create-wizard__scroll"],
    },
  };

  static create(): CharacterCreateWizard {
    const app = new CharacterCreateWizard();
    void app.render({ force: true });
    return app;
  }

  get stepId(): StepId {
    return STEPS[this.#draft.stepIndex] ?? "abilities";
  }

  protected override async _onRender(
    context: object,
    options: foundry.applications.api.ApplicationV2.RenderOptions,
  ): Promise<void> {
    await super._onRender(context, options);
    this.#bindNameInput();
    this.#bindSpecInputs();
  }

  #bindNameInput(): void {
    this.#nameAbort?.abort();
    this.#nameAbort = new AbortController();
    const input = this.element?.querySelector<HTMLInputElement>('input[name="characterName"]');
    if (!input) return;
    const sync = (): void => {
      this.#draft.name = input.value;
      this.#refreshNextButton();
    };
    input.addEventListener("input", sync, { signal: this.#nameAbort.signal });
  }

  #bindSpecInputs(): void {
    const signal = this.#nameAbort?.signal;
    const opts = signal ? { signal } : undefined;
    for (const input of this.element?.querySelectorAll<HTMLInputElement>(
      "input[data-spec-target]",
    ) ?? []) {
      input.addEventListener(
        "change",
        () => {
          const target = input.dataset.specTarget;
          const value = input.value.trim();
          if (target === "free") this.#draft.freeWild.specLabel = value || null;
          else if (target === "choice") this.#draft.choiceWild.specLabel = value || null;
          else if (target === "roll1") this.#draft.roll1Wild.specLabel = value || null;
          else if (target === "roll2") this.#draft.roll2Wild.specLabel = value || null;
          else if (target === "bonus") this.#draft.bonusFree.specLabel = value || null;
          void this.render();
        },
        opts,
      );
    }
  }

  #refreshNextButton(): void {
    const btn = this.element?.querySelector<HTMLButtonElement>('[data-action="next"]');
    if (!btn) return;
    btn.disabled = !this.#canAdvance();
  }

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions,
  ): Promise<object> {
    await super._prepareContext(options);
    const d = this.#draft;
    const stepId = this.stepId;

    const abilityRows = CREATION_ABILITY_KEYS.map((key) => ({
      key,
      label: localize(`KEDOM.Ability.${key}.label`, key),
      value: d.abilities[key],
      display: d.abilities[key] === null ? "—" : String(d.abilities[key]),
      canReplace:
        d.abilitiesRolled &&
        (CREATION_REPLACEABLE_ABILITY_KEYS as readonly string[]).includes(key),
      isReplaced: d.replacedAbility === key,
    }));

    const regions = REGIONS.map((r) => ({
      key: r.key,
      label: localize(r.labelKey),
      selected: d.regionKey === r.key,
    }));

    const cultures =
      d.regionKey === null
        ? []
        : CULTURES_BY_REGION[d.regionKey].map((c) => ({
            key: c.key,
            label: localize(c.labelKey),
            selected: d.cultureKey === c.key,
            disabled: c.available === false,
          }));

    const backgrounds =
      d.regionKey === null
        ? []
        : backgroundsForRegion(d.regionKey).map((b, index) => ({
            key: b.key,
            index: index + 1,
            label: localize(b.labelKey),
            selected: d.backgroundKey === b.key,
          }));

    const background =
      d.regionKey && d.backgroundKey
        ? getBackground(d.regionKey, d.backgroundKey)
        : undefined;

    const freeResolved = background
      ? resolveConcreteEntry(background.free, d.freeWild)
      : null;
    const freeNeedsWild =
      background?.free.kind === "anyCombat" || background?.free.kind === "anySkill";
    const freeWildIsCombat = background?.free.kind === "anyCombat";

    const tableRows =
      background?.growth.map((entry, index) => ({
        index,
        n: index + 1,
        label: this.#entryLabel(entry),
        selected: d.choiceIndex === index,
        kind: entry.kind,
      })) ?? [];

    const choiceEntry =
      d.choiceIndex !== null && background ? background.growth[d.choiceIndex] : undefined;
    const choiceNeedsWild =
      choiceEntry?.kind === "anyCombat" || choiceEntry?.kind === "anySkill";
    const choiceWildIsCombat = choiceEntry?.kind === "anyCombat";

    const ownedBeforeRoll1 = this.#ownedGrants({
      includeRoll1: false,
      includeRoll2: false,
      includeBonus: false,
    });
    const ownedBeforeRoll2 = this.#ownedGrants({
      includeRoll1: true,
      includeRoll2: false,
      includeBonus: false,
    });

    const roll1Entry =
      background && d.roll1 !== null ? background.growth[d.roll1 - 1] : null;
    const roll2Entry =
      background && d.roll2 !== null ? background.growth[d.roll2 - 1] : null;

    const roll1State =
      roll1Entry != null ? resolveRolledEntry(roll1Entry, ownedBeforeRoll1, d.roll1Wild) : null;
    const roll2State =
      roll2Entry != null ? resolveRolledEntry(roll2Entry, ownedBeforeRoll2, d.roll2Wild) : null;

    if (roll1State?.rolledGrant) {
      d.roll1OriginalLabel = formatGrantLabel(roll1State.rolledGrant);
    }
    if (roll2State?.rolledGrant) {
      d.roll2OriginalLabel = formatGrantLabel(roll2State.rolledGrant);
    }

    const culture =
      d.regionKey && d.cultureKey ? getCulture(d.regionKey, d.cultureKey) : undefined;
    const classOptions =
      culture === undefined
        ? []
        : culture.allowedClassKeys
            .map((key) => getClass(key))
            .filter((c): c is NonNullable<typeof c> => c !== undefined)
            .map((c) => ({
              key: c.key,
              label: localize(c.labelKey),
              selected: d.classKey === c.key,
            }));

    const combatOptions = COMBAT_SKILLS.map((key) => ({
      key,
      label: localize(`KEDOM.Skill.${key}`),
    }));
    const skillOptions = SKILL_KEYS.map((key) => ({
      key,
      label: localize(`KEDOM.Skill.${key}`),
    }));

    const priorForBonus = this.#ownedGrants({ includeBonus: false });
    const bonusSkillOptions = SKILL_KEYS.map((key) => ({
      key,
      label: localize(`KEDOM.Skill.${key}`),
      selected: d.bonusFree.skillKey === key,
      disabled: countSkill(priorForBonus, key) >= MAX_SAME_SKILL,
    }));
    const bonusResolved = resolveConcreteEntry({ kind: "anySkill" }, d.bonusFree);

    return {
      stepId,
      stepCurrent: d.stepIndex + 1,
      stepCount: STEPS.length,
      stepTitle: localize(`KEDOM.Creation.Step.${stepId}`),
      name: d.name,
      abilitiesRolled: d.abilitiesRolled,
      abilityRows,
      regions,
      cultures,
      backgrounds,
      backgroundKey: d.backgroundKey,
      backgroundLabel: background ? localize(background.labelKey) : "",
      freeLabel: background ? this.#entryLabel(background.free) : "",
      freeNeedsWild,
      freeWildIsCombat,
      freeWildPick: d.freeWild.skillKey,
      freeSpecUI: this.#specUI("free", d.freeWild),
      tableRows,
      choiceIndex: d.choiceIndex,
      choiceWildPick: d.choiceWild.skillKey,
      choiceNeedsWild,
      choiceWildIsCombat,
      choiceSpecUI: this.#specUI("choice", d.choiceWild),
      roll1: d.roll1,
      roll2: d.roll2,
      roll1Label: roll1Entry ? this.#entryLabel(roll1Entry) : "",
      roll2Label: roll2Entry ? this.#entryLabel(roll2Entry) : "",
      roll1NeedsCombat: roll1State?.needsCombatPick ?? false,
      roll1NeedsAny: roll1State?.needsAnySkill ?? false,
      roll1NeedsSpec: roll1State?.needsSpecialization ?? false,
      roll1Substituted: roll1State?.substituted ?? false,
      roll1RolledLabel:
        (roll1State?.rolledGrant ? formatGrantLabel(roll1State.rolledGrant) : "") ||
        d.roll1OriginalLabel,
      roll1FinalLabel: roll1State?.grant ? formatGrantLabel(roll1State.grant) : "",
      roll1WildPick: d.roll1Wild.skillKey,
      roll1SpecUI: this.#specUI("roll1", d.roll1Wild),
      roll2NeedsCombat: roll2State?.needsCombatPick ?? false,
      roll2NeedsAny: roll2State?.needsAnySkill ?? false,
      roll2NeedsSpec: roll2State?.needsSpecialization ?? false,
      roll2Substituted: roll2State?.substituted ?? false,
      roll2RolledLabel:
        (roll2State?.rolledGrant ? formatGrantLabel(roll2State.rolledGrant) : "") ||
        d.roll2OriginalLabel,
      roll2FinalLabel: roll2State?.grant ? formatGrantLabel(roll2State.grant) : "",
      roll2WildPick: d.roll2Wild.skillKey,
      roll2SpecUI: this.#specUI("roll2", d.roll2Wild),
      freeResolvedLabel: freeResolved ? formatGrantLabel(freeResolved) : "",
      bonusFreePick: d.bonusFree.skillKey,
      bonusSkillOptions,
      bonusSpecUI: this.#specUI("bonus", d.bonusFree),
      bonusResolvedLabel: bonusResolved ? formatGrantLabel(bonusResolved) : "",
      classOptions,
      combatOptions,
      skillOptions,
      confirmLines: this.#confirmLines(),
      canNext: this.#canAdvance(),
      isFirst: d.stepIndex === 0,
      isLast: d.stepIndex === STEPS.length - 1,
    };
  }

  #specUI(
    target: "free" | "choice" | "roll1" | "roll2" | "bonus",
    pick: ResolvePick,
  ): {
    show: boolean;
    freeform: boolean;
    fixedOptions: { leaf: string; label: string; selected: boolean }[];
    value: string;
    target: string;
  } {
    const skillKey = pick.skillKey;
    if (!skillKey || !skillNeedsSpecialization(skillKey)) {
      return { show: false, freeform: false, fixedOptions: [], value: "", target };
    }
    const kind = SKILL_SPECIALIZATION_KIND[skillKey] ?? "none";
    const fixedOptions = hasFixedSpecializationCatalog(kind)
      ? (SKILL_FIXED_SPECIALIZATIONS[skillKey] ?? []).map((leaf) => ({
          leaf,
          label: localize(`KEDOM.Specialization.${skillKey}.${leaf}`, leaf),
          selected: pick.specLabel === leaf,
        }))
      : [];
    return {
      show: true,
      freeform: allowsFreeSpecialization(kind),
      fixedOptions,
      value: pick.specLabel ?? "",
      target,
    };
  }

  #entryLabel(entry: { kind: string; skillKey?: string; specLabel?: string }): string {
    if (entry.kind === "anyCombat") return localize("KEDOM.Creation.AnyCombat");
    if (entry.kind === "anySkill") return localize("KEDOM.Creation.AnySkill");
    const skill = localize(`KEDOM.Skill.${entry.skillKey}`, entry.skillKey);
    if (!entry.specLabel) return skill;
    return `${skill} (${localizeCreationSpecLabel(entry.specLabel)})`;
  }

  #ownedGrants(opts?: {
    includeRoll1?: boolean;
    includeRoll2?: boolean;
    includeBonus?: boolean;
  }): ResolvedSkillGrant[] {
    const includeRoll1 = opts?.includeRoll1 ?? true;
    const includeRoll2 = opts?.includeRoll2 ?? true;
    const includeBonus = opts?.includeBonus ?? true;
    const d = this.#draft;
    if (!d.regionKey || !d.backgroundKey) return [];
    const bg = getBackground(d.regionKey, d.backgroundKey);
    if (!bg) return [];

    const out: ResolvedSkillGrant[] = [];

    const free = resolveConcreteEntry(bg.free, d.freeWild);
    if (free) out.push(free);

    if (d.choiceIndex !== null) {
      const entry = bg.growth[d.choiceIndex];
      if (entry) {
        if (entry.kind === "skill") {
          const chosen = resolveConcreteEntry(entry, null);
          if (chosen) out.push(chosen);
        } else {
          const chosen = resolveConcreteEntry(entry, d.choiceWild);
          if (chosen) out.push(chosen);
        }
      }
    }

    if (includeRoll1 && d.roll1 !== null) {
      const entry = bg.growth[d.roll1 - 1];
      if (entry) {
        const r = resolveRolledEntry(entry, out, d.roll1Wild);
        if (r.grant) out.push(r.grant);
      }
    }

    if (includeRoll2 && d.roll2 !== null) {
      const entry = bg.growth[d.roll2 - 1];
      if (entry) {
        const r = resolveRolledEntry(entry, out, d.roll2Wild);
        if (r.grant) out.push(r.grant);
      }
    }

    if (includeBonus) {
      const bonus = resolveConcreteEntry({ kind: "anySkill" }, d.bonusFree);
      if (bonus) out.push(bonus);
    }

    return out;
  }

  #confirmLines(): string[] {
    const d = this.#draft;
    const lines: string[] = [];
    if (d.name) lines.push(d.name);
    if (d.regionKey) {
      lines.push(localize(REGIONS.find((r) => r.key === d.regionKey)!.labelKey));
    }
    if (d.regionKey && d.cultureKey) {
      const c = getCulture(d.regionKey, d.cultureKey);
      if (c) lines.push(localize(c.labelKey));
    }
    if (d.regionKey && d.backgroundKey) {
      const b = getBackground(d.regionKey, d.backgroundKey);
      if (b) lines.push(localize(b.labelKey));
    }
    if (d.classKey) {
      const c = getClass(d.classKey);
      if (c) lines.push(localize(c.labelKey));
    }
    const grants = this.#ownedGrants();
    if (grants.length) {
      lines.push(grants.map((g) => formatGrantLabel(g)).join(", "));
    }
    return lines;
  }

  #canAdvance(): boolean {
    const d = this.#draft;
    switch (this.stepId) {
      case "abilities":
        return d.abilitiesRolled;
      case "region":
        return d.regionKey !== null;
      case "culture":
        return d.cultureKey !== null;
      case "background": {
        if (!d.regionKey || !d.backgroundKey) return false;
        const bg = getBackground(d.regionKey, d.backgroundKey);
        if (!bg) return false;
        if (
          (bg.free.kind === "anyCombat" || bg.free.kind === "anySkill") &&
          !resolveConcreteEntry(bg.free, d.freeWild)
        ) {
          return false;
        }
        if (d.choiceIndex === null) return false;
        const choice = bg.growth[d.choiceIndex];
        if (choice && choice.kind !== "skill" && !resolveConcreteEntry(choice, d.choiceWild)) {
          return false;
        }
        if (d.roll1 === null || d.roll2 === null) return false;
        const r1 = resolveRolledEntry(
          bg.growth[d.roll1 - 1]!,
          this.#ownedGrants({ includeRoll1: false, includeRoll2: false, includeBonus: false }),
          d.roll1Wild,
        );
        if (!r1.grant) return false;
        const r2 = resolveRolledEntry(
          bg.growth[d.roll2 - 1]!,
          this.#ownedGrants({ includeRoll1: true, includeRoll2: false, includeBonus: false }),
          d.roll2Wild,
        );
        if (!r2.grant) return false;
        const bonus = resolveConcreteEntry({ kind: "anySkill" }, d.bonusFree);
        if (!bonus) return false;
        const prior = this.#ownedGrants({ includeBonus: false });
        if (countSkill(prior, bonus.skillKey) >= MAX_SAME_SKILL) return false;
        return true;
      }
      case "className":
        return Boolean(d.classKey && d.name.trim());
      case "confirm":
        return true;
      default:
        return false;
    }
  }

  #readNameFromForm(): void {
    const input = this.element?.querySelector<HTMLInputElement>('input[name="characterName"]');
    if (input) this.#draft.name = input.value.trim();
  }

  static async #onNext(this: CharacterCreateWizard): Promise<void> {
    this.#readNameFromForm();
    if (this.stepId === "abilities" && this.#draft.abilitiesRolled && !this.#draft.replacedAbility) {
      ui.notifications.warn(localize("KEDOM.Creation.Wizard.NoFourteenWarning"));
    }
    if (!this.#canAdvance()) {
      ui.notifications.warn(localize("KEDOM.Creation.Wizard.IncompleteStep"));
      return;
    }
    if (this.#draft.stepIndex < STEPS.length - 1) {
      this.#draft.stepIndex += 1;
      await this.render();
    }
  }

  static async #onBack(this: CharacterCreateWizard): Promise<void> {
    this.#readNameFromForm();
    if (this.#draft.stepIndex > 0) {
      this.#draft.stepIndex -= 1;
      await this.render();
    }
  }

  static async #onRollAbilities(this: CharacterCreateWizard): Promise<void> {
    const totals = await postCreationRolls(
      CREATION_ABILITY_KEYS.map((key) => ({
        formula: "3d6",
        label: localize(`KEDOM.Ability.${key}.label`, key),
      })),
      localize("KEDOM.Creation.Wizard.AbilitiesRollFlavor"),
    );
    const rolled = emptyAbilities();
    CREATION_ABILITY_KEYS.forEach((key, i) => {
      rolled[key] = totals[i] ?? 10;
    });
    this.#draft.rolledAbilities = { ...rolled };
    this.#draft.abilities = { ...rolled };
    this.#draft.abilitiesRolled = true;
    this.#draft.replacedAbility = null;
    await this.render();
  }

  static async #onSetFourteen(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const key = target.dataset.abilityKey as CreationAbilityKey | undefined;
    if (!key || key === "lck" || !this.#draft.abilitiesRolled) return;
    if (!(CREATION_REPLACEABLE_ABILITY_KEYS as readonly string[]).includes(key)) return;

    const prev = this.#draft.replacedAbility;
    if (prev) {
      this.#draft.abilities[prev] = this.#draft.rolledAbilities[prev];
    }
    if (prev === key) {
      this.#draft.replacedAbility = null;
    } else {
      this.#draft.abilities[key] = 14;
      this.#draft.replacedAbility = key;
    }
    await this.render();
  }

  static async #onPickRegion(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const key = target.dataset.regionKey as RegionKey | undefined;
    if (!key || !REGIONS.some((r) => r.key === key)) return;
    this.#draft.regionKey = key;
    this.#draft.cultureKey = null;
    this.#draft.backgroundKey = null;
    this.#resetBackgroundPicks();
    await this.render();
  }

  static async #onPickCulture(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const key = target.dataset.cultureKey;
    if (!key || !this.#draft.regionKey) return;
    if (!isCultureAvailable(this.#draft.regionKey, key)) return;
    if (!getCulture(this.#draft.regionKey, key)) return;
    this.#draft.cultureKey = key;
    this.#draft.classKey = null;
    await this.render();
  }

  static async #onRollCulture(this: CharacterCreateWizard): Promise<void> {
    if (!this.#draft.regionKey) return;
    const list = CULTURES_BY_REGION[this.#draft.regionKey].filter((c) => c.available !== false);
    if (!list.length) return;
    const { total } = await postCreationRoll(
      `1d${list.length}`,
      localize("KEDOM.Creation.Wizard.CultureRollFlavor"),
    );
    const pick = list[total - 1] ?? list[0];
    if (!pick) return;
    this.#draft.cultureKey = pick.key;
    this.#draft.classKey = null;
    await this.render();
  }

  static async #onPickBackground(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const key = target.dataset.backgroundKey;
    if (!key || !this.#draft.regionKey) return;
    if (!getBackground(this.#draft.regionKey, key)) return;
    this.#draft.backgroundKey = key;
    this.#resetBackgroundPicks();
    await this.render();
  }

  static async #onRollBackground(this: CharacterCreateWizard): Promise<void> {
    if (!this.#draft.regionKey) return;
    const list = backgroundsForRegion(this.#draft.regionKey);
    const { total } = await postCreationRoll(
      "1d20",
      localize("KEDOM.Creation.Wizard.BackgroundRollFlavor"),
    );
    const pick = list[Math.min(total, list.length) - 1] ?? list[0];
    if (!pick) return;
    this.#draft.backgroundKey = pick.key;
    this.#resetBackgroundPicks();
    await this.render();
  }

  #resetBackgroundPicks(): void {
    this.#draft.freeWild = emptyPick();
    this.#draft.choiceIndex = null;
    this.#draft.choiceWild = emptyPick();
    this.#draft.roll1 = null;
    this.#draft.roll1Wild = emptyPick();
    this.#draft.roll1OriginalLabel = "";
    this.#draft.roll2 = null;
    this.#draft.roll2Wild = emptyPick();
    this.#draft.roll2OriginalLabel = "";
    this.#draft.bonusFree = emptyPick();
  }

  static async #onSetFreeWild(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const leaf = target.dataset.specLeaf;
    if (leaf) {
      this.#draft.freeWild.specLabel = leaf;
      await this.render();
      return;
    }
    const key = target.dataset.skillKey as SkillKey | undefined;
    if (!key || !SKILL_KEYS.includes(key)) return;
    this.#draft.freeWild = { skillKey: key, specLabel: null };
    await this.render();
  }

  static async #onPickChoice(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const index = Number.parseInt(target.dataset.choiceIndex ?? "", 10);
    if (!Number.isFinite(index) || index < 0 || index > 7) return;
    this.#draft.choiceIndex = index;
    this.#draft.choiceWild = emptyPick();
    this.#draft.roll1 = null;
    this.#draft.roll1Wild = emptyPick();
    this.#draft.roll1OriginalLabel = "";
    this.#draft.roll2 = null;
    this.#draft.roll2Wild = emptyPick();
    this.#draft.roll2OriginalLabel = "";
    this.#draft.bonusFree = emptyPick();
    await this.render();
  }

  static async #onSetChoiceWild(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const key = target.dataset.skillKey as SkillKey | undefined;
    const leaf = target.dataset.specLeaf;
    if (leaf) {
      this.#draft.choiceWild.specLabel = leaf;
      await this.render();
      return;
    }
    if (!key || !SKILL_KEYS.includes(key)) return;
    this.#draft.choiceWild = { skillKey: key, specLabel: null };
    await this.render();
  }

  static async #onRollSkill1(this: CharacterCreateWizard): Promise<void> {
    const { total } = await postCreationRoll(
      "1d8",
      `${localize("KEDOM.Creation.Wizard.BackgroundSkillRollFlavor")} (1)`,
    );
    this.#draft.roll1 = total;
    this.#draft.roll1Wild = emptyPick();
    this.#draft.roll1OriginalLabel = "";
    this.#draft.bonusFree = emptyPick();
    await this.render();
  }

  static async #onSetRoll1Wild(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const leaf = target.dataset.specLeaf;
    if (leaf) {
      this.#draft.roll1Wild.specLabel = leaf;
      await this.render();
      return;
    }
    const key = target.dataset.skillKey as SkillKey | undefined;
    if (!key || !SKILL_KEYS.includes(key)) return;
    this.#draft.roll1Wild = { skillKey: key, specLabel: null };
    await this.render();
  }

  static async #onRollSkill2(this: CharacterCreateWizard): Promise<void> {
    const { total } = await postCreationRoll(
      "1d8",
      `${localize("KEDOM.Creation.Wizard.BackgroundSkillRollFlavor")} (2)`,
    );
    this.#draft.roll2 = total;
    this.#draft.roll2Wild = emptyPick();
    this.#draft.roll2OriginalLabel = "";
    this.#draft.bonusFree = emptyPick();
    await this.render();
  }

  static async #onSetRoll2Wild(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const leaf = target.dataset.specLeaf;
    if (leaf) {
      this.#draft.roll2Wild.specLabel = leaf;
      await this.render();
      return;
    }
    const key = target.dataset.skillKey as SkillKey | undefined;
    if (!key || !SKILL_KEYS.includes(key)) return;
    this.#draft.roll2Wild = { skillKey: key, specLabel: null };
    await this.render();
  }

  static async #onSetBonusFree(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const leaf = target.dataset.specLeaf;
    if (leaf) {
      this.#draft.bonusFree.specLabel = leaf;
      await this.render();
      return;
    }
    const key = target.dataset.skillKey as SkillKey | undefined;
    if (!key || !SKILL_KEYS.includes(key)) return;
    const prior = this.#ownedGrants({ includeBonus: false });
    if (countSkill(prior, key) >= MAX_SAME_SKILL) return;
    this.#draft.bonusFree = { skillKey: key, specLabel: null };
    await this.render();
  }

  static async #onPickClass(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const key = target.dataset.classKey;
    if (!key || !getClass(key)) return;
    this.#draft.classKey = key;
    this.#readNameFromForm();
    await this.render();
  }

  static async #onFinish(this: CharacterCreateWizard): Promise<void> {
    this.#readNameFromForm();
    if (!this.#canAdvance() || this.stepId !== "confirm") {
      ui.notifications.warn(localize("KEDOM.Creation.Wizard.IncompleteStep"));
      return;
    }
    await this.#createActor();
  }

  async #createActor(): Promise<void> {
    const d = this.#draft;
    if (!d.regionKey || !d.cultureKey || !d.backgroundKey || !d.classKey) return;
    if (!d.abilitiesRolled) return;

    const culture = getCulture(d.regionKey, d.cultureKey)!;
    const background = getBackground(d.regionKey, d.backgroundKey)!;
    const classDef = getClass(d.classKey)!;
    const grants = this.#ownedGrants();
    const merged = mergeSkillGrants(grants);

    const abilities: Record<string, { value: number }> = {};
    for (const key of ABILITY_KEYS) {
      const v = d.abilities[key as CreationAbilityKey] ?? 10;
      abilities[key] = { value: v };
    }

    const skills: Record<string, unknown> = {};
    for (const key of SKILL_KEYS) {
      const prof = merged.proficiency[key];
      const specs = merged.specializations[key];
      if (!prof && !specs) continue;
      skills[key] = {
        ...(prof ? { proficiency: prof } : {}),
        ...(specs ? { specializations: specs } : {}),
      };
    }

    const cultureLabel = localize(culture.labelKey);
    const backgroundLabel = localize(background.labelKey);
    const classLabel = localize(classDef.labelKey);

    const actorData = {
      name: d.name.trim() || localize("KEDOM.Creation.Wizard.DefaultName"),
      type: "character",
      system: {
        abilities,
        skills,
        details: {
          culture: cultureLabel,
          background: backgroundLabel,
          class: classLabel,
          region: "",
        },
        combat: {
          attackBonus: classDef.attackBonus,
        },
      },
      items: [
        {
          name: cultureLabel,
          type: "origin",
          system: { subType: "race", description: "" },
        },
        {
          name: backgroundLabel,
          type: "origin",
          system: { subType: "background", description: "" },
        },
        {
          name: classLabel,
          type: "origin",
          system: {
            subType: "class",
            description: "",
            hitDie: classDef.hitDie,
            attackBonus: classDef.attackBonus,
          },
        },
      ],
    };

    // @ts-expect-error fvtt-types: character + origin subtypes
    const created = await Actor.create(actorData, { renderSheet: true });
    const actor = Array.isArray(created) ? created[0] : created;
    if (actor) {
      ui.notifications.info(
        game.i18n.format("KEDOM.Creation.Wizard.Created", { name: actor.name }),
      );
      await this.close();
    }
  }
}

/** Directory footer button → open wizard (CoC7 / Shadowdark style). */
export function registerCharacterCreateDirectoryButton(
  _app: unknown,
  element: HTMLElement | JQuery,
): void {
  const root =
    element instanceof HTMLElement
      ? element
      : ((element as JQuery).get?.(0) as HTMLElement | undefined);
  if (!root) return;
  if (root.querySelector("[data-action='kedomCreateCharacter']")) return;

  const footer =
    root.querySelector(".directory-footer") ?? root.querySelector("footer.directory-footer");
  if (!footer) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "kedom-create-character-btn";
  btn.dataset.action = "kedomCreateCharacter";
  btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${localize("KEDOM.Creation.Wizard.DirectoryButton")}`;
  btn.addEventListener("click", () => {
    CharacterCreateWizard.create();
  });
  footer.append(btn);
}
