import type { BackgroundDef, GrowthEntry, RegionKey } from "./creation.ts";
import type { SkillKey } from "./kedom.ts";

function skill(skillKey: SkillKey, specLabel?: string): GrowthEntry {
  return specLabel !== undefined
    ? { kind: "skill", skillKey, specLabel }
    : { kind: "skill", skillKey };
}

const anyCombat: GrowthEntry = { kind: "anyCombat" };
const anySkill: GrowthEntry = { kind: "anySkill" };

/** Draft Nerlander backgrounds from docs/content/nerland-human-backgrounds.md */
export const NERLAND_BACKGROUNDS: readonly BackgroundDef[] = [
  {
    key: "blacksmith",
    labelKey: "KEDOM.Creation.Background.blacksmith",
    free: skill("craft", "Smithing"),
    growth: [
      skill("connect", "Dwarves"),
      skill("convince"),
      skill("craft", "Armorer"),
      skill("stab"),
      skill("exert"),
      skill("lore"),
      skill("notice"),
      skill("work", "Trade"),
    ],
  },
  {
    key: "wildling",
    labelKey: "KEDOM.Creation.Background.wildling",
    free: skill("survive", "Foraging"),
    growth: [
      anyCombat,
      skill("connect", "Gnomes"),
      skill("exert"),
      skill("convince", "Intimidation"),
      skill("notice"),
      skill("punch"),
      skill("prowl", "Sneaking"),
      skill("survive", "Taiga"),
    ],
  },
  {
    key: "carter",
    labelKey: "KEDOM.Creation.Background.carter",
    free: skill("travel", "Driving"),
    growth: [
      anyCombat,
      skill("connect", "Halflings"),
      skill("craft", "Repair"),
      skill("exert"),
      skill("notice"),
      skill("travel", "Riding"),
      skill("survive", "Scouting"),
      skill("work", "Porter"),
    ],
  },
  {
    key: "criminal",
    labelKey: "KEDOM.Creation.Background.criminal",
    free: skill("prowl", "Sneaking"),
    growth: [
      skill("conduct", "Streetwise"),
      anyCombat,
      skill("connect", "Dwarves"),
      skill("guile", "Fraud"),
      skill("exert"),
      skill("notice", "Awareness"),
      skill("prowl", "Backstabbing"),
      skill("work", "Trade"),
    ],
  },
  {
    key: "hunter",
    labelKey: "KEDOM.Creation.Background.hunter",
    free: skill("shoot"),
    growth: [
      anyCombat,
      skill("exert"),
      skill("heal", "First Aid"),
      skill("notice", "Detail"),
      skill("travel", "Hiking"),
      skill("shoot"),
      skill("prowl", "Sneaking"),
      skill("survive", "Tracking"),
    ],
  },
  {
    key: "cooper",
    labelKey: "KEDOM.Creation.Background.cooper",
    free: skill("craft", "Carpentry"),
    growth: [
      skill("conduct", "Organizations"),
      anySkill,
      skill("connect", "Dwarves"),
      skill("convince", "Haggle"),
      skill("work", "Trade"),
      skill("exert"),
      skill("work", "Porter"),
      skill("notice", "Detail"),
    ],
  },
  {
    key: "merchant",
    labelKey: "KEDOM.Creation.Background.merchant",
    free: skill("work", "Trade"),
    growth: [
      skill("conduct", "Organizations"),
      anyCombat,
      skill("connect", "Dwarves"),
      skill("convince", "Haggle"),
      skill("investigate", "Appraisal"),
      skill("travel", "Sailing"),
      skill("notice", "Insight"),
      skill("connect", "Nitol"),
    ],
  },
  {
    key: "nomad",
    labelKey: "KEDOM.Creation.Background.nomad",
    free: skill("travel", "Riding"),
    growth: [
      anyCombat,
      skill("connect", "Nitol"),
      skill("exert"),
      skill("convince", "Persuasion"),
      skill("notice", "Farsight"),
      skill("travel", "Hiking"),
      skill("survive", "Scouting"),
      skill("work", "Trade"),
    ],
  },
  {
    key: "farmer",
    labelKey: "KEDOM.Creation.Background.farmer",
    free: skill("exert"),
    growth: [
      skill("connect", "Halflings"),
      skill("exert"),
      skill("craft", "Repair"),
      skill("notice", "Anomalies"),
      skill("survive", "Foraging"),
      skill("work", "Draft"),
      skill("work", "Trade"),
      skill("work", "Farming"),
    ],
  },
  {
    key: "bard",
    labelKey: "KEDOM.Creation.Background.bard",
    free: skill("convince", "Performance"),
    growth: [
      anyCombat,
      skill("connect", "Nitol"),
      skill("travel", "Hiking"),
      skill("notice", "Listen"),
      skill("convince", "Charm"),
      skill("lore"),
      skill("conduct", "Rumors"),
      skill("guile", "Disguise"),
    ],
  },
  {
    key: "healer",
    labelKey: "KEDOM.Creation.Background.healer",
    free: skill("heal", "First Aid"),
    growth: [
      skill("conduct", "Rumors"),
      skill("connect", "Halflings"),
      skill("craft", "Herbalism"),
      skill("heal", "Diagnosis"),
      skill("lore"),
      skill("notice", "Detail"),
      skill("convince", "Persuasion"),
      skill("guile", "Poisons"),
    ],
  },
  {
    key: "acolyte",
    labelKey: "KEDOM.Creation.Background.acolyte",
    free: skill("worship", "Old Gods"),
    growth: [
      skill("conduct", "Etiquette"),
      skill("connect", "Khvirya"),
      skill("lore"),
      skill("convince", "Persuasion"),
      skill("heal", "First Aid"),
      skill("convince", "Charm"),
      skill("worship", "Khvirya Gods"),
      skill("investigate", "Library Use"),
    ],
  },
  {
    key: "apprentice",
    labelKey: "KEDOM.Creation.Background.apprentice",
    free: skill("lore"),
    growth: [
      skill("conduct", "Organizations"),
      skill("heal", "Diagnosis"),
      skill("craft"),
      skill("lore"),
      skill("notice", "Detail"),
      skill("investigate", "Library Use"),
      skill("worship", "Old Gods"),
      skill("convince", "Persuasion"),
    ],
  },
  {
    key: "slave",
    labelKey: "KEDOM.Creation.Background.slave",
    free: skill("prowl", "Sneaking"),
    growth: [
      skill("conduct", "Streetwise"),
      anyCombat,
      anySkill,
      skill("convince", "Deception"),
      skill("exert"),
      skill("prowl", "Hide"),
      skill("survive", "Shelter"),
      skill("work", "Draft"),
    ],
  },
  {
    key: "mercenary",
    labelKey: "KEDOM.Creation.Background.mercenary",
    free: anyCombat,
    growth: [
      anyCombat,
      skill("stab"),
      skill("exert"),
      skill("convince", "Command"),
      skill("notice", "Farsight"),
      skill("travel", "Hiking"),
      skill("prowl", "Hide"),
      skill("survive", "Scouting"),
    ],
  },
  {
    key: "bandit",
    labelKey: "KEDOM.Creation.Background.bandit",
    free: anyCombat,
    growth: [
      anyCombat,
      skill("shoot"),
      skill("connect", "Goblins"),
      skill("convince", "Intimidation"),
      skill("exert"),
      skill("notice", "Hidden"),
      skill("prowl", "Sneaking"),
      skill("survive", "Shelter"),
    ],
  },
  {
    key: "traveler",
    labelKey: "KEDOM.Creation.Background.traveler",
    free: skill("travel", "Hiking"),
    growth: [
      anyCombat,
      skill("connect", "Nitol"),
      skill("notice", "Farsight"),
      skill("convince", "Performance"),
      skill("travel", "Orientation"),
      skill("prowl", "Sneaking"),
      skill("survive", "Scouting"),
      skill("survive", "Scouting"),
    ],
  },
  {
    key: "shepherd",
    labelKey: "KEDOM.Creation.Background.shepherd",
    free: skill("notice", "Awareness"),
    growth: [
      skill("convince", "Intimidation"),
      skill("exert"),
      skill("connect", "Halflings"),
      skill("shoot"),
      skill("prowl", "Hide"),
      skill("survive", "Foraging"),
      skill("notice", "Farsight"),
      skill("work", "Herding"),
    ],
  },
  {
    key: "elder",
    labelKey: "KEDOM.Creation.Background.elder",
    free: skill("convince", "Command"),
    growth: [
      skill("conduct", "Politics"),
      anyCombat,
      skill("connect", "Dwarves"),
      skill("convince", "Persuasion"),
      skill("lore"),
      skill("connect", "Halflings"),
      skill("notice", "Insight"),
      skill("conduct", "Rumors"),
    ],
  },
  {
    key: "pilgrim",
    labelKey: "KEDOM.Creation.Background.pilgrim",
    free: skill("worship", "Old Gods"),
    growth: [
      anyCombat,
      skill("connect", "Khvirya"),
      skill("notice", "Awareness"),
      skill("convince", "Persuasion"),
      skill("worship", "Khvirya Gods"),
      skill("exert"),
      skill("survive", "Foraging"),
      skill("travel", "Hiking"),
    ],
  },
];

export const BACKGROUNDS_BY_REGION: Record<RegionKey, readonly BackgroundDef[]> = {
  nerland: NERLAND_BACKGROUNDS,
};

export function getBackground(
  regionKey: RegionKey,
  backgroundKey: string,
): BackgroundDef | undefined {
  return BACKGROUNDS_BY_REGION[regionKey]?.find((b) => b.key === backgroundKey);
}

export function backgroundsForRegion(regionKey: RegionKey): readonly BackgroundDef[] {
  return BACKGROUNDS_BY_REGION[regionKey] ?? [];
}
