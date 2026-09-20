# Forge content schema

The relational schema behind the authoring tool. This exists to make one specific workflow
work:

> I want to create a new region, and I think it has these races, and for each of them I need a
> list of backgrounds, and every background needs a list of skills to choose from.

That is a foreign key graph. Expressing it in flat files means maintaining referential
integrity by hand, which is the reason SQLite is the source of truth
([ADR-011](../research/05-decisions.md#adr-011--sqlite-is-the-content-source-of-truth-yaml-is-the-reviewable-artefact)).

## The graph

```mermaid
flowchart TD
  region --> region_race
  region_race --> race
  race --> race_grant
  race --> race_class
  race_class --> class
  race --> race_background
  race_background --> background
  background --> skill_choice
  skill_choice --> skill_choice_option
  skill_choice_option --> skill
  skill_choice_option --> specialization
  skill --> specialization
  attribute --> skill
  race_grant --> skill
  race_grant --> specialization
  race_grant --> attribute
  translation -.-> skill
  translation -.-> race
  translation -.-> class
  translation -.-> background
```

`translation` is an overlay, not a parent. English `label` / `description` live on the entity;
Russian lives in `translation`. See [localisation.md](localisation.md).

## Identity, and why it is separate from names

Every content row carries three distinct identifiers, and conflating any two of them is the
mistake this whole schema is designed to avoid:

| Column | Mutable? | Purpose |
|---|---|---|
| `id` | never | SQLite primary key. Internal to Forge. |
| `slug` | never | Cross-system identity. Referenced by the Foundry system and by exports. |
| `foundry_id` | never | The 16-character Foundry document `_id`, stored so re-export does not regenerate it. |
| `label` | freely | What humans read. **English**, the canonical display name. Russian lives in `translation`. |

Call of Cthulhu 7e, WFRP4e, and Star Wars FFG all use the display name as identity and parse
it back out with string operations, so renaming a skill silently breaks references
([../research/04-skill-systems.md](../research/04-skill-systems.md)). Storing `foundry_id`
matters for the same reason one level down: a regenerated `_id` breaks every reference to that
document in every existing world.

Slugs are enforced by a `CHECK` constraint: lower-case, `[a-z0-9]`, dot-separated segments.

## Tables

### `attribute`

The six primary attributes — Might, Dexterity, Knowledge, Focus, Presence, Luck. Small and
fixed, but a table rather than an enum because skills reference it and the set has already
changed once: strength and constitution merged into Might, dropping the count from seven
([Q2](../rules/99-open-questions.md#q2--is-strength-separate-from-constitution--no)).

```
id, slug, label, abbreviation, description, comment, sort_order
```

`comment` is an authoring note shared across languages — not exported to play, not translated.

### `skill`

```
id, slug, label, description, comment
attribute_id            -> attribute      the usual governing attribute
specialization_mode     'none' | 'fixed' | 'free' | 'parameterized'
is_secondary            skills outside the core nineteen
sort_order
foundry_id
```

`specialization_mode` encodes the three kinds from
[../rules/20-skills.md](../rules/20-skills.md), plus `none` for Exert, Punch, Shoot, and Stab:

- `fixed` — options come from `specialization` rows authored here
- `free` — the player writes a label at character creation; Forge stores no options
- `parameterized` — options are grouped under a named parameter (Survive's Environment,
  Worship's pantheon, Connect's culture)

### `specialization`

```
id, slug, label, description, comment
skill_id                -> skill
parameter               nullable; 'environment', 'pantheon', 'culture'
sort_order
foundry_id
```

`slug` nests under the skill, and under the parameter when there is one:
`conduct.law`, `survive.environment.forest`. The nesting is not decoration — it lets a query
ask "which environment specialisations exist" by prefix, which is what the character sheet
needs.

`parameter` is null for plain fixed specialisations.

### `race`

```
id, slug, label, description
parent_race_id          nullable; self-reference for sub-cultures
unarmored_ac            nullable; Lizards are 13
sort_order
foundry_id
```

`parent_race_id` handles human sub-cultures such as the Nitól — currently flavour-only, but
the setting notes list several, and if they gain mechanics they need to be first-class
([Q9](../rules/99-open-questions.md#q9--human-sub-cultures-need-mechanics)).

### `race_grant`

What a race gives. One row per grant, because races grant heterogeneous things and a wide
table with mostly-null columns would be worse.

```
id
race_id                 -> race
kind                    'skill' | 'specialization' | 'attribute' | 'ability' | 'save_bonus'
level                   1 by default; 2 for the Dwarf's level-2 ability
skill_id                -> skill,          nullable
specialization_id       -> specialization, nullable
attribute_id            -> attribute,      nullable
delta                   nullable; +1 / -1
is_player_choice        the Lizard's "STR or CHA +1"
choice_group            nullable; ties the +1 and the -1 of one choice together
text                    nullable; for narrative grants
```

Three things this shape gets right:

**`kind` distinguishes skill from specialisation grants.** The source has Rats granting
"Sneak" and Gnomes granting "Magic", neither of which is a skill — sneaking is a
specialisation of Prowl and the magic skill is Arcana. Either the grants predate the skill
list or racial grants can target specialisations, and the latter is both more likely and more
interesting
([Q10](../rules/99-open-questions.md#q10--racial-skill-grants-name-skills-that-do-not-exist)).

**`level` supports level-gated racial abilities.** Dwarves are the only race in the source with
one, but one is enough to need the column.

**`is_player_choice` plus `choice_group`** model "STR or CHA +1, DEX or CHA −1" as a decision
made at character creation rather than a fixed modifier. Both halves share a `choice_group`
so the UI can present them together, and the resolved answer is persisted on the actor, never
re-derived.

### `class` and `race_class`

```
class:       id, slug, label, description, comment,
             is_full (0|1), is_partial (0|1),
             attack_progression, skill_points_per_level, hit_die,
             sort_order, foundry_id
race_class:  race_id, class_id, is_prefilled_slot
```

`is_full` and `is_partial` are independent booleans because the five full classes are **also**
selectable as Adventurer partials. At least one must be true. Adventurer itself is **not** a
row — it is two partials combined at character creation.

The class list is a many-to-many with races because that is the main mechanical weight of
choosing a race. `is_prefilled_slot` captures the Adventurer pattern: most non-human races can
*only* be Adventurers with one of the two slots already filled.

The class roster is now fixed — five with `is_full` and `is_partial`, plus seven partial-only,
listed in [../rules/30-character-creation.md](../rules/30-character-creation.md#classes) —
but none of the progression numbers exist yet
([Q12](../rules/99-open-questions.md#q12--per-class-mechanics-are-unspecified)), so
`attack_progression`, `skill_points_per_level`, and `hit_die` stay nullable. They are named
after WWN's `classEdge` fields because those are known to be the right shape.

### `region` and `region_race`

```
region:       id, slug, label, description, parent_region_id, sort_order, foundry_id
region_race:  region_id, race_id, prevalence ('common'|'uncommon'|'rare'), notes
```

Many-to-many: a race appears in several regions, with different prevalence. `prevalence` is
what makes the region view useful rather than just a grouping.

### `background` and `race_background`

```
background:       id, slug, label, description, roll_result, free_skill_id, sort_order, foundry_id
race_background:  race_id, background_id
```

`roll_result` is the entry's slot on the `2d8` background table, and `free_skill_id` is the
skill it grants outright.

Backgrounds are joined to **races**, not regions, since the workflow is region → races →
backgrounds and the region link comes through the race. If a background ever needs to be
region-specific independently of race, that is a second join table, not a column.

> The background table does not exist in the source yet — the mechanic is "roll 2d8, then
> either roll three times on it or roll once and take two bold", with no table, no explanation
> of what the three rolls produce, and no definition of "bold"
> ([Q11](../rules/99-open-questions.md#q11--the-background-table-does-not-exist-yet)). This is
> the largest content gap, and it sits at the centre of this schema.

### `skill_choice` and `skill_choice_option`

The "pick N of M" mechanic, and the reason a relational store earns its place.

```
skill_choice:         id, background_id, pick_count, label, sort_order
skill_choice_option:  id, skill_choice_id, skill_id (nullable),
                      specialization_id (nullable), granted_level
```

A background has zero or more choices; each has `pick_count` and a list of options; each
option points at a skill **or** a specialisation, mirroring `race_grant.kind`.

Expressing this in YAML by hand is exactly where name-based references creep in, because
there is no constraint stopping you from writing a skill name that does not exist. Here a
foreign key does.

### `translation`

The Russian overlay. English stays on the entity; this table never contains `locale = 'en'`.
The full design is [localisation.md](localisation.md).

```
id
entity_kind     'attribute' | 'skill' | 'specialization' | 'race' | 'class'
                | 'background' | 'region' | 'focus' | 'power' | 'condition'
                | 'injury'
entity_id       INTEGER NOT NULL
locale          TEXT NOT NULL        currently only 'ru'
field           'label' | 'abbreviation' | 'description'
value           TEXT NOT NULL
UNIQUE(entity_kind, entity_id, locale, field)
CHECK(locale != 'en')
```

One table rather than one per entity so completeness is a single query and a new kind is a
new allowed value. The cost is that `entity_id` cannot be a real foreign key: a trigger
rejects rows whose id is missing from the kind's table, and each parent deletes its
translations on `DELETE`.

A missing row means "fall back to English", not "this entity has no name". Empty `value` is
rejected — omit the row instead, so completeness cannot be faked by storing a blank.

### `schema_migrations`

```
version, applied_at
```

Written by the migration runner. See
[../../packages/forge/api/README.md](../../packages/forge/api/README.md).

## Invariants the database enforces

Enforced in SQL, not in application code, because the database is the only layer that cannot
be bypassed:

- `PRAGMA foreign_keys = ON` on every connection. Without it SQLite silently ignores foreign
  keys, which defeats the entire design.
- `slug` is `UNIQUE` per table and `CHECK`-constrained to the slug character set.
- `specialization.skill_id` is `ON DELETE CASCADE`; deleting a skill removes its
  specialisations.
- `race_grant` has a `CHECK` that the column matching `kind` is non-null and the others are
  null.
- `skill_choice_option` has a `CHECK` that exactly one of `skill_id` and `specialization_id` is
  set.
- `skill_choice.pick_count` is `CHECK`-constrained to be at least 1 and no greater than the
  option count — enforced by trigger, since a `CHECK` cannot count rows.
- Every join table has a composite primary key, so a duplicate link is impossible.
- `translation.locale` cannot be `'en'`, and `(entity_kind, entity_id, locale, field)` is
  unique, so an entity cannot carry two Russian labels.
- `translation.value` is `NOT NULL` and `CHECK(length(value) > 0)`.

## Known gaps

Found by reading the working WWN character generator on the public site, which implements this
same content graph. Details and evidence in
[public-site-export.md](public-site-export.md#what-it-confirms-about-the-forge-schema).

**No roll weights.** A rollable list needs an integer weight per entry to build ranges — the
generator gives Nitól 3/20 and Half-Orc 1/20 off a `toRoll` field. `region_race.prevalence` is
a three-value enum and cannot reconstruct that. Anything that can be rolled on needs
`weight INTEGER`.

**`skill_choice_option` cannot express a roll table.** A background's `1d8` skill table is
**ordered** and contains **deliberate duplicates** — `["pray", "pray"]` is how a background
doubles the odds of that skill. That needs a `roll_index`, and the option list must not be
constrained unique. `pick_count` covers the separate two-skill quick list, not this.

**Wildcards are not modelled.** `any combat` and `any skill` appear throughout the generator's
background tables. A wildcard is a real option kind, alongside `skill` and `specialization` in
`skill_choice_option`, not an unresolved reference.

**`granted_level` is now the wrong type.** Proficiency became a six-value tier rather than an
integer level ([../rules/20-skills.md](../rules/20-skills.md#proficiency)), so
`skill_choice_option.granted_level` and the grant columns should carry a tier slug. The
`race_grant.level` column is unaffected — that one really is a character level, gating the
Dwarf's level-2 ability.

These are recorded, not fixed. The skill/save die is settled (`2d10`); remaining open
questions (backgrounds, class numbers, magic) still argue for keeping enums and progressions
as data rather than code constants.

## What is not in here

**Setting text.** The vault has 161 notes on history, myth, calendar, weather, languages, and
places. None of it is relational, and forcing it into tables buys nothing. It exports to
compendium journal entries from Markdown directly.

**Play state.** Actors, worlds, and campaign notes are Foundry's business.

**The critical-injury tables.** They are `(severity, location, weapon_type)` to effect, which
is a lookup table rather than authored content. They ship as Active Effect documents and their
source form is YAML written by hand once
([../system/compendium-pipeline.md](../system/compendium-pipeline.md)).
