/**
 * Bump system.json version, build, zip dist, commit, tag, push, and create a
 * GitHub Release with system.json + kedom.zip via `gh` (no GitHub Actions).
 *
 * Usage:
 *   npm run release -- patch
 *   npm run release -- minor
 *   npm run release -- major
 *   npm run release -- 0.2.0
 *   npm run release -- patch --dry-run
 */
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const systemJsonPath = join(root, "packages/system/system.json");
const distPath = join(root, "packages/system/dist");

type SystemJson = {
  version: string;
  [key: string]: unknown;
};

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function run(
  command: string,
  args: string[],
  opts: { cwd?: string; dryRun?: boolean; label?: string } = {},
): void {
  const label = opts.label ?? `${command} ${args.join(" ")}`;
  if (opts.dryRun) {
    console.log(`[dry-run] ${label}`);
    return;
  }
  const result = spawnSync(command, args, {
    cwd: opts.cwd ?? root,
    stdio: "inherit",
    encoding: "utf8",
  });
  if (result.error) fail(`${label}: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} failed (exit ${String(result.status)})`);
}

function capture(command: string, args: string[], cwd = root): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) fail(`${command}: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return (result.stdout ?? "").trim();
}

function which(bin: string): boolean {
  const result = spawnSync("which", [bin], { encoding: "utf8" });
  return result.status === 0;
}

function parseArgs(argv: string[]): { bump: string; dryRun: boolean } {
  const positional: string[] = [];
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("-")) fail(`unknown flag: ${arg}\nUsage: npm run release -- <major|minor|patch|x.y.z> [--dry-run]`);
    positional.push(arg);
  }
  if (positional.length !== 1) {
    fail("Usage: npm run release -- <major|minor|patch|x.y.z> [--dry-run]");
  }
  return { bump: positional[0]!, dryRun };
}

function parseSemver(version: string): [number, number, number] {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) fail(`invalid semver in system.json: ${version}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function nextVersion(current: string, bump: string): string {
  if (/^\d+\.\d+\.\d+$/.test(bump)) {
    const [cMaj, cMin, cPat] = parseSemver(current);
    const [nMaj, nMin, nPat] = parseSemver(bump);
    const currentKey = cMaj * 1e6 + cMin * 1e3 + cPat;
    const nextKey = nMaj * 1e6 + nMin * 1e3 + nPat;
    if (nextKey <= currentKey) {
      fail(`version ${bump} must be greater than current ${current}`);
    }
    return bump;
  }
  const [maj, min, pat] = parseSemver(current);
  if (bump === "major") return `${maj + 1}.0.0`;
  if (bump === "minor") return `${maj}.${min + 1}.0`;
  if (bump === "patch") return `${maj}.${min}.${pat + 1}`;
  fail(`unknown bump "${bump}" (use major, minor, patch, or x.y.z)`);
}

function assertCleanTree(): void {
  const status = capture("git", ["status", "--porcelain"]);
  if (status) {
    fail(`working tree is dirty; commit or stash first:\n${status}`);
  }
}

function assertGhReady(): void {
  if (!which("gh")) fail("gh CLI not found on PATH (https://cli.github.com/)");
  const result = spawnSync("gh", ["auth", "status"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    fail(`gh is not authenticated. Run: gh auth login\n${result.stderr || result.stdout}`);
  }
}

function zipDist(zipPath: string, dryRun: boolean): void {
  if (!existsSync(distPath)) fail(`missing ${distPath}; build failed?`);
  if (!which("zip")) fail("zip not found on PATH (needed to package kedom.zip)");
  if (dryRun) {
    console.log(`[dry-run] zip -r ${zipPath} . -x *.map  (cwd: ${distPath})`);
    return;
  }
  // Archive root = dist contents (no wrapping kedom/ folder).
  const result = spawnSync("zip", ["-r", zipPath, ".", "-x", "*.map", "-x", "**/*.map"], {
    cwd: distPath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    fail(`zip failed:\n${result.stderr || result.stdout}`);
  }
}

function main(): void {
  const { bump, dryRun } = parseArgs(process.argv.slice(2));

  if (!dryRun) {
    assertCleanTree();
    assertGhReady();
  } else {
    console.log("[dry-run] skipping clean-tree / gh auth checks");
  }

  if (!existsSync(systemJsonPath)) fail(`missing ${systemJsonPath}`);
  const systemJson = JSON.parse(readFileSync(systemJsonPath, "utf8")) as SystemJson;
  const current = systemJson.version;
  if (typeof current !== "string") fail("system.json: version must be a string");

  const version = nextVersion(current, bump);
  const tag = `v${version}`;

  console.log(`release ${current} → ${version} (${tag})${dryRun ? " [dry-run]" : ""}`);

  systemJson.version = version;
  if (!dryRun) {
    writeFileSync(systemJsonPath, `${JSON.stringify(systemJson, null, 2)}\n`, "utf8");
  } else {
    console.log(`[dry-run] write ${systemJsonPath} version=${version}`);
  }

  run("npm", ["run", "system:build"], { dryRun, label: "npm run system:build" });

  const staging = dryRun
    ? join(tmpdir(), "kedom-release-dry-run")
    : mkdtempSync(join(tmpdir(), "kedom-release-"));
  const zipPath = join(staging, "kedom.zip");
  const stagedSystemJson = join(staging, "system.json");

  try {
    if (!dryRun) {
      zipDist(zipPath, false);
      copyFileSync(join(distPath, "system.json"), stagedSystemJson);
    } else {
      zipDist(zipPath, true);
      console.log(`[dry-run] copy dist/system.json → ${stagedSystemJson}`);
    }

    run("git", ["add", "packages/system/system.json"], {
      dryRun,
      label: "git add packages/system/system.json",
    });
    run("git", ["commit", "-m", `release: ${tag}`], {
      dryRun,
      label: `git commit -m "release: ${tag}"`,
    });
    run("git", ["tag", "-a", tag, "-m", tag], {
      dryRun,
      label: `git tag -a ${tag}`,
    });
    run("git", ["push", "origin", "HEAD", "--follow-tags"], {
      dryRun,
      label: "git push origin HEAD --follow-tags",
    });

    run(
      "gh",
      [
        "release",
        "create",
        tag,
        zipPath,
        stagedSystemJson,
        "--title",
        tag,
        "--generate-notes",
      ],
      {
        dryRun,
        label: `gh release create ${tag} kedom.zip system.json`,
      },
    );

    console.log(
      dryRun
        ? `[dry-run] would publish ${tag}`
        : `published ${tag}\nmanifest: https://github.com/c7d5a6/foundry-kedom-rpg/releases/latest/download/system.json`,
    );
  } finally {
    if (!dryRun && existsSync(staging)) {
      rmSync(staging, { recursive: true, force: true });
    }
  }
}

main();
