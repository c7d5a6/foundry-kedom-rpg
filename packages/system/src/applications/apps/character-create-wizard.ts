import { systemOf } from "../../types/accessors.ts";
import { localize } from "../../i18n/localize.ts";
import { repickLoss } from "../../creation/repick.ts";
import { enrichHTML } from "../enrich.ts";
import { buildAbilityData, buildOriginItems, buildSkillData } from "./wizard/actor-data.ts";
import { isFilled, prefixKeys } from "./wizard/text.ts";
import { SKILL_KEYS } from "../../config/kedom.ts";
import {
  CREATION_ABILITY_KEYS,
  CREATION_REPLACEABLE_ABILITY_KEYS,
  getCulture,
  resolveTalentPickBudget,
  classSaveSystemData,
  type CreationAbilityKey,
  type GrowthEntry,
  type RegionKey,
} from "../../config/creation.ts";
import { abilityModifier } from "../../derivations/ability-mod.ts";
import { localizePersistedSpecLabel } from "../../config/creation-spec-labels.ts";
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
  type CatalogRegion,
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
  combineClassOrigins,
  combinedOriginSaveProficiencies,
  type CombinedClassOrigin,
} from "../../creation/combine-class-origins.ts";
import type { OriginDataFields } from "../../data/item/origin-fields.ts";
import type { ClassDef } from "../../config/creation.ts";
import {
  COMBAT_SKILLS,
  entryNeedsPlayerSpecialization,
  countSkill,
  formatGrantLabel,
  isBonusSkillPickBlocked,
  isGrantBlocked,
  mergeSkillGrants,
  resolveBonusSkillPick,
  resolveConcreteEntry,
  resolveRolledEntry,
  skillNeedsSpecialization,
  type ResolvePick,
  type ResolvedSkillGrant,
  type RolledResolveState,
} from "../../creation/resolve-background.ts";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const STEPS = ["abilities", "region", "culture", "background", "className", "confirm"] as const;
type StepId = (typeof STEPS)[number];

/** Step names for the breadcrumb. Literal keys so the lang-key test can see them. */
const STEP_TITLE_KEYS: Record<StepId, string> = {
  abilities: "KEDOM.Creation.Step.abilities",
  region: "KEDOM.Creation.Step.region",
  culture: "KEDOM.Creation.Step.culture",
  background: "KEDOM.Creation.Step.background",
  className: "KEDOM.Creation.Step.className",
  confirm: "KEDOM.Creation.Step.confirm",
};

/** Why Next is disabled, per step. Literal keys so the lang-key test can see them. */
const STEP_HINT_KEYS: Record<StepId, string> = {
  abilities: "KEDOM.Creation.Wizard.Hint.abilities",
  region: "KEDOM.Creation.Wizard.Hint.region",
  culture: "KEDOM.Creation.Wizard.Hint.culture",
  background: "KEDOM.Creation.Wizard.Hint.background",
  className: "KEDOM.Creation.Wizard.Hint.className",
  confirm: "KEDOM.Creation.Wizard.IncompleteStep",
};

interface Draft {
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
  /** Extra any-skill pick after free + growth (outside interests). */
  bonusWild: ResolvePick;
  /** Full class slug (mutually exclusive with partialKeys). */
  classKey: string | null;
  /** Up to two partial class slugs (Adventurer). */
  partialKeys: string[];
  /** Raw hit-die roll total (before Might mod); set via Roll HP. */
  hitDieTotal: number | null;
}

function emptyAbilities(): Record<CreationAbilityKey, number | null> {
  return { mgh: null, dex: null, kno: null, foc: null, pre: null, lck: null };
}

function emptyPick(): ResolvePick {
  return { skillKey: null, specLabel: null };
}

async function enrichHtml(html: string): Promise<string> {
  if (!html.trim()) return "";
  return enrichHTML(html, {});
}

