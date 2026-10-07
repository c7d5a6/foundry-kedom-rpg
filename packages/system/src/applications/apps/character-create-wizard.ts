import { ABILITY_KEYS, SKILL_KEYS, type SkillKey } from "../../config/kedom.ts";
import {
  CREATION_ABILITY_KEYS,
  CREATION_REPLACEABLE_ABILITY_KEYS,
  getClass,
  getCulture,
  resolveTalentPickBudget,
  classSaveSystemData,
  type CreationAbilityKey,
  type GrowthEntry,
  type RegionKey,
} from "../../config/creation.ts";
import { featureKeysForCreate, featureTalentCreateData } from "../../creation/class-features.ts";
import { getClassOrigin } from "../../creation/class-origins.ts";
import { combineClassOriginsBySlug } from "../../creation/combine-class-origins.ts";
import { abilityModifier } from "../../derivations/ability-mod.ts";
import { localizeCreationSpecLabel } from "../../config/creation-spec-labels.ts";
import {
  SKILL_FIXED_SPECIALIZATIONS,
  SKILL_SPECIALIZATION_KIND,
  allowsFreeSpecialization,
  hasFixedSpecializationCatalog,
} from "../../config/specializations.ts";
import { postCreationRoll, postCreationRolls } from "../../creation/creation-rolls.ts";
import {
  type CatalogBackground,
  type CatalogClass,
  type CatalogCulture,
  type CatalogItemPayload,
  type OriginsCatalog,
  culturePercents,
  getCatalogBackground,
  getCatalogClass,
  getCatalogCulture,
  getCatalogRegion,
  getCatalogTalent,
  loadOriginsCatalog,
} from "../../creation/origins-catalog.ts";
import {
  COMBAT_SKILLS,
  formatGrantLabel,
  isGrantBlocked,
  mergeSkillGrants,
  resolveConcreteEntry,
  resolveRolledEntry,
  skillNeedsSpecialization,
  type ResolvePick,
  type ResolvedSkillGrant,
} from "../../creation/resolve-background.ts";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const STEPS = ["abilities", "region", "culture", "background", "className", "confirm"] as const;
type StepId = (typeof STEPS)[number];

