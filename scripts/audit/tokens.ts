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

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const uiSrc = join(repoRoot, "packages", "ui", "src");

/** Tailwind utilities that take a colour. */
const COLOUR_UTILITIES =
  "bg|text|border|ring|fill|stroke|from|via|to|outline|divide|decoration|shadow|accent|caret|placeholder";

/** Raw scales are Tier 1 — components must go through the semantic layer. */
const RAW_SCALE = new RegExp(
  `\\b(?:${COLOUR_UTILITIES})-(neutral|red|green|amber|blue|slate|gray|grey|zinc|stone|orange|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b`,
  "g",
);

/** A literal colour anywhere in a component is a theme that cannot move. */
const LITERAL_COLOUR = /(#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\()/g;

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

const findings: Finding[] = [];

for (const file of sourceFiles()) {
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
