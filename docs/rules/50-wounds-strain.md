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

Written **SS**. Maximum equals the Constitution score, per WWN. It is the universal currency of
attrition: magical healing, wound recovery, and cyberware-equivalents all cost Strain.

A character at maximum Strain is **Strained** and cannot accept more. The critical tables in
[80-criticals.md](80-criticals.md) award Strain by severity: `+1` at group III, `+1d4` at
group IV, `+1d6` at group V, and **maximum Strain** at group VI.

Natural Strain recovery is blocked while Wounded. The base recovery rate is
[Q17](99-open-questions.md#q17--system-strain-recovery-rate).

## Other trackers

`Kedom RPG.md` names two more secondary attributes without specifying them:

- a **mental resilience / sanity** track derived from WIS
- a **corruption / disease** track derived from CON

WWN's equivalents are Alienation (WIS) and Stress (WIS). Whether Kedom keeps two separate
tracks, and what drives them, is
[Q18](99-open-questions.md#q18--sanity-and-corruption-tracks-are-unspecified).

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
