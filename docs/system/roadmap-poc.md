# POC roadmap — Kedom Foundry system

Goal: a **playable proof of concept** — create a character from setting hooks, roll
skills/saves/luck with real choices, and run basic combat including wounds and Luck spend.

This is not full rules coverage (magic, travel tables, Forge export end-to-end, NPCs, packs
at volume). Status reflects **`packages/system` code today** vs the target below.

**Legend**

| Mark | Meaning |
|---|---|
| **Done** | Works in Foundry for a demo |
| **Partial** | Schema, stub, or i18n only — not usable end-to-end |
| **Todo** | Not started |

---

## 1. Create character

| # | Capability | Status | Notes |
|---|---|---|---|
| 1.0 | Actor sheet: abilities, skills, HP/Strain/Wounds, saves | **Done** | `character` actor + sheet |
| 1.1 | Set **birthplace** (region) | **Done** | Wizard step only (creation-only; not on sheet identity line) |
| 1.2 | Set **culture** (race / human sub-culture) | **Done** | Wizard → `details.culture` + race `origin` item |
| 1.3 | Set **background** | **Done** | Wizard: free + choose 1 of 8 + 2×1d8 growth (Nerland draft); skills granted at create |
| 1.4 | Set **class** | **Done** | Wizard → `details.class` + class `origin`; stub `hitDie` / `attackBonus` |
| 1.5 | **Special abilities** (foci, racial arts, class features) | **Partial** | `focus` Item type exists; foci picking deferred from create wizard |

**POC minimum for §1:** ApplicationV2 **Create Character** wizard from the Actor Directory
(attributes → region → culture → background → class/name → `Actor.create`). Sheet under-name
line: `culture · background · class`. Region is creation-only. Foci / dual-class / multi-region
tables stay deferred.

**Suggested work**

1. ~~Item types: at least `origin` (`race` | `background` | `class`) and `focus`.~~ Done.
2. ~~Character details + create wizard.~~ Done (Nerland backgrounds draft).
3. Expand backgrounds beyond Nerland; Adventurer dual-class maths.
4. Foci picking in wizard or post-create advancement.

---

## 2. Skills, saves, Luck

| # | Capability | Status | Notes |
|---|---|---|---|
| 2.1 | **Skill rolls** (`2d10` + mod + proficiency → graded outcome → chat) | **Done** | `rolls/skill-check.ts` |
| 2.2 | **Class save rolls** (Reflex / Fortitude / Will, same ladder) | **Done** | `rolls/save-check.ts` |
| 2.3 | **Luck save** (`d20` + Luck mod + Luck save proficiency) | **Done** | Graded dialog/ladder (Ctrl/⌘); no spend on this card |
| 2.4 | **Difficulty** (Easy…Legendary) | **Done** | Check dialog + default Trained when skipped |
| 2.5 | **Pre-roll modal** (difficulty, situational, optional) | **Done** | Ctrl/⌘-click or client setting `kedom.checkDialog` |
| 2.6 | **Advantage / disadvantage** (extra d10, keep 2 best/worst) | **Done** | Signed net; slider −3…+3 + number input |
| 2.7 | **Spend Luck** to improve skill/save (1-to-1) | **Done** | Chat: spend N Luck to next outcome band; not on Luck save |
| 2.8 | **Skill defaults** (extra dice or default +adv) | **Done** | Per-skill `baseDice` + `defaultAdvantage`; sheet edit + roll seed |
| 2.9 | **Rerolls** (from chat or sheet) | **Done** | Free chat reroll on skill/class-save cards (no Luck cost) |

Also related (not in your list, but POC-adjacent):

| Capability | Status | Notes |
|---|---|---|
| Strain roll (`d20` vs Resolve/Strain) | **Partial** | Implemented as “Strain Save”; docs call it **Strain roll**; Limit in code still Focus **score**, docs say `10 + Focus mod` |
| Half proficiency without specialisation | **Done** | Skills |

**POC minimum for §2:** opt-in check dialog (difficulty + adv/disadv + situational); Luck
score as pool (0–20, 3d6 at create); Luck save; spend Luck on total; one reroll path from the
chat card; per-skill `baseDice` + `defaultAdvantage`.

**Suggested work**

1. Check dialog (skip by default; open with Ctrl/⌘-click or setting). — **Done**
2. AdvantageState → formula (`Nd10kh2` / `kl2` style) — **Done** (signed net).
3. Allow Luck `value` **0–20** (generation 3d6); spend on chat reduces score. — **Done** (0–20 + spend-to-next-band)
4. Luck save proficiency on actor + roll entry on sheet. — **Done**
5. Chat buttons: spend Luck (N to next outcome), free reroll. — **Done**
6. Actor/skill flags: `defaultAdvantage`, `baseDice` (default 2). — **Done**
7. Narrative restore: GM edits Luck up (no auto rest recovery).