export class CharacterCreateWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  #draft: Draft;
  #nameAbort: AbortController | null = null;
  #catalog: OriginsCatalog | null = null;
  #creating = false;
  /** Set when the wizard closes on purpose (character created), skipping the discard prompt. */
  #closeConfirmed = false;

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
      bonusWild: emptyPick(),
      classKey: null,
      partialKeys: [],
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
      goToStep: CharacterCreateWizard.#onGoToStep,
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
      setBonusWild: CharacterCreateWizard.#onSetBonusWild,
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

  /** Anything the player would lose by closing the window. */
  #hasProgress(): boolean {
    const d = this.#draft;
    return d.name.trim() !== "" || d.abilitiesRolled || d.regionKey !== null;
  }

  override async close(
    options: foundry.applications.api.ApplicationV2.ClosingOptions = {},
  ): Promise<this> {
    if (!this.#closeConfirmed && this.#hasProgress()) {
      this.#readNameFromForm();
      const discard = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("KEDOM.Creation.Wizard.Title") },
        content: `<p>${game.i18n.localize("KEDOM.Creation.Wizard.DiscardConfirm")}</p>`,
      });
      if (discard !== true) return this;
    }
    await super.close(options);
    return this;
  }

  /**
   * The window element. Foundry types it as always present, but it is undefined until the
   * first render, and handlers can run before that.
   */
  get #root(): HTMLElement | undefined {
    const element: HTMLElement | undefined = this.element;
    return element;
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
    this.#revealNewSpecBlock();
  }

  /** Specialization pickers open below the fold; bring a newly shown one into view. */
  #specBlockCount = 0;
  #revealNewSpecBlock(): void {
    const blocks = this.#root?.querySelectorAll<HTMLElement>(".kedom-create-wizard__spec");
    const count = blocks?.length ?? 0;
    if (count > this.#specBlockCount) blocks?.item(count - 1).scrollIntoView({ block: "nearest" });
    this.#specBlockCount = count;
  }

  #bindNameInput(): void {
    this.#nameAbort?.abort();
    this.#nameAbort = new AbortController();
    const input = this.#root?.querySelector<HTMLInputElement>('input[name="characterName"]');
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
    for (const input of this.#root?.querySelectorAll<HTMLInputElement>("input[data-spec-target]") ??
      []) {
      const sync = () => {
        const target = input.dataset.specTarget;
        const value = input.value.trim();
        if (target === "free") this.#draft.freeWild.specLabel = value || null;
        else if (target === "roll1") this.#draft.roll1Wild.specLabel = value || null;
        else if (target === "roll2") this.#draft.roll2Wild.specLabel = value || null;
        else if (target === "bonus") this.#draft.bonusWild.specLabel = value || null;
        this.#refreshNextButton();
      };
      // `input` keeps Next in sync while typing; `change` re-renders on blur/commit.
      input.addEventListener("input", sync, opts);
      input.addEventListener(
        "change",
        () => {
          sync();
          void this.render();
        },
        opts,
      );
    }
  }

  #refreshNextButton(): void {
    const root = this.#root;
    if (root === undefined) return;
    const btn = root.querySelector<HTMLButtonElement>('[data-action="next"]');
    if (!btn) return;
    const canAdvance = this.#canAdvance();
    btn.disabled = !canAdvance;
    const hint = root.querySelector<HTMLElement>(".kedom-create-wizard__hint");
    if (hint) hint.hidden = canAdvance;
  }

  #selectedCulture(catalog: OriginsCatalog): CatalogCulture | undefined {
    const d = this.#draft;
    if (!isFilled(d.regionKey) || !isFilled(d.cultureKey)) return undefined;
    return getCatalogCulture(catalog, d.regionKey, d.cultureKey);
  }

  #selectedBackground(catalog: OriginsCatalog): CatalogBackground | undefined {
    const d = this.#draft;
    if (!isFilled(d.backgroundKey)) return undefined;
    return getCatalogBackground(catalog, d.backgroundKey);
  }

  #selectedClass(catalog: OriginsCatalog): CatalogClass | undefined {
    const d = this.#draft;
    if (!isFilled(d.classKey)) return undefined;
    return getCatalogClass(catalog, d.classKey);
  }

  #selectedPartials(catalog: OriginsCatalog): CatalogClass[] {
    return this.#draft.partialKeys
      .map((slug) => getCatalogClass(catalog, slug))
      .filter((c): c is CatalogClass => c !== undefined);
  }

  #hasValidClassSelection(catalog: OriginsCatalog): boolean {
    const d = this.#draft;
    if (isFilled(d.classKey)) {
      const cls = getCatalogClass(catalog, d.classKey);
      return Boolean(cls?.isFull);
    }
    if (d.partialKeys.length !== 2) return false;
    const [a, b] = this.#selectedPartials(catalog);
    return Boolean(a && b && !a.isFull && !b.isFull && a.slug !== b.slug);
  }

  #originFields(catalog: OriginsCatalog, slug: string): OriginDataFields | null {
    const payload = catalog.originBySlug.get(slug);
    if (!payload?.system) return null;
    const sys = systemOf<OriginDataFields>(payload);
    if (sys.subType !== "class") return null;
    return sys;
  }

  #combinedPartials(catalog: OriginsCatalog): CombinedClassOrigin | null {
    const partials = this.#selectedPartials(catalog);
    if (partials.length !== 2) return null;
    const [a, b] = partials;
    if (a === undefined || b === undefined) return null;
    const sysA = this.#originFields(catalog, a.slug);
    const sysB = this.#originFields(catalog, b.slug);
    if (!sysA || !sysB) return null;
    return combineClassOrigins(sysA, a.name, sysB, b.name);
  }

  #effectiveHitDie(catalog: OriginsCatalog): string {
    if (isFilled(this.#draft.classKey)) {
      return this.#selectedClass(catalog)?.hitDie ?? "1d6";
    }
    return this.#combinedPartials(catalog)?.hitDie ?? "1d6";
  }

  #effectiveClassLabel(catalog: OriginsCatalog): string {
    const full = this.#selectedClass(catalog);
    if (full) return full.name;
    const partials = this.#selectedPartials(catalog);
    const [first, second] = partials;
    if (partials.length === 2 && first !== undefined && second !== undefined) {
      return `${first.name} / ${second.name}`;
    }
    return "";
  }

  #classDefForCreate(catalog: OriginsCatalog): ClassDef | null {
    const full = this.#selectedClass(catalog);
    if (full?.def) return full.def;
    const combined = this.#combinedPartials(catalog);
    if (!combined) return null;
    return {
      key: `${combined.partialSlugs[0]}+${combined.partialSlugs[1]}`,
      labelKey: "",
      hitDie: combined.hitDie,
      talentPicks: {
        ...(combined.talentPicks.warrior ? { warrior: combined.talentPicks.warrior } : {}),
        ...(combined.talentPicks.expert ? { expert: combined.talentPicks.expert } : {}),
        ...(combined.talentPicks.any ? { any: combined.talentPicks.any } : {}),
      },
      saveProficiencies: combinedOriginSaveProficiencies(combined),
    };
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
    // First open can wait on pack loading; show a placeholder instead of an empty window.
    const ready = await Promise.race([
      this.#ensureCatalog().then(() => true),
      new Promise<boolean>((resolve) =>
        setTimeout(() => {
          resolve(false);
        }, 200),
      ),
    ]);
    if (!ready) {
      void this.#ensureCatalog()
        .then(() => this.render())
        .catch((err: unknown) => {
          console.error("Kedom | origins catalog failed to load", err);
        });
      return { loading: true, stepTitle: localize(STEP_TITLE_KEYS[this.stepId]), stepNav: [] };
    }
    const catalog = await this.#ensureCatalog();
    const d = this.#draft;
    const region = isFilled(d.regionKey) ? getCatalogRegion(catalog, d.regionKey) : undefined;
    const culture = this.#selectedCulture(catalog);
    const background = this.#selectedBackground(catalog);

    // Slice order matters: the background slice seeds draft picks that the confirm slice reads.
    return {
      ...this.#navContext(),
      ...this.#abilitiesContext(),
      ...(await this.#regionContext(catalog, region)),
      ...(await this.#cultureContext(catalog, region, culture)),
      ...(await this.#backgroundContext(catalog, culture, background)),
      ...(await this.#classContext(catalog, culture)),
      ...this.#confirmContext(catalog),
    };
  }

  #navContext() {
    const d = this.#draft;
    return {
      stepId: this.stepId,
      stepCurrent: d.stepIndex + 1,
      stepCount: STEPS.length,
      stepNav: STEPS.map((id, index) => ({
        index,
        number: index + 1,
        label: localize(STEP_TITLE_KEYS[id]),
        current: index === d.stepIndex,
        done: index < d.stepIndex,
      })),
      stepTitle: localize(`KEDOM.Creation.Step.${this.stepId}`),
      name: d.name,
      isFirst: d.stepIndex === 0,
      isLast: d.stepIndex === STEPS.length - 1,
    };
  }

  #abilitiesContext() {
    const d = this.#draft;
    const abilityRows = CREATION_ABILITY_KEYS.map((key) => ({
      key,
      label: localize(`KEDOM.Ability.${key}.label`, key),
      value: d.abilities[key],
      display: d.abilities[key] === null ? "—" : String(d.abilities[key]),
      canReplace:
        d.abilitiesRolled && (CREATION_REPLACEABLE_ABILITY_KEYS as readonly string[]).includes(key),
      isReplaced: d.replacedAbility === key,
    }));
    return { abilitiesRolled: d.abilitiesRolled, abilityRows };
  }

  async #regionContext(catalog: OriginsCatalog, region: CatalogRegion | undefined) {
    const d = this.#draft;
    const regions = catalog.regions.map((r) => ({
      key: r.slug,
      label: r.name,
      selected: d.regionKey === r.slug,
    }));
    return {
      regions,
      regionDescriptionHtml: region ? await enrichHtml(region.description) : "",
      showRegionDetail: Boolean(region),
    };
  }

  async #cultureContext(
    catalog: OriginsCatalog,
    region: CatalogRegion | undefined,
    culture: CatalogCulture | undefined,
  ) {
    const d = this.#draft;
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
    const cultureTalent = culture ? getCatalogTalent(catalog, culture.talentSlug) : undefined;
    return {
      cultures,
      cultureDescriptionHtml: culture ? await enrichHtml(culture.description) : "",
      cultureTalentName: cultureTalent?.name ?? "",
      cultureTalentHtml: cultureTalent ? await enrichHtml(cultureTalent.description) : "",
      showCultureDetail: Boolean(culture),
    };
  }

  async #backgroundContext(
    catalog: OriginsCatalog,
    culture: CatalogCulture | undefined,
    background: CatalogBackground | undefined,
  ) {
    const d = this.#draft;
    const backgrounds = this.#backgroundsForCulture(catalog, culture).map((b, index) => ({
      key: b.slug,
      index: index + 1,
      label: b.name,
      selected: d.backgroundKey === b.slug,
    }));
    return {
      backgrounds,
      backgroundKey: d.backgroundKey,
      backgroundLabel: background?.name ?? "",
      backgroundDescriptionHtml: background ? await enrichHtml(background.description) : "",
      showBackgroundDetail: Boolean(background),
      ...this.#freeContext(catalog, background),
      ...this.#rollsContext(catalog, background),
      combatOptions: COMBAT_SKILLS.map((key) => ({ key, label: localize(`KEDOM.Skill.${key}`) })),
      skillOptions: SKILL_KEYS.map((key) => ({ key, label: localize(`KEDOM.Skill.${key}`) })),
    };
  }

  #freeContext(catalog: OriginsCatalog, background: CatalogBackground | undefined) {
    const d = this.#draft;
    const freeNeedsWild =
      background?.free.kind === "anyCombat" || background?.free.kind === "anySkill";
    const freeWildIsCombat = background?.free.kind === "anyCombat";
    // Concrete free skill without authored specialization → seed skill for Spec UI.
    if (
      background &&
      entryNeedsPlayerSpecialization(background.free) &&
      background.free.kind === "skill"
    ) {
      if (d.freeWild.skillKey !== background.free.skillKey) {
        d.freeWild = { skillKey: background.free.skillKey, specLabel: d.freeWild.specLabel };
      }
    }
    const freeResolved = background ? resolveConcreteEntry(background.free, d.freeWild) : null;

    const ownedFree = this.#ownedGrants(catalog, {
      includeRoll1: false,
      includeRoll2: false,
      includeBonus: false,
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

    return {
      freeDone: Boolean(freeResolved),
      freeLabel: background ? this.#entryLabel(background.free) : "",
      freeNeedsWild,
      freeWildIsCombat,
      freeWildPick: d.freeWild.skillKey,
      freeSpecUI: this.#specUI("free", d.freeWild, []),
      freeResolvedLabel: freeResolved ? formatGrantLabel(freeResolved) : "",
      tableRows,
    };
  }

  /** Both background growth rolls plus the bonus pick, as the template's flat `roll1*`/`roll2*`/`bonus*` keys. */
  #rollsContext(catalog: OriginsCatalog, background: CatalogBackground | undefined) {
    const d = this.#draft;
    const ownedBeforeRoll1 = this.#ownedGrants(catalog, {
      includeRoll1: false,
      includeRoll2: false,
      includeBonus: false,
    });
    const ownedBeforeRoll2 = this.#ownedGrants(catalog, {
      includeRoll1: true,
      includeRoll2: false,
      includeBonus: false,
    });
    const ownedBeforeBonus = this.#ownedGrants(catalog, {
      includeRoll1: true,
      includeRoll2: true,
      includeBonus: false,
    });
    const bonusResolved = resolveBonusSkillPick(ownedBeforeBonus, d.bonusWild);

    const roll1 = this.#rollView(1, background, ownedBeforeRoll1);
    const roll2 = this.#rollView(2, background, ownedBeforeRoll2);

    return {
      roll1: d.roll1,
      roll2: d.roll2,
      ...prefixKeys("roll1", roll1.fields),
      ...prefixKeys("roll2", roll2.fields),
      rollsDone: (roll1.state?.grant ? 1 : 0) + (roll2.state?.grant ? 1 : 0),
      bonusDone: Boolean(bonusResolved),
      bonusWildPick: d.bonusWild.skillKey,
      bonusSkillOptions: SKILL_KEYS.map((key) => ({
        key,
        label: localize(`KEDOM.Skill.${key}`),
        selected: d.bonusWild.skillKey === key,
        disabled: countSkill(ownedBeforeBonus, key) >= 2,
      })),
      bonusSpecUI: this.#specUI("bonus", d.bonusWild, ownedBeforeBonus, isBonusSkillPickBlocked),
      bonusResolvedLabel: bonusResolved ? formatGrantLabel(bonusResolved) : "",
    };
  }

  /** One growth roll: seeds the draft's wild pick and original label, then derives its template fields. */
  #rollView(
    n: 1 | 2,
    background: CatalogBackground | undefined,
    owned: readonly ResolvedSkillGrant[],
  ): { state: RolledResolveState | null; fields: Record<string, unknown> } {
    const d = this.#draft;
    const rolled = n === 1 ? d.roll1 : d.roll2;
    const entry = background && rolled !== null ? (background.growth[rolled - 1] ?? null) : null;
    let wild = n === 1 ? d.roll1Wild : d.roll2Wild;

    // Seed fixed skill for Spec UI when a concrete growth row needs a player specialization.
    if (entry && entryNeedsPlayerSpecialization(entry) && entry.kind === "skill") {
      if (!isFilled(wild.skillKey)) {
        wild = { skillKey: entry.skillKey, specLabel: wild.specLabel };
        if (n === 1) d.roll1Wild = wild;
        else d.roll2Wild = wild;
      }
    }

    const state = entry !== null ? resolveRolledEntry(entry, owned, wild) : null;
    if (state?.rolledGrant) {
      const label = formatGrantLabel(state.rolledGrant);
      if (n === 1) d.roll1OriginalLabel = label;
      else d.roll2OriginalLabel = label;
    }
    const originalLabel = n === 1 ? d.roll1OriginalLabel : d.roll2OriginalLabel;

    return {
      state,
      fields: {
        label: entry ? this.#entryLabel(entry) : "",
        needsCombat: state?.needsCombatPick ?? false,
        needsAny: state?.needsAnySkill ?? false,
        // Keep skill chooser while wild/substitute pick is incomplete (incl. needing a specialization).
        showAnySkills: this.#showAnySkillChooser(state, entry),
        needsSpec: state?.needsSpecialization ?? false,
        substituted: state?.substituted ?? false,
        rolledLabel:
          (state?.rolledGrant ? formatGrantLabel(state.rolledGrant) : "") || originalLabel,
        finalLabel: state?.grant ? formatGrantLabel(state.grant) : "",
        wildPick: wild.skillKey,
        specUI: this.#specUI(n === 1 ? "roll1" : "roll2", wild, owned),
      },
    };
  }

  async #classContext(catalog: OriginsCatalog, culture: CatalogCulture | undefined) {
    const d = this.#draft;
    const allowedClasses = this.#classesForCulture(catalog, culture);
    const mapClassOption = (c: CatalogClass) => ({
      key: c.slug,
      label: c.name,
      hitDie: c.hitDie,
      selected: d.classKey === c.slug || d.partialKeys.includes(c.slug),
    });
    const hasClassSelected = this.#hasValidClassSelection(catalog);
    const selectedClass = this.#selectedClass(catalog);
    const effectiveHitDie = this.#effectiveHitDie(catalog);
    const startingHp = this.#startingHp();

    const detailClasses = selectedClass ? [selectedClass] : this.#selectedPartials(catalog);
    const classTalentSlugs = [...new Set(detailClasses.flatMap((c) => c.talentSlugs))];
    const classTalents = classTalentSlugs
      .map((slug) => getCatalogTalent(catalog, slug))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));

    return {
      fullClassOptions: allowedClasses.filter((c) => c.isFull).map(mapClassOption),
      partialClassOptions: allowedClasses.filter((c) => !c.isFull).map(mapClassOption),
      needSecondPartial: d.partialKeys.length === 1,
      selectedClassHitDie: effectiveHitDie,
      hasClassSelected,
      startingHp,
      startingHpLabel:
        startingHp !== null && hasClassSelected
          ? game.i18n.format("KEDOM.Creation.Wizard.StartingHp", {
              hp: String(startingHp),
              hitDie: effectiveHitDie,
              roll: String(d.hitDieTotal ?? 0),
            })
          : "",
      classDescriptionHtml: (await Promise.all(detailClasses.map((c) => enrichHtml(c.description))))
        .filter(Boolean)
        .join(""),
      classTalentBlocks: await Promise.all(
        classTalents.map(async (t) => ({
          name: t.name,
          html: await enrichHtml(t.description),
        })),
      ),
      showClassDetail: detailClasses.length > 0,
    };
  }

  #confirmContext(catalog: OriginsCatalog) {
    return {
      confirmLines: this.#confirmLines(catalog),
      canNext: this.#canAdvance(catalog),
      stepHint: localize(STEP_HINT_KEYS[this.stepId], ""),
    };
  }

  /** Hit die roll + Might mod, min 1. Null until Roll HP. */
  #startingHp(): number | null {
    const d = this.#draft;
    if (d.hitDieTotal === null) return null;
    if (!this.#catalog || !this.#hasValidClassSelection(this.#catalog)) return null;
    const mgh = d.abilities.mgh ?? 10;
    return Math.max(1, Math.floor(d.hitDieTotal + abilityModifier(mgh)));
  }

  #specUI(
    target: "free" | "roll1" | "roll2" | "bonus",
    pick: ResolvePick,
    owned: readonly ResolvedSkillGrant[],
    blockFn: typeof isGrantBlocked = isGrantBlocked,
  ): {
    show: boolean;
    freeform: boolean;
    fixedOptions: { leaf: string; label: string; selected: boolean; disabled: boolean }[];
    value: string;
    target: string;
  } {
    const skillKey = pick.skillKey;
    if (!isFilled(skillKey) || !skillNeedsSpecialization(skillKey)) {
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
            disabled: candidate !== null && blockFn(owned, candidate),
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
    if (!isFilled(entry.specLabel)) return skill;
    const spec = localizePersistedSpecLabel(entry.skillKey, entry.specLabel, entry.specLabel);
    return `${skill} (${spec})`;
  }

  /**
   * Keep the any-skill grid visible for wild/substitute picks — including after a
   * specialization is chosen — so the player can change their mind.
   */
  #showAnySkillChooser(state: RolledResolveState | null, entry: GrowthEntry | null): boolean {
    if (!state) return false;
    if (state.needsCombatPick) return false;
    if (state.needsAnySkill) return true;
    // Substitute or anySkill wild pick: stay open even once the grant resolves.
    if (state.substituted || entry?.kind === "anySkill") return true;
    return false;
  }

  #ownedGrants(
    catalog: OriginsCatalog,
    opts?: {
      includeRoll1?: boolean;
      includeRoll2?: boolean;
      includeBonus?: boolean;
    },
  ): ResolvedSkillGrant[] {
    const includeRoll1 = opts?.includeRoll1 ?? true;
    const includeRoll2 = opts?.includeRoll2 ?? true;
    const includeBonus = opts?.includeBonus ?? true;
    const d = this.#draft;
    if (!isFilled(d.backgroundKey)) return [];
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

    if (includeBonus) {
      const bonus = resolveBonusSkillPick(out, d.bonusWild);
      if (bonus) out.push(bonus);
    }

    return out;
  }

  #confirmLines(catalog: OriginsCatalog): string[] {
    const d = this.#draft;
    const lines: string[] = [];
    if (d.name) lines.push(d.name);
    if (isFilled(d.regionKey)) {
      const r = getCatalogRegion(catalog, d.regionKey);
      if (r) lines.push(r.name);
    }
    const culture = this.#selectedCulture(catalog);
    if (culture) lines.push(culture.name);
    const background = this.#selectedBackground(catalog);
    if (background) lines.push(background.name);
    const classLabel = this.#effectiveClassLabel(catalog);
    if (classLabel !== "" && this.#hasValidClassSelection(catalog)) {
      const talentSlugs = isFilled(d.classKey)
        ? (this.#selectedClass(catalog)?.talentSlugs ?? [])
        : (this.#combinedPartials(catalog)?.talentSlugs ?? []);
      const talentNames = [...talentSlugs]
        .map((slug) => getCatalogTalent(catalog, slug)?.name)
        .filter((n): n is string => Boolean(n));
      lines.push(talentNames.length ? `${classLabel} (${talentNames.join(", ")})` : classLabel);
    }
    const hp = this.#startingHp();
    if (hp !== null && this.#hasValidClassSelection(catalog)) {
      lines.push(
        game.i18n.format("KEDOM.Creation.Wizard.StartingHp", {
          hp: String(hp),
          hitDie: this.#effectiveHitDie(catalog),
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
        if (!isFilled(d.backgroundKey)) return false;
        const bg = getCatalogBackground(cat, d.backgroundKey);
        if (!bg) return false;
        // Free grant must resolve (wild pick and/or required specialization).
        if (!resolveConcreteEntry(bg.free, d.freeWild)) {
          return false;
        }
        if (d.roll1 === null || d.roll2 === null) return false;
        const entry1 = bg.growth[d.roll1 - 1];
        const entry2 = bg.growth[d.roll2 - 1];
        if (!entry1 || !entry2) return false;
        const r1 = resolveRolledEntry(
          entry1,
          this.#ownedGrants(cat, {
            includeRoll1: false,
            includeRoll2: false,
            includeBonus: false,
          }),
          d.roll1Wild,
        );
        if (!r1.grant) return false;
        const r2 = resolveRolledEntry(
          entry2,
          this.#ownedGrants(cat, {
            includeRoll1: true,
            includeRoll2: false,
            includeBonus: false,
          }),
          d.roll2Wild,
        );
        if (!r2.grant) return false;
        const beforeBonus = this.#ownedGrants(cat, {
          includeRoll1: true,
          includeRoll2: true,
          includeBonus: false,
        });
        return resolveBonusSkillPick(beforeBonus, d.bonusWild) !== null;
      }
      case "className":
        return Boolean(
          this.#hasValidClassSelection(cat) && d.name.trim() && d.hitDieTotal !== null,
        );
      case "confirm":
        return true;
      default:
        return false;
    }
  }

  #readNameFromForm(): void {
    const input = this.#root?.querySelector<HTMLInputElement>('input[name="characterName"]');
    if (input) this.#draft.name = input.value.trim();
  }

  static async #onNext(this: CharacterCreateWizard): Promise<void> {
    this.#readNameFromForm();
    if (
      this.stepId === "abilities" &&
      this.#draft.abilitiesRolled &&
      this.#draft.replacedAbility === null
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

  /** Breadcrumb: jump back to a finished step (forward still goes through Next). */
  static async #onGoToStep(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const index = Number(target.dataset.stepIndex);
    if (!Number.isInteger(index) || index < 0 || index >= this.#draft.stepIndex) return;
    this.#readNameFromForm();
    this.#draft.stepIndex = index;
    await this.render();
  }

  /** Ask before a re-pick throws away later choices. */
  async #confirmRepick(level: "region" | "culture"): Promise<boolean> {
    if (!repickLoss(this.#draft, level)) return true;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: localize("KEDOM.Creation.Wizard.Title") },
      content: `<p>${localize("KEDOM.Creation.Wizard.RepickConfirm")}</p>`,
    });
    return ok === true;
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
    if (!isFilled(key) || key === "lck" || !this.#draft.abilitiesRolled) return;
    if (!(CREATION_REPLACEABLE_ABILITY_KEYS as readonly string[]).includes(key)) return;

    const prev = this.#draft.replacedAbility;
    if (prev !== null) {
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
    if (!isFilled(key) || !getCatalogRegion(catalog, key)) return;
    if (key === this.#draft.regionKey) return;
    if (!(await this.#confirmRepick("region"))) return;
    this.#draft.regionKey = key;
    this.#draft.cultureKey = null;
    this.#draft.backgroundKey = null;
    this.#draft.classKey = null;
    this.#draft.partialKeys = [];
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
    if (!isFilled(key) || !isFilled(this.#draft.regionKey)) return;
    const culture = getCatalogCulture(catalog, this.#draft.regionKey, key);
    if (!culture || culture.disabled) return;
    if (key === this.#draft.cultureKey) return;
    if (!(await this.#confirmRepick("culture"))) return;
    this.#draft.cultureKey = key;
    this.#draft.backgroundKey = null;
    this.#draft.classKey = null;
    this.#draft.partialKeys = [];
    this.#draft.hitDieTotal = null;
    this.#resetBackgroundPicks();
    await this.render();
  }

  static async #onRollCulture(this: CharacterCreateWizard): Promise<void> {
    const catalog = await this.#ensureCatalog();
    if (!isFilled(this.#draft.regionKey)) return;
    const region = getCatalogRegion(catalog, this.#draft.regionKey);
    const available = region?.cultures.filter((c) => !c.disabled) ?? [];
    const lastOption = available[available.length - 1];
    if (lastOption === undefined) return;
    // Ask before the roll is posted to chat, not after.
    if (!(await this.#confirmRepick("culture"))) return;

    const pcts = culturePercents(available.map((c) => c.weight));
    const { total } = await postCreationRoll(
      "1d100",
      localize("KEDOM.Creation.Wizard.CultureRollFlavor"),
    );
    let acc = 0;
    let pick = lastOption;
    for (const [i, option] of available.entries()) {
      acc += pcts[i] ?? 0;
      if (total <= acc) {
        pick = option;
        break;
      }
    }
    this.#draft.cultureKey = pick.slug;
    this.#draft.backgroundKey = null;
    this.#draft.classKey = null;
    this.#draft.partialKeys = [];
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
    if (!isFilled(key)) return;
    const culture = this.#selectedCulture(catalog);
    if (culture?.backgroundSlugs.includes(key) !== true) return;
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
      `1d${String(list.length)}`,
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
    this.#draft.bonusWild = emptyPick();
  }

  static async #onSetFreeWild(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const leaf = target.dataset.specLeaf;
    if (isFilled(leaf)) {
      this.#draft.freeWild.specLabel = leaf;
      await this.render();
      return;
    }
    const key = target.dataset.skillKey;
    if (!isFilled(key) || !SKILL_KEYS.includes(key)) return;
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
    if (isFilled(leaf)) {
      const skillKey = this.#draft.roll1Wild.skillKey;
      if (isFilled(skillKey)) {
        const prior = this.#ownedGrants(catalog, {
          includeRoll1: false,
          includeRoll2: false,
          includeBonus: false,
        });
        const candidate = resolveConcreteEntry({ kind: "anySkill" }, { skillKey, specLabel: leaf });
        if (candidate && isGrantBlocked(prior, candidate)) return;
      }
      this.#draft.roll1Wild.specLabel = leaf;
      await this.render();
      return;
    }
    const key = target.dataset.skillKey;
    if (!isFilled(key) || !SKILL_KEYS.includes(key)) return;
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
    if (isFilled(leaf)) {
      const skillKey = this.#draft.roll2Wild.skillKey;
      if (isFilled(skillKey)) {
        const prior = this.#ownedGrants(catalog, {
          includeRoll1: true,
          includeRoll2: false,
          includeBonus: false,
        });
        const candidate = resolveConcreteEntry({ kind: "anySkill" }, { skillKey, specLabel: leaf });
        if (candidate && isGrantBlocked(prior, candidate)) return;
      }
      this.#draft.roll2Wild.specLabel = leaf;
      await this.render();
      return;
    }
    const key = target.dataset.skillKey;
    if (!isFilled(key) || !SKILL_KEYS.includes(key)) return;
    this.#draft.roll2Wild = { skillKey: key, specLabel: null };
    await this.render();
  }

  static async #onSetBonusWild(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const catalog = await this.#ensureCatalog();
    const prior = this.#ownedGrants(catalog, {
      includeRoll1: true,
      includeRoll2: true,
      includeBonus: false,
    });
    const leaf = target.dataset.specLeaf;
    if (isFilled(leaf)) {
      const skillKey = this.#draft.bonusWild.skillKey;
      if (isFilled(skillKey)) {
        const candidate = resolveConcreteEntry({ kind: "anySkill" }, { skillKey, specLabel: leaf });
        if (candidate && isBonusSkillPickBlocked(prior, candidate)) return;
      }
      this.#draft.bonusWild.specLabel = leaf;
      await this.render();
      return;
    }
    const key = target.dataset.skillKey;
    if (!isFilled(key) || !SKILL_KEYS.includes(key)) return;
    if (countSkill(prior, key) >= 2) return;
    this.#draft.bonusWild = { skillKey: key, specLabel: null };
    await this.render();
  }

  static async #onPickClass(
    this: CharacterCreateWizard,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const catalog = await this.#ensureCatalog();
    const key = target.dataset.classKey;
    if (!isFilled(key)) return;
    const culture = this.#selectedCulture(catalog);
    if (culture?.classSlugs.includes(key) !== true) return;
    const cls = getCatalogClass(catalog, key);
    if (!cls) return;
    const d = this.#draft;
    if (cls.isFull) {
      if (d.classKey === key) {
        d.classKey = null;
      } else {
        d.classKey = key;
        d.partialKeys = [];
      }
    } else {
      d.classKey = null;
      if (d.partialKeys.includes(key)) {
        d.partialKeys = d.partialKeys.filter((k) => k !== key);
      } else if (d.partialKeys.length < 2) {
        d.partialKeys = [...d.partialKeys, key];
      } else {
        const [first] = d.partialKeys;
        if (first === undefined)
          throw new Error("two partial classes are selected, so a first exists");
        d.partialKeys = [first, key];
      }
    }
    d.hitDieTotal = null;
    this.#readNameFromForm();
    await this.render();
  }

  static async #onRollHp(this: CharacterCreateWizard): Promise<void> {
    const catalog = await this.#ensureCatalog();
    if (!this.#hasValidClassSelection(catalog)) return;
    this.#readNameFromForm();
    const hitDie = this.#effectiveHitDie(catalog);
    const { total } = await postCreationRoll(
      hitDie,
      game.i18n.format("KEDOM.Creation.Wizard.HpRollFlavor", { hitDie }),
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
    if (this.#creating) return;
    this.#creating = true;
    try {
      await this.#createActor();
    } finally {
      this.#creating = false;
    }
  }

  async #createActor(): Promise<void> {
    const catalog = await this.#ensureCatalog();
    const d = this.#draft;
    if (!isFilled(d.regionKey) || !isFilled(d.cultureKey) || !isFilled(d.backgroundKey)) return;
    if (!this.#hasValidClassSelection(catalog)) return;
    if (!d.abilitiesRolled) return;

    const culture = this.#selectedCulture(catalog);
    const background = this.#selectedBackground(catalog);
    if (!culture || !background) return;

    const fullClass = this.#selectedClass(catalog);
    const partials = this.#selectedPartials(catalog);
    const combined = fullClass ? null : this.#combinedPartials(catalog);
    const classDef = this.#classDefForCreate(catalog);
    if (!classDef) return;
    if (!fullClass && (!combined || partials.length !== 2)) return;

    const merged = mergeSkillGrants(this.#ownedGrants(catalog));
    const talentSlugs = fullClass ? fullClass.talentSlugs : [...(combined?.talentSlugs ?? [])];

    const draftCulture = getCulture(d.regionKey as RegionKey, d.cultureKey) ?? undefined;
    const talentPicks = resolveTalentPickBudget(draftCulture, classDef);

    const hpMax = this.#startingHp();
    if (hpMax === null || d.hitDieTotal === null) {
      ui.notifications.warn(localize("KEDOM.Creation.Wizard.IncompleteStep"));
      return;
    }

    const region = getCatalogRegion(catalog, d.regionKey);
    const items = buildOriginItems(catalog, {
      regionKey: d.regionKey,
      cultureKey: d.cultureKey,
      backgroundKey: d.backgroundKey,
      region,
      regionLabel: region?.name ?? d.regionKey,
      culture,
      background,
      fullClass,
      partials,
      talentSlugs,
    });

    const actorData = {
      name: d.name.trim() || localize("KEDOM.Creation.Wizard.DefaultName"),
      type: "character",
      system: {
        abilities: buildAbilityData(d.abilities),
        skills: buildSkillData(merged),
        saves: classSaveSystemData(classDef),
        details: {
          level: 1,
          culture: culture.name,
          background: background.name,
          class: this.#effectiveClassLabel(catalog),
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

    await this.#submitActor(actorData);
  }

  async #submitActor(actorData: object): Promise<void> {
    // @ts-expect-error fvtt-types: character + origin subtypes
    const created = await Actor.create(actorData, { renderSheet: true });
    const actor = Array.isArray(created) ? created[0] : created;
    if (actor) {
      ui.notifications.info(
        game.i18n.format("KEDOM.Creation.Wizard.Created", { name: actor.name }),
      );
      this.#closeConfirmed = true;
      await this.close();
    }
  }
}

/** Directory footer button → open wizard (CoC7 / Shadowdark style). */
export function registerCharacterCreateDirectoryButton(
  _app: unknown,
  element: HTMLElement | JQuery,
): void {
  const root = element instanceof HTMLElement ? element : element.get(0);
  if (!root) return;
  if (!game.user.can("ACTOR_CREATE")) return;
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
