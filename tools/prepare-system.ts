/**
 * Export forge content into the Foundry system and rebuild packs + dist.
 *
 * Same content pipeline as `npm run release`, without version bump / tag / publish.
 *
 * Usage: npm run system:prepare
 *
 * Steps:
 *   1. forge:export:packs  — YAML under packs/_source/ + closed-vocab lang/{en,ru}.json
 *   2. packs:build         — wipe LevelDB packs, compile from YAML
 *   3. system:build        — vite dist/ (copies packs + lang into the linked system)
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function run(script: string): void {
  console.log(`→ npm run ${script}`);
  const result = spawnSync("npm", ["run", script], {
    cwd: root,
    stdio: "inherit",
    encoding: "utf8",
  });
  if (result.error) fail(`npm run ${script}: ${result.error.message}`);
  if (result.status !== 0) fail(`npm run ${script} failed (exit ${String(result.status)})`);
}

function main(): void {
  console.log("prepare system: forge export → packs → dist");
  run("forge:export:packs");
  run("packs:build");
  run("system:build");
  console.log("prepare system: done");
}

main();
