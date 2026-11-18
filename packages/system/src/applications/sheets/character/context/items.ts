import { artActiveUses, artHoldsEffort } from "../../../../derivations/effort.ts";
import type { ArtDataFields } from "../../../../data/item/art.ts";
import { systemOf } from "../../../../types/accessors.ts";
import { enrichHTML } from "../../../enrich.ts";
import { collate } from "./shared.ts";

export async function buildTalents(actor: Actor.Implementation, enabled: boolean) {
  const talentItems = actor.items
    .filter((item) => enabled && (item.type as string) === "talent")
    .sort((a, b) => collate(a.name, b.name));
  const talents = await Promise.all(
    talentItems.map(async (item) => {
      const system = item.system as unknown as { description?: string };
      const enrichedDescription = await enrichHTML(system.description ?? "", {
        secrets: actor.isOwner,
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
  return talents;
}

/** Arts plus the per-use release lists. Empty off the arts tab. */
export async function buildArts(actor: Actor.Implementation, enabled: boolean) {
  const artItems = actor.items
    .filter((item) => enabled && (item.type as string) === "art")
    .sort((a, b) => collate(a.name, b.name));
  const arts = await Promise.all(
    artItems.map(async (item) => {
      const system = systemOf<ArtDataFields>(item);
      const enrichedDescription = await enrichHTML(system.description, {
        secrets: actor.isOwner,
        relativeTo: item,
      });
      const activeUses = artActiveUses({
        commitment: system.commitment,
        activeUses: system.activeUses || 0,
      });
      const holding = artHoldsEffort({
        commitment: system.commitment,
        activeUses,
      });
      return {
        id: item.id,
        name: item.name,
        img: item.img,
        commitment: system.commitment,
        commitmentLabel: game.i18n.localize(`KEDOM.Art.Commitment.${system.commitment}`),
        isFree: system.commitment === "free",
        isConcentration: system.commitment === "concentration",
        activeUses,
        holding,
        enrichedDescription,
        hasDescription: Boolean(system.description.replace(/<[^>]*>/g, "").trim()),
      };
    }),
  );
  /** One list row per active use so stacked uses can be released individually. */
  const expandUses = (
    rows: typeof arts,
    commitment: string,
  ): { id: string; name: string; useIndex: number }[] => {
    const out: { id: string; name: string; useIndex: number }[] = [];
    for (const a of rows) {
      if (a.commitment !== commitment || a.activeUses < 1) continue;
      for (let i = 0; i < a.activeUses; i++) {
        out.push({ id: a.id, name: a.name, useIndex: i });
      }
    }
    return out;
  };
  const usedConcentration = expandUses(arts, "concentration");
  const usedScene = expandUses(arts, "scene");
  const usedDay = expandUses(arts, "day");

  return { arts, usedConcentration, usedScene, usedDay };
}
