# Data model

How Kedom's documents are shaped. Decisions behind this are in
[../research/05-decisions.md](../research/05-decisions.md); the game rules it encodes are in
[../rules/](../rules/).

## Ground rules

**TypeDataModels only.** `foundry.abstract.TypeDataModel` subclasses registered on
`CONFIG.Actor.dataModels`, `CONFIG.Item.dataModels`, `CONFIG.ChatMessage.dataModels`, and
`CONFIG.ActiveEffect.dataModels`. `template.json` does not exist — `System#template` was
removed in v14 ([ADR-004](../research/05-decisions.md#adr-004--datamodels-only-no-templatejson)).

**Composable schema templates.** Shared field groups are mixins in the style of dnd5e's
`SystemDataModel.mixin()`, living in `src/data/templates/`. A weapon is
`physical + describable + its own fields`, not a copy-paste of a base schema.

**Persisted versus derived is a hard line.** If a value can be computed, it is computed —
in a pure function in `src/derivations/`, never stored. The exception is a **player choice**
(which attribute took the Lizard's +1, what label the player wrote for their free Craft
specialisation): choices are persisted because they are input, not output.

**Every derived path is zero-initialised in `prepareBaseData`.** This is
`foundryvtt-wwn`'s single most valuable trick. An Active Effect targeting
`system.combat.attackBonus` only works if that path exists at the moment effects apply;
without zero-initialisation, whether an effect works depends on preparation order, and it
fails silently when it does not.

**Slugs, never display names.** See the section below. This is the one rule with no
exceptions.

**English names in the document, Russian via overlay.** Pack documents store English `name`
and `system.description`. The sheet never reads those for closed vocabularies — it localises
the slug through `game.i18n`. Content prose is overlaid at runtime by Babele from generated
JSON. See [../forge/localisation.md](../forge/localisation.md).

## Actor types

Two. Not five, not nine.

### `character`

```
abilities:
  mgh, dex, kno, foc, pre, lck:
    value        persisted   3-18, rolled at creation
    baseMod      persisted   racial and permanent adjustments
    mod          DERIVED     from value + baseMod, on the -3..+3 band table

attributes:
  hp:      { value persisted, max persisted }   # both entered; initial 0/0 (HD derivation deferred)
  strain:  { value persisted }                  # current System Strain
  wounds:  { value persisted }                  # wound-point count
  strainLimit  DERIVED   = foc.value (Focus score)
  resolve      DERIVED   = 20 - foc.value
  # wounded is DERIVED (wounds > 1), never stored -- see rules/50-wounds-strain.md
  # the two corruption tracks are unshaped -- see rules/99-open-questions.md Q18

combat:            stubs for now, zero-initialised (formulas deferred)
  ac, attackBonus, meleeDamageBonus

saves:
  reflex, fortitude, will:
    proficiency  persisted   same ladder as skills; no specialisations
    mod          DERIVED     ability mod + full proficiency bonus
  # attribute pairing: reflex←dex, fortitude←mgh, will←foc
  # Strain Save (d20 vs Resolve/Strain) is a separate check — see rules/10-attributes.md

movement:
  base:    { value persisted }
  current: DERIVED (injuries and encumbrance reduce it)

encumbrance:       DERIVED from mgh
  readied: { value, max }
  stowed:  { value, max }

pools:             DERIVED from class grants minus commitments
  <slug>: { value, max, committed: { scene, day, indefinite } }

details:
  level        persisted
  experience   { value, next DERIVED }
  hitDie       persisted
  biography    persisted, HTMLField

skillPoints:
  unspent persisted, earned DERIVED
```

Note what is absent: no `skills` object. Skills are **embedded items**, following WWN. The
reasoning is in the skills section below.

### `npc`

Deliberately not a character. NPCs get a flat `skill` value substituting for the whole skill
item tree — WWN does this and it is right: statting an NPC should not mean creating nineteen
embedded documents.

```
abilities:     same shape, but only value (no baseMod split)
attributes:    hp, strain, wounds
combat:        ac, attackBonus, attackDamage  -- persisted, not derived
skill:         persisted   flat value used wherever a PC would use a skill level
saves:         persisted   flat target
details:       hitDice, morale, instinct, biography
```

## Item types

Seven. Each has a reason to exist that no other type covers.

| Type | Purpose |
|---|---|
| `skill` | A skill and its specialisations. Embedded on the actor. |
| `weapon` | Attack profile, damage, shock, ranges. |
| `armor` | AC contribution and skill penalty. |
| `gear` | Everything else carried. |
| `focus` | A feat or talent. Grants modifiers and unlocks. |
| `power` | Arts, spells, and abilities, behind a `subType` discriminator. |
| `origin` | Race, background, or class, behind a `subType` discriminator. |

### Why `power` and `origin` are discriminated unions

WWN consolidated what were once separate `art`, `spell`, and `ability` item types into one
`power` type with a `subType` field. It was the right call, and the reasoning generalises:
**fewer types with a discriminator beats many near-identical types**, because every item type
costs a data model, a document class, a sheet, a template, a CSS block, and an entry in six
registries.

Race, background, and class share almost their entire schema — each grants skills, adjusts
attributes, and carries descriptive text. They differ in which grants they use, not in shape.
So one `origin` type with `subType: "race" | "background" | "class"`.

The counter-argument is that a discriminated type needs runtime narrowing where a distinct
type would not. In TypeScript that narrowing is a discriminated union and the compiler checks
it, so the cost is small. See [../../Style.md](../../Style.md) on making invalid states
unrepresentable.

### Shared templates

```
src/data/templates/
  physical.ts      quantity, weight, price, encumbrance slot, equipped state
  describable.ts   description (HTMLField), source, slug
  grantor.ts       the grant arrays -- used by origin and focus
```

## Skills and specialisations

**The single most important part of this document.**

### The shape

```
skill item:
  slug             "survive"              immutable identity
  attribute        "foc"
  proficiency      "trained"              tier, not a number; bonus is DERIVED
  specializations:
    - slug         "survive.tracking"     immutable identity
      label        "Tracking"             display only, localisable
    - slug         "survive.environment.forest"
      label        "Forest"
```

**Proficiency is a stored tier and a derived bonus.** The six tiers run Untrained (−2) to
Legendary (+8) in steps of two, and the tier-to-bonus table lives in `src/config/` so it can
be retuned without a migration. Whether specialisations carry tiers of their own, rather than
merely gating the half-versus-full proficiency rule, is
[Q28](../rules/99-open-questions.md#q28--do-specialisations-have-their-own-proficiency-tiers);
this shape assumes they do not, which is the easier of the two to widen.

### Why slugs

Call of Cthulhu 7e, WFRP4e, and Star Wars FFG **all** encode specialisation identity in the
item's display name — `"Locksmith (Craft)"`, `"Sailing (Navigation)"` — and parse it back out
with string operations. WFRP4e compounds it by storing career skill lists as arrays of
display-name strings, which forces a `changeSkillName()` routine to walk and rewrite every
referencing career whenever a skill is renamed, with silent breakage on any path it misses.
See [../research/04-skill-systems.md](../research/04-skill-systems.md).

With slugs, renaming "Tracking" to "Spoor-reading" is a one-field change and nothing breaks.

Slugs are **branded types** in TypeScript, not bare strings:

```
type SkillSlug = string & { readonly __brand: "SkillSlug" }
```

so a function taking a `SkillSlug` cannot be handed an arbitrary string, and the check happens
at compile time rather than in an assertion. This is the type-level half of the three-tier
assertion rule in [../../Style.md](../../Style.md).

### The three kinds of specialisation

[../rules/20-skills.md](../rules/20-skills.md) describes three, and one shape handles all of
them:

- **fixed** — from a closed list. Slug is authored in Forge: `conduct.law`.
- **free** — the player writes the label. Slug is generated from the label at creation and
  then frozen: `craft.blacksmith`. The label stays editable; the slug does not.
- **parameterised** — a named slot filled from an open list. Slug nests:
  `survive.environment.forest`. The parent segment identifies the parameter, so code can ask
  "which environment specialisations does this character have" by prefix.

### Why skills are items, not actor fields

Star Wars FFG keeps skills as plain actor data and progression packages as items, which makes
rolling cheap. That is a real advantage, and it was rejected because Kedom skills need
descriptions, a variable specialisation list, and compendium authoring — all of which are
document features. Nineteen embedded items per character is well within what Foundry handles.

Skill items are **cloned from a compendium onto the actor at creation**, as in WWN. The
compendium is the definition; the embedded item is the character's instance of it.

## References between documents

Grants on `origin` and `focus` items are declarative arrays, and they reference by slug:

```
grants:
  skills:          [ { slug, proficiency } ]
  specializations: [ { slug } ]
  abilities:       [ { key, delta } ]
  choices:         [ { pick: 2, from: [ slug, ... ] } ]
  pools:           [ { slug, formula, progression } ]
```

`specializations` exists as a separate array because racial grants in the source name things
like Rats' "Sneak", which is a *specialisation* of Prowl rather than a skill
([Q10](../rules/99-open-questions.md#q10--racial-skill-grants-name-skills-that-do-not-exist)).
Grant resolution therefore accepts either.

`choices` covers the background workflow — "pick 2 of these 5 skills" — which is the whole
point of the Forge relational schema ([../forge/schema.md](../forge/schema.md)). The **result**
of a choice is persisted on the actor; the choice definition stays on the item.

## ChatMessage types

Three: `check`, `attack`, `damage`. Each a real DataModel with a schema, following dnd5e's
seventeen message subtypes.

The reason is not tidiness. CoC7 makes push-rolls and luck-spending work by persisting
complete roll state into message flags, so a card stays interactive after the fact. A typed
DataModel does the same thing with validation instead of an untyped flag bag:

```
check message:
  actorUuid, skillSlug, specializationSlug?
  modifiers: [ { label, value, source } ]
  total, outcome, margin
  difficulty
```

`outcome` is `{ kind, degree }` looked up from the difficulty column of the success ladder
(see [../rules/20-skills.md](../rules/20-skills.md#the-success-ladder)). There is no separate
critical flag on skill checks; the revised rules dropped critical success as a kind
([Q6](../rules/99-open-questions.md#q6--critical-success-versus-the-legendary-tier--critical-success-removed)).

Because the modifier list is persisted with labels, the card can explain itself — "14 = 9
(2d10) + 2 (Focus) + 2 (Trained, Survive)" — without recomputing anything.

## Active Effects

v14 Active Effects are primary documents: they live in compendiums, drag onto actors and
tokens, modify token data, and expire on duration events. Kedom uses them as the *only*
mechanism for conditional modifiers, with two subtypes:

- `condition` — the standard condition set from [../rules/40-combat.md](../rules/40-combat.md)
- `injury` — the critical-injury tables from [../rules/80-criticals.md](../rules/80-criticals.md)

Both ship as compendium content, not code. A group IV head injury is an effect document with
a duration and a change list. There is no critical-injury engine
([ADR-009](../research/05-decisions.md#adr-009--declarative-effects-and-a-handler-registry-no-user-authored-javascript)).

Effects target the zero-initialised derived paths listed above. That list is therefore a
**public API**: renaming `system.combat.attackBonus` breaks every effect in every user's world,
so it needs a migration.

## Derivations

```
src/derivations/
  modifiers.ts     ability score -> modifier, on the -3..+3 band table
  hp.ts            hit points from class hit die, Might, level
  ac.ts            armour class from armour items and Dexterity
  saves.ts         reflex, fortitude, will targets
  attack.ts        attack bonus from class progression
  encumbrance.ts   readied and stowed slots from Might
  pools.ts         Effort from class grants minus commitments
  movement.ts      base movement less injury and encumbrance penalties
  skills.ts        proficiency tier -> bonus, halved without a specialisation
```

Each file exports pure functions: data in, data out, no document reads, no I/O, no `game`
access. Two consequences, both deliberate:

1. They are **unit-testable** without Foundry running, which is how the rules arithmetic gets
   tested ([../research/01-big-systems.md](../research/01-big-systems.md) on pf2e's Vitest
   suites).
2. They are **cheap**, which matters because `prepareDerivedData` runs on every actor update.
   pf2e needed a debounce module to survive its own preparation cost; staying pure avoids
   needing one.

## Migrations

`src/migrations/NNN-description.ts`, one isolated class each with a version stamp, following
pf2e's 120-file approach rather than dnd5e's single 1,300-line file
([ADR-010](../research/05-decisions.md#adr-010--numbered-migrations-from-the-first-commit)).

The harness exists before the first schema, because retrofitting it after content exists is
the expensive way to do it. `system.json` carries `flags.kedom.needsMigrationVersion`.

## Line budget

Under 10,000 lines of logic for v1 ([00-summary](../research/00-summary.md)). Rough allocation:

| | Lines |
|---|---|
| Data models | ~1,500 |
| Derivations | ~800 |
| Rolls | ~600 |
| Applications | ~2,500 |
| Documents | ~600 |
| Config | ~600 |
| Migrations | ~300 |
| **Total** | **~7,000** |

plus 10,000-15,000 lines of CSS, which is where the appearance budget goes
([ui-design-system.md](ui-design-system.md)).
