/**
 * The release workflow's steps, as commands that also run locally.
 *
 *   pnpm release check v0.12.0          the tag, the versions, the changelog, the live registry
 *   pnpm release notes v0.12.0 out.md   the changelog's section, for the GitHub release
 *   pnpm release pack v0.12.0 out/      a tarball of every public package
 *
 * `check` exists because the order matters and nothing else enforces it: the
 * CLI resolves components from the live registry, and the registry URL is
 * compiled into each published version, so a CLI published before the site is
 * deployed points at a registry that does not have its components
 * (RELEASING.md).
 *
 * `pack` uses pnpm, which rewrites `workspace:` ranges to real versions. The
 * tarballs are published by `scripts/publish-tarballs.ts`, which is kept
 * separate and dependency-free so the job that is allowed to publish runs no
 * installed code at all.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { branding } from "../branding.config";

import {
  changelogSection,
  outOfStep,
  versionFromTag,
  type WorkspacePackage,
} from "./lib/release";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function workspacePackages(): WorkspacePackage[] {
  const root = join(repoRoot, "packages");
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(root, entry.name);
      const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
        name: string;
        version: string;
        private?: boolean;
      };
      return {
        name: manifest.name,
        version: manifest.version,
        private: manifest.private ?? false,
        dir,
      };
    });
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function check(version: string, skipRegistry: boolean): Promise<void> {
  const behind = outOfStep(workspacePackages(), version);
  if (behind.length > 0) {
    fail(`The tag says ${version}, but these are not at it: ${behind.join(", ")}.`);
  }
  console.log(`✓ Every published package is at ${version}.`);

  const changelog = readFileSync(join(repoRoot, "CHANGELOG.md"), "utf8");
  if (changelogSection(changelog, version) === null) {
    fail(`CHANGELOG.md has no "## ${version}" section, or it is empty.`);
  }
  console.log(`✓ CHANGELOG.md has a section for ${version}.`);

  if (skipRegistry) return;
  const url = `${branding.registryUrl}/index.json`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) fail(`${url} answered ${String(response.status)}.`);
  const { generatedFrom } = (await response.json()) as { generatedFrom?: string };
  // The registry build stamps itself with the UI package's name and version.
  const ui = JSON.parse(
    readFileSync(join(repoRoot, "packages", "ui", "package.json"), "utf8"),
  ) as { name: string };
  const expected = `${ui.name}@${version}`;
  if (generatedFrom !== expected) {
    fail(
      `The live registry was generated from ${String(generatedFrom)}, not ${expected}. ` +
        "Deploy the site before publishing: the CLI reads the registry.",
    );
  }
  console.log(`✓ The live registry serves ${expected}.`);
}

function notes(version: string, out: string | undefined): void {
  const section = changelogSection(
    readFileSync(join(repoRoot, "CHANGELOG.md"), "utf8"),
    version,
  );
  if (section === null) fail(`CHANGELOG.md has no "## ${version}" section, or it is empty.`);
  if (out) writeFileSync(out, `${section}\n`);
  else console.log(section);
}

function pack(version: string, out: string | undefined): void {
  if (!out) fail("usage: tsx scripts/release.ts pack <tag> <directory>");
  const packages = workspacePackages().filter((entry) => !entry.private);
  const behind = outOfStep(packages, version);
  if (behind.length > 0) fail(`Not at ${version}: ${behind.join(", ")}.`);

  const destination = resolve(out);
  mkdirSync(destination, { recursive: true });
  for (const entry of packages) {
    const packed = spawnSync("pnpm", ["pack", "--pack-destination", destination], {
      cwd: entry.dir,
      stdio: ["ignore", "ignore", "inherit"],
    });
    if (packed.status !== 0) fail(`Could not pack ${entry.name}.`);
    console.log(`✓ Packed ${entry.name}@${version}.`);
  }
}

const [command, tag, ...rest] = process.argv.slice(2);
if (!command || !tag) {
  fail("usage: tsx scripts/release.ts <check|notes|pack> <tag> [options]");
}

let version: string;
try {
  version = versionFromTag(tag);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

if (command === "check") await check(version, rest.includes("--skip-registry"));
else if (command === "notes") notes(version, rest[0]);
else if (command === "pack") pack(version, rest[0]);
else fail(`Unknown command "${command}".`);
