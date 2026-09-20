# @kedom/content

The authored content of the game: attributes, skills, specialisations, races, backgrounds,
classes, regions.

Not an npm package — no `package.json`, nothing imports it. It is a data directory, and it is
the **source of truth** for everything content-shaped
([ADR-011](../../docs/research/05-decisions.md#adr-011--sqlite-is-the-content-source-of-truth-yaml-is-the-reviewable-artefact)).

## Files

| File | What | Committed |
|---|---|---|
| `content.sqlite` | the database Forge reads and writes | yes |
| `dump.sql` | deterministic SQL dump, for review | yes, generated |

Both are committed. The database because it is the source of truth; the dump because a binary
file in a pull request tells a reviewer nothing.

```sh
npm run forge:dump     # regenerate dump.sql from content.sqlite
```

`dump.sql` is ordered by primary key with schema statements first, so diffs are stable and
structural changes show up before data changes.

## Do not edit either file by hand

Edit through the Forge UI:

```sh
npm run forge:api      # :7777
npm run forge:web      # :5173
```

The database enforces invariants that a hand-edit bypasses — foreign keys, slug patterns, the
`race_grant` kind check, the `skill_choice` option-count trigger. See
[../../docs/forge/schema.md](../../docs/forge/schema.md).

`dump.sql` is generated output. Editing it changes nothing; the next export overwrites it.

## Recovery

If `content.sqlite` is lost or corrupted, rebuild from the dump:

```sh
sqlite3 content.sqlite < dump.sql
```

This is the reason both files are committed rather than just the database.

## Schema changes

Schema lives in `packages/forge/api/migrations/`, not here. Add a numbered migration, run the
API to apply it, then re-dump. Migrations are append-only — never edit one that has been
applied.

## Reproducibility

The whole chain must work from a fresh clone: migrations create the schema, `content.sqlite`
holds the content, and `npm run packs:build` produces the compendium packs.

This is a deliberate response to `foundryvtt-wwn`, whose fourteen pack-generation scripts all
point at a gitignored `/import-scripts/` directory, so nobody but its author can rebuild its
packs.
