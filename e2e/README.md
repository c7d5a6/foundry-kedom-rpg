# e2e/

Playwright against a running Foundry instance was sketched here earlier.

**Deferred / not required.** [ADR-014](../docs/research/05-decisions.md#adr-014--unit-tests-only-no-playwright-e2e-for-now)
replaces e2e with **Vitest unit tests** for pure rules and derivations. Do not wire Playwright
into `npm run check` or CI unless that ADR is revisited.

Scaffold files (`playwright.config.ts`, this folder) may remain in the tree unused.

```sh
npm test              # Vitest — the current test gate
# npm run test:e2e    # not an expected workflow
```
