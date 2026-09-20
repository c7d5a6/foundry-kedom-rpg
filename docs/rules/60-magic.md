# Magic

**This document is almost entirely unwritten.** The source notes reference magic constantly —
through classes, racial grants, and Effort — but contain no magic system.

## What the sources establish

**Traditions exist as classes.** The roster is now fixed
([30-character-creation.md](30-character-creation.md#classes)): **Queran Arcanist**,
**Elementalist**, and **Necromancer** are full casting classes; **Priest**, **Rune Guardian**,
**Wise**, and **Accursed** are magical partials. Mage Slayer, Vowed, Bard, and Artificer have
been dropped, so there is no longer a dedicated anti-magic class.

**Four candidate styles, none chosen.** The revised source lists what magic might be built
from:

- **Vancian** — prepared slots, marked with a question mark even in the source
- **Ritual** — consumes real resources: money, materials, blood, strain
- **A roll to cast** — casting as a skill check, presumably Arcana
- **Limited-use abilities** — once per scene, once per session

These are not exclusive, and the obvious reading is that different traditions use different
ones: the Arcanist vancian, the Elementalist ability-based, ritual magic available to all.
Note that **ritual magic spending strain** would wire magic directly into the corruption
tracks ([50-wounds-strain.md](50-wounds-strain.md#the-two-corruption-tracks)), which is the
link a low-fantasy game with necromancers wants.

**Arts and Effort.** Inherited from WWN. Magical abilities are **arts**, and using one
**commits Effort** for a duration: for the scene, for the day, or until released. Effort is a
pool granted by class level, not a stored resource — see the implementation note.

**Spell preparation.** WWN's High Mage prepares spells from a slot progression. The
`casting.prepared.{value,max}` shape in `foundryvtt-wwn` implies Kedom needs the same if it
keeps High Mage.

**Racial interaction.** Gnomes gain one additional Elementalist art. Dwarves get **+2 on saves
against hostile magical effects** and, at level 2, can negate one unwanted magical effect per
day as an Instant action.

**Healing.** Magical healing removes wound points at one System Strain each — see
[50-wounds-strain.md](50-wounds-strain.md). This is the only fully specified magical effect in
the whole source set.

**A named deity.** `📥 inbox/WWN Kedom - Quilisa priest.md` develops a priest of Quilisa, and
the Worship skill takes a specialisation per pantheon. The pantheon list is marked "tbd".

**Arcana** is the magic skill, with specialisations "tbd". The Gnome grant calls it "Magic",
which does not match — see
[Q10](99-open-questions.md#q10--racial-skill-grants-name-skills-that-do-not-exist).

## What has to be decided

Tracked as [Q19](99-open-questions.md#q19--the-magic-system-does-not-exist-yet). The
significant choices:

- **Which of the four styles each tradition uses.** This is now the central question: the
  candidates are named but unassigned.
- How **Effort** is granted and recovered, and what the commitment durations are — and whether
  Effort survives at all, given that ritual magic proposes spending strain instead.
- Whether magic feeds the **corruption tracks** in
  [50-wounds-strain.md](50-wounds-strain.md#the-two-corruption-tracks). The ritual style
  already spends strain, so the link is half-made.
- The **pantheon list** and what Worship specialisation actually does.
- Ritual or "Magical Working" style long-form magic. WWN has a `project` actor type for this;
  Kedom probably does not need a whole actor type.
- Whether spellcasting is interruptible, and its interaction with **Stunned**, which the
  condition table says prevents spellcasting.

## Implementation note

The WWN pattern is worth copying wholesale here, because it is the single best idea in that
codebase.

**Effort pools are derived, never stored.** In `foundryvtt-wwn`, a pool is computed in
`module/derivations/resource-pools.mjs` from each class item's `poolGrant` — a name, a formula,
and a per-level progression — minus what each power item has committed through
`poolCommitted.{none,active,scene,day}`. The consequence is that a pool cannot drift out of
sync with its source, and removing a class item removes its pool automatically.

Kedom does the same: `src/derivations/pools.ts` computes available Effort from class grants
minus active commitments.

The one thing **not** to copy is WWN's pool identity resolution, which matches a generic
`"Effort"` grant against `"{source} Effort"` by string. Kedom's pools use slugs, consistent
with [20-skills.md](20-skills.md).

Arts and spells are a **single `power` item type with a `subType` discriminator**, following
WWN's consolidation of what were once separate `art`, `spell`, and `ability` types. Fewer
types with a discriminator beats many near-identical types.
