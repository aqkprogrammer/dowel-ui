/**
 * The component count, wherever it is written down.
 *
 * It appears in two READMEs and an npm description, all of them prose that a
 * generator would ruin, and it has now drifted twice — 52 when there were 56,
 * 56 when there were 60. Both times it shipped to npm before anyone noticed,
 * because nothing was checking.
 *
 * So the numbers stay hand-written and this makes them impossible to get wrong.
 *
 *   pnpm audit:counts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const registryDir = join(repoRoot, "packages", "registry", "r");

if (!existsSync(join(registryDir, "index.json"))) {
  console.error(`No registry at ${registryDir}. Run \`pnpm build:registry\` first.`);
  process.exit(1);
}

// Counted from the index rather than from the item files: a licensed item is
// listed in the index but its body is deliberately absent from the directory,
// and counting files would undercount by exactly the paid catalogue.
const index = JSON.parse(readFileSync(join(registryDir, "index.json"), "utf8")) as {
  items: { type: string }[];
};

const counts = { component: 0, block: 0 };
for (const { type } of index.items) {
  if (type === "registry:ui") counts.component += 1;
  if (type === "registry:block") counts.block += 1;
}

/**
 * Every claim about how many there are.
 *
 * Matched loosely — "60 components", "**60 components**", "60 accessible
 * components" — because the surrounding prose differs at each site and pinning
 * the exact sentence would mean editing this file to reword a README.
 */
const CLAIMS: { file: string; pattern: RegExp; expected: number; what: string }[] = [
  {
    file: "README.md",
    pattern: /\*\*(\d+) components\*\*/,
    expected: counts.component,
    what: "components",
  },
  {
    file: "README.md",
    pattern: /\*\*(\d+) blocks\*\*/,
    expected: counts.block,
    what: "blocks",
  },
  {
    file: "packages/ui/README.md",
    pattern: /\*\*(\d+) components\*\*/,
    expected: counts.component,
    what: "components",
  },
  {
    file: "packages/ui/README.md",
    pattern: /\*\*(\d+) blocks\*\*/,
    expected: counts.block,
    what: "blocks",
  },
  {
    file: "packages/ui/package.json",
    pattern: /(\d+) accessible components/,
    expected: counts.component,
    what: "components in the npm description",
  },
];

console.log(
  `Counts: ${String(counts.component)} components, ${String(counts.block)} blocks.\n`,
);

let failed = false;
for (const claim of CLAIMS) {
  const path = join(repoRoot, claim.file);
  const found = claim.pattern.exec(readFileSync(path, "utf8"));

  if (!found) {
    console.error(
      `  ${relative(repoRoot, path)} no longer states its ${claim.what} — ` +
        `either restore the claim or drop it from this check`,
    );
    failed = true;
    continue;
  }

  const stated = Number(found[1]);
  if (stated !== claim.expected) {
    console.error(
      `  ${relative(repoRoot, path)} says ${String(stated)} ${claim.what}, registry has ${String(claim.expected)}`,
    );
    failed = true;
    continue;
  }

  console.log(`  ${relative(repoRoot, path).padEnd(26)} ${String(stated)} ${claim.what}`);
}

if (failed) {
  console.error("\nUpdate the numbers, or this ships to npm wrong again.");
  process.exit(1);
}

console.log("\nEvery stated count matches the registry.");
