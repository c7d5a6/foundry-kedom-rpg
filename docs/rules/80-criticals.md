# Critical injuries

Ported from the "Critical Migration Guide" section of `📥 inbox/WWN Kedom Hack.md`
(last updated March 2026 in the source). This is the most complete subsystem in the whole
design, and by some distance the most detailed.

It exists because the author wanted WFRP-style and Pathfinder 2e-style critical hit effects
expressed in WWN mechanics. The guide is therefore built on **equivalence tables** between
systems, which are preserved here because they are the reasoning, not just the result.

## Structure

An injury is described by three axes:

1. **Severity** — a level from 1 to 15, banded into seven mechanical groups
2. **Location** — head, body, arms, legs, or a general bleed
3. **Weapon type** — arrow, bullet, blunt, claws, cutting, flame, piercing, explosion

Severity determines the group; group and location together give the base effect; weapon type
modifies it.

How severity is rolled is not specified —
[Q22](99-open-questions.md#q22--how-is-critical-severity-determined).

## Severity tiers

Using Pathfinder 2e's tier ranges:

| Tier | Levels | Description |
|---|---|---|
| **Minor** | 1–7 | Superficial to moderate; temporary penalties; no lasting harm |
| **Major** | 8–12 | Serious; extended incapacitation; permanent penalties possible; death risk from complications |
| **Severe** | 13–15 | Mortal wounds or instant death; only powerful magic can help |

## Mechanical groups

### Group I — Scratch (levels 1–2)

−1 to −2 to hit for 1 round. Lose the On Turn Action. Mental save or drop a weapon (arms
only). −5 ft movement for 1 round (legs only). No lasting effects.

### Group II — Light Wound (levels 3–4)

−2 to hit for 1 to 1d4 rounds. Stunned 1 round. Prone (Evasion save to avoid). Mental save or
drop held weapon. Minor bleeding, easily stopped. Movement halved for 1d4 rounds (legs). No
permanent effects.

### Group III — Wound (levels 5–6)

−2 to −4 to hit for 1d6 to 2d4 rounds. Stunned 1 round plus a Physical save each round to end.
Slowed, with saves to end. Limb partially useless until treated (Int/Heal DC 6–8). Lodged
projectiles or weapon fragments need removal. Possible **permanent −1** to a specific skill or
attribute. Infection risk after the fight (Physical save DC 6). **+1 System Strain.**

### Group IV — Serious Wound (levels 7–9)

Stunned 1d4–1d6 rounds. −4 to hit and/or disadvantage on all rolls. Limb useless until HP
fully restored. Fractures needing 4–6 weeks of natural healing. **Permanent −1 to −2** to hit
or to an attribute. Cumulative bleeding at −1 to all rolls per round (Physical save DC 8 to
stabilise). Infection risk: Physical save DC 8 or death in 1d6 days without Int/Heal
treatment. **+1d4 System Strain.**

### Group V — Critical Wound (levels 10–12)

Paralyzed 1d4–1d6 rounds, or the rest of the encounter. **Permanent** major disability: lost
eye, limb paralysis, movement permanently halved. Cumulative arterial bleeding at −2 to all
rolls per round. **Wounded** condition. Death without magic within 1d6 turns or days.
**Permanent −2 to −4** to attributes. Amputation may be needed to prevent gangrene.
**+1d6 System Strain**, likely reaching Strained.

### Group VI — Mortal Wound (levels 13–14)

Dies in 1d4 rounds unless stabilised, and stabilisation requires **magical healing** — mundane
Int/Heal is insufficient, or DC 12+. Even if saved: Wounded plus a permanent major disability.
Severed limbs, destroyed organs. **Maximum System Strain.**

### Group VII — Death (level 15)

Instant death. No saves, no stabilisation. Describe it spectacularly.

> The source uses WWN's **Mortally Wounded** and **Frail** terms throughout these tables,
> but [50-wounds-strain.md](50-wounds-strain.md) replaced both with **wound points** and
> **Wounded**. The text above has been translated; the per-location tables below still use
> the original terms in places. Tracked as
> [Q23](99-open-questions.md#q23--critical-tables-use-the-pre-rework-wound-vocabulary).

## By location

### Head

| Group | Effect |
|---|---|
| I (1–2) | −1 to −2 to hit for 1 round. Lose On Turn action. |
| II (3–4) | −2 to hit for 1d4 rounds. Stunned 1 round. Mental save or drop weapon. Blood in eyes: Blinded until an action is spent wiping; DC 6 flat check each round or blood returns until bandaged (Int/Heal DC 6). |
| III (5–6) | Stunned 1 round, then −2 to hit with a Physical save each round to end. Slowed until a Physical save. Deafened possible. Permanent −1 Charisma from scarring. +1 System Strain. |
| IV (7–9) | Stunned 1d6 rounds. −4 to hit for the rest of the encounter. Fractured jaw or skull — cannot speak or eat normally. Permanent −1 to −2 Charisma. Cumulative −1 to all rolls per round from internal bleeding. Infection: Physical save DC 8 or death in 1d6 days. +1d4 System Strain. |
| V (10–12) | Lost eye: −4 to Shoot, disadvantage on Wis/Notice for sight. Paralyzed for the rest of the encounter. Permanent −1 to all checks. Brain haemorrhage: Physical save DC 10 each round or Mortally Wounded. +1d6 System Strain. |
| VI (13–14) | Prone and Mortally Wounded, dies in 1d4 rounds. Possible spinal damage giving permanent Paralyzed from the neck down. Only magical healing helps (effective DC 10+). Maximum System Strain. |
| VII (15) | Instant death. |

**By weapon.** *Arrow/bullet:* projectile lodged, penalties persist until removed (Int/Heal DC
8, 2 Main Actions; failure nicks an artery → Mortally Wounded). *Blunt:* concussion-focused;
group III+ Physical save or unconscious, revive in 10 minutes; skull fracture at IV needs
Int/Heal DC 10 trepanation. *Claws:* infection one tier worse; tearing worsens scarring for an
extra −1 Charisma. *Cutting:* clean cuts heal more easily (Int/Heal at −1 DC); severed nose or
ear at IV+. *Flame:* Ignited; Charisma damage one tier worse; permanent Deafened at IV;
Suffocating at V. *Piercing:* organ damage; projectile removal as arrow at IV+. *Explosion:*
multiple shrapnel fragments, each −1 to hit until removed at Int/Heal DC 8 per fragment.

### Body

| Group | Effect |
|---|---|
| I (1–2) | −1 to −2 to hit for 1 round. Lose On Turn or Move action. |
| II (3–4) | −2 to hit for 1d4 rounds. Stunned 1 round. Prone (Evasion save to avoid). +1 System Strain. |
| III (5–6) | −2 to −4 to hit until treated (Int/Heal DC 6–8). Slowed until a Physical save. Prone. Infection risk after the fight: Physical save DC 6 or Sickened within a day. Lodged projectile: penalties persist until removed. +1 System Strain. |
| IV (7–9) | Stunned 1d6 rounds. −4 to all rolls for the rest of the encounter. Slowed. Cumulative −1 to all rolls per round from bleeding. Prone. Fractures — useless until HP restored. Infection: Physical save DC 8 or death in 1d6 days. +1d4 System Strain. |
| V (10–12) | Paralyzed 1d6 rounds. Cumulative −2 per round from arterial bleeding. Collapsed lung: Luck save each round or die. Permanent Paralyzed from the waist down possible: Physical save DC 10. Wounded. Only magic saves. +1d6 System Strain. |
| VI (13–14) | Paralyzed and Mortally Wounded, dies in 1d4–1d6 rounds. Entrails or organs exposed. No mundane save. Maximum System Strain. |
| VII (15) | Instant death. |

**By weapon.** *Arrow/bullet:* lodged under ribs or in the cavity (Int/Heal DC 6–8, 3 Main
Actions; failure deals extra HP damage and delays healing by 1 HP next rest). *Blunt:* internal
organ damage; group IV cardiac arrhythmia — Physical save or instant death; V pericardial
bleeding at −3 per round with no mundane stabilisation. *Claws:* filthy claws raise infection
saves by +2 DC. *Cutting:* weapon may lodge in hip or rib (Str/Stab opposed check or Int/Heal
DC 8); organ puncture → infection. *Flame:* Ignited; inhaled flame at IV+ causes Suffocating;
permanent −1 STR from chest muscle damage; exposed bone → infection at Physical save DC 8.
*Piercing:* group IV+ nicked heart at −2 per round; collapsed lung one tier earlier than other
weapons. *Explosion:* shrapnel in multiple locations; peritonitis risk at Physical save DC 8;
multiple organ damage counts as one group worse.

### Arms

| Group | Effect |
|---|---|
| I (1–2) | −1 to −2 to hit for 1 round. Mental save or drop the weapon in that hand. |
| II (3–4) | Drop weapon. Arm numb and useless for 1 round. −2 to hit for 1d4 rounds. Mental or Physical save or drop held items. +1 System Strain. |
| III (5–6) | −2 to −4 to hit for 2d4 rounds. Arm useless until treated (Int/Heal DC 6–8). Permanent −1 to fine manipulation with that hand. +1 System Strain. |
| IV (7–9) | Stunned 1d4–1d6 rounds. Arm useless until HP fully restored. −4 to all rolls. Fractured collarbone or elbow. Permanent −2 to hit with that arm. Cumulative −1 per round from arterial bleeding. Infection: Physical save DC 8 or death in 1d6 days. +1d4 System Strain. |
| V (10–12) | Arm permanently paralysed or useless. Cumulative −2 per round arterial. Severed fingers, −1 per finger to that hand's checks. Amputation needed to prevent gangrene: Physical save DC 10 or death in 1d6 days. Wounded. +1d6 System Strain. |
| VI (13–14) | Unconscious at 0 HP non-lethal, becoming Mortally Wounded. Arm severed or torn off. Dies in 1d4 rounds. Only magic saves. Maximum System Strain. |
| VII (15) | Instant death — weapon through the armpit into the chest. |

**By weapon.** *Arrow/bullet:* embedded (Int/Heal DC 6–8, 2–3 Main Actions; lodged in bone is
DC 8 and 3 actions). *Blunt:* fractures and dislocations; wrist or forearm breaks at III,
dislocated shoulder at IV, crushed joints give permanent −2, snapped elbow is permanent
without magic. *Claws:* fingers removed; infection +2 DC; arm ripped off at elbow or shoulder
at V–VI. *Cutting:* 1d4 severed fingers at V; severed tendons permanently lose grip; arterial
spray at V+; arm severed at VI. *Flame:* Ignited spreading to the body; charred fingers;
permanent −2 STR and −2 DEX for that arm; arm burned off at VI. *Piercing:* nerve damage;
brachial plexus damage at V permanently paralyses the arm unless magically healed within a day
(Int/Heal DC 10). *Explosion:* shrapnel needing separate removal checks; blast nerve damage
gives permanent −1 to that arm at IV+.

### Legs

| Group | Effect |
|---|---|
| I (1–2) | −1 to hit for 1 round. −5 ft movement for 1 round. Cosmetic stumble. |
| II (3–4) | −2 to hit for 1 round. Prone (Evasion save to avoid). Movement halved for 1d4 rounds. Evasion saves at Hard DC 8 during that time. +1 System Strain. |
| III (5–6) | −2 to hit for 2d4 rounds. Slowed 1 round. Movement halved with a Physical save to end. Evasion saves at Hard DC for the rest of the encounter. Permanent −5 ft movement risk (Physical save DC 8 to avoid). +1 System Strain. |
| IV (7–9) | Stunned 1d4 rounds. −4 to all rolls for the rest of the encounter. Movement reduced to 5 ft. Leg useless until HP restored. Evasion saves at Very Hard DC 10. Permanent −5 to −10 ft movement. Permanent Evasion saves at Challenging DC 6. Fractures. +1d4 System Strain. |
| V (10–12) | Paralyzed and helpless 1d4–1d6 rounds. Permanent movement halved. Permanent Evasion saves at Hard DC 8. Cumulative −1 to −2 per round from femoral bleeding. Fractures needing 4–6 weeks. Amputation risk from gangrene: Physical save DC 10. Wounded. +1d6 System Strain. |
| VI (13–14) | Unconscious. Femoral artery severed. Dies in 1d4–1d6 rounds. Leg torn off. No mundane save. Maximum System Strain. |
| VII (15) | Instant death — shattered pelvis, major arteries severed. |

**By weapon.** *Arrow:* foot pinned to the ground, movement 0 until removed (2 Main Actions,
both hands); knee shot gives permanent −5 ft and Evasion saves at Challenging DC. *Bullet:*
hip joint lodging with gangrene risk at Physical save DC 8; shattered kneecap permanently
halves movement; wadding infection at Physical save DC 6 after the fight. *Blunt:* shattered
kneecap, dislocated hip, crushed ankle; open fractures at V; broken metatarsals give permanent
−10 ft. *Claws:* kneecap torn out; hamstrings severed; toes removed; leg ripped off at V–VI;
infection +2 DC. *Cutting:* severed Achilles permanently halves movement with Evasion saves at
Very Hard DC; foot or leg amputated at V–VI; weapon lodged in the thighbone. *Flame:* Ignited;
burned-off toes; fused knee giving permanent 5 ft movement and Very Hard Evasion saves; charred
stump at VI. *Piercing:* femoral artery nick at IV for −1 per round (Physical save DC 8 to
tourniquet); hip organ damage at V. *Explosion:* knee shrapnel needing Int/Heal DC 8 surgery;
permanent leg paralysis from nerve damage; blast amputation at VI.

### Bleed (no location)

Ongoing haemorrhage from any source. Stacks with location criticals.

| Group | Effect |
|---|---|
| I (1–2) | Minor seeping. −1 to hit for 1 round. Physical save DC 6 to staunch as an On Turn action. |
| II (3–4) | Moderate. −2 to hit until treated (Int/Heal DC 6, 1 Main Action). +1 System Strain. |
| III (5–6) | Persistent. Cumulative −1 to all rolls per round until staunched (Int/Heal DC 8, 2 Main Actions). Slowed from blood loss. +1 System Strain. |
| IV (7–9) | Heavy. Cumulative −1 per round. Physical save DC 8 each round or lose another −1, accelerating. Stunned 1 round. Unconscious when the total penalty reaches −6. +1d4 System Strain. |
| V (10–12) | Arterial. Cumulative −2 per round. Wounded. Unconscious at −6 total, then Mortally Wounded. Only magic or Int/Heal DC 10 (3 Main Actions) stops it. +1d6 System Strain. |
| VI (13–14) | Massive. Cumulative −3 per round. Mortally Wounded within 1d4 rounds. Only powerful magical healing saves. Maximum System Strain. |
| VII (15) | Instant exsanguination. |

**Rules.** Bleed stacks with location bleeding. Multiple sources use the **highest** rate plus
1 per additional source. Staunching needs both hands free and appropriate tools; a healer's
pouch reduces the Int/Heal DC by 2. **Cauterisation** with flame stops bleeding instantly but
deals 1d6 damage, may cause Ignited, and on a failed Physical save DC 6 leaves a permanent
scar for −1 Charisma.

## Source equivalence tables

Preserved because they are the design reasoning, and because they define Kedom's own
condition and difficulty scales.

**Hit roll modifiers.** WFRP −10% per −1 to hit; PF2 −1 attack per −1 to hit. Linear.

**Global penalties.** WFRP −10% all tests = −1 to hit, saves, and skill checks. −20% = −2 plus
disadvantage on saves and skill checks. −30% = −4 plus disadvantage on all rolls.

**Conditions.** Mapped in [40-combat.md](40-combat.md).

**Movement.** WFRP M−1 = −5 ft; M−2 = −10 ft; M halved = halved; M=0 = immobilised; M=1 = 5 ft.

**Saves.** WFRP WP test = Mental; T test = Physical; Ag test = Evasion.

**Difficulty.** Challenging DC 6, Hard DC 8, Very Hard DC 10, Incredibly Hard DC 12.

**Duration.** 1 turn = 1 round; d10/2 turns = 1d4 rounds; d10 turns = 1d6 rounds; rest of
battle = rest of encounter.

**Bleeding.** −5% per turn = −1 per round; −10% = −2; −15% = −3.

## Implementation note

This subsystem is large but almost entirely **content, not code**.

The tables ship as **compendium roll tables and Active Effect documents**. v14 makes this
practical: Active Effects are primary documents that can live in a compendium, be dragged onto
an actor or token, modify token data, and expire on duration events. A group IV head injury is
an Active Effect with a duration and a set of changes, not a code path.

What the system actually implements:

- a **lookup** from `(severity, location, weaponType)` to a compendium effect
- **cumulative bleed** as a stacking effect with a per-round rate, since it is the one genuinely
  stateful mechanic here
- the difficulty labels as configuration, so "Hard" renders as DC 8 consistently

What it must not implement: a critical-injury engine. There is no need for one — the tables
are data, and the GM adjudicates. WFRP4e's 2,100 hashed effect scripts are the cautionary tale
([ADR-009](../research/05-decisions.md#adr-009--declarative-effects-and-a-handler-registry-no-user-authored-javascript)).
