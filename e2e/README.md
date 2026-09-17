# e2e/

Playwright tests against a running Foundry instance. Config:
[../playwright.config.ts](../playwright.config.ts).

**Not implemented yet.** This file is the contract.

## Prerequisites

Foundry running at `FOUNDRY_URL` (default `http://localhost:30000`) with a Kedom world open and
the system linked (`pnpm system:link`). The tests do not start Foundry.

```sh
pnpm test:e2e
```

## `setup.ts` — `globalSetup`

1. Navigate to `/join`.
2. Select the Gamemaster user from `#join-game-form select[name="userid"]` and join.
3. **Wait for the Kedom ready signal.**
4. Save `storageState` to `e2e/state.json` so tests skip auth.

### The ready signal

The system sets an explicit marker on the `ready` hook — a `data-kedom-ready` attribute on
`document.body` — and `setup.ts` waits for that.

This is the one place the borrowed design is deliberately changed. StarWarsFFG waits for
`#destinyDark`, a system UI element standing in for a ready signal, which couples its test
harness to its own layout and breaks whenever that element moves. An explicit marker cannot
drift.

## `fixtures.ts`

Helpers for creating and cleaning up documents, in the shape of StarWarsFFG's ~450-line
`playwright/fixtures.ts` but v14-only:

- `createActor(type, data)` / `createItem(type, data)`, auto-cleaned after each test
- `setField(selector, value)` that retries through re-render races — sheets re-render on every
  document update, so a naive `fill()` is flaky
- ApplicationV2 and DialogV2 selectors
- sidebar context-menu helpers

## The first tests

Small and load-bearing, not a suite for its own sake:

1. Create a character, set an attribute, assert the derived modifier on the sheet.
2. Roll a skill; assert the total, the tier badge, and the modifier breakdown on the chat card.
3. Drag a condition from the compendium onto an actor; assert the derived path changed.
4. Equip armour; assert AC.
5. Take a wound; assert `wounded` appears and natural healing is blocked.

Tests 2 and 5 are the ones worth having: they cover the pure logic *through* the UI, which is
the seam unit tests cannot reach.

## Constraints

- `fullyParallel: false` and one worker. Tests share one world; this is a property of Foundry,
  not a temporary limitation.
- **Every test cleans up after itself.** A leaked actor makes the next run's assertions
  ambiguous.
- Assert on **semantic** selectors and localised text keys, not on CSS classes. The CSS is
  going to change a lot ([../docs/system/ui-design-system.md](../docs/system/ui-design-system.md));
  the behaviour is not.
- **Wired into CI**, unlike StarWarsFFG's, whose workflow only builds releases.
