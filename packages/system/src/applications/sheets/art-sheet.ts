import { openSheet } from "../open-sheet.ts";
import { systemOf } from "../../types/accessors.ts";
import { enrichHTML } from "../enrich.ts";
import type { ArtDataFields } from "../../data/item/art.ts";
import { effectListRows } from "../../active-effects/skill-advantage.ts";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class ArtSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS = {
    ...ItemSheetV2.DEFAULT_OPTIONS,
    classes: ["kedom", "sheet", "item", "art"],
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
      createEffect: ArtSheet.#onCreateEffect,
      editEffect: ArtSheet.#onEditEffect,
      deleteEffect: ArtSheet.#onDeleteEffect,
      toggleEffect: ArtSheet.#onToggleEffect,
    },
  };

  static override PARTS = {
    body: {
      template: "systems/kedom/templates/item/art.hbs",
      classes: ["kedom-art-sheet-body"],
      scrollable: [""],
    },
  };

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions,
  ) {
    const context = await super._prepareContext(options);
    const system = systemOf<ArtDataFields>(this.item);
    const enrichedDescription = await enrichHTML(system.description, {
      secrets: this.item.isOwner,
      relativeTo: this.item,
    });

    return Object.assign(context, {
      item: this.item,
      system,
      systemFields: (this.item.system as unknown as { schema: { fields: unknown } }).schema.fields,
      enrichedDescription,
      commitmentLabel: game.i18n.localize(`KEDOM.Art.Commitment.${system.commitment}`),
      effects: effectListRows(this.item.effects),
      editable: this.isEditable,
    });
  }

  static async #onCreateEffect(this: ArtSheet): Promise<void> {
    if (!this.isEditable) return;
    const created = await this.item.createEmbeddedDocuments("ActiveEffect", [
      {
        name: game.i18n.localize("KEDOM.Art.NewEffect"),
        img: "icons/svg/aura.svg",
        transfer: true,
        origin: this.item.uuid,
        disabled: false,
        changes: [],
      },
    ]);
    const effect = Array.isArray(created) ? created[0] : created;
    if (effect) await openSheet(effect);
  }

  static async #onEditEffect(
    this: ArtSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const id = target.dataset.effectId;
    if (id === undefined || id === "") return;
    const effect = this.item.effects.get(id);
    if (effect) await openSheet(effect);
  }

  static async #onDeleteEffect(
    this: ArtSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.isEditable) return;
    const id = target.dataset.effectId;
    if (id === undefined || id === "") return;
    const effect = this.item.effects.get(id);
    if (!effect) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("KEDOM.Sheet.Action.deleteEffect") },
      content: `<p>${game.i18n.format("KEDOM.Sheet.DeleteEffectConfirm", { name: effect.name })}</p>`,
    });
    if (confirmed !== true) return;
    await effect.delete();
  }

  static async #onToggleEffect(
    this: ArtSheet,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    if (!this.isEditable) return;
    const id = target.dataset.effectId;
    if (id === undefined || id === "") return;
    const effect = this.item.effects.get(id);
    if (!effect) return;
    await effect.update({ disabled: !effect.disabled });
  }
}
