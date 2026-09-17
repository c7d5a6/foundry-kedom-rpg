# @kedom/shared

Types used by both the Foundry system and the Forge UI, so a skill or a background has one
definition rather than two that drift apart.

## Layout

```
src/
  index.ts              barrel
  generated/            tygo output from the Go models -- GITIGNORED, do not edit
    content.ts
  slug.ts               branded slug types and the slug pattern
  tiers.ts              the success ladder and proficiency tiers
```

## Generated versus hand-written

`src/generated/` comes from `packages/forge/api/internal/model` via
[tygo](../forge/api/tygo.yaml). It is gitignored and regenerated:

```sh
pnpm forge:types
```

Everything else in `src/` is hand-written and covers what has no Go equivalent — the branded
slug types, and the success-ladder types that only the Foundry side uses.

The split is deliberate: **content shapes** are generated from the database's authority, while
**play mechanics** are authored here, because Forge knows nothing about rolls.

## Why the Go models are the source

The Forge database is where content is defined
([ADR-011](../../docs/research/05-decisions.md#adr-011--sqlite-is-the-content-source-of-truth-yaml-is-the-reviewable-artefact)),
so its Go structs are the authoritative shape and generating downward is the only direction
that cannot drift. See
[ADR-012](../../docs/research/05-decisions.md#adr-012--go-for-the-forge-api-pure-go-sqlite).

## Constraints

No DOM, no Foundry globals, no dependencies. `tsconfig.json` sets `"lib": ["ES2023"]` and
`"types": []` to enforce it — this package has to remain consumable from a browser bundle and
from a Foundry system alike.

Types only, no runtime behaviour beyond small pure helpers such as slug validation. Anything
with real logic belongs in whichever package owns it.
