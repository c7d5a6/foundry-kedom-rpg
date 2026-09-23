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
| **Luck** | `lck` | Lck | Spendable score (0–20), Luck save, wound Luck |

The rename matters for more than flavour: **Might is one stat doing two jobs**, feeding hit
points, melee damage, and encumbrance at once, which makes it unusually load-bearing. Watch it
during balance.

**Luck** governs no skills. Its score **is** the spendable pool:

| Rule | Value |
|---|---|
| Range | **0–20** |
| Generation | **3d6** |
| Restore | **Narrative** (fiction / GM — no fixed rest recovery) |
| Luck save | `d20 + Luck mod + Luck save proficiency` |
| Spend | 1-to-1 to improve a roll; spend **all** current Luck to ignore a wound roll result |

Modifier from current score uses the table below; treat **0–2** as −3 and **19–20** as +3 until a
wider band is written. Remaining open bits (proficiency ladder for Luck save) —
[Q4](99-open-questions.md#q4--luck-save-proficiency).

Generation for the other five attributes, from `WWN Kedom Hack.md`: **3d6 in order, replacing
any one roll with 14.** Luck is a separate **3d6** (not the replace-with-14 pool).

## The modifier table

Now specified, and wider than WWN's −2…+2:

| Score | 3 | 4–5 | 6–8 | 9–12 | 13–15 | 16–17 | 18 |
|---|---|---|---|---|---|---|---|
| **modifier** | −3 | −2 | −1 | 0 | +1 | +2 | +3 |

The band widths are `1, 2, 3, 4, 3, 2, 1` across the sixteen values 3–18 — symmetric, centred
on 9–12. Paired with 3d6 generation that puts most characters at 0 and makes a ±3 genuinely
rare.

This is a **wider spread than WWN**, which matters because Kedom stacks it on top of a
proficiency bonus running −2…+8 ([20-skills.md](20-skills.md)). A Legendary specialist with an
18 carries +11 before dice.

## Secondary attributes

Mostly **entered or proficiency-gated**, with Focus-derived Strain stats. Combat numbers that
still lack class formulas are **stubs** (zero until rules land).

| Secondary | Source | Persistence |
|---|---|---|
| **Hit Points** | Entered current / max (class HD derivation deferred) | Both persisted; initial `0` / `0` |
| **Wounds** | Entered wound-point count | Persisted; initial `0` |
| **Strain** | Entered current System Strain | Persisted |
| **Strain Limit** | `10 + Focus mod` | Derived only |
| **Resolve** | `20 − Focus score` | Derived only |
| Armour class | `10 + Dexterity mod` (+ armour; stub) | Derived path |
| Melee damage bonus | Might (stub) | Derived path, zero-init |
| Attack bonus | Might or Dexterity + class (stub) | Derived path, zero-init |
| **Reflex** save | Dexterity mod + **save proficiency** | Proficiency persisted |
| **Fortitude** save | Might mod + **save proficiency** | Proficiency persisted |
| **Will** save | Focus mod + **save proficiency** | Proficiency persisted |
| **Luck save** | Luck mod + **Luck save proficiency** | Proficiency persisted (schema stub) |

**Class saves** (Reflex / Fortitude / Will) use the **same proficiency ladder as skills**
(`2d10 + attribute mod + proficiency`), with **no specialisations** and therefore always the
full tier bonus ([20-skills.md](20-skills.md#resolution)). Class primary/secondary save
*progression* remains open
([Q30](99-open-questions.md#q30--per-class-primary-and-secondary-saves)).

**Luck save** is separate from the class three: it rolls on **`d20`**, not `2d10`.

### Strain triad and Strain roll

| Stat | Meaning |
|---|---|
| **Strain Limit** | Maximum Strain; `10 + Focus mod` |
| **Strain** | Current System Strain (attrition currency) |
| **Resolve** | Strain roll high threshold; `20 − Focus score` |

**Strain roll** is a plain `d20` against Resolve and current Strain (not the skill `2d10`
ladder, and not a class save):

| Result | Condition |
|---|---|
| **Harm** | `d20 <= min(Resolve, Strain)` — also when `Resolve == Strain` and the roll is `<=` that value |
| **Success** | `d20 > max(Resolve, Strain)` |
| **Failure** | otherwise (strictly between the two when they differ) |

What Harm applies (wound points, permanent alteration, etc.) is **not yet specified**. Do not
auto-increment wounds from the Strain roll until that lands.

### Corruption tracks (still open)

Strain still conceptually splits into two named sub-tracks for permanent alteration:

- **Mental / sanity**, keyed to **Will**
- **Corruption / disease**, keyed to **Fortitude**

Mechanics remain unwritten
([Q18](99-open-questions.md#q18--the-two-corruption-tracks-are-unspecified)).

## Which attribute each skill uses

Fully specified for all nineteen skills:

| Attribute | Skills | Count |
|---|---|---|
| **Knowledge** | Arcana, Guile, Heal, Investigate, Lore | 5 |
| **Presence** | Connect, Conduct, Convince, Worship | 4 |
| **Might** | Exert, Punch, Stab, Work | 4 |
| **Focus** | Notice, Survive, Travel | 3 |
| **Dexterity** | Craft, Prowl, Shoot | 3 |
| **Luck** | — | 0 |

The counts total nineteen.

The source also tags each skill mental or physical, independently of its attribute:

**Mental:** Arcana, Connect, Conduct, Convince, Guile, Heal, Investigate, Lore, Notice,
Worship
**Physical:** Exert, Punch, Shoot, Stab
**Mixed:** Craft (mental > physical), Prowl (physical > mental), Survive, Travel, Work

> **Focus** covers intuition, perception, will, and wisdom; it drives three skills (Notice,
> Survive, Travel) and also Strain Limit, Resolve, and the Will save.
> [Q5](99-open-questions.md#q5--focus-skill-vs-defensive-load) still tracks balance weight.

## Implementation note

Primary attributes are a fixed schema field on the character DataModel:

```
abilities: { mgh: { value, baseMod }, dex: { ... }, kno, foc, pre, lck }
```

with `mod` derived, never persisted. Secondary paths:

```
attributes: { hp: { value, max }, strain: { value }, wounds: { value },
              strainLimit DERIVED, resolve DERIVED }
saves: { reflex, fortitude, will, luck?: { proficiency } }  # bonus DERIVED
```

Derived secondaries are **zero-initialised in `prepareBaseData`** so Active Effects can target
them. See [../system/data-model.md](../system/data-model.md).

The modifier table is **configuration**, not a `switch` in the derivation. It is a small
ordered list of `{ max, mod }` bands in `src/config/`, so revising it is a data edit.
