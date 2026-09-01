/**
 * Rewrites every placeholder to real branding, in one pass.
 *
 *   pnpm rebrand --name Nova --scope @nova-ui --cli nova --domain nova-ui.dev \
 *                --repo acme/nova
 *
 * Pass --dry to preview. Replacement is a single pass over an ordered
 * alternation so longer tokens win: "@libname" is never partially rewritten by
 * the rule for "libname".
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { branding } from "../branding.config";
import { walkTextFiles } from "./lib/walk";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const EXEMPT = new Set(["scripts/check-branding.ts", "scripts/rebrand.ts"]);

function arg(flag: string): string | undefined {
  const index = process.argv.indexOf(`--${flag}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

if (process.argv.includes("--help")) {
  console.log(
    [
      "Usage: pnpm rebrand --name <Name> --scope <@scope> --cli <bin> --domain <host> --repo <owner/name>",
      "",
      "  --name    Product name, e.g. Nova           (replaces LibName)",
      "  --scope   npm scope, e.g. @nova-ui          (replaces @libname)",
      "  --cli     CLI binary name, e.g. nova        (replaces libname)",
      "  --domain  Docs host, e.g. nova-ui.dev       (replaces libname.dev)",
      "  --repo    GitHub owner/name                 (replaces libname/libname)",
      "  --dry     Print what would change and exit",
    ].join("\n"),
  );
  process.exit(0);
}

const name = arg("name");
const scope = arg("scope");
const cli = arg("cli");
const domain = arg("domain");
const repo = arg("repo");

if (!name || !scope || !cli || !domain) {
  console.error("Missing required flags. Run `pnpm rebrand --help`.");
  process.exit(1);
}

if (!scope.startsWith("@")) {
  console.error("--scope must start with '@'.");
  process.exit(1);
}

// Ordered longest-first so overlapping tokens cannot be partially rewritten.
/** Host of the current registry URL, e.g. "dowel.dev". */
const currentDomain = new URL(branding.registryUrl).host;

// Every entry is derived from the current branding rather than from the
// original placeholders. Hardcoding those meant the second rename silently
// did nothing to the domain or the CLI name, because by then no file contained
// them any more.
const REPLACEMENTS: [string, string][] = [
  [branding.repository, repo ?? `${cli}/${cli}`],
  [currentDomain, domain],
  [branding.packageScope, scope],
  [branding.libraryName, name],
  [branding.cliName, cli],
];

const pattern = new RegExp(
  [...REPLACEMENTS]
    .sort(([a], [b]) => b.length - a.length)
    .map(([from]) => from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "g",
);

const lookup = new Map(REPLACEMENTS);
const dry = process.argv.includes("--dry");
let changedFiles = 0;
let changedOccurrences = 0;

for (const file of walkTextFiles(ROOT)) {
  if (EXEMPT.has(file)) continue;

  const absolute = resolve(ROOT, file);
  const original = readFileSync(absolute, "utf8");

  let count = 0;
  const updated = original.replace(pattern, (match) => {
    count += 1;
    return lookup.get(match) ?? match;
  });

  if (count === 0) continue;

  changedFiles += 1;
  changedOccurrences += count;

  if (dry) {
    console.log(`${file}  ${count} occurrence(s)`);
  } else {
    writeFileSync(absolute, updated);
  }
}

console.log(
  `${dry ? "Would rewrite" : "Rewrote"} ${changedOccurrences} occurrence(s) in ${changedFiles} file(s).`,
);

if (!dry) {
  console.log(
    [
      "",
      "Next steps:",
      "  1. pnpm install   (workspace package names changed)",
      "  2. pnpm lint && pnpm typecheck && pnpm test && pnpm build",
      "  3. pnpm check:branding --strict",
    ].join("\n"),
  );
}
