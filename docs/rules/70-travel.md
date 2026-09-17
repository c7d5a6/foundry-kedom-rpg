# Travel and exploration

Ported from `📥 inbox/WWN Kedom Hack.md` and the travel section of
`📥 inbox/Relics of the Forgotten Era.md`.

## The One Ring hack

The source replaces WWN's travel rules with a **journey event table** adapted from *The One
Ring*. A travel skill roll maps to an event, and the note also gives a "fate die" column for
rolling the event directly without a skill check.

| Skill roll | Fate die | Event |
|---|---|---|
| 2–4 | eye | Terrible Misfortune |
| 5 | 1 | Despair |
| 6 | 2–3 | Ill Choices |
| 7–8 | 4–7 | Mishap |
| 9–10 | 8–9 | Short Cut |
| 11 | 10 | Chance-meeting |
| 12+ | rune | Joyful Sight |

Two observations that matter for implementation:

1. **This table is on a `2d6` scale.** It runs 2 to 12+ with a single value at 5, 6, and 11,
   which is the shape of a `2d6` distribution — not `2d8`. If the core mechanic settles on
   `2d8` ([Q1](99-open-questions.md#q1--the-core-dice-mechanic)), this table needs rescaling
   or it will produce Joyful Sight far too often.
2. **The outcomes are narrative, not mechanical.** Terrible Misfortune and Joyful Sight have
   no defined effects. The table is a prompt list, which is fine for play but means the system
   should present it as a roll table with descriptive results rather than trying to automate
   consequences.

Tracked as [Q20](99-open-questions.md#q20--the-travel-table-is-on-a-2d6-scale).

## Hexcrawl encounters

`Relics of the Forgotten Era.md` records a campaign-specific `1d8`-plus-cross-out procedure,
citing [The Alexandrian's 5e hexcrawl series](https://thealexandrian.net/wordpress/46101/roleplaying-games/5e-hexcrawl-part-2-wilderness-travel).
Entries are crossed off once used, so the list drains as the journey proceeds:

Enemy (wolves) · Ruins (broken bridge, watchtower) · Animals or a village · Witch · Mist ·
Bandits · Sick child · False pilgrim · Refugees · Burned magical ground · Poisoned water ·
Murder scene · Cult patrols · Cult killing on a spike

This is **campaign content, not a system rule**. It belongs in a Foundry roll table shipped as
an optional compendium, not in the rules. The "cross out once used" mechanic is worth
supporting though, since Foundry roll tables have a `drawn` flag and a "draw without
replacement" mode that does exactly this.

## Related skills

**Travel** — Hiking, Riding, Driving, Sailing, Exotic, Navigation, Orientation
**Survive** — Foraging, Scouting, Shelter, Tracking, Environment (forest, desert, plains, urban)

The division of labour between them is not stated. Presumably Travel covers making progress
and Survive covers living off the land, but which skill rolls on the journey-event table above
is [Q21](99-open-questions.md#q21--which-skill-rolls-for-travel-events).

## Not specified

- Travel speeds, and whether the scale is hexes, miles, or days.
- Encumbrance effects on travel, though STR-based slots exist.
- Rations, water, and foraging rates. Dwarves need half the usual food, water, and air, which
  implies these are tracked.
- Getting lost, and what Orientation and Navigation actually do.
- Weather. The setting notes include `Kedôm Weather.md`, unported.
- Mounts and vehicles, though Riding and Driving specialisations exist.

## Implementation note

Travel is **procedure, not automation**. The system ships the journey table as a Foundry roll
table with descriptive results and leaves the consequences to the GM. No travel subsystem, no
custom application, no automated day-by-day resolution. WWN's `project` actor type is the
warning here: a whole actor type for what could be a journal entry.

The one piece worth automating is the **draw-without-replacement** encounter list, which core
Foundry roll tables already support.
