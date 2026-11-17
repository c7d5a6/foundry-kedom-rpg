import { characterData } from "../../types/accessors.ts";
import { enrichHTML } from "../enrich.ts";
import { buildCombat } from "./character/context/combat.ts";
import { buildEffects } from "./character/context/effects.ts";
import { buildIdentity, type CharacterDetails } from "./character/context/identity.ts";
import { buildArts, buildTalents } from "./character/context/items.ts";
import {
  buildAbilities,
  buildResources,
  buildSaves,
  woundsNotesOf,
} from "./character/context/resources.ts";
import { buildTierOptions } from "./character/context/shared.ts";
import { buildSkills } from "./character/context/skills.ts";
import { summarizeActorEffort } from "../../derivations/actor-effort.ts";
import type { CharacterData } from "../../data/actor/character.ts";

import {
  onCreateArmor,
  onCreateArt,
  onCreateTalent,
  onCreateWeapon,
  onEditTalent,
  onDeleteTalent,
  onUseArt,
  onToggleArtConcentration,
  onReleaseArtEffort,
  onEditArt,
  onDeleteArt,
  onEndArtScene,
  onEndArtDay,
  onOpenIdentityItem,
  onEditWeapon,
  onDeleteWeapon,
  onEditArmor,
  onDeleteArmor,
} from "./character/item-actions.ts";
import {
  onCreateActorEffect,
  onEditEffect,
  onDeleteEffect,
  onToggleEffect,
  onOpenEffectSource,
} from "./character/effect-actions.ts";
import {
  onTakeWound,
  onRollAttack,
  onRollDamage,
  onRollSkill,
  onRollSave,
  onRollLuckSave,
  onRollStrainSave,
} from "./character/roll-actions.ts";
import {
  onRollSpecialization,
  onToggleSpecialization,
  onAddSpecialization,
  onRemoveSpecialization,
} from "./character/specialization-actions.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const SHEET_MODES = Object.freeze({ PLAY: "play", EDIT: "edit" } as const);
type SheetMode = (typeof SHEET_MODES)[keyof typeof SHEET_MODES];

const SHEET_TABS = Object.freeze({
  SKILLS: "skills",
  COMBAT: "combat",
  TALENTS: "talents",
  ARTS: "arts",
  NOTES: "notes",
  EFFECTS: "effects",
} as const);
type SheetTab = (typeof SHEET_TABS)[keyof typeof SHEET_TABS];