---

## 3. Combat

| # | Capability | Status | Notes |
|---|---|---|---|
| 3.1 | **Attack rolls** (`d20` + skill ability + proficiency + AB stub vs AC; damage on same card; crit = max dice) | **Done** | Weapon `skill` punch\|shoot\|stab; inspectable dice |
| 3.2 | **Damage rolls** | **Done** | Standalone Damage button + attack card damage; melee bonuses; chat only (no apply-HP) |
| 3.3 | **Wound rolls** (`d20 + Luck mod` by wound count + `d8` body part → effect) | **Done** | Take Wound on Combat tab; matrix + body part; chat card |
| 3.4 | **Spend Luck** (combat / ignore wound result) | **Done** | Spend-all ignore on wound; spend on attack total (to-hit / +1) |

Also related:

| Capability | Status | Notes |
|---|---|---|
| AC derived | **Partial** | `10 + Dex mod`; armour not applied |
| HP / Wounded flag | **Partial** | Wounded derived (`wounds >= 1`); header badge; natural HP recovery not yet blocked; apply-damage → 0 HP auto-wound deferred |
| Shock, initiative, targets | **Todo** | Out of minimal POC; attack uses optional single target for AC/crit only |

**POC minimum for §3:** weapon item (or sheet attack line) → attack + damage chat; on 0 HP /
critical → increase Wound count → wound table roll (`d20 + Luck mod` + body part) → show
effect; spend Luck on attack or to void wound result. Do **not** implement PF2e severity
1–15 as a separate roll.

**Suggested work**

1. `weapon` Item type + attack/damage roll helpers.
2. Attack chat card (hit vs target AC optional for POC — even “roll only” is enough).
3. Wound roll UI: increase wound count → roll table column + body part → show effect text.
4. Wire Luck spend into attack total and “ignore this wound result”.

---

## Suggested build order

```text
A. Roll UX          dialog → adv/disadv → difficulty          (§2.4–2.6)  Done
B. Luck             pool + Luck save + spend + reroll         (§2.3, 2.7, 2.9) Done
D. Wounds           wound roll + Luck ignore                  (§3.3–3.4) Done
C. Combat core      weapon → attack → damage                  (§3.1–3.2) Done (apply-HP deferred)
E. Character create wizard (attrs→region→culture→bg→class)   (§1.1–1.5) Done (foci deferred)
F. Skill defaults   per-skill dice/adv presets                (§2.8) Done
```

A→B unlocks the skill/save fantasy of the POC. **D before C** unlocks the wound loop without
weapons. C wires 0 HP / crit → Take Wound. E can parallel once Item types exist. F is polish.

**Doc/code sync (do early, cheap):** rename Strain Save → Strain roll in UI; Strain Limit =
`10 + Focus mod`. Wounded (`wounds >= 1`) and Luck `0–20` are done.

---

## Explicitly out of POC

- Full magic / Effort ([60-magic.md](../rules/60-magic.md))
- Travel journey table ([70-travel.md](../rules/70-travel.md))
- Critical-injury **design** matrix (severity × location × weapon in [80-criticals.md](../rules/80-criticals.md)) — not a play procedure
- NPC actor type, compendium packs at scale
- Forge → Foundry pack pipeline end-to-end (hand-authored JSON/YAML fine for POC)
- Corruption / madness tracks (Q18)
- Class primary/secondary save progression maths (Q30) — flat proficiency enough

---

## Rules gaps that block POC decisions

| Gap | Blocks | Ref |
|---|---|---|
| Luck save proficiency ladder | Luck save tiers | [Q4](../rules/99-open-questions.md#q4--luck-save-proficiency) |
| Background grant table in Foundry | §1.3 apply | [Q11](../rules/99-open-questions.md#q11--the-background-table-does-not-exist-yet) / nerland scratch |
| Class HD / attack numbers | §1.4 / §3.1 derivation | [Q12](../rules/99-open-questions.md#q12--per-class-mechanics-are-unspecified) |

Until class numbers land, POC should use **explicit stubs** (fixed HD, flat attack bonus
field). Luck pool rules are settled — no stub needed beyond UI.

---

## Related docs

- [Data model](data-model.md) — target shapes (ahead of code for items)
- [Roll pipeline](roll-pipeline.md) — dialog, collectors, chat stages
- [Character creation](../rules/30-character-creation.md)
- [Open questions](../rules/99-open-questions.md)
- System README — current “barebone playable” status
