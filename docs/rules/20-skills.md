# Skills

The heart of the system. Ported from `🗄️ slip-box/Kedom RPG.md`, with the competing formula
from `📥 inbox/WWN Kedom Hack.md` noted.

## Resolution

> **Unresolved.** The two source notes disagree on the dice. See
> [Q1](99-open-questions.md#q1--the-core-dice-mechanic). Both are recorded here; the
> implementation treats dice expression and thresholds as **configuration**, so this decision
> stays cheap.

**Variant A** — `Kedom RPG.md`, the newer note:

```
2d8 + attribute modifier + skill level     (level −1 if untrained)
```

Without a specialisation, add `level / 2` instead of the full level.

**Variant B** — `WWN Kedom Hack.md`, the older note:

```
2d6 + attribute modifier + skill level     (untrained is −1)
```

Each level of a specialisation adds; with no specialisation, `level / 2` is added to the
trained roll.

The two differ in spread as well as average: `2d8` ranges 2–16 averaging 9, `2d6` ranges 2–12
averaging 7. The thresholds below were written for `2d8`.

## The success ladder

Four outcomes, from `Kedom RPG.md`:

- **9 or less** — failure
- **10 to 12** — partial success (success with a cost)
- **13 to 16** — success
- **17 or more** — critical success

## Proficiency tiers

Difficulty is expressed as a tier, and the tier shifts what each band means. A `2d8` total of
11 is a clean success for an easy task and a flat failure for a legendary one.

Tiers: **Untrained → Apprentice → Trained → Expert → Master → Legendary**

| Roll | Easy / Untrained | Trained / Expert | Hard / Master | Legendary |
|---|---|---|---|---|
| 9− | Failure | Failure | Failure | Failure |
| 10–12 | Success | Success with a cost | Failure | Failure |
| 13–16 | Success | Success | Success with a cost | Failure |
| 17–20 | Success | Success | Success | Success with a cost |
| 21+ | Success | Success | Success | Success |

Two things follow from this table, and both matter for implementation:

1. **The outcome is a function of `(total, tier)`**, not of the total alone. One pure function
   takes both and returns the tier. See
   [../system/roll-pipeline.md](../system/roll-pipeline.md).
2. **Critical success is not a row in this table.** The 17+ critical from the ladder and the
   "success with a cost" at 17–20 Legendary occupy the same range, which is a genuine
   contradiction in the source. Tracked as
   [Q6](99-open-questions.md#q6--critical-success-versus-the-legendary-tier).

## The skill list

Nineteen skills. Some have a fixed specialisation list, some take a free-form specialisation,
and four have none.

1. **Arcana** — specialisations to be determined
2. **Connect** — one specialisation covering a culture and its language
3. **Conduct** — Bureaucracy, Etiquette, Law, Organizations, Politics, Rumors, Streetwise
4. **Convince** — Charm, Command, Deception, Haggle, Intimidation, Performance, Persuasion
5. **Craft** — *free* specialisation (carpenter, blacksmith, drugs, ...)
6. **Exert** — no specialisations
7. **Guile** — Disguise, Forgery, Fraud, Gambling, Poisons, Traps
8. **Heal** — Diagnosis, First Aid, Pharmacology, Psychology, Rehabilitation, Surgery, Toxicology
9. **Investigate** — Appraisal, Cryptography, Investigation, Library Use, Research, Search
10. **Know** — *free* specialisation (a narrow theme, including dead cultures and languages)
11. **Notice** — Anomalies, Awareness, Detail, Farsight, Hidden, Insight, Listen
12. **Prowl** — Backstabbing, Climbing, Hide, Lockpicking, Sleight of Hand, Sneaking
13. **Punch** — no specialisations
14. **Shoot** — no specialisations
15. **Stab** — no specialisations
16. **Survive** — Foraging, Scouting, Shelter, Tracking, Environment (forest, desert, plains, urban, ...)
17. **Travel** — Hiking, Riding, Driving, Sailing, Exotic, Navigation, Orientation
18. **Work** — *free* specialisation (trade, haul, administer, ...)
19. **Worship** — specialisation per pantheon, pantheons to be determined

Note that Survive's "Environment" and Travel's "Exotic" are themselves open categories, so
there are three kinds of specialisation, not two:

- **fixed** — chosen from a closed list
- **free** — player writes the label
- **parameterised** — a named slot filled from an open list (Environment, pantheon, culture)

The data model handles all three with one shape; see below.

## Specialisation identity

**A specialisation is identified by an immutable slug, never by its display label.**

```
skill: {
  slug: "survive",
  attribute: "wis",
  level: 2,
  specializations: [
    { slug: "survive.tracking",            label: "Tracking",        level: 1 },
    { slug: "survive.environment.forest",  label: "Forest",          level: 0 }
  ]
}
```

This is the one hard architectural constraint the research produced. Call of Cthulhu 7e,
WFRP4e, and Star Wars FFG all encode specialisation identity in the item's display name —
`"Locksmith (Craft)"` — and parse it back out with string operations, and WFRP4e additionally
stores career skill lists as arrays of display-name strings, so renaming a skill requires
rewriting every career that mentions it. See
[../research/04-skill-systems.md](../research/04-skill-systems.md).

Backgrounds, races, and classes reference `skill.slug` and `specialization.slug`. Renaming a
label is a one-row change and breaks nothing.

## Advancement

From `WWN Kedom Hack.md`, following WWN: skill points per level come from the class, rank cost
rises with rank, and level gates limit the maximum rank at low character levels. The specific
numbers have not been chosen for Kedom — WWN's are 3 points per level, cost `rank + 2`, gates
at levels 3, 6, and 9, maximum rank 4. Tracked as
[Q7](99-open-questions.md#q7--skill-advancement-costs-and-gates).

## Untrained use

Untrained skill level is **−1**. Whether every skill can be attempted untrained, or whether
some require at least Apprentice, is [Q8](99-open-questions.md#q8--untrained-restrictions).
