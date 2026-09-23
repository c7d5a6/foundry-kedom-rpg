# Skills

The heart of the system. Ported from `🗄️ slip-box/Kedom RPG.md`, with the competing formula
from `📥 inbox/WWN Kedom Hack.md` noted.

## Resolution

**Skill checks and saves** use the same die and the proficiency ladder:

```
2d10 + attribute modifier + proficiency
```

The source writes this as `2d10 + STAT + skill/save proficiency`. Saves share the skill die
and the three-outcome ladder; they are not rolled on `d20` against a derived target.

**Without a relevant specialisation, add half proficiency** instead of the full value (skills
only — saves have no specialisations). Half applies only to **positive** proficiency bonuses;
Untrained (−2) and Apprentice (0) are unchanged when unspecialised.

**Attacks** use a different die, deliberately:

```
1d20 + attribute modifier + proficiency
```

The split is intentional: a flat `d20` for opposed, high-variance attack rolls; a bell curve
where competence should show on skills and saves.

> Source front matter is `dice: d20/2d10` (attacks / skills). Dice expression and thresholds
> remain **configuration** in `src/config/` so a later revision stays cheap.

## Proficiency

Six tiers, with a flat bonus, a point cost, and a character-level gate.

| Tier | Bonus | Cost to reach | Min. character level |
|---|---|---|---|
| Untrained | −2 | — | — |
| Apprentice | 0 | 2 | — |
| Trained | +2 | 3 | — |
| Expert | +4 | 4 | 3 |
| Master | +6 | 5 | 6 |
| Legendary | +8 | 6 | 9 |

The bonus moves in uniform steps of +2. Costs rise by one per tier, so **Legendary costs 20
points cumulatively**, and the gates at levels 3, 6, and 9 match WWN's.

Two consequences for implementation:

- **Proficiency is a tier, not a number.** Store the tier; derive the bonus. The bonus table
  and the gates are configuration.
- **Untrained is a real tier with a real penalty (−2)**, not the absence of a value.

