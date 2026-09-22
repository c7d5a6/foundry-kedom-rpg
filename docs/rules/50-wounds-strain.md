# Wounds and System Strain

Ported from `📥 inbox/WWN Kedom Hack.md`, which records the WWN rules as written and then the
Kedom rework. This is one of Kedom's clearest deliberate divergences from its parent system.

## What WWN does

- **Hit Points**, then **Mortally Wounded** (helpless, dies at the end of the sixth round
  after going down, dies instantly on further damage).
- **Stabilize**: an ally spends a Main Action on an Int/Heal or Dex/Heal check against
  difficulty `8 + full rounds since downed`, `+2` without medical implements. One attempt per
  round, retryable on failure.
- A stabilised character is **Frail**: cannot heal naturally, does not lose System Strain, and
  dies immediately if brought to zero again. Frail persists until a week of bed rest. A
  physician may attempt removal with an hour's work against difficulty 10, one attempt only.
- **Magical healing** removes Mortally Wounded and Frail and lets the character rise.
- **First aid** restores hit points to a Frail character but does not clear Frail.

## What Kedom does instead

**Mortally Wounded and Stabilize are removed as states.** They are replaced by **wound
points**, and healing converts wounds into System Strain.

- **Hit points** work as before.
- **Wound points** accumulate. The Heal skill is used to remove them.
- **Wounded** replaces both Mortally Wounded and Frail: a character with **more than one wound
  point** is Wounded.
- While Wounded, a character **cannot lose System Strain and cannot recover hit points
  naturally**.
- **Healing a wound** removes one wound point and **adds one System Strain**. That trade — HP
  recovery paid for in Strain — is the core of the rework.
- **Magical healing** removes any number of wound points for an equal amount of System Strain.
- **First aid** can restore hit points but cannot remove the Wounded condition.

### Feats that interact

- **Die Hard** — automatically stabilise.
- **Gifted Chirurgeon** — stabilise as an On Turn action; and separately, double hit points
  restored by first aid.
- **Lucky** — once per week, an event that would kill, mortally wound, or render you helpless
  simply fails to connect or affect you.

> The feats still reference "stabilise", which the rework removed as a state. They presumably
> now mean "remove a wound point without the Strain cost", but the note does not say.
> Tracked as [Q16](99-open-questions.md#q16--feats-reference-the-removed-stabilize-state).

## System Strain

Written **SS** on the sheet short form; full label **System Strain**.

| Stat | Meaning |
|---|---|
| **Strain Limit** | Maximum Strain; equals Focus **score** ([10-attributes.md](10-attributes.md)) |
| **Strain** | Current System Strain (attrition currency) |
| **Resolve** | `20 − Focus score` — high threshold for the Strain Save |

Earlier notes equated maximum Strain to Might (WWN Constitution). **That is superseded:** the
cap is Focus score. Magical healing, wound recovery, and similar costs still spend Strain.

**Strain Save** (`d20`): Harm if `d20 <= min(Resolve, Strain)`; Success if
`d20 > max(Resolve, Strain)`; Failure otherwise. Harm’s mechanical payload is unwritten —
do not auto-apply wounds from the save yet.

A character at maximum Strain is **Strained** and cannot accept more. The critical tables in
[80-criticals.md](80-criticals.md) award Strain by severity: `+1` at group III, `+1d4` at
group IV, `+1d6` at group V, and **maximum Strain** at group VI.

Natural Strain recovery is blocked while Wounded. The base recovery rate is
[Q17](99-open-questions.md#q17--system-strain-recovery-rate).

## The two corruption tracks

Strain now splits into two named sub-tracks. The revised `Kedom RPG.md` describes them twice,
once under secondary attributes and once under "Other", and the two framings agree:

| Track | Keyed to | Framed as |
|---|---|---|
| **Mental / sanity** | the **Will** save | corruption and madness — *mind alterations* |
| **Corruption / disease** | the **Fortitude** save | corruption and disease — *body alterations* |

Two changes from the earlier notes. The tracks now hang off **saves rather than attributes**
(they were WIS and CON before), which couples them to the new three-save set in
[40-combat.md](40-combat.md#saves). And **"alteration" is the operative word** — both are
framed as things that change the character permanently, not merely as depleting meters. That
suggests each track should accumulate discrete named effects rather than a single number,
which is a different data shape.

WWN's equivalents are Alienation and Stress, both from WIS, and both simple counters. Kedom
appears to want something else. Mechanics are unwritten —
[Q18](99-open-questions.md#q18--the-two-corruption-tracks-are-unspecified).

## Disease

From the equivalence table: infection is a **Physical save or Sickened**, progressing to
**death in 1d6 days** without an Int/Heal check at DC 8 or better. Filthy sources — claws,
gunshot wadding — raise the infection DC by 2 or worsen the tier.

## Implementation note

Wound points, System Strain, and hit points are all persisted fields. **Wounded is derived**
from wound points (`wounds > 1`), not stored, so it can never disagree with its own cause.

The blocks that Wounded imposes — no natural HP recovery, no Strain loss — are implemented as
flags on the derived data that the rest recovery routine reads, rather than as checks
scattered through the healing code.
