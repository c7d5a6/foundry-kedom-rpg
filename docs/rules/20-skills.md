# Skills

The heart of the system. Ported from `🗄️ slip-box/Kedom RPG.md`, with the competing formula
from `📥 inbox/WWN Kedom Hack.md` noted.

## Resolution

> **Still unresolved, but narrowed.** The revised source now says `2d10`, while its own front
> matter still reads `dice: D20/2d6` and the threshold table below was generated for `2d8`.
> The note's own caveat: *"I'm not sure if d10 will be the dice to use. Final decision tbd. As
> well as DC for successes."* See [Q1](99-open-questions.md#q1--the-core-dice-mechanic). Dice
> expression and thresholds stay **configuration**, so this decision remains cheap.

**Skill checks:**

```
2d10 + attribute modifier + proficiency
```

**Attacks and saves** use a different die, deliberately:

```
1d20 + attribute modifier + proficiency
```

The split is inherited from WWN and is intentional: a flat `d20` for opposed, high-variance
rolls; a bell curve for skills, where competence should show. The source floats "maybe saves
as skills?" without resolving it, noting *"I don't know how to setup dc for them"* —
[Q13](99-open-questions.md#q13--save-target-formula).

**Without a relevant specialisation, add half proficiency** instead of the full value.

## Proficiency

Six tiers, with a flat bonus, a point cost, and a character-level gate. **This is new** and
closes what used to be Q7.

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
- **Untrained is a real tier with a real penalty (−2)**, not the absence of a value. It is
  also a change: the earlier note had untrained at −1.

## The success ladder

Outcomes are **failure**, **success with a cost**, and **success**. Difficulty is a tier, and
the tier shifts what each band means — a total of 11 is a clean success against an easy task
and a flat failure against a legendary one.

| Roll | Easy / Untrained | Trained / Expert | Hard / Master | Legendary |
|---|---|---|---|---|
| 9− | Failure | Failure | Failure | Failure |
| 10–12 | Success | Success with a cost | Failure | Failure |
| 13–16 | Success | Success | Success with a cost | Failure |
| 17–20 | Success | Success | Success | Success with a cost |
| 21+ | Success | Success | Success | Success |

> **The source flags this table as stale**: *"table needs a redo, it was generated for 2d8."*
> Treat the bands as provisional.

**Critical success is gone.** The earlier ladder had "17+ = critical success", which
contradicted the table's "17–20 versus Legendary = success with a cost". The revised source
drops the critical outcome entirely, leaving three outcomes. That resolves what used to be Q6.

### Why the table needs the redo

The bands were cut for `2d8` (range 2–16). Under the proposed `2d10` (range 2–20) they land
very differently. Unmodified:

| Band | on 2d8 | on 2d10 |
|---|---|---|
| 9− | 56% | 36% |
| 10–12 | 28% | 28% |
| 13–16 | 16% | 26% |
| 17–20 | 0% | 10% |
| 21+ | 0% | 0% |

Two things fall out. **The 21+ band is unreachable on the dice alone** under either die, so
the top row only exists for modified rolls — fine, but deliberate. And under `2d8` the top
*two* bands were dead without modifiers, which is presumably what prompted the note.

For calibration at the extremes: an untrained character with a 0 attribute (−2 total) clears
an Easy task 45% of the time, while a Legendary specialist with an 18 (+11 total) beats a
Legendary task 64% of the time. Both feel about right for a low-fantasy game; neither is
confirmed.

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
17. **Travel** — Hiking, Riding, Driving, Sailing, Exotic, Navigation, Orientation
18. **Work** — *free* specialisation (trade, haul, administer, ...)
19. **Worship** — *free* specialisation per pantheon, pantheons to be determined

> **`Know` was renamed to `Lore`.** Same definition, new label. Anything already written
> against `know` — including the Gnome and Rat racial grants and any Forge content — needs the
> slug changed.

Which attribute each skill rolls is in
[10-attributes.md](10-attributes.md#which-attribute-each-skill-uses).

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