type Draft = {
  stepIndex: number;
  name: string;
  abilitiesRolled: boolean;
  abilities: Record<CreationAbilityKey, number | null>;
  rolledAbilities: Record<CreationAbilityKey, number | null>;
  replacedAbility: Exclude<CreationAbilityKey, "lck"> | null;
  regionKey: string | null;
  cultureKey: string | null;
  backgroundKey: string | null;
  freeWild: ResolvePick;
  roll1: number | null;
  roll1Wild: ResolvePick;
  roll1OriginalLabel: string;
  roll2: number | null;
  roll2Wild: ResolvePick;
  roll2OriginalLabel: string;
  classKey: string | null;
  /** Raw hit-die roll total (before Might mod); set via Roll HP. */
  hitDieTotal: number | null;
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

async function enrichHtml(html: string): Promise<string> {
  if (!html.trim()) return "";
  return TextEditor.enrichHTML(html, {});
}

export class CharacterCreateWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  #draft: Draft;
  #nameAbort: AbortController | null = null;
  #catalog: OriginsCatalog | null = null;

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
      roll1: null,
      roll1Wild: emptyPick(),
      roll1OriginalLabel: "",
      roll2: null,
      roll2Wild: emptyPick(),
      roll2OriginalLabel: "",
      classKey: null,
      hitDieTotal: null,
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
      rollSkill1: CharacterCreateWizard.#onRollSkill1,
      setRoll1Wild: CharacterCreateWizard.#onSetRoll1Wild,
      rollSkill2: CharacterCreateWizard.#onRollSkill2,
      setRoll2Wild: CharacterCreateWizard.#onSetRoll2Wild,
      pickClass: CharacterCreateWizard.#onPickClass,
      rollHp: CharacterCreateWizard.#onRollHp,
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

  async #ensureCatalog(): Promise<OriginsCatalog> {
    if (!this.#catalog) {
      this.#catalog = await loadOriginsCatalog();
    }
    return this.#catalog;
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
          else if (target === "roll1") this.#draft.roll1Wild.specLabel = value || null;
          else if (target === "roll2") this.#draft.roll2Wild.specLabel = value || null;
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

  #selectedCulture(catalog: OriginsCatalog): CatalogCulture | undefined {
    const d = this.#draft;
    if (!d.regionKey || !d.cultureKey) return undefined;
    return getCatalogCulture(catalog, d.regionKey, d.cultureKey);
  }

  #selectedBackground(catalog: OriginsCatalog): CatalogBackground | undefined {
    const d = this.#draft;
    if (!d.backgroundKey) return undefined;
    return getCatalogBackground(catalog, d.backgroundKey);
  }

  #selectedClass(catalog: OriginsCatalog): CatalogClass | undefined {
    const d = this.#draft;
    if (!d.classKey) return undefined;
    return getCatalogClass(catalog, d.classKey);
  }

  #backgroundsForCulture(
    catalog: OriginsCatalog,
    culture: CatalogCulture | undefined,
  ): CatalogBackground[] {
    if (!culture) return [];
    return culture.backgroundSlugs
      .map((slug) => getCatalogBackground(catalog, slug))
      .filter((b): b is CatalogBackground => b !== undefined);
  }

  #classesForCulture(catalog: OriginsCatalog, culture: CatalogCulture | undefined): CatalogClass[] {
    if (!culture) return [];
    return culture.classSlugs
      .map((slug) => getCatalogClass(catalog, slug))
      .filter((c): c is CatalogClass => c !== undefined);
  }

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions,
  ): Promise<object> {
    await super._prepareContext(options);
    const catalog = await this.#ensureCatalog();
    const d = this.#draft;
    const stepId = this.stepId;

    const abilityRows = CREATION_ABILITY_KEYS.map((key) => ({
      key,
      label: localize(`KEDOM.Ability.${key}.label`, key),
      value: d.abilities[key],
      display: d.abilities[key] === null ? "—" : String(d.abilities[key]),
      canReplace:
        d.abilitiesRolled && (CREATION_REPLACEABLE_ABILITY_KEYS as readonly string[]).includes(key),
      isReplaced: d.replacedAbility === key,
    }));

    const regions = catalog.regions.map((r) => ({
      key: r.slug,
      label: r.name,
      selected: d.regionKey === r.slug,
    }));

    const region = d.regionKey ? getCatalogRegion(catalog, d.regionKey) : undefined;
    const cultures =
      region?.cultures.map((c) => ({
        key: c.slug,
        label: c.name,
        percent: c.percent,
        percentLabel: game.i18n.format("KEDOM.Creation.Wizard.CulturePercent", {
          percent: String(c.percent),
        }),
        selected: d.cultureKey === c.slug,
        disabled: c.disabled,
      })) ?? [];

    const culture = this.#selectedCulture(catalog);
    const backgroundList = this.#backgroundsForCulture(catalog, culture);
    const backgrounds = backgroundList.map((b, index) => ({
      key: b.slug,
      index: index + 1,
      label: b.name,
      selected: d.backgroundKey === b.slug,
    }));

    const background = this.#selectedBackground(catalog);
    const freeResolved = background ? resolveConcreteEntry(background.free, d.freeWild) : null;
    const freeNeedsWild =
      background?.free.kind === "anyCombat" || background?.free.kind === "anySkill";
    const freeWildIsCombat = background?.free.kind === "anyCombat";

    const ownedFree = this.#ownedGrants(catalog, {
      includeRoll1: false,
      includeRoll2: false,
    });
    const tableRows =
      background?.growth.map((entry, index) => {
        const preview = entry.kind === "skill" ? resolveConcreteEntry(entry, null) : null;
        const duplicate = preview !== null && isGrantBlocked(ownedFree, preview);
        return {
          index,
          n: index + 1,
          label: this.#entryLabel(entry),
          kind: entry.kind,
          duplicate,
        };
      }) ?? [];

    const ownedBeforeRoll1 = this.#ownedGrants(catalog, {
      includeRoll1: false,
      includeRoll2: false,
    });
    const ownedBeforeRoll2 = this.#ownedGrants(catalog, {
      includeRoll1: true,
      includeRoll2: false,
    });

    const roll1Entry =
      background && d.roll1 !== null ? (background.growth[d.roll1 - 1] ?? null) : null;
    const roll2Entry =
      background && d.roll2 !== null ? (background.growth[d.roll2 - 1] ?? null) : null;

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

    const classOptions = this.#classesForCulture(catalog, culture).map((c) => ({
      key: c.slug,
      label: c.name,
      hitDie: c.hitDie,
      selected: d.classKey === c.slug,
    }));

    const selectedClass = this.#selectedClass(catalog);
    const startingHp = this.#startingHp();

    const combatOptions = COMBAT_SKILLS.map((key) => ({
      key,
      label: localize(`KEDOM.Skill.${key}`),
    }));
    const skillOptions = SKILL_KEYS.map((key) => ({
      key,
      label: localize(`KEDOM.Skill.${key}`),
    }));

    const cultureTalent = culture ? getCatalogTalent(catalog, culture.talentSlug) : undefined;
    const classTalent = selectedClass
      ? getCatalogTalent(catalog, selectedClass.talentSlug)
      : undefined;

    const cultureDescriptionHtml = culture ? await enrichHtml(culture.description) : "";
    const cultureTalentHtml = cultureTalent ? await enrichHtml(cultureTalent.description) : "";
    const backgroundDescriptionHtml = background ? await enrichHtml(background.description) : "";
    const classDescriptionHtml = selectedClass ? await enrichHtml(selectedClass.description) : "";
    const classTalentHtml = classTalent ? await enrichHtml(classTalent.description) : "";

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
      backgroundLabel: background?.name ?? "",
      freeLabel: background ? this.#entryLabel(background.free) : "",
      freeNeedsWild,
      freeWildIsCombat,
      freeWildPick: d.freeWild.skillKey,
      freeSpecUI: this.#specUI("free", d.freeWild, []),
      tableRows,
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
      roll1SpecUI: this.#specUI("roll1", d.roll1Wild, ownedBeforeRoll1),
      roll2NeedsCombat: roll2State?.needsCombatPick ?? false,
      roll2NeedsAny: roll2State?.needsAnySkill ?? false,
      roll2NeedsSpec: roll2State?.needsSpecialization ?? false,
      roll2Substituted: roll2State?.substituted ?? false,
      roll2RolledLabel:
        (roll2State?.rolledGrant ? formatGrantLabel(roll2State.rolledGrant) : "") ||
        d.roll2OriginalLabel,
      roll2FinalLabel: roll2State?.grant ? formatGrantLabel(roll2State.grant) : "",
      roll2WildPick: d.roll2Wild.skillKey,
      roll2SpecUI: this.#specUI("roll2", d.roll2Wild, ownedBeforeRoll2),
      freeResolvedLabel: freeResolved ? formatGrantLabel(freeResolved) : "",
      classOptions,
      selectedClassHitDie: selectedClass?.hitDie ?? "",
      hasClassSelected: Boolean(d.classKey),
      startingHp,
      startingHpLabel:
        startingHp !== null && selectedClass
          ? game.i18n.format("KEDOM.Creation.Wizard.StartingHp", {
              hp: String(startingHp),
              hitDie: selectedClass.hitDie,
              roll: String(d.hitDieTotal ?? 0),
            })
          : "",
      combatOptions,
      skillOptions,
      cultureDescriptionHtml,
      cultureTalentName: cultureTalent?.name ?? "",
      cultureTalentHtml,
      showCultureDetail: Boolean(culture),
      backgroundDescriptionHtml,
      showBackgroundDetail: Boolean(background),
      classDescriptionHtml,
      classTalentName: classTalent?.name ?? "",
      classTalentHtml,
      showClassDetail: Boolean(selectedClass),
      confirmLines: this.#confirmLines(catalog),
      canNext: this.#canAdvance(catalog),
      isFirst: d.stepIndex === 0,
      isLast: d.stepIndex === STEPS.length - 1,
    };
  }

  /** Hit die roll + Might mod, min 1. Null until Roll HP. */
  #startingHp(): number | null {
    const d = this.#draft;
    if (d.hitDieTotal === null || !d.classKey) return null;
    const mgh = d.abilities.mgh ?? 10;
    return Math.max(1, Math.floor(d.hitDieTotal + abilityModifier(mgh)));
  }

  #specUI(
    target: "free" | "roll1" | "roll2",
    pick: ResolvePick,
    owned: readonly ResolvedSkillGrant[],
  ): {
    show: boolean;
    freeform: boolean;
    fixedOptions: { leaf: string; label: string; selected: boolean; disabled: boolean }[];
    value: string;
    target: string;
  } {
    const skillKey = pick.skillKey;
    if (!skillKey || !skillNeedsSpecialization(skillKey)) {
      return { show: false, freeform: false, fixedOptions: [], value: "", target };
    }
    const kind = SKILL_SPECIALIZATION_KIND[skillKey] ?? "none";
    const fixedOptions = hasFixedSpecializationCatalog(kind)
      ? (SKILL_FIXED_SPECIALIZATIONS[skillKey] ?? []).map((leaf) => {
          const candidate = resolveConcreteEntry(
            { kind: "anySkill" },
            { skillKey, specLabel: leaf },
          );
          return {
            leaf,
            label: localize(`KEDOM.Specialization.${skillKey}.${leaf}`, leaf),
            selected: pick.specLabel === leaf,
            disabled: candidate !== null && isGrantBlocked(owned, candidate),
          };
        })
      : [];
    return {
      show: true,
      freeform: allowsFreeSpecialization(kind),
      fixedOptions,
      value: pick.specLabel ?? "",
      target,
    };
  }

  #entryLabel(entry: GrowthEntry): string {
    if (entry.kind === "anyCombat") return localize("KEDOM.Creation.AnyCombat");
    if (entry.kind === "anySkill") return localize("KEDOM.Creation.AnySkill");
    const skill = localize(`KEDOM.Skill.${entry.skillKey}`, entry.skillKey);
    if (!entry.specLabel) return skill;
    return `${skill} (${localizeCreationSpecLabel(entry.specLabel)})`;
  }

  #ownedGrants(
    catalog: OriginsCatalog,
    opts?: {
      includeRoll1?: boolean;
      includeRoll2?: boolean;
    },
  ): ResolvedSkillGrant[] {
    const includeRoll1 = opts?.includeRoll1 ?? true;
    const includeRoll2 = opts?.includeRoll2 ?? true;
    const d = this.#draft;
    if (!d.backgroundKey) return [];
    const bg = getCatalogBackground(catalog, d.backgroundKey);
    if (!bg) return [];

    const out: ResolvedSkillGrant[] = [];

    const free = resolveConcreteEntry(bg.free, d.freeWild);
    if (free) out.push(free);

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

    return out;
  }

  #confirmLines(catalog: OriginsCatalog): string[] {
    const d = this.#draft;
    const lines: string[] = [];
    if (d.name) lines.push(d.name);
    if (d.regionKey) {
      const r = getCatalogRegion(catalog, d.regionKey);
      if (r) lines.push(r.name);
    }
    const culture = this.#selectedCulture(catalog);
    if (culture) lines.push(culture.name);
    const background = this.#selectedBackground(catalog);
    if (background) lines.push(background.name);
    const cls = this.#selectedClass(catalog);
    if (cls) lines.push(cls.name);
    const hp = this.#startingHp();
    if (hp !== null && cls) {
      lines.push(
        game.i18n.format("KEDOM.Creation.Wizard.StartingHp", {
          hp: String(hp),
          hitDie: cls.hitDie,
          roll: String(d.hitDieTotal ?? 0),
        }),
      );
    }
    const grants = this.#ownedGrants(catalog);
    if (grants.length) {
      lines.push(grants.map((g) => formatGrantLabel(g)).join(", "));
    }
    return lines;
  }

  #canAdvance(catalog?: OriginsCatalog | null): boolean {
    const cat = catalog ?? this.#catalog;
    if (!cat) return false;
    const d = this.#draft;
    switch (this.stepId) {
      case "abilities":
        return d.abilitiesRolled;
      case "region":
        return d.regionKey !== null;
      case "culture":
        return d.cultureKey !== null;
      case "background": {
        if (!d.backgroundKey) return false;
        const bg = getCatalogBackground(cat, d.backgroundKey);
        if (!bg) return false;
        if (
          (bg.free.kind === "anyCombat" || bg.free.kind === "anySkill") &&
          !resolveConcreteEntry(bg.free, d.freeWild)
        ) {
          return false;
        }
        if (d.roll1 === null || d.roll2 === null) return false;
        const entry1 = bg.growth[d.roll1 - 1];
        const entry2 = bg.growth[d.roll2 - 1];
        if (!entry1 || !entry2) return false;
        const r1 = resolveRolledEntry(
          entry1,
          this.#ownedGrants(cat, { includeRoll1: false, includeRoll2: false }),
          d.roll1Wild,
        );
        if (!r1.grant) return false;
        const r2 = resolveRolledEntry(
          entry2,
          this.#ownedGrants(cat, { includeRoll1: true, includeRoll2: false }),
          d.roll2Wild,
        );
        if (!r2.grant) return false;
        return true;
      }
      case "className":
        return Boolean(d.classKey && d.name.trim() && d.hitDieTotal !== null);
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
    if (
      this.stepId === "abilities" &&
      this.#draft.abilitiesRolled &&
      !this.#draft.replacedAbility
    ) {
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
    const catalog = await this.#ensureCatalog();
    const key = target.dataset.regionKey;
    if (!key || !getCatalogRegion(catalog, key)) return;
    this.#draft.regionKey = key;
    this.#draft.cultureKey = null;
    this.#draft.backgroundKey = null;
    this.#draft.classKey = null;
    this.#draft.hitDieTotal = null;
    this.#resetBackgroundPicks();
    await this.render();
  }

  static async #onPickCulture(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const catalog = await this.#ensureCatalog();
    const key = target.dataset.cultureKey;
    if (!key || !this.#draft.regionKey) return;
    const culture = getCatalogCulture(catalog, this.#draft.regionKey, key);
    if (!culture || culture.disabled) return;
    this.#draft.cultureKey = key;
    this.#draft.backgroundKey = null;
    this.#draft.classKey = null;
    this.#draft.hitDieTotal = null;
    this.#resetBackgroundPicks();
    await this.render();
  }

  static async #onRollCulture(this: CharacterCreateWizard): Promise<void> {
    const catalog = await this.#ensureCatalog();
    if (!this.#draft.regionKey) return;
    const region = getCatalogRegion(catalog, this.#draft.regionKey);
    const available = region?.cultures.filter((c) => !c.disabled) ?? [];
    if (!available.length) return;

    const pcts = culturePercents(available.map((c) => c.weight));
    const { total } = await postCreationRoll(
      "1d100",
      localize("KEDOM.Creation.Wizard.CultureRollFlavor"),
    );
    let acc = 0;
    let pick = available[available.length - 1]!;
    for (let i = 0; i < available.length; i++) {
      acc += pcts[i] ?? 0;
      if (total <= acc) {
        pick = available[i]!;
        break;
      }
    }
    this.#draft.cultureKey = pick.slug;
    this.#draft.backgroundKey = null;
    this.#draft.classKey = null;
    this.#draft.hitDieTotal = null;
    this.#resetBackgroundPicks();
    await this.render();
  }

  static async #onPickBackground(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const catalog = await this.#ensureCatalog();
    const key = target.dataset.backgroundKey;
    if (!key) return;
    const culture = this.#selectedCulture(catalog);
    if (!culture?.backgroundSlugs.includes(key)) return;
    if (!getCatalogBackground(catalog, key)) return;
    this.#draft.backgroundKey = key;
    this.#resetBackgroundPicks();
    await this.render();
  }

  static async #onRollBackground(this: CharacterCreateWizard): Promise<void> {
    const catalog = await this.#ensureCatalog();
    const culture = this.#selectedCulture(catalog);
    const list = this.#backgroundsForCulture(catalog, culture);
    if (!list.length) return;
    const { total } = await postCreationRoll(
      `1d${list.length}`,
      localize("KEDOM.Creation.Wizard.BackgroundRollFlavor"),
    );
    const pick = list[total - 1] ?? list[0];
    if (!pick) return;
    this.#draft.backgroundKey = pick.slug;
    this.#resetBackgroundPicks();
    await this.render();
  }

  #resetBackgroundPicks(): void {
    this.#draft.freeWild = emptyPick();
    this.#draft.roll1 = null;
    this.#draft.roll1Wild = emptyPick();
    this.#draft.roll1OriginalLabel = "";
    this.#draft.roll2 = null;
    this.#draft.roll2Wild = emptyPick();
    this.#draft.roll2OriginalLabel = "";
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

  static async #onRollSkill1(this: CharacterCreateWizard): Promise<void> {
    const { total } = await postCreationRoll(
      "1d8",
      `${localize("KEDOM.Creation.Wizard.BackgroundSkillRollFlavor")} (1)`,
    );
    this.#draft.roll1 = total;
    this.#draft.roll1Wild = emptyPick();
    this.#draft.roll1OriginalLabel = "";
    await this.render();
  }

  static async #onSetRoll1Wild(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const catalog = await this.#ensureCatalog();
    const leaf = target.dataset.specLeaf;
    if (leaf) {
      const skillKey = this.#draft.roll1Wild.skillKey;
      if (skillKey) {
        const prior = this.#ownedGrants(catalog, {
          includeRoll1: false,
          includeRoll2: false,
        });
        const candidate = resolveConcreteEntry({ kind: "anySkill" }, { skillKey, specLabel: leaf });
        if (candidate && isGrantBlocked(prior, candidate)) return;
      }
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
    await this.render();
  }

  static async #onSetRoll2Wild(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const catalog = await this.#ensureCatalog();
    const leaf = target.dataset.specLeaf;
    if (leaf) {
      const skillKey = this.#draft.roll2Wild.skillKey;
      if (skillKey) {
        const prior = this.#ownedGrants(catalog, {
          includeRoll1: true,
          includeRoll2: false,
        });
        const candidate = resolveConcreteEntry({ kind: "anySkill" }, { skillKey, specLabel: leaf });
        if (candidate && isGrantBlocked(prior, candidate)) return;
      }
      this.#draft.roll2Wild.specLabel = leaf;
      await this.render();
      return;
    }
    const key = target.dataset.skillKey as SkillKey | undefined;
    if (!key || !SKILL_KEYS.includes(key)) return;
    this.#draft.roll2Wild = { skillKey: key, specLabel: null };
    await this.render();
  }

  static async #onPickClass(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const catalog = await this.#ensureCatalog();
    const key = target.dataset.classKey;
    if (!key) return;
    const culture = this.#selectedCulture(catalog);
    if (!culture?.classSlugs.includes(key)) return;
    if (!getCatalogClass(catalog, key)) return;
    this.#draft.classKey = key;
    this.#draft.hitDieTotal = null;
    this.#readNameFromForm();
    await this.render();
  }

  static async #onRollHp(this: CharacterCreateWizard): Promise<void> {
    const catalog = await this.#ensureCatalog();
    const cls = this.#selectedClass(catalog);
    if (!cls) return;
    this.#readNameFromForm();
    const { total } = await postCreationRoll(
      cls.hitDie,
      game.i18n.format("KEDOM.Creation.Wizard.HpRollFlavor", { hitDie: cls.hitDie }),
    );
    this.#draft.hitDieTotal = total;
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

  /** Origin system payload for the embedded class item (from class origin seeds). */
  #classOriginSystem(classKey: string, hitDieFallback: string): Record<string, unknown> {
    if (classKey === "adventurer") {
      const combined = combineClassOriginsBySlug("warrior-partial", "expert-partial");
      if (!combined) {
        return { subType: "class", slug: "adventurer", hitDie: hitDieFallback, isFull: true };
      }
      return {
        subType: "class",
        slug: "adventurer",
        description: "",
        isFull: true,
        hitDie: combined.hitDie,
        hitDiePriority: combined.hitDiePriority,
        classTalentKeys: [...combined.classTalentKeys],
        talentPicks: combined.talentPicks,
        arts: {
          skillKey: combined.arts.skillKey,
          abilityKeys: [...combined.arts.abilityKeys],
          receiveTableKey: "",
          artKeys: [],
        },
        saves: combined.saves,
        grants: { skills: [], specializations: [], abilities: [] },
      };
    }
    const seed = getClassOrigin(classKey);
    if (!seed) {
      return { subType: "class", slug: classKey, hitDie: hitDieFallback, isFull: true };
    }
    return { ...seed.system };
  }

  #pushTalentPayload(
    items: CatalogItemPayload[],
    catalog: OriginsCatalog,
    talentSlug: string,
    seen: Set<string>,
  ): void {
    if (!talentSlug || seen.has(talentSlug)) return;
    const payload = catalog.talentBySlug.get(talentSlug);
    if (!payload) return;
    seen.add(talentSlug);
    items.push(payload);
  }

  async #createActor(): Promise<void> {
    const catalog = await this.#ensureCatalog();
    const d = this.#draft;
    if (!d.regionKey || !d.cultureKey || !d.backgroundKey || !d.classKey) return;
    if (!d.abilitiesRolled) return;

    const culture = this.#selectedCulture(catalog);
    const background = this.#selectedBackground(catalog);
    const catalogClass = this.#selectedClass(catalog);
    if (!culture || !background || !catalogClass) return;

    const classDef = catalogClass.def ?? getClass(d.classKey) ?? null;
    const grants = this.#ownedGrants(catalog);
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

    const cultureLabel = culture.name;
    const backgroundLabel = background.name;
    const classLabel = catalogClass.name;

    const draftCulture = getCulture(d.regionKey as RegionKey, d.cultureKey) ?? undefined;
    const featureKeys = classDef
      ? featureKeysForCreate(draftCulture?.raceFeatures, classDef.classFeatures)
      : featureKeysForCreate(draftCulture?.raceFeatures, []);
    const featureItems = featureKeys.map((key) => featureTalentCreateData(key));
    const talentPicks = resolveTalentPickBudget(draftCulture, classDef ?? undefined);

    const hpMax = this.#startingHp();
    if (hpMax === null || d.hitDieTotal === null) {
      ui.notifications.warn(localize("KEDOM.Creation.Wizard.IncompleteStep"));
      return;
    }

    const saves = classDef
      ? classSaveSystemData(classDef)
      : classSaveSystemData(getClass("warrior")!);

    const items: CatalogItemPayload[] = [];
    const seenTalents = new Set<string>();

    if (catalog.fromPacks) {
      const racePayload = catalog.originBySlug.get(d.cultureKey);
      const bgPayload = catalog.originBySlug.get(d.backgroundKey);
      const classPayload = catalog.originBySlug.get(d.classKey);
      if (racePayload) items.push(racePayload);
      else {
        items.push({
          name: cultureLabel,
          type: "origin",
          img: "icons/svg/mystery-man.svg",
          system: { subType: "race", slug: d.cultureKey, description: culture.description },
        });
      }
      if (bgPayload) items.push(bgPayload);
      else {
        items.push({
          name: backgroundLabel,
          type: "origin",
          img: "icons/svg/book.svg",
          system: {
            subType: "background",
            slug: d.backgroundKey,
            description: background.description,
          },
        });
      }
      if (classPayload) items.push(classPayload);
      else {
        items.push({
          name: classLabel,
          type: "origin",
          img: "icons/svg/combat.svg",
          system: this.#classOriginSystem(d.classKey, catalogClass.hitDie),
        });
      }
      this.#pushTalentPayload(items, catalog, culture.talentSlug, seenTalents);
      this.#pushTalentPayload(items, catalog, catalogClass.talentSlug, seenTalents);
    } else {
      items.push(
        {
          name: cultureLabel,
          type: "origin",
          img: "icons/svg/mystery-man.svg",
          system: { subType: "race", description: "" },
        },
        {
          name: backgroundLabel,
          type: "origin",
          img: "icons/svg/book.svg",
          system: { subType: "background", description: "" },
        },
        {
          name: classLabel,
          type: "origin",
          img: "icons/svg/combat.svg",
          system: this.#classOriginSystem(d.classKey, catalogClass.hitDie),
        },
      );
    }

    for (const feat of featureItems) {
      items.push({
        name: feat.name,
        type: feat.type,
        img: feat.img ?? "icons/svg/upgrade.svg",
        system: feat.system as Record<string, unknown>,
      });
    }

    const actorData = {
      name: d.name.trim() || localize("KEDOM.Creation.Wizard.DefaultName"),
      type: "character",
      system: {
        abilities,
        skills,
        saves,
        details: {
          level: 1,
          culture: cultureLabel,
          background: backgroundLabel,
          class: classLabel,
          region: d.regionKey,
        },
        attributes: {
          hp: { value: hpMax, max: hpMax },
        },
      },
      flags: {
        kedom: {
          talentPicks,
        },
      },
      items,
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
