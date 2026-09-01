/**
 * Reports every place the placeholder branding still appears.
 *
 * During development placeholders are expected everywhere, so this is a report,
 * not a gate — run it with `--strict` (as the release workflow does) to fail
 * when any placeholder survives. Naming must be settled before the CLI and the
 * public registry URL ship, which is Phase 4.
 *
 *   pnpm check:branding
 *   pnpm check:branding --strict
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { walkTextFiles } from "./lib/walk";

/**
 * The original placeholder tokens.
 *
 * Deliberately hard-coded here rather than derived from `branding.config.ts`.
 * `pnpm rebrand` rewrites that file, so a list living there would be rewritten
 * to the *new* name — and this check would then report the real branding as an
 * unreplaced placeholder. It did exactly that once.
 *
 * This file is exempt from the rebrand, so these stay fixed.
 */
const BRANDING_PLACEHOLDERS = ["LibName", "@libname", "libname", "libname.dev"] as const;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Files whose whole purpose is to define or rewrite the placeholders. */
const EXEMPT = new Set([
  "branding.config.ts",
  "scripts/check-branding.ts",
  "scripts/rebrand.ts",
]);

interface Hit {
  file: string;
  line: number;
  placeholder: string;
  text: string;
}

function findHits(): Hit[] {
  const hits: Hit[] = [];

  for (const file of walkTextFiles(ROOT)) {
    if (EXEMPT.has(file)) continue;

    const lines = readFileSync(resolve(ROOT, file), "utf8").split("\n");
    lines.forEach((text, index) => {
      for (const placeholder of BRANDING_PLACEHOLDERS) {
        if (text.includes(placeholder)) {
          hits.push({ file, line: index + 1, placeholder, text: text.trim() });
          break;
        }
      }
    });
  }

  return hits;
}

const strict = process.argv.includes("--strict");
const hits = findHits();

if (hits.length === 0) {
  console.log("No branding placeholders found.");
  process.exit(0);
}

const byFile = new Map<string, Hit[]>();
for (const hit of hits) {
  byFile.set(hit.file, [...(byFile.get(hit.file) ?? []), hit]);
}

console.log(
  `${hits.length} placeholder occurrence(s) across ${byFile.size} file(s).\n` +
    `Run \`pnpm rebrand --help\` to rewrite them.\n`,
);

for (const [file, fileHits] of [...byFile].sort()) {
  console.log(`${file}  (${fileHits.length})`);
  for (const hit of fileHits.slice(0, 3)) {
    console.log(`  ${String(hit.line).padStart(4)}  ${hit.text.slice(0, 96)}`);
  }
  if (fileHits.length > 3) console.log(`  ...   ${fileHits.length - 3} more`);
}

if (strict) {
  console.error("\nFAIL: placeholders must be replaced before publishing.");
  process.exit(1);
}
