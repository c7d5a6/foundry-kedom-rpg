# Combat

Largely inherited from WWN. The source notes cover combat only through the critical-injury
tables and the penalty-equivalence work in `📥 inbox/WWN Kedom Hack.md`, so much of this
document records what Kedom needs to decide rather than what it has decided.

## Established

**Ascending armour class.** Base 10, plus armour, plus DEX modifier. Lizards have an
unarmoured AC of 13. Melee and ranged AC are tracked separately — WWN does this, and the
critical tables assume it.

**Attack roll** is `1d20` plus attack bonus, compared to target AC. Note that attacks use
**d20** while skill checks use `2d8` or `2d6`; this is inherited from WWN and is intentional.

**Shock** damage applies to a miss against a low-AC target, per WWN. Weapons carry
`shock.damage` and `shock.ac`.

**Damage** is a weapon die plus modifiers.

## Conditions

These are fixed by the critical-injury tables in [80-criticals.md](80-criticals.md), which
reference them extensively. From the penalty-equivalence table in `WWN Kedom Hack.md`:

| Condition | Effect |
|---|---|
| **Stunned** | Speed halved; disadvantage on attacks, saves, and checks; no spellcasting |
| **Paralyzed** | No actions; attacks against automatically hit |
| **Prone** | −4 own melee attacks; adjacent enemies +2 to hit; distant ranged −2 to hit |
| **Blinded** | No ranged attacks; attackers have advantage; disadvantage on melee and sight-based saves |
| **Deafened** | Cannot hear; immune to auditory effects |
| **Ignited** | 1d6 damage per turn; Luck save or readied items take item damage |
| **Slowed** | Lose the Move action |
| **Sickened** | Disease progression; see [50-wounds-strain.md](50-wounds-strain.md) |

Kedom uses **advantage/disadvantage** alongside flat numeric modifiers. The critical tables
use both, sometimes in the same entry ("−2 to hit + disadvantage on saves and skill checks"),
so both must exist in the modifier pipeline.

## Saves

Three saves plus Luck, mapped from other systems in the source:

| Save | Covers |
|---|---|
| **Physical** | Fortitude, toughness, disease, poison |
| **Mental** | Will, fear, domination |
| **Evasion** | Reflex, area effects |
| **Luck** | Fortune, the unlucky break |

Saves are a **derived target** rolled against with `1d20`, following WWN, rather than a bonus
added to a roll. WWN's PC formula is `16 + baseMod + saveMod − best(pair mods) − level`; the
Kedom numbers are [Q13](99-open-questions.md#q13--save-target-formula).

## Difficulty numbers

From the equivalence table, Kedom uses fixed difficulty numbers for saves and checks:

| Label | DC |
|---|---|
| Challenging | 6 |
| Hard | 8 |
| Very Hard | 10 |
| Incredibly Hard | 12 |

> These are **save/check DCs on a different scale** from the skill-check thresholds in
> [20-skills.md](20-skills.md), which run 9/10-12/13-16/17+. Two difficulty scales coexist,
> inherited from WWN's split between skill checks and saves. Confusing but consistent with the
> parent system. Tracked as [Q14](99-open-questions.md#q14--two-difficulty-scales).

## Initiative

Undecided. WWN uses `1d8 + DEX modifier` with optional group and side initiative.
[Q15](99-open-questions.md#q15--initiative).

## Not yet specified

- Action economy. The critical tables reference **Main Action**, **On Turn Action**, **Move
  Action**, and **Instant** action, so WWN's economy is assumed, but it is not written down.
- Movement rates and the base movement value. The tables use feet in 5-foot steps.
- Ranges. WWN weapons carry short/medium/long; the Kedom values are unset.
- Execution attacks, mentioned once in the wounds note with no rules.
- Encumbrance thresholds, though STR-based readied/stowed slots are assumed from WWN.

## Implementation note

Every combat modifier is produced by a collector function returning `Modifier[]`, and
conditions apply through **Active Effects** targeting zero-initialised derived paths
(`system.combat.allAttack`, `system.combat.meleeDamage`, and so on). v14 Active Effects are
primary documents, so the condition set ships as a compendium of effects that can be dragged
onto actors and tokens. See [../system/roll-pipeline.md](../system/roll-pipeline.md).
