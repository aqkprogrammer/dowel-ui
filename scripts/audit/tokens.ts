/**
 * Checks that components use only semantic tokens.
 *
 * The whole re-skinning story depends on it: a component that reaches past the
 * semantic layer to a raw scale, or to a literal colour, stops responding to
 * themes and silently breaks every preset. That is invisible until someone
 * switches theme and one component stays the wrong colour.
 *
 *   pnpm audit:tokens
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { LITERAL_COLOUR, PALETTE_CLASS } from "../../packages/registry/src/rules";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const uiSrc = join(repoRoot, "packages", "ui", "src");

// Shared with `dowel audit`. Component source is held to the strict form —
// any literal colour at all — where a project is only told about literals in
// classes and inline styles, because a component has no business owning one.
const RAW_SCALE = PALETTE_CLASS;

interface Finding {
  file: string;
  line: number;
  match: string;
  reason: string;
}

function sourceFiles(): string[] {
  const files: string[] = [];

  for (const group of ["components", "blocks"]) {
    const root = join(uiSrc, group);
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      for (const file of readdirSync(join(root, entry.name))) {
        // Stories and tests may use raw scales freely: they are examples, not
        // the component, and are never installed into anyone's project.
        if (!file.endsWith(".tsx") || file.includes(".test.") || file.includes(".stories.")) {
          continue;
        }
        files.push(join(root, entry.name, file));
      }
    }
  }

  return files.sort();
}

/**
 * Illustrated components whose artwork is the point: a scene with its own
 * palette, like a brand mark. Their colours live in one CSS string as custom
 * properties (`--boulder-run-*`, `--reactor-*` and so on) that a project can re-tint
 * from a class, so they stay overridable without following the theme.
 */
const ILLUSTRATIONS = new Set([
  "boulder-run-switch/boulder-run-switch.tsx",
  "reactor-switch/reactor-switch.tsx",
  "symbiote-switch/symbiote-switch.tsx",
  "snow-globe-switch/snow-globe-switch.tsx",
  "mercury-switch/mercury-switch.tsx",
  "dot-matrix-switch/dot-matrix-switch.tsx",
  "tide-switch/tide-switch.tsx",
  "neon-sign-switch/neon-sign-switch.tsx",
  "origami-switch/origami-switch.tsx",
  "eclipse-switch/eclipse-switch.tsx",
  "sleepy-blob-switch/sleepy-blob-switch.tsx",
  "dot-matrix-loader/dot-matrix-loader.tsx",
]);

const findings: Finding[] = [];

for (const file of sourceFiles().filter(
  (file) => ![...ILLUSTRATIONS].some((allowed) => file.endsWith(allowed)),
)) {
  const lines = readFileSync(file, "utf8").split("\n");

  lines.forEach((line, index) => {
    for (const match of line.matchAll(RAW_SCALE)) {
      findings.push({
        file: relative(repoRoot, file),
        line: index + 1,
        match: match[0],
        reason: "raw colour scale — use a semantic token",
      });
    }

    for (const match of line.matchAll(LITERAL_COLOUR)) {
      findings.push({
        file: relative(repoRoot, file),
        line: index + 1,
        match: match[0],
        reason: "literal colour — use a semantic token",
      });
    }
  });
}

const files = sourceFiles().length;

if (findings.length === 0) {
  console.log(`Tokens: ${String(files)} source files, no raw colours.`);
  process.exit(0);
}

console.error(`Tokens: ${String(findings.length)} raw colour(s) in component source.\n`);
for (const finding of findings) {
  console.error(
    `  ${finding.file}:${String(finding.line)}  ${finding.match}  — ${finding.reason}`,
  );
}
process.exit(1);
