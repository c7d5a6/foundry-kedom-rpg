# Character create wizard UX

Requirements for the create-character ApplicationV2 wizard
(`packages/system/templates/apps/create-character/wizard.hbs`,
`character-create-wizard.ts`, wizard section of `system.css`).

## Priorities

1. **Easy, intuitive, convenient** — players always know what to do next and can recover from mid-pick mistakes.
2. **Aligned with the character sheet** — same gold/primary palette and opaque control language as sheet buttons/chips.
3. **Beauty** — polish last; never trade clarity for decoration.

## Clickable vs non-clickable

- **Content** action controls (Roll…, region/culture/background/class choices, ability set-14, skill picks) use **opaque** dark fill + **solid gold** border. Do not restyle the Foundry window toolbar or the form footer (Back / Next / Create).
- **Selected** controls must be unmistakable among peers: stronger gold fill, brighter border, and a clear selected cue (e.g. inset accent bar + heavier weight).
- **Non-interactive** content must not look like a button. Growth-table rows are plain numbered text (or muted labels), never skill chips.
- If something is not clickable, it must not use the clickable chip/button styles.

## Skills vs specializations

- **Skill** picks: solid gold border, opaque fill (same family as other clickable chips).
- **Specialization** picks: same size/fill family, but **dotted** gold border so they read as clickable-but-different from skills.
- Specialization UI nests **under** the selected skill (indent / nested block), not as a peer row at the same hierarchy level as the skill grid.

## Ready / valid (green)

- Soft green (`#7ec8a0` family) marks **resolved grants** / completed skill results only.
- Do **not** tint the Next button green.

## Panels and lists

- Peer interactive sections (free skill, each roll, bonus skill) share the **same panel** chrome.
- Do not double-number: if an `<ol>` provides numbers, i18n step labels omit “1.” / “2.” / “3.”.
- Reference material (growth table) **nests under** the action it supports (rolls), not as its own top-level numbered step.
- Leave clear spacing after step intro text before chips/grids.

## Skill pick flow

- For wild / substitute / bonus skill picks, keep the **skill chooser visible** for the whole pick — including while specialization is required **and after** a specialization is chosen — so the player can change their mind.
- The chosen skill stays `is-selected` while the player picks a specialization.
- Changing skill clears specialization but must not trap the player (grid must remain).
- Resolved grants (free, rolled, bonus) use **one** display style — a green ready chip with the final label.

## Description images (wizard only)

Scoped to `.kedom-create-wizard__desc img`:

- Float right, min-width ~200px, max-width ~45%, text wraps beside.
- Clear floats so following sections (talent, skill steps) start below the image.

Do not change sheet or world description CSS for this.

## Class step (full vs Adventurer)

- Classes are **full or partial** (never both). Allowed fulls list first; then a **Partials**
  heading and the partial list.
- One full **or** two distinct partials. Click again deselects. After one partial, show a hint
  to pick a second. Next is blocked until the selection is complete (+ name + HP roll).
- Adventurer combines hit die (higher priority), talent picks (**max** per pool), talent
  slugs (union), and embeds **both** class origins.

## Confirm summary

- Class line includes granted class talent name(s) in brackets when known, e.g.
  `Fighter (Talent Name)`, `Fighter (Talent A, Talent B)`, or
  `Warrior / Expert (Talent A, Talent B)`.

## Related

- Sheet / cascade budget: [ui-design-system.md](./ui-design-system.md)
- Creation rules: [../rules/30-character-creation.md](../rules/30-character-creation.md)
