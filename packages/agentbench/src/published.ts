import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PUBLISHED_DIR } from "./paths";
import { summarySchema, type Summary } from "./summary";

/**
 * What the docs site reads: the tasks, the metric definitions, and the runs
 * someone chose to publish.
 *
 * This module imports nothing that runs a tool, so reading it at build time
 * costs a JSON parse.
 */

/**
 * Every summary under results/published, oldest first.
 *
 * Validated, so a hand-edited or half-copied run fails the docs build rather
 * than rendering numbers nobody can trace.
 */
export function loadPublishedSummaries(dir: string = PUBLISHED_DIR): Summary[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, "summary.json")))
    .map((entry) => {
      const file = join(dir, entry.name, "summary.json");
      const parsed = summarySchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
      if (!parsed.success)
        throw new Error(`${file} is not a valid summary: ${parsed.error.message}`);
      return parsed.data;
    })
    .sort((a, b) => a.runId.localeCompare(b.runId));
}

export { loadTasks, type Task } from "./tasks";
export { CONDITIONS, type Condition } from "./conditions";
export {
  METRICS,
  type MetricDefinition,
  type MetricId,
  type Stat,
  type Summary,
} from "./summary";
