import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

/**
 * Unit tests cover the rules arithmetic: `resolveTier`, the modifier collectors,
 * and everything in `derivations/`. Those are pure functions over numbers, which
 * is exactly what unit tests are good at.
 *
 * Deliberately no Foundry environment and no mocking of `game`. If a test needs
 * Foundry, the code under test is not pure and belongs on the other side of the
 * boundary -- or the test belongs in Playwright. See docs/system/roll-pipeline.md.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@kedom/shared": resolve(root, "packages/shared/src/index.ts"),
    },
  },

  test: {
    // node, not jsdom: pure logic does not touch the DOM.
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "packages/*/*/src/**/*.test.ts", "tools/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Only the pure layers are held to a coverage bar. Sheets and documents
      // are covered by Playwright, and chasing coverage there produces tests
      // that assert implementation rather than behaviour.
      include: ["packages/system/src/derivations/**", "packages/system/src/rolls/**"],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
