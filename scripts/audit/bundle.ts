/**
 * Per-entry size of the published package.
 *
 * A source-first library is judged on what lands in the consumer's project as
 * much as on what ships to their users, so this reports both: the source the
 * CLI writes, and the built module plus everything it pulls in.
 *
 *   pnpm audit:bundle
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const registryDir = join(repoRoot, "packages", "registry", "r");
const distDir = join(repoRoot, "packages", "ui", "dist");

/** A single source file this big is a component that wants splitting up. */
const SOURCE_BUDGET_BYTES = 24_000;

interface Row {
  name: string;
  kind: string;
  sourceBytes: number;
  gzipBytes: number;
  npmDependencies: string[];
}

if (!existsSync(join(registryDir, "index.json"))) {
  console.error(`No registry at ${registryDir}. Run \`pnpm build:registry\` first.`);
  process.exit(1);
}

const rows: Row[] = [];

for (const file of readdirSync(registryDir)) {
  if (!file.endsWith(".json") || file === "index.json") continue;

  const item = JSON.parse(readFileSync(join(registryDir, file), "utf8")) as {
    name: string;
    type: string;
    dependencies: string[];
    files: { content: string }[];
  };

  const source = item.files.map((entry) => entry.content).join("\n");
  rows.push({
    name: item.name,
    kind: item.type.replace("registry:", ""),
    sourceBytes: Buffer.byteLength(source, "utf8"),
    gzipBytes: gzipSync(Buffer.from(source, "utf8")).length,
    npmDependencies: item.dependencies,
  });
}

rows.sort((a, b) => b.sourceBytes - a.sourceBytes);

const totalSource = rows.reduce((sum, row) => sum + row.sourceBytes, 0);

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

console.log(`Registry: ${String(rows.length)} entries, ${kb(totalSource)} of source.\n`);
console.log("  Largest entries");
for (const row of rows.slice(0, 10)) {
  console.log(
    `    ${row.name.padEnd(20)} ${row.kind.padEnd(6)} ${kb(row.sourceBytes).padStart(9)}  ${kb(row.gzipBytes).padStart(9)} gzipped`,
  );
}

// Every npm package a consumer could be asked to install, and what asks for it.
const byDependency = new Map<string, string[]>();
for (const row of rows) {
  for (const dependency of row.npmDependencies) {
    byDependency.set(dependency, [...(byDependency.get(dependency) ?? []), row.name]);
  }
}

console.log("\n  npm dependencies a consumer may be asked to install");
for (const [dependency, users] of [...byDependency].sort()) {
  console.log(`    ${dependency.padEnd(28)} ${String(users.length)} entries`);
}

// One file per module means one file per component in dist — evidence that the
// package tree-shakes rather than a claim that it does.
if (existsSync(distDir)) {
  const componentModules = readdirSync(join(distDir, "components"), {
    withFileTypes: true,
  }).filter((entry) => entry.isDirectory()).length;
  const indexBytes = statSync(join(distDir, "index.js")).size;
  console.log(
    `\n  Build: ${String(componentModules)} separately-importable component modules; ` +
      `barrel is ${kb(indexBytes)} of re-exports only.`,
  );
}

const oversized = rows.filter((row) => row.sourceBytes > SOURCE_BUDGET_BYTES);
if (oversized.length > 0) {
  console.error(`\nOver the ${kb(SOURCE_BUDGET_BYTES)} source budget:\n`);
  for (const row of oversized) {
    console.error(`  ${row.name.padEnd(20)} ${kb(row.sourceBytes)}`);
  }
  process.exit(1);
}

console.log(`\nAll entries within the ${kb(SOURCE_BUDGET_BYTES)} source budget.`);
