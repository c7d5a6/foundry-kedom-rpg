# Attributes

Ported from `🗄️ slip-box/Kedom RPG.md` and `📥 inbox/WWN Kedom Hack.md`.

## Primary attributes

Six attributes. The vault note groups strength and constitution together on one line
(`strength/constitution`), which leaves the count ambiguous — see
[Q2](99-open-questions.md#q2--is-strength-separate-from-constitution).

| Attribute | Key | Notes |
|---|---|---|
| Strength | `str` | Melee damage, encumbrance |
| Constitution | `con` | Hit points, System Strain, disease resistance |
| Dexterity | `dex` | Armour class, initiative, ranged attack |
| Intelligence | `int` | Knowledge and technical skills |
| Wisdom | `wis` | Perception, mental resilience |
| Charisma | `cha` | Social skills |
| Luck | `luck` | Fortune saves; unusual for the genre, deliberately kept |

Generation, from `WWN Kedom Hack.md`: **3d6 in order, replacing any one roll with 14.**

Scores convert to modifiers on the WWN curve (−2 to +2 across 3–18). The exact table is
[Q3](99-open-questions.md#q3--attribute-modifier-table).

## Secondary attributes

Derived, never stored. Each is computed by a pure function in `src/derivations/`.

| Secondary | Derived from | Status |
|---|---|---|
| Hit points | CON, hit die, level | Formula undecided |
| System Strain (SS) | CON | Maximum equals CON score, per WWN |
| Mental resilience / sanity | WIS | Named but unspecified in source |
| Corruption / disease | CON | Named but unspecified in source |
| Armour class | DEX + armour | Ascending AC |
| Melee damage bonus | STR | |
| Attack bonus | STR or DEX + class progression | |

The vault marks the secondary list with a trailing `???`, so it is explicitly incomplete.
Tracked as [Q4](99-open-questions.md#q4--secondary-attributes-are-incomplete).

## Attribute load per skill

Each skill leans mental, physical, or both. From `Kedom RPG.md`:

**Mental:** Arcana, Connect, Conduct, Convince, Guile, Heal, Investigate, Know, Notice,
Worship
**Physical:** Exert, Punch, Shoot, Stab
**Mixed:** Craft (mental > physical), Prowl (physical > mental), Survive (equal),
Travel (equal), Work (equal)

The source records a balance target: **mental 10–15, physical 4–9, roughly 2:1.** The current
list is 10 mental, 4 physical, 5 mixed, which sits at the low end of the physical range.
Tracked as [Q5](99-open-questions.md#q5--mentalphysical-skill-balance).

## Implementation note

Attributes are a fixed schema field on the character DataModel:

```
abilities: { str: { value, baseMod }, dex: { ... }, ... }
```

with `mod` derived, never persisted — following `foundryvtt-wwn`'s
`module/derivations/modifiers.mjs`. Secondary attributes are derived paths
**zero-initialised in `prepareBaseData`** so Active Effects can target them reliably. See
[../system/data-model.md](../system/data-model.md).
