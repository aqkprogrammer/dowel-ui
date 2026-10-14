/**
 * `@/components/x` must mean the same thing in this repo and in a project the
 * CLI installed it into.
 *
 * Here, `@/components/x` resolves to the folder's `index.ts`. An installed
 * project has no index: the CLI copies each file flat into `components/ui` and
 * rewrites the import to `@/components/ui/x`, which is the main file, `x.tsx`.
 * So anything `index.ts` exports that `x.tsx` does not works in every test
 * here and breaks the build of whoever installs it. `dither-bar` importing
 * `createSprings` from `dither-canvas`, and `agent-form` importing
 * `JsonSchema` from `agent-surface`, both did.
 *
 * The rule: everything a component's `index.ts` exports, its main file exports.
 *
 * Flat also means file names are shared. Every carousel carries its own
 * `carousel-controls.tsx` so that it installs alone, and installed together
 * the last one written wins: `swipe-carousel` carried a shorter one, and
 * `invite-carousel` then imported names its copy did not have.
 *
 * The second rule: files of the same name in different items are identical.
 *
 *   pnpm audit:installed-imports
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const uiSrc = join(repoRoot, "packages", "ui", "src");
const components = join(uiSrc, "components");

function resolveSibling(from: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const base = join(dirname(from), specifier);
  return [".tsx", ".ts", "/index.ts"].map((ext) => base + ext).find((path) => existsSync(path));
}

/** The names a file exports, following `export *` into its siblings. */
function exportsOf(file: string, seen = new Set<string>()): Set<string> {
  const names = new Set<string>();
  if (seen.has(file)) return names;
  seen.add(file);

  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest);
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      const clause = statement.exportClause;
      if (clause && ts.isNamedExports(clause)) {
        for (const element of clause.elements) names.add(element.name.text);
      } else if (!clause && statement.moduleSpecifier) {
        const target = resolveSibling(
          file,
          (statement.moduleSpecifier as ts.StringLiteral).text,
        );
        if (target) for (const name of exportsOf(target, seen)) names.add(name);
      }
      continue;
    }
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (!modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      }
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      names.add(statement.name.text);
    }
  }
  return names;
}

const problems: string[] = [];
let checked = 0;

for (const dir of readdirSync(components, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const index = join(components, dir.name, "index.ts");
  const main = [".tsx", ".ts"]
    .map((ext) => join(components, dir.name, dir.name + ext))
    .find((path) => existsSync(path));
  if (!existsSync(index) || !main) continue;
  checked += 1;

  const provided = exportsOf(main);
  const missing = [...exportsOf(index)].filter((name) => !provided.has(name));
  if (missing.length > 0) {
    problems.push(
      `${relative(repoRoot, main)} does not export ${missing.join(", ")}, ` +
        `which its index.ts does. Re-export them from ${dir.name}.tsx.`,
    );
  }
}

// Components land in one folder and blocks in another, so a name only has to
// be unique, or identical, within each.
const SHIPPED = /\.tsx?$/;
const NOT_SHIPPED = /\.(test|stories)\.tsx?$|^(index|meta)\.ts$/;

for (const group of ["components", "blocks"]) {
  const root = join(uiSrc, group);
  if (!existsSync(root)) continue;
  const byName = new Map<string, { item: string; source: string }[]>();

  for (const dir of readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const file of readdirSync(join(root, dir.name))) {
      if (!SHIPPED.test(file) || NOT_SHIPPED.test(file)) continue;
      const copies = byName.get(file) ?? [];
      copies.push({ item: dir.name, source: readFileSync(join(root, dir.name, file), "utf8") });
      byName.set(file, copies);
    }
  }

  for (const [file, copies] of byName) {
    if (new Set(copies.map((copy) => copy.source)).size <= 1) continue;
    problems.push(
      `${file} differs between ${copies.map((copy) => copy.item).join(", ")} (${group}). ` +
        "Installed together they overwrite each other: make the copies identical, or rename one.",
    );
  }
}

if (problems.length > 0) {
  console.error(`✗ ${String(problems.length)} components import differently once installed:\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `✓ ${String(checked)} components export the same from their main file as their index, ` +
    "and no two items ship different files under one name.",
);
