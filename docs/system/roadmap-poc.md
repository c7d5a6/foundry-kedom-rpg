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
| 1.1 | Set **birthplace** (region) | **Todo** | No region/birthplace field or UI; Forge `region` planned |
| 1.2 | Set **culture** (race / human sub-culture) | **Todo** | No origin items; race lists in rules only |
| 1.3 | Set **background** | **Partial** | Scratch tables in `docs/content/nerland-human-backgrounds.md`; no Foundry grant/apply |
| 1.4 | Set **class** | **Todo** | Roster in `docs/rules/30-character-creation.md`; no class item / HD / attack progression |
| 1.5 | **Special abilities** (foci, racial arts, class features) | **Todo** | Lang foreshadows `focus` / `power` / `origin` Item types — **not registered** in `system.json` |

**POC minimum for §1:** `origin` (or sheet fields) for region + culture + background + class;
apply free skill / growth picks from background; attach 1–2 foci or racial abilities as items
or Active Effects. Full Adventurer dual-class maths and Forge packs can stay deferred.

**Suggested work**

1. Item types: at least `origin` (`race` | `background` | `class`) and `focus` (or `power`).
2. Character details: birthplace/region + culture slugs (persisted choices).
3. Apply grants: skill proficiency / specialisation from background + class skill points stub.
4. Optional: thin creation dialog (pick order) instead of only manual sheet edits.

---

## 2. Skills, saves, Luck

| # | Capability | Status | Notes |
|---|---|---|---|
| 2.1 | **Skill rolls** (`2d10` + mod + proficiency → graded outcome → chat) | **Done** | `rolls/skill-check.ts` |
| 2.2 | **Class save rolls** (Reflex / Fortitude / Will, same ladder) | **Done** | `rolls/save-check.ts` |
| 2.3 | **Luck save** (`d20 + Luck mod + Luck save proficiency`) | **Todo** | Luck ability exists; no save proficiency / roll yet |
| 2.4 | **Difficulty** (Easy…Legendary) | **Done** | Check dialog + default Trained when skipped |
| 2.5 | **Pre-roll modal** (difficulty, situational, optional) | **Done** | Ctrl/⌘-click or client setting `kedom.checkDialog` |
| 2.6 | **Advantage / disadvantage** (extra d10, keep 2 best/worst) | **Done** | Signed net; slider −3…+3 + number input |
| 2.7 | **Spend Luck** to improve skill/save (1-to-1) | **Todo** | Pool rules settled (0–20, 3d6 start, narrative restore); no spend UI |
| 2.8 | **Skill defaults** (extra dice or default +adv) | **Todo** | Per-skill or actor settings; nowhere in schema |
| 2.9 | **Rerolls** (from chat or sheet) | **Todo** | Chat card is display-only |

Also related (not in your list, but POC-adjacent):

| Capability | Status | Notes |
|---|---|---|
| Strain roll (`d20` vs Resolve/Strain) | **Partial** | Implemented as “Strain Save”; docs call it **Strain roll**; Limit in code still Focus **score**, docs say `10 + Focus mod` |
| Half proficiency without specialisation | **Done** | Skills |

**POC minimum for §2:** opt-in check dialog (difficulty + adv/disadv + situational); Luck
score as pool (0–20, 3d6 at create); Luck save; spend Luck on total; one reroll path from the
chat card; optional per-skill default adv count.

**Suggested work**

1. Check dialog (skip by default; open with Ctrl/⌘-click or setting).
2. AdvantageState → formula (`Nd10kh2` / `kl2` style) — **Done** (signed net).
3. Allow Luck `value` **0–20** (generation 3d6); spend on chat reduces score.
4. Luck save proficiency on actor + roll entry on sheet.
5. Chat buttons: spend Luck, reroll (spend Luck unless free once — **decide**).
6. Actor/skill flags: `defaultAdvantage`, `baseDice` (default 2).
7. Narrative restore: GM edits Luck up (no auto rest recovery).

---

## 3. Combat

| # | Capability | Status | Notes |
|---|---|---|---|
| 3.1 | **Attack rolls** (`d20` + attr + proficiency vs AC) | **Todo** | `combat.attackBonus` stub = 0; no attack roll path |
| 3.2 | **Damage rolls** | **Todo** | `meleeDamageBonus` stub; no weapon items |
| 3.3 | **Wound rolls** (`d20 + Luck mod` by wound count + body part → effect) | **Partial** | Manual **Wounds** counter; effect table in source `Kedom RPG.md` — not rolled. PF2e-style “severity 1–15” in `80-criticals.md` is **design notes only**, not play |
| 3.4 | **Spend Luck** (combat / ignore wound result) | **Todo** | Same Luck pool as §2; “spend all Luck to ignore wound” in source note |

Also related:

| Capability | Status | Notes |
|---|---|---|
| AC derived | **Partial** | `10 + Dex mod`; armour not applied |
| HP / Wounded flag | **Partial** | HP + wound count editable; Wounded (`>= 1`) not derived/enforced in code |
| Shock, initiative, targets | **Todo** | Out of minimal POC unless needed for attack demo |

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
A. Roll UX          dialog → adv/disadv → difficulty          (§2.4–2.6)
B. Luck             pool + Luck save + spend + reroll         (§2.3, 2.7, 2.9, 3.4)
C. Combat core      weapon → attack → damage                  (§3.1–3.2)
D. Wounds           wound roll + Luck ignore                  (§3.3–3.4)
E. Character create origin/focus items + birthplace/culture   (§1.1–1.5)
F. Skill defaults   per-skill dice/adv presets                (§2.8)
```

A→B unlocks the skill/save fantasy of the POC. C→D unlocks combat. E can parallel once Item
types exist. F is polish.

**Doc/code sync (do early, cheap):** rename Strain Save → Strain roll in UI; Strain Limit =
`10 + Focus mod`; Wounded when `wounds >= 1`; Luck ability `value` min/max **0–20** (today
schema is 3–18 for all abilities) — see [10-attributes.md](../rules/10-attributes.md),
[50-wounds-strain.md](../rules/50-wounds-strain.md).

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
