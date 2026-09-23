# Combat

Largely inherited from WWN. The source notes cover combat only through the critical-injury
tables and the penalty-equivalence work in `📥 inbox/WWN Kedom Hack.md`, so much of this
document records what Kedom needs to decide rather than what it has decided.

## Established

**Ascending armour class.** Base 10, plus armour, plus DEX modifier. Lizards have an
unarmoured AC of 13. Melee and ranged AC are tracked separately — WWN does this, and the
critical tables assume it.

**Attack roll** is `1d20 + attribute modifier + proficiency`, compared to target AC.

**Saves** use the same formula and success ladder as skill checks:
`2d10 + attribute modifier + save proficiency`
([20-skills.md](20-skills.md#resolution)). They are not rolled on `d20` against a derived
target.

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
| **Ignited** | 1d6 damage per turn; save or readied items take item damage |
| **Slowed** | Lose the Move action |
| **Sickened** | Disease progression; see [50-wounds-strain.md](50-wounds-strain.md) |

Kedom uses **advantage/disadvantage** alongside flat numeric modifiers. The critical tables
use both, sometimes in the same entry ("−2 to hit + disadvantage on saves and skill checks"),
so both must exist in the modifier pipeline.

> Ignited and other critical lines that name a **Luck save** can use the revived Luck save
> (`d20 + Luck mod + Luck save proficiency`). Lines that still say **Physical** / **Mental**
> need remapping to Fortitude / Will (or Reflex). Tracked as
> [Q23](99-open-questions.md#q23--critical-tables-use-retired-wound-and-save-vocabulary).

## Saves

**Class saves are the classic three.** The revised source replaces the earlier
Physical/Mental/Evasion/Luck *class* set with:

| Save | Covers | Also keys |
|---|---|---|
| **Reflex** | Area effects, dodging | — |
| **Fortitude** | Toughness, disease, poison | the corruption / disease strain track |
| **Will** | Fear, domination, mental assault | the sanity strain track |

**Luck save** is a separate primary-attribute roll (`d20 + Luck mod + Luck save proficiency`),
not a fourth class save and not on the `2d10` ladder —
[Q4](99-open-questions.md#q4--luck-save-proficiency),
[10-attributes.md](10-attributes.md). **Fortitude and Will** also each anchor one of the two
strain tracks in [10-attributes.md](10-attributes.md), coupling the class save set to
corruption.

**Class saves share the skill resolution mechanic.** Roll `2d10 + attribute + save
proficiency` against the same three-outcome ladder as skills
([20-skills.md](20-skills.md#the-success-ladder)).

Each class designates a **primary and secondary save** with better progression than the
third; Adventurer combines the two partials' primaries —
[30-character-creation.md](30-character-creation.md#saves),
[Q30](99-open-questions.md#q30--per-class-primary-and-secondary-saves). Numerical progression
remains open under Q30.

## Difficulty numbers

From the equivalence table, Kedom uses fixed difficulty numbers for saves and checks:

| Label | DC |
|---|---|
| Challenging | 6 |
| Hard | 8 |
| Very Hard | 10 |
| Incredibly Hard | 12 |

> These are **legacy fixed DCs** from the older equivalence note (critical tables, infection
> checks, and similar). Skill checks and saves now share the graded ladder in
> [20-skills.md](20-skills.md#the-success-ladder) (≤10 / 11–14 / 15–21 / 22–26 / 27+). Whether
> the critical tables should be rewritten onto that ladder is
> [Q14](99-open-questions.md#q14--two-difficulty-scales).

## Initiative

Undecided. WWN uses `1d8 + DEX modifier` with optional group and side initiative.
[Q15](99-open-questions.md#q15--initiative).

## Not yet specified

- Action economy. The critical tables reference **Main Action**, **On Turn Action**, **Move
  Action**, and **Instant** action, so WWN's economy is assumed, but it is not written down.
- Movement rates and the base movement value. The tables use feet in 5-foot steps.
- Ranges. WWN weapons carry short/medium/long; the Kedom values are unset.
- Execution attacks, mentioned once in the wounds note with no rules.
- Encumbrance thresholds, though Might-based readied/stowed slots are assumed from WWN.

## Implementation note

Every combat modifier is produced by a collector function returning `Modifier[]`, and
conditions apply through **Active Effects** targeting zero-initialised derived paths
(`system.combat.allAttack`, `system.combat.meleeDamage`, and so on). v14 Active Effects are
primary documents, so the condition set ships as a compendium of effects that can be dragged
onto actors and tokens. See [../system/roll-pipeline.md](../system/roll-pipeline.md).
