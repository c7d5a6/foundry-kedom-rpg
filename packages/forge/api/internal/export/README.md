# export/

Emitters from SQLite to reviewable artefacts.

| Emitter | CLI | Status |
|---|---|---|
| Markdown rulebook | `forge export md` / `npm run forge:export:md` | implemented |
| Foundry lang closed vocab | `forge export lang` / `npm run forge:export:lang` | implemented |
| YAML packs | `forge export packs` / `npm run forge:export:packs` | implemented (origins + talents; runs lang export first unless `-skip-lang`) |
| Babele JSON | (planned) | not built |

Lang export rewrites only closed `KEDOM.*` sections in `packages/system/lang/{en,ru}.json`
(Ability, Skill, Proficiency, Outcome, Save, Difficulty, Attributes, Condition, Injury,
Specialization). Sheet chrome is preserved.
