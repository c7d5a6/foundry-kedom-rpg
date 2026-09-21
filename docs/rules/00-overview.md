# Kedom RPG — overview

A low-fantasy OSR system descended from **Worlds Without Number**, set in the world of Kedom.

## Where this text comes from

These documents are the **canonical design spec**. They were bootstrapped from the author's
Obsidian vault, which remains upstream for brainstorming:

| Source note | Ported into |
|---|---|
| `🗄️ slip-box/Kedom RPG.md` | [10-attributes.md](10-attributes.md), [20-skills.md](20-skills.md), [30-character-creation.md](30-character-creation.md) (classes), [60-magic.md](60-magic.md) |
| `📥 inbox/WWN Kedom Hack.md` | [30-character-creation.md](30-character-creation.md), [50-wounds-strain.md](50-wounds-strain.md), [70-travel.md](70-travel.md), [80-criticals.md](80-criticals.md) |
| `📥 inbox/Relics of the Forgotten Era.md` | campaign material, not rules |
| `kedom/` (161 notes) | setting, not rules |

When the vault and these documents disagree, **these documents win**. When the vault contains
something not yet ported, it is listed in [99-open-questions.md](99-open-questions.md).

> **Skill and save rolls are settled** for now: `2d10 + attribute + proficiency` (half
> proficiency without a relevant specialisation). Attacks stay on `1d20`. The note's front
> matter still says `dice: D20/2d6` — ignore it; the body is canonical. See
> [20-skills.md](20-skills.md#resolution).

## Design intent

- **Low fantasy.** Magic is real, rare, and costly. Characters are mortal and improve slowly.
- **Skills over classes.** A character is defined mainly by what they can do, through a broad
  skill list with narrow specialisations.
- **Graded outcomes.** A roll is not pass or fail. The ladder runs failure → success with a
  cost → success, each cell carrying a **degree**, so partial success and strong results both
  drive the fiction.
- **Attrition, not hit-point inflation.** Wounds, System Strain, and encumbrance are the
  pressure. Healing is slow.
- **OSR procedure.** Exploration and travel are structured with real decisions and real
  costs, not a single roll.

## The pieces

- [10-attributes.md](10-attributes.md) — Might, Dexterity, Knowledge, Focus, Presence, Luck,
  and the derived secondaries.
- [20-skills.md](20-skills.md) — the nineteen skills, their specialisations, the proficiency
  tiers, and the success ladder.
- [30-character-creation.md](30-character-creation.md) — races, backgrounds, classes.
- [40-combat.md](40-combat.md) — initiative, attacks, armour, shock, damage.
- [50-wounds-strain.md](50-wounds-strain.md) — the wound and System Strain rework.
- [60-magic.md](60-magic.md) — arts, Effort, spell preparation.
- [70-travel.md](70-travel.md) — overland travel and exploration procedure.
- [80-criticals.md](80-criticals.md) — critical injuries by severity, body part, and weapon.
- [99-open-questions.md](99-open-questions.md) — everything still undecided.

## Relationship to WWN

Kedom borrows WWN's skeleton: attribute modifiers, level gates at 3/6/9, Effort as a committed
resource, System Strain, ascending armour class, and shock damage.

It deliberately diverges on:

- **The attribute set.** Six attributes with strength and constitution merged into **Might**,
  on a wider `−3…+3` modifier curve than WWN's `−2…+2`.
- **The resolution dice and the success ladder** (WWN is `2d6` pass/fail against a difficulty
  number; Kedom uses `2d10` with a graded three-outcome ladder for skills and saves, and
  `1d20` for attacks).
- **Proficiency as flat tiers** (−2 to +8 in steps of two) rather than WWN's skill levels.
- **Skill specialisations** as a first-class mechanic.
- **Wounds** replacing WWN's Mortally Wounded and Frail states — see
  [50-wounds-strain.md](50-wounds-strain.md).
- **Critical injuries** as a detailed subsystem — see [80-criticals.md](80-criticals.md).

No WWN text is reproduced here. The Foundry implementation is written from scratch and is not
derived from the `foundryvtt-wwn` codebase; that project was consulted only to understand what
data such a system needs to track.
