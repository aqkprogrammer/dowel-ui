/**
 * Publishes a directory of package tarballs to npm.
 *
 *   node scripts/publish-tarballs.ts <directory> [--dry-run]
 *
 * This is the only code that runs in the job allowed to publish, so it imports
 * nothing that had to be installed: Node runs it as it is, with no
 * `pnpm install` and no build beside it. Whatever a dependency's install
 * script could do, it cannot do it there. The tarballs come from
 * `pnpm release pack`, built in a job that has no publishing rights.
 *
 * npm authenticates with the workflow's identity (trusted publishing), so
 * there is no token to keep and no one-time code to type. A version npm
 * already has is skipped, so a run that failed half-way can be run again.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const [directory, ...flags] = process.argv.slice(2);
const dryRun = flags.includes("--dry-run");

if (!directory) {
  console.error("usage: node scripts/publish-tarballs.ts <directory> [--dry-run]");
  process.exit(1);
}

function manifestOf(tarball: string): { name: string; version: string } {
  const result = spawnSync("tar", ["-xOzf", tarball, "package/package.json"], {
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`Could not read package.json from ${tarball}.`);
  return JSON.parse(result.stdout) as { name: string; version: string };
}

function onNpm(name: string, version: string): boolean {
  const result = spawnSync("npm", ["view", `${name}@${version}`, "version"], {
    encoding: "utf8",
  });
  return result.status === 0 && result.stdout.trim() === version;
}

const root = resolve(directory);
const tarballs = readdirSync(root)
  .filter((file) => file.endsWith(".tgz"))
  .sort();

if (tarballs.length === 0) {
  console.error(`✗ No tarballs in ${root}.`);
  process.exit(1);
}

for (const file of tarballs) {
  const tarball = join(root, file);
  const { name, version } = manifestOf(tarball);

  if (onNpm(name, version)) {
    console.log(`• ${name}@${version} is already on npm.`);
    continue;
  }

  const args = ["publish", tarball, "--access", "public"];
  if (dryRun) args.push("--dry-run");
  const result = spawnSync("npm", args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`✗ npm could not publish ${name}@${version}.`);
    process.exit(1);
  }
  console.log(`✓ ${dryRun ? "Would publish" : "Published"} ${name}@${version}.`);
}
