/**
 * Compile packs/_source YAML into LevelDB packs via @foundryvtt/foundryvtt-cli.
 * Usage: npm run packs:build
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const systemDir = join(root, "packages", "system");
const sourceRoot = join(systemDir, "packs", "_source");
const packsRoot = join(systemDir, "packs");

const PACKS = ["origins", "talents"] as const;

function compilePack(name: string): void {
  const src = join(sourceRoot, name);
  const dest = join(packsRoot, name);
  if (!existsSync(src)) {
    console.log(`skip ${name}: no ${src}`);
    return;
  }
  const files = readdirSync(src).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  if (files.length === 0) {
    console.log(`skip ${name}: empty source`);
    return;
  }
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });

  const result = spawnSync(
    "npx",
    [
      "--no-install",
      "fvtt",
      "package",
      "pack",
      "-n",
      name,
      "--type",
      "Item",
      "-t",
      "yaml",
      "--inputDirectory",
      src,
      "--outputDirectory",
      dest,
    ],
    { cwd: systemDir, stdio: "inherit", shell: true },
  );
  if (result.status !== 0) {
    // Fallback: copy note when CLI unavailable — still leave _source as SoT.
    console.warn(
      `fvtt pack failed for ${name} (exit ${result.status ?? "?"}). YAML sources remain in packs/_source/${name}.`,
    );
  } else {
    console.log(`packed ${name} (${files.length} docs)`);
  }
}

for (const pack of PACKS) {
  compilePack(pack);
}
