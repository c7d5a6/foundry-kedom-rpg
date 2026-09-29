const { NumberField } = foundry.data.fields;

function armorSchema() {
  return {
    /** Flat bonus added to wound Luck saves while this armor is owned. */
    woundBonus: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
    }),
  };
}

export type ArmorSchema = ReturnType<typeof armorSchema>;

export type ArmorDataFields = {
  woundBonus: number;
};

export class ArmorData extends foundry.abstract.TypeDataModel<
  ArmorSchema,
  Item.Implementation
> {
  static override defineSchema(): ArmorSchema {
    return armorSchema();
  }
}

/** Sum `woundBonus` from all owned armor items on the actor. */
export function ownedArmorWoundBonus(actor: Actor.Implementation): number {
  let total = 0;
  for (const item of actor.items) {
    if ((item.type as string) !== "armor") continue;
    const bonus = (item.system as unknown as ArmorDataFields)?.woundBonus;
    total += Math.floor(bonus ?? 0);
  }
  return total;
}
