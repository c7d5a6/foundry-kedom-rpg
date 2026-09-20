# Attributes

Ported from `🗄️ slip-box/Kedom RPG.md` and `📥 inbox/WWN Kedom Hack.md`.

## Primary attributes

**Six attributes, renamed away from the D&D set.** The revised source names them explicitly
and collapses strength and constitution into one — "I think there is no need in separate str
and con". This closes what used to be Q2.

| Attribute | Key | Abbrev. | Covers |
|---|---|---|---|
| **Might** | `mgh` | Mgh | Strength *and* constitution |
| **Dexterity** | `dex` | Dex | Coordination |
| **Knowledge** | `kno` | Kno | Education, knowledge, intelligence |
| **Focus** | `foc` | Foc | Intuition, perception, will, wisdom |
| **Presence** | `pre` | Pre | Charisma |
| **Luck** | `lck` | Lck | Its own rules, which are unwritten |

The rename matters for more than flavour: **Might is one stat doing two jobs**, feeding hit
points, melee damage, and encumbrance at once, which makes it unusually load-bearing. Watch it
during balance.

**Luck governs no skills at all** (see the table below) and the source says only that it is
"a separate attribute with its own rules". What those rules are is
[Q4](99-open-questions.md#q4--luck-has-no-rules).

Generation, from `WWN Kedom Hack.md`: **3d6 in order, replacing any one roll with 14.**

## The modifier table

Now specified, and wider than WWN's −2…+2:

| Score | 3 | 4–5 | 6–8 | 9–12 | 13–15 | 16–17 | 18 |
|---|---|---|---|---|---|---|---|
| **Modifier** | −3 | −2 | −1 | 0 | +1 | +2 | +3 |

The band widths are `1, 2, 3, 4, 3, 2, 1` across the sixteen values 3–18 — symmetric, centred
on 9–12. Paired with 3d6 generation that puts most characters at 0 and makes a ±3 genuinely
rare.

This is a **wider spread than WWN**, which matters because Kedom stacks it on top of a
proficiency bonus running −2…+8 ([20-skills.md](20-skills.md)). A Legendary specialist with an
18 carries +11 before dice.

## Secondary attributes

Derived, never stored. Each is computed by a pure function in `src/derivations/`.

| Secondary | Derived from | Status |
|---|---|---|
| Hit points | class hit die + Might modifier | Progression per level still unstated |
| Strain | Focus | Two sub-tracks, below |
| Armour class | Dexterity + armour | Ascending AC |
| Melee damage bonus | Might | |
| Attack bonus | Might or Dexterity + class progression | |
| Reflex save | — | Formula unstated ([Q13](99-open-questions.md#q13--save-target-formula)) |
| Fortitude save | — | Formula unstated |
| Will save | — | Formula unstated |

> **The source's secondary section still uses the old attribute names** — it says `strain
> (wisdom)`, `melee damage bonus (str)`, `attack bonus (str/dex)` while the primary list above
> has already been renamed. The table translates them: wisdom → Focus, str → Might. This is
> almost certainly staleness rather than intent, but it is an assumption, not a quotation.

### The two strain tracks

Strain splits into two named sub-tracks, each keyed to a save rather than directly to an
attribute:

- **Mental / sanity**, keyed to **Will**
- **Corruption / disease**, keyed to **Fortitude**

The "Other" section of the source frames the same split as body versus mind: *corruption and
disease as body alterations*, *corruption and madness as mind alterations*. Two tracks, one
physical and one mental, both called corruption. Mechanics remain unwritten
([Q18](99-open-questions.md#q18--the-two-corruption-tracks-are-unspecified)).

## Which attribute each skill uses

Now fully specified for all nineteen skills. Translated from the source's old attribute names:

| Attribute | Skills | Count |
|---|---|---|
| **Knowledge** | Arcana, Guile, Heal, Investigate, Lore | 5 |
| **Might** | Exert, Punch, Stab, Travel, Work | 5 |
| **Presence** | Connect, Conduct, Convince, Worship | 4 |
| **Dexterity** | Craft, Prowl, Shoot | 3 |
| **Focus** | Notice, Survive | 2 |
| **Luck** | — | 0 |

The counts are the source's own tally, and they total nineteen.

The source also tags each skill mental or physical, independently of its attribute:

**Mental:** Arcana, Connect, Conduct, Convince, Guile, Heal, Investigate, Lore, Notice,
Worship
**Physical:** Exert, Punch, Shoot, Stab
**Mixed:** Craft (mental > physical), Prowl (physical > mental), Survive, Travel, Work

> **Focus is thin.** It covers intuition, perception, will, *and* wisdom, yet drives only two
> skills — while also carrying Strain and the Will save. Either it is under-used as a skill
> attribute or it is over-loaded as a defensive one.
> [Q5](99-open-questions.md#q5--focus-governs-only-two-skills) tracks it.

## Implementation note

Attributes are a fixed schema field on the character DataModel:

```
abilities: { mgh: { value, baseMod }, dex: { ... }, kno, foc, pre, lck }
```

with `mod` derived, never persisted — following `foundryvtt-wwn`'s
`module/derivations/modifiers.mjs`. Secondary attributes are derived paths
**zero-initialised in `prepareBaseData`** so Active Effects can target them reliably. See
[../system/data-model.md](../system/data-model.md).

The modifier table is **configuration**, not a `switch` in the derivation. It is a small
ordered list of `{ max, mod }` bands in `src/config/`, so revising it is a data edit.
