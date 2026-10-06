/**
 * Folds the last `test:a11y` run into known-violations.json.
 *
 * Removes what no longer occurs and adds what is new with an empty reason. The
 * suite rejects an empty reason, so this never exempts anything by itself: a
 * person has to write down why, and a reviewer gets to read it.
 *
 *   pnpm --filter @dowel-ui/browser-tests test:a11y   # may fail; that is fine
 *   pnpm --filter @dowel-ui/browser-tests a11y:baseline
 */
import { writeFileSync } from "node:fs";

import { BASELINE_PATH, mergeBaseline, readBaseline, readObservations } from "../lib/baseline";

const observations = readObservations();
if (observations.length === 0) {
  console.error("Nothing observed. Run `test:a11y` first.");
  process.exit(1);
}

const { next, added, removed } = mergeBaseline(readBaseline(), observations);

// Written the way Prettier formats it, so the file never churns on `format`.
const lines = next.map(
  (entry) =>
    `  {\n    "story": ${JSON.stringify(entry.story)},\n    "rule": ${JSON.stringify(entry.rule)},\n    "themes": [${entry.themes
      .map((theme) => JSON.stringify(theme))
      .join(", ")}],\n    "reason": ${JSON.stringify(entry.reason)}\n  }`,
);
writeFileSync(BASELINE_PATH, next.length === 0 ? "[]\n" : `[\n${lines.join(",\n")}\n]\n`);

console.log(`${String(observations.length)} story/mode pairs observed.`);
console.log(
  `Removed ${String(removed.length)} entr${removed.length === 1 ? "y" : "ies"} that no longer occur.`,
);
for (const line of removed) console.log(`  - ${line}`);
console.log(`Added ${String(added.length)} that need a reason before the suite passes.`);
for (const line of added) console.log(`  + ${line}`);
console.log(`${String(next.length)} entries in known-violations.json.`);
