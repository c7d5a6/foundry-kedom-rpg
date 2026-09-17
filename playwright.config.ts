import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a running Foundry instance with a Kedom world open.
 * Shape borrowed from StarWarsFFG -- the only surveyed system with working e2e
 * tests -- with its two flaws fixed: it waits on a system UI element standing in
 * for a ready signal, and its CI never runs the tests. See ADR-014.
 *
 * Foundry must already be running. These tests do not start it.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",

  // Tests mutate one shared world, so they cannot run in parallel. This is a
  // property of Foundry, not a temporary limitation.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  globalSetup: "./e2e/setup.ts",

  use: {
    baseURL: process.env.FOUNDRY_URL ?? "http://localhost:30000",
    // Written by globalSetup after joining as Gamemaster, so tests skip auth.
    storageState: "./e2e/state.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