function isSheetTab(value: string | undefined): value is SheetTab {
  return (
    value === SHEET_TABS.SKILLS ||
    value === SHEET_TABS.COMBAT ||
    value === SHEET_TABS.TALENTS ||
    value === SHEET_TABS.ARTS ||
    value === SHEET_TABS.NOTES ||
    value === SHEET_TABS.EFFECTS
  );
}

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
      rollSkill: onRollSkill,
      rollSave: onRollSave,
      rollLuckSave: onRollLuckSave,
      rollStrainSave: onRollStrainSave,
      takeWound: onTakeWound,
      rollAttack: onRollAttack,
      rollDamage: onRollDamage,
      editWeapon: onEditWeapon,
      deleteWeapon: onDeleteWeapon,
      editArmor: onEditArmor,
      deleteArmor: onDeleteArmor,
      createTalent: onCreateTalent,
      createWeapon: onCreateWeapon,
      createArmor: onCreateArmor,
      createArt: onCreateArt,
      editTalent: onEditTalent,
      deleteTalent: onDeleteTalent,
      useArt: onUseArt,
      toggleArtConcentration: onToggleArtConcentration,
      releaseArtEffort: onReleaseArtEffort,
      editArt: onEditArt,
      deleteArt: onDeleteArt,
      endArtScene: onEndArtScene,
      endArtDay: onEndArtDay,
      createActorEffect: onCreateActorEffect,
      editEffect: onEditEffect,
      deleteEffect: onDeleteEffect,
      toggleEffect: onToggleEffect,
      openEffectSource: onOpenEffectSource,
      openIdentityItem: onOpenIdentityItem,
      editResource: CharacterSheet.#onEditResource,
      rollSpecialization: onRollSpecialization,
      toggleSpecialization: onToggleSpecialization,
      addSpecialization: onAddSpecialization,
      removeSpecialization: onRemoveSpecialization,
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
    const actor = this.actor;
    const system = characterData(actor);
    // Hidden tabs are not rendered, so skip their (sometimes async) preparation.
    const tab = this.#primaryTab;
    const onCombat = tab === SHEET_TABS.COMBAT;
    const onNotes = tab === SHEET_TABS.NOTES;
    const tierOptions = buildTierOptions();
    const details = (system as CharacterData & { details?: CharacterDetails }).details ?? {};
    const richText = { secrets: actor.isOwner, relativeTo: actor };

    const enrichedWoundsNotes = onCombat ? await enrichHTML(woundsNotesOf(system), richText) : "";
    const enrichedNotes = onNotes ? await enrichHTML(details.notes ?? "", richText) : "";

    const tabs: { id: SheetTab; label: string; icon: string; active: boolean }[] = [
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

    const effortSummary = summarizeActorEffort(this.actor);
    if (effortSummary.showArtsTab) {
      tabs.splice(3, 0, {
        id: SHEET_TABS.ARTS,
        label: game.i18n.localize("KEDOM.Sheet.Tab.arts"),
        icon: "fa-solid fa-wand-magic-sparkles",
        active: this.#primaryTab === SHEET_TABS.ARTS,
      });
    } else if (this.#primaryTab === SHEET_TABS.ARTS) {
      this.#primaryTab = SHEET_TABS.SKILLS;
      for (const tab of tabs) tab.active = tab.id === SHEET_TABS.SKILLS;
    }

    const [identity, talents, artsView, effects] = await Promise.all([
      buildIdentity(actor, details, this.#tipCache),
      buildTalents(actor, tab === SHEET_TABS.TALENTS),
      buildArts(actor, tab === SHEET_TABS.ARTS),
      Promise.resolve(buildEffects(actor, tab === SHEET_TABS.EFFECTS)),
    ]);

    return Object.assign(context, {
      actor,
      system,
      systemFields: actor.system.schema.fields,
      abilities: buildAbilities(system),
      skills: buildSkills(actor, tierOptions, tab === SHEET_TABS.SKILLS),
      ...buildSaves(system, tierOptions),
      resources: buildResources(system),
      ...buildCombat(actor, system, onCombat),
      talents,
      ...artsView,
      effort: effortSummary,
      isArtOwner: actor.isOwner,
      ...effects,
      ...identity,
      tabs,
      primaryTab: this.#primaryTab,
      isSkillsTab: this.#primaryTab === SHEET_TABS.SKILLS,
      isCombatTab: this.#primaryTab === SHEET_TABS.COMBAT,
      isTalentsTab: this.#primaryTab === SHEET_TABS.TALENTS,
      isArtsTab: this.#primaryTab === SHEET_TABS.ARTS,
      isNotesTab: this.#primaryTab === SHEET_TABS.NOTES,
      isEffectsTab: this.#primaryTab === SHEET_TABS.EFFECTS,
      enrichedWoundsNotes,
      enrichedNotes,
      editable: this.isEditable,
      isPlay: this.isPlayMode,
      /** Rolling needs ownership and play mode; observers see the buttons disabled. */
      canRoll: this.isEditable && this.isPlayMode,
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
    this.element.classList.toggle("tab-arts", this.#primaryTab === SHEET_TABS.ARTS);
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
    // A freshly rendered tabs part lands inside `.window-content`; an earlier one may
    // already sit outside it. Keep only the fresh one (partial renders re-create it).
    const fresh = this.element.querySelector(".window-content .kedom-sheet-tabs-part");
    if (!(fresh instanceof HTMLElement)) return;
    for (const stale of this.element.querySelectorAll(":scope > .kedom-sheet-tabs-part")) {
      stale.remove();
    }
    this.element.append(fresh);
  }

  /** Enriched identity tooltips, keyed by content so edits invalidate naturally. */
  readonly #tipCache = new Map<string, string>();

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

    const hint = `${game.i18n.localize(
      wantEdit ? "KEDOM.Sheet.Mode.edit" : "KEDOM.Sheet.Mode.play",
    )} — ${game.i18n.localize("KEDOM.Sheet.Mode.toggleHint")}`;
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
    } as unknown as foundry.applications.api.ApplicationV2.RenderOptions);
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
    // The header does not depend on the tab; skip re-rendering it.
    await this.render({
      parts: ["tabs", "body"],
    } as unknown as foundry.applications.api.ApplicationV2.RenderOptions);
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
}
