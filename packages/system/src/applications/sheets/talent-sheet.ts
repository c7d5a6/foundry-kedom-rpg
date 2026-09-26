import type { TalentDataFields } from "../../data/item/talent.ts";
import {
  createSkillAdvantageEffect,
  effectListRows,
  promptSkillKeyForAdvantage,
} from "../../active-effects/skill-advantage.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class TalentSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS = {
    ...ItemSheetV2.DEFAULT_OPTIONS,
    classes: ["kedom", "sheet", "item", "talent"],
    position: { width: 480, height: 560 },
    window: {
      ...ItemSheetV2.DEFAULT_OPTIONS.window,
      resizable: true,
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      createEffect: TalentSheet.#onCreateEffect,
      addSkillAdvantage: TalentSheet.#onAddSkillAdvantage,
      editEffect: TalentSheet.#onEditEffect,
      deleteEffect: TalentSheet.#onDeleteEffect,
      toggleEffect: TalentSheet.#onToggleEffect,
    },
  };

  static override PARTS = {
    body: {
      template: "systems/kedom/templates/item/talent.hbs",
      classes: ["kedom-talent-sheet-body"],
      scrollable: [""],
    },
  };

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions,
  ) {
    const context = await super._prepareContext(options);
    const system = this.item.system as unknown as TalentDataFields;
    const enrichedDescription = await TextEditor.enrichHTML(system.description ?? "", {
      secrets: this.item.isOwner,
      relativeTo: this.item,
    });

    return Object.assign(context, {
      item: this.item,
      system,
      systemFields: this.item.system.schema.fields,
      enrichedDescription,
      categoryLabel: game.i18n.localize(`KEDOM.Talent.Category.${system.category}`),
      effects: effectListRows(this.item.effects),
      editable: this.isEditable,
    });
  }

  static async #onCreateEffect(this: TalentSheet): Promise<void> {
    if (!this.isEditable) return;
    const created = await this.item.createEmbeddedDocuments("ActiveEffect", [
      {
        name: game.i18n.localize("KEDOM.Talent.NewEffect"),
        img: "icons/svg/aura.svg",
        transfer: true,
        origin: this.item.uuid,
        disabled: false,
        changes: [],
      },
    ]);
    const effect = Array.isArray(created) ? created[0] : created;
    if (effect) await effect.sheet?.render(true);
  }

  static async #onAddSkillAdvantage(this: TalentSheet): Promise<void> {
    if (!this.isEditable) return;
    const skillKey = await promptSkillKeyForAdvantage();
    if (!skillKey) return;
    const effect = await createSkillAdvantageEffect(this.item, skillKey);
    if (effect) await this.render();
  }

  static async #onEditEffect(
    this: TalentSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const effectId = target.dataset.effectId;
    if (!effectId) return;
    const effect = this.item.effects.get(effectId);
    if (!effect) return;
    await effect.sheet?.render(true);
  }

  static async #onDeleteEffect(
    this: TalentSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.isEditable) return;
    const effectId = target.dataset.effectId;
    if (!effectId) return;
    const effect = this.item.effects.get(effectId);
    if (!effect) return;
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
    this: TalentSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.isEditable) return;
    const effectId = target.dataset.effectId;
    if (!effectId) return;
    const effect = this.item.effects.get(effectId);
    if (!effect) return;
    await effect.update({ disabled: !effect.disabled });
  }
}
