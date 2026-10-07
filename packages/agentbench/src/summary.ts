import { z } from "zod";

import { CONDITIONS } from "./conditions";

/**
 * What a run's summary contains, and the metrics in it.
 *
 * Kept free of anything that runs a tool, because the docs site reads it to
 * render published runs: the page and the harness agree on the shape by
 * importing the same schema, not by each keeping a copy.
 */

export interface MetricDefinition {
  id: MetricId;
  label: string;
  /** How it is measured, in one sentence. */
  description: string;
  /** Which direction is better, for a reader comparing the two columns. */
  better: "higher" | "lower";
  /** A share of runs (shown as a percentage) rather than a count. */
  rate: boolean;
}

export const METRIC_IDS = [
  "routeExists",
  "typecheckPass",
  "typecheckErrors",
  "auditFindings",
  "invented",
  "uninstalled",
  "recall",
  "a11yErrors",
  "filesChanged",
] as const;
export type MetricId = (typeof METRIC_IDS)[number];

export const METRICS: MetricDefinition[] = [
  {
    id: "routeExists",
    label: "Route created",
    description: "The page file the task asks for exists after the run.",
    better: "higher",
    rate: true,
  },
  {
    id: "typecheckPass",
    label: "Typecheck passes",
    description:
      "`tsc --noEmit` exits 0 in the workspace. Only measured when dependencies were installed.",
    better: "higher",
    rate: true,
  },
  {
    id: "typecheckErrors",
    label: "Type errors",
    description: "Errors `tsc --noEmit` reports.",
    better: "lower",
    rate: false,
  },
  {
    id: "auditFindings",
    label: "Audit findings",
    description:
      "Findings from `dowel audit` over the changed files: palette and arbitrary colours, inline colours, off-scale sizes, physical directions, and native elements where an installed component replaces them.",
    better: "lower",
    rate: false,
  },
  {
    id: "invented",
    label: "Invented components",
    description:
      "Imports from the Dowel UI or blocks alias naming something the registry does not have.",
    better: "lower",
    rate: false,
  },
  {
    id: "uninstalled",
    label: "Uninstalled imports",
    description:
      "Imports of registry components that exist but are not installed, so would not resolve.",
    better: "lower",
    rate: false,
  },
  {
    id: "recall",
    label: "Expected components used",
    description:
      "Share of the task's expected components imported, directly or through a block or component built from them.",
    better: "higher",
    rate: true,
  },
  {
    id: "a11yErrors",
    label: "Accessibility lint errors",
    description:
      "Errors from the jsx-a11y rules this repository lints its own components with, over the changed .tsx files.",
    better: "lower",
    rate: false,
  },
  {
    id: "filesChanged",
    label: "Files changed",
    description: "Files added, modified or deleted since the baseline. Context, not a score.",
    better: "lower",
    rate: false,
  },
];

const statSchema = z.object({
  /** Runs this was measured in. A check that was skipped is not counted. */
  n: z.number(),
  mean: z.number().nullable(),
  median: z.number().nullable(),
});
export type Stat = z.infer<typeof statSchema>;

const metricsSchema = z.object({
  runs: z.number(),
  metrics: z.record(z.enum(METRIC_IDS), statSchema),
});

const reportedSchema = z.object({
  durationMs: statSchema,
  costUsd: statSchema,
  turns: statSchema,
});

export const summarySchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string(),
  generatedAt: z.string(),
  source: z.object({ commit: z.string(), dirty: z.boolean() }),
  agents: z.array(z.object({ id: z.string(), version: z.string().nullable() })),
  tasks: z.array(z.string()),
  conditions: z.array(z.enum(CONDITIONS)),
  dependenciesInstalled: z.boolean(),
  /** One per agent and condition: the comparison. */
  cells: z.array(
    metricsSchema.extend({
      agent: z.string(),
      condition: z.enum(CONDITIONS),
      /**
       * What the agent said about its own runs — time, cost, turns. Recorded
       * for the person paying, not compared: none of it says whether the page
       * is any good.
       */
      reported: reportedSchema,
    }),
  ),
  /** One per agent, condition and task. */
  rows: z.array(
    metricsSchema.extend({
      agent: z.string(),
      condition: z.enum(CONDITIONS),
      task: z.string(),
    }),
  ),
});

export type Summary = z.infer<typeof summarySchema>;

/** Mean and median of the values that were measured; undefined means not measured. */
export function stat(values: (number | undefined)[]): Stat {
  const measured = values.filter((value): value is number => value !== undefined);
  if (measured.length === 0) return { n: 0, mean: null, median: null };
  const sorted = [...measured].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return {
    n: measured.length,
    mean: measured.reduce((sum, value) => sum + value, 0) / measured.length,
    median,
  };
}
