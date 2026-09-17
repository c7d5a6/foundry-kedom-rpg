# OSR systems: WWN, Shadowdark, Mothership

`foundryvtt-wwn` is the mechanics reference for Kedom — it shows exactly what data a Worlds
Without Number implementation tracks. Shadowdark and Mothership are architecture comparisons
at two smaller scales.

Checkouts: `../foundryvtt-wwn`, `../foundryvtt-shadowdark`, `../foundry-mothership`.

**Kedom is not a fork of foundryvtt-wwn.** It is referenced for data shape and mechanics only.

## foundryvtt-wwn 2.0.0-beta4

`compatibility: { minimum: "14", verified: "14", maximum: "14" }`. Pure `.mjs`, no TypeScript.
ApplicationV2 sheets throughout. **No `template.json`** — TypeDataModels only, registered in
`module/wwn.mjs` and `module/data/_module.mjs`. ~29,911 lines in `module/`, ~51,048 total,
plus ~9,879 lines of tests.

This is the most architecturally current of the three, and the closest thing to a template.

### The patterns to lift

**`derivations/` as a separate directory of pure functions.** Not helpers, not methods on the
document — a directory where each file computes one derived thing:

```
module/derivations/ac.mjs           armour class from armour items and DEX
module/derivations/saves.mjs        save targets
module/derivations/encumbrance.mjs  readied/stowed slots from STR
module/derivations/attack-bonus.mjs from class attack progressions
module/derivations/hit-dice.mjs
module/derivations/initiative.mjs
module/derivations/modifiers.mjs    ability score to modifier
module/derivations/resource-pools.mjs
```

Kedom's `src/derivations/` copies this shape directly.

**Derived paths zero-initialised in `prepareBaseData()` so Active Effects have stable
targets.** The base actor model declares `combat.ac`, `combat.allAttack`, `combat.meleeDamage`,
and a long list of boolean combat flags as derived-but-always-present. An Active Effect can
therefore target `system.combat.allAttack` and be confident the path exists. Without this,
effects silently no-op depending on preparation order. `module/data/actor/base.mjs`.

**Resource pools derived, not stored.** Effort and spell slots are *not* fields on the actor.
They are computed in `module/derivations/resource-pools.mjs` from each `classEdge` item's
`poolGrant` (name, formula, per-level progression), minus what each `power` item has committed
via `poolCommitted.{none,active,scene,day}`. This means a pool cannot drift out of sync with
its source, and removing a class item removes the pool automatically. Excellent pattern;
Kedom's Effort equivalent should work the same way.

**Typed roll classes and a parts builder.** `module/dice/roll-parts.mjs` assembles a roll from
labelled parts; `module/dice/rolls.mjs` defines `WwnRoll`, `WwnSkillRoll`, `WwnAttackRoll`,
`WwnDamageRoll`. `module/dice/dice.mjs` is the public API.

**Real tests.** ~9,879 lines under `tests/`, plus Quench batches in `wwn-system-tests/`. None
of the other OSR systems surveyed has any.

### Data inventory

Six actor types (`character`/`pc`, `monster`/`npc`, `faction`, `starship`, `powerArmor`,
`project`) and eighteen item types. Kedom needs a small subset.

**Shared actor base** (`module/data/actor/base.mjs`) persists `hp.{value,max}`,
`strain.value`, `alienation.value`, `stress.value`, `combat.ab`, `movement.base.value`,
`biography`. Everything else on the base is derived.

**PC** (`module/data/actor/pc.mjs`) persists:

- `abilities.{str,dex,con,int,wis,cha}.{value, baseMod}` — `mod` is derived
- `details.{class, background, alignment, level, notes, morale, renown, xp.{value,bonus,share,next}}`
- `hitDice.{die, perLevelMod}`
- `skills.{unspent, levelsUnlocked}`
- `casting.prepared.{value, max}`
- `favorites[]`, `languages[]`, `currencyShare`
- `retainer.{enabled, wage}`

Derived: ability modifiers, `strain.max` (= CON score), AC, saves, encumbrance, initiative,
resource pools, `treasure`/`wealth`, and `skills.floor` (the Polymath minimum).

There is **no `systemStrain` field** — WWN calls it `strain`.

**Skill item** (`module/data/item/skill.mjs`) is deliberately tiny:

```js
ownedLevel     // -1 = untrained
score          // ability key, e.g. "con"
skillDice      // "2d6" | "3d6kh2" | "4d6kh2"
secondary      // boolean
pointsInvested
```

**Class/Edge item** (`module/data/item/class-edge.mjs`) carries the progressions:
`attackProgression` (`none|warrior|expert|mage|partialWarrior`), `skillPointsPerLevel`,
`poolGrant.{name, formula, value, progression[]}`, `slotGrant`, `hdGrant`, `bonusSkills*`,
`attributeGrant`.

