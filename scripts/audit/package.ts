/**
 * What each publishable package actually ships to npm.
 *
 * The bundle audit measures the source the CLI writes and the modules a bundler
 * pulls in. Neither of those is the npm tarball, so nothing was watching it —
 * and 0.1.0 went out carrying 110 test and story files that no consumer can
 * use. This closes that gap: it asks npm itself what it would pack, so the
 * answer comes from the same code that does the packing rather than from a
 * second guess at the `files` semantics.
 *
 *   pnpm audit:package
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Files that are part of building the library but useless to anyone consuming
 * it. Shipping them costs install time and bandwidth for every user forever.
 */
const NEVER_PUBLISH = [
  { pattern: /\.test\.[cm]?[jt]sx?$/, why: "test" },
  { pattern: /\.stories\.[cm]?[jt]sx?$/, why: "story" },
  { pattern: /\.storybook\//, why: "storybook config" },
  { pattern: /(^|\/)tsconfig(\.\w+)?\.json$/, why: "tsconfig" },
  { pattern: /(^|\/)vitest\.config\./, why: "test config" },
  { pattern: /(^|\/)\.env/, why: "env file" },
  { pattern: /(^|\/)coverage\//, why: "coverage report" },
] as const;

/** Unpacked size past which a package deserves a second look, not a failure. */
const SIZE_ADVISORY_BYTES = 2_000_000;

interface PackedFile {
  path: string;
  size: number;
}

interface PackReport {
  name: string;
  version: string;
  size: number;
  unpackedSize: number;
  entryCount: number;
  files: PackedFile[];
}

/** Workspace packages that are actually published, read from the manifests. */
function publishablePackages(): { dir: string; name: string }[] {
  const dirs = ["packages/ui", "packages/cli", "packages/themes", "packages/registry"];
  const found: { dir: string; name: string }[] = [];

  for (const dir of dirs) {
    const manifest = join(repoRoot, dir, "package.json");
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, "utf8")) as {
      name: string;
      private?: boolean;
    };
    if (pkg.private) continue;
    found.push({ dir, name: pkg.name });
  }

  return found;
}

function pack(dir: string): PackReport {
  // --dry-run so nothing is written; --json so the file list is exact rather
  // than parsed back out of human-readable output.
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: join(repoRoot, dir),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 32 * 1024 * 1024,
  });
  return (JSON.parse(raw) as PackReport[])[0];
}

function kb(bytes: number): string {
  return `${(bytes / 1000).toFixed(1)} kB`;
}

const packages = publishablePackages();
if (packages.length === 0) {
  console.error("No publishable packages found.");
  process.exit(1);
}

interface Violation {
  pkg: string;
  path: string;
  why: string;
}

const violations: Violation[] = [];
const advisories: string[] = [];

console.log("Packages as npm would publish them\n");

for (const { dir, name } of packages) {
  let report: PackReport;
  try {
    report = pack(dir);
  } catch {
    console.error(`  ${name.padEnd(20)} could not be packed — is it built?`);
    process.exit(1);
  }

  for (const file of report.files) {
    for (const rule of NEVER_PUBLISH) {
      if (rule.pattern.test(file.path)) {
        violations.push({ pkg: name, path: file.path, why: rule.why });
      }
    }
  }

  if (report.unpackedSize > SIZE_ADVISORY_BYTES) {
    advisories.push(`${name} unpacks to ${kb(report.unpackedSize)}`);
  }

  console.log(
    `  ${name.padEnd(20)} ${String(report.version).padEnd(8)} ` +
      `${String(report.entryCount).padStart(4)} files  ` +
      `${kb(report.size).padStart(9)} packed  ${kb(report.unpackedSize).padStart(10)} unpacked`,
  );
}

if (advisories.length > 0) {
  console.log("\n  Advisory\n");
  for (const line of advisories) console.log(`    ${line}`);
}

if (violations.length > 0) {
  console.error(`\n${String(violations.length)} file(s) that should never be published:\n`);
  // Grouped by package, and capped: one missing exclusion produces hundreds of
  // near-identical lines, which buries the rest of the audit output.
  const byPackage = new Map<string, Violation[]>();
  for (const violation of violations) {
    byPackage.set(violation.pkg, [...(byPackage.get(violation.pkg) ?? []), violation]);
  }
  for (const [pkg, found] of byPackage) {
    console.error(`  ${pkg} — ${String(found.length)} file(s)`);
    for (const violation of found.slice(0, 5)) {
      console.error(`    ${violation.path}  (${violation.why})`);
    }
    if (found.length > 5) {
      console.error(`    … and ${String(found.length - 5)} more`);
    }
  }
  console.error("\nAdd an exclusion to the package's `files` field.");
  process.exit(1);
}

console.log("\nNo test, story or config files are published.");
