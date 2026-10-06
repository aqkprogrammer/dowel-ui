import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { RunResult } from "./run";
import {
  METRIC_IDS,
  stat,
  summarySchema,
  type MetricId,
  type Stat,
  type Summary,
} from "./summary";

/** Every result.json under a run directory. */
export function loadResults(runDir: string): RunResult[] {
  const found: RunResult[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (entry === "result.json") {
        found.push(JSON.parse(readFileSync(path, "utf8")) as RunResult);
      }
    }
  };
  walk(runDir);
  return found;
}

const asRate = (value: boolean): number => (value ? 1 : 0);

/**
 * One run's value for each metric, or undefined where it was not measured.
 *
 * Not measured is kept apart from zero on purpose: a typecheck skipped because
 * nothing was installed is not a typecheck with no errors.
 */
export function metricValues(result: RunResult): Record<MetricId, number | undefined> {
  const { scores } = result;
  const typecheck = scores.typecheck.status === "skipped" ? undefined : scores.typecheck;
  return {
    routeExists: asRate(scores.files.routeExists),
    typecheckPass: typecheck ? asRate(typecheck.status === "pass") : undefined,
    typecheckErrors: typecheck?.errors,
    auditFindings: scores.audit.status === "ok" ? scores.audit.total : undefined,
    invented: scores.invented.count,
    uninstalled: scores.uninstalled.count,
    recall: scores.recall.value,
    a11yErrors: scores.a11yLint.status === "ok" ? scores.a11yLint.errors : undefined,
    filesChanged: scores.files.count,
  };
}

function aggregate(results: RunResult[]): { runs: number; metrics: Record<MetricId, Stat> } {
  const values = results.map(metricValues);
  const metrics = Object.fromEntries(
    METRIC_IDS.map((id) => [id, stat(values.map((value) => value[id]))]),
  ) as Record<MetricId, Stat>;
  return { runs: results.length, metrics };
}

const unique = <T>(values: T[]): T[] => [...new Set(values)];

export function summarise(runId: string, results: RunResult[]): Summary {
  if (results.length === 0) throw new Error(`Run ${runId} has no results.`);

  const agents = unique(results.map((result) => result.agent.id)).sort();
  const conditions = unique(results.map((result) => result.condition)).sort();
  const tasks = unique(results.map((result) => result.task)).sort();
  const commits = unique(results.map((result) => result.source.commit));
  if (commits.length > 1) {
    // A run that mixes commits is comparing two versions of Dowel as well as
    // two conditions, and its summary would say neither.
    throw new Error(`Run ${runId} mixes results from commits ${commits.join(", ")}.`);
  }

  const cells: Summary["cells"] = [];
  const rows: Summary["rows"] = [];

  for (const agent of agents) {
    for (const condition of conditions) {
      const cell = results.filter((r) => r.agent.id === agent && r.condition === condition);
      if (cell.length === 0) continue;
      cells.push({
        agent,
        condition,
        ...aggregate(cell),
        reported: {
          durationMs: stat(
            cell.map((r) => (r.agentRun.error ? undefined : r.agentRun.durationMs)),
          ),
          costUsd: stat(cell.map((r) => r.agentRun.usage?.costUsd)),
          turns: stat(cell.map((r) => r.agentRun.usage?.turns)),
        },
      });
      for (const task of tasks) {
        const row = cell.filter((r) => r.task === task);
        if (row.length > 0) rows.push({ agent, condition, task, ...aggregate(row) });
      }
    }
  }

  return summarySchema.parse({
    schemaVersion: 1,
    runId,
    generatedAt: new Date().toISOString(),
    source: {
      commit: commits[0]!,
      dirty: results.some((result) => result.source.dirty),
    },
    agents: agents.map((id) => ({
      id,
      version: results.find((result) => result.agent.id === id)?.agent.version ?? null,
    })),
    tasks,
    conditions,
    dependenciesInstalled: results.every((result) => result.workspace.dependenciesInstalled),
    cells,
    rows,
  });
}

/** Aggregates a run directory and writes its summary.json next to the results. */
export function writeSummary(runDir: string, runId: string): Summary {
  if (!existsSync(runDir)) throw new Error(`No run at ${runDir}.`);
  const summary = summarise(runId, loadResults(runDir));
  writeFileSync(join(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}