**Power item** (`module/data/item/power.mjs`) consolidates what used to be separate `art`,
`spell`, and `ability` types behind a `subType` discriminator
(`art|spell|ability|psychic|cyberware|mutation|gift|custom`). Worth noting as a
consolidation precedent: fewer types with a discriminator beats many near-identical types.

### How skills work

1. Skill definitions live in compendium packs (`abilities-wwn` has 437 entries), chosen by a
   world-level `skillSet` setting.
2. On PC creation they are **cloned from the pack into embedded items** on the actor.
3. Rank is `ownedLevel`; the formula slug is the lowercased name (`exert`, `know`).
4. Skill points per level come from the highest `classEdge.skillPointsPerLevel` (default 3).
   Rank cost is `level + 2`. Level gates: rank 1→2 needs level 3, 2→3 needs 6, 3→4 needs 9,
   maximum rank 4. `module/helpers/skill-points.mjs`.
5. Non-combat skills are floored by `skills.floor`; `stab`, `shoot`, and `punch` are exempt.

Skill check formula:

```
{skillDice} + effectiveSkillLevel + abilityMod - armorPenalty + situational
```

with `2d6` at rank 0-1, `3d6kh2` at rank 2, `4d6kh2` at rank 3+.

Attack:

```
1d20 + combat.ab + allAttack + modeAttack + abilityMod + skillLevel + weaponBonus + burst + situational
```

Unskilled is -2. NPCs substitute a flat `system.skill` for the skill item level.

Saves are a derived target rather than a rolled bonus: PC is
`16 + baseMod + saveMod - best(pair mods) - level`, rolled against with `1d20`.

### Weaknesses

- **Enormous scope.** WWN plus SWN plus AWN plus CWN plus Godbound plus OSE content in one
  system. Starships, power armour, factions, and projects are all first-class actor types.
- **Dual type names.** `character`/`pc` and `monster`/`npc` both exist as aliases, which adds
  migration and branching complexity for no benefit.
- **Effort pool resolution is indirect.** A generic `"Effort"` grant is matched by string to
  `"{source} Effort"`, which is fragile.
- **Pack generation is not reproducible from a clone.** All fourteen `generate:*` npm scripts
  target an `/import-scripts/` directory that is gitignored.

## foundryvtt-shadowdark 4.0.6

`min 13, verified 14`. Gulp 5 + Rollup, SCSS, TypeDataModels — but **ApplicationV1 sheets**.
~18,121 lines in `system/src/`, ~28,606 total. No tests.

**Good:** a genuinely nice pack pipeline. Per-document JSON files in `data/packs/<name>.db/`
compiled to LevelDB by a `PackHandler` (`utils/lib/pack-handler.mjs`) that supports both JSON
and YAML input, with a round-trip `npm run import` / `npm run export`. Shared
`_PhysicalItemSD` and `_BaseItemSD` bases across 20+ item types. Eleven languages.

**Bad:** AppV1 while WWN has moved to V2. `PlayerSD.mjs` is a 1,200-line model doing slot
usage, spellcasting, and roll config generation. The monster pack has 1,086 actors, which is
heavy at world load. Packs recompile on every build with no incremental step.

## foundry-mothership 0.6.1

`min 13, verified 14`. Gulp 4 for SCSS only, **no JS bundler**, **`template.json` only**,
ApplicationV1 only, pre-built LevelDB packs committed as binaries. ~8,135 lines in `module/`,
~14,956 total. No tests.

**Good:** radical simplicity. `template.json` is human-readable and complete. Ship, stress,
and panic mechanics work without heavy abstraction. The whole thing can be read in an
afternoon. It is proof that a small system does not need a framework.

**Bad:** `module/actor/actor.js` is a ~2,994-line monolith holding all derivation. No
DataModels means no schema validation and manual migration patches. Committed binary packs
cannot be diffed. 0e and 1e content is duplicated, doubling maintenance.

## What this comparison says

| | Mothership | Shadowdark | WWN |
|---|---|---|---|
| Data definition | one `template.json` | DataModels per type | DataModels + large CONFIG |
| Mechanics location | one `actor.js` | model + derivations | `derivations/` + `helpers/` + combat |
| Sheets | V1 HTML | V1 Handlebars | **V2** |
| Pack source | committed binaries | JSON → LevelDB | JSON → LevelDB |
| Tests | none | none | ~9,879 lines |

Kedom should take WWN's v14 DataModel and derivation split — it is the only future-proof
option of the three — while keeping scope closer to Mothership's. Specifically: WWN's embedded
skill items, class-grant-driven derived pools, and roll-parts pipeline, without its starships,
power armour, factions, projects, or four extra game lines.