If saves use this ladder, each class also designates a primary and secondary save with
better progression — see [30-character-creation.md](30-character-creation.md#saves).

## The success ladder

Outcomes are a **kind** plus a **degree**: failure, success with a cost, or success. Difficulty
is a column on the table; each cell stores both the kind and the degree — a total of 12 is
Success 1 against an easy task and Failure 2 against a legendary one. Cost is always degree 1.

| Roll | Easy / Untrained | Trained / Expert | Hard / Master | Legendary |
|---|---|---|---|---|
| ≤10 | Failure 1 | Failure 1 | Failure 2 | Failure 3 |
| 11–14 | Success 1 | Success at a cost | Failure 1 | Failure 2 |
| 15–21 | Success 2 | Success 1 | Success at a cost | Failure 1 |
| 22–26 | Success 3 | Success 2 | Success 1 | Success at a cost |
| 27+ | Success 4 | Success 3 | Success 2 | Success 1 |

The source writes the first row as `-10`, read as **≤10**. The table is configuration in
`src/config/` (`OUTCOME_BANDS`); retuning a cell does not change the resolve helper.

There is still no separate “critical success” kind — higher success degrees are just stronger
successes on this table. That keeps
[Q6](99-open-questions.md#q6--critical-success-versus-the-legendary-tier--critical-success-removed)
settled.

### How the bands sit on 2d10

Unmodified `2d10` ranges 2–20 (mean 11). The top bands exist mainly for **modified** rolls —
a Legendary specialist with an 18 is `2d10 + 11`, mean 22, and routinely reaches 22–26+.
Unmodified:

| Band | on 2d10 (approx.) |
|---|---|
| ≤10 | ~45% |
| 11–14 | ~36% |
| 15–20 | ~19% |
| 21+ | 0% without modifiers |

For calibration at the extremes: an untrained character with a 0 attribute (−2 total) clears
an Easy task only on a high roll; a Legendary specialist with an 18 (+11) beats a Legendary
task most of the time. Neither end is locked for balance, but the bands are continuous and
implementable.

## The skill list

Nineteen skills. Some have a fixed specialisation list, some take a free-form specialisation,
and four have none.

1. **Arcana** — *free* specialisation, to be determined
2. **Connect** — *free* specialisation covering a culture and its language
3. **Conduct** — Bureaucracy, Etiquette, Law, Organizations, Politics, Rumors, Streetwise
4. **Convince** — Charm, Command, Deception, Haggle, Intimidation, Performance, Persuasion
5. **Craft** — *free* specialisation (carpenter, blacksmith, drugs, ...)
6. **Exert** — no specialisations
7. **Guile** — Disguise, Forgery, Fraud, Gambling, Poisons, Traps
8. **Heal** — Diagnosis, First Aid, Pharmacology, Psychology, Rehabilitation, Surgery, Toxicology
9. **Investigate** — Appraisal, Cryptography, Investigation, Library Use, Research, Search
10. **Lore** — *free* specialisation (a narrow theme, including dead cultures and languages)
11. **Notice** — Anomalies, Awareness, Detail, Farsight, Hidden, Insight, Listen
12. **Prowl** — Backstabbing, Climbing, Hide, Lockpicking, Sleight of Hand, Sneaking
13. **Punch** — no specialisations
14. **Shoot** — no specialisations
15. **Stab** — no specialisations
16. **Survive** — Foraging, Scouting, Shelter, Tracking, Environment (forest, desert, plains, urban, ...)
17. **Travel** — Hiking, Riding, Driving, Sailing, Navigation, Orientation
18. **Work** — *free* specialisation (trade, haul, administer, ...)
19. **Worship** — *free* specialisation per pantheon, pantheons to be determined

> **`Know` was renamed to `Lore`.** Same definition, new label. Anything already written
> against `know` — including the Gnome and Rat racial grants and any Forge content — needs the
> slug changed.

Which attribute each skill rolls is in
[10-attributes.md](10-attributes.md#which-attribute-each-skill-uses).

Note that Survive's "Environment" is an open category, so there are three kinds of
specialisation, not two:

- **fixed** — chosen from a closed list
- **free** — player writes the label
- **parameterised** — a named slot filled from an open list (Environment, pantheon, culture)

The data model handles all three with one shape; see below.

## Specialisation identity

**A specialisation is identified by an immutable slug, never by its display label.**

```
skill: {
  slug: "survive",
  attribute: "foc",
  proficiency: "trained",
  specializations: [
    { slug: "survive.tracking",            label: "Tracking" },
    { slug: "survive.environment.forest",  label: "Forest"   }
  ]
}
```

Whether a specialisation carries its **own** proficiency tier, or merely gates the half-versus-
full proficiency rule above, is not stated —
[Q28](99-open-questions.md#q28--do-specialisations-have-their-own-proficiency-tiers). The shape
above assumes the simpler reading, and is the cheaper of the two to widen later.

This is the one hard architectural constraint the research produced. Call of Cthulhu 7e,
WFRP4e, and Star Wars FFG all encode specialisation identity in the item's display name —
`"Locksmith (Craft)"` — and parse it back out with string operations, and WFRP4e additionally
stores career skill lists as arrays of display-name strings, so renaming a skill requires
rewriting every career that mentions it. See
[../research/04-skill-systems.md](../research/04-skill-systems.md).

Backgrounds, races, and classes reference `skill.slug` and `specialization.slug`. Renaming a
label is a one-row change and breaks nothing — as the `Know` → `Lore` rename just demonstrated.

## Advancement

Point costs and level gates are now specified, in the proficiency table above. What is still
missing is **how many points a character gets per level**, which the source never states. WWN
grants 3 per level. Tracked as
[Q7](99-open-questions.md#q7--skill-points-per-level).

## Untrained use

Untrained proficiency is **−2**. Whether every skill can be attempted untrained, or whether
some require at least Apprentice, is [Q8](99-open-questions.md#q8--untrained-restrictions).
