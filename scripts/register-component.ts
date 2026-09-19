/**
 * Adds components to the registry barrel and the package entry point.
 *
 * The motion catalogue lands several hundred components in phases; editing two
 * barrels by hand for each one is where an entry gets missed. New entries are
 * appended to each list (the lists are not strictly sorted today, and
 * re-sorting them would bury every real change in a reorder diff).
 *
 *   pnpm tsx scripts/register-component.ts dots-loader ring-loader
 *
 * Idempotent: a component already present is skipped. Also brings the
 * component count claimed in the READMEs and the npm description in line with
 * what is on disk, which `audit:counts` checks.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const uiSrc = join(repoRoot, "packages", "ui", "src");
const barrelPath = join(uiSrc, "registry", "components.ts");
const indexPath = join(uiSrc, "index.ts");

function identifier(name: string): string {
  return `${name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase())}Meta`;
}

const names = process.argv.slice(2);
if (names.length === 0) {
  console.error("usage: tsx scripts/register-component.ts <name> [...names]");
  process.exit(1);
}

let barrel = readFileSync(barrelPath, "utf8");
let index = readFileSync(indexPath, "utf8");

for (const name of names) {
  if (!existsSync(join(uiSrc, "components", name, "meta.ts"))) {
    console.error(`skip ${name}: no components/${name}/meta.ts`);
    process.exitCode = 1;
    continue;
  }

  const id = identifier(name);
  const importLine = `import { meta as ${id} } from "@/components/${name}/meta";`;
  if (!barrel.includes(importLine)) {
    const imports = [
      ...barrel.matchAll(/^import \{ meta as \w+ \} from "@\/components\/.+";$/gm),
    ];
    const last = imports.at(-1);
    if (!last || last.index === undefined) throw new Error("no component imports found");
    const at = last.index + last[0].length;
    barrel = `${barrel.slice(0, at)}\n${importLine}${barrel.slice(at)}`;
    barrel = barrel.replace(/(\n {2}\w+Meta,\n)(\];)/, `$1  ${id},\n$2`);
  }

  const exportLine = `export * from "./components/${name}";`;
  if (!index.includes(exportLine)) {
    const exports = [...index.matchAll(/^export \* from "\.\/components\/.+";$/gm)];
    const last = exports.at(-1);
    if (!last || last.index === undefined) throw new Error("no component exports found");
    const at = last.index + last[0].length;
    index = `${index.slice(0, at)}\n${exportLine}${index.slice(at)}`;
  }

  console.log(`registered ${name}`);
}

writeFileSync(barrelPath, barrel);
writeFileSync(indexPath, index);

const componentCount = readdirSync(join(uiSrc, "components"), { withFileTypes: true }).filter(
  (entry) =>
    entry.isDirectory() && existsSync(join(uiSrc, "components", entry.name, "meta.ts")),
).length;

for (const [file, pattern] of [
  ["README.md", /\*\*\d+ components\*\*/],
  ["packages/ui/README.md", /\*\*\d+ components\*\*/],
  ["packages/ui/package.json", /\d+ accessible components/],
] as const) {
  const path = join(repoRoot, file);
  const text = readFileSync(path, "utf8");
  writeFileSync(
    path,
    text.replace(pattern, (match) => match.replace(/\d+/, String(componentCount))),
  );
}
console.log(`${String(componentCount)} components`);
