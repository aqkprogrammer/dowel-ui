import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

import { ADAPTERS, findAdapter } from "./adapters";
import { CONDITIONS, isCondition } from "./conditions";
import { sourceCommit } from "./git";
import {
  assertBuilt,
  DEFAULT_WORKSPACES_DIR,
  PUBLISHED_DIR,
  REPO_ROOT,
  RESULTS_DIR,
} from "./paths";
import { writeSummary } from "./report";
import { newRunId, runBench } from "./run";
import { METRICS, type Summary } from "./summary";
import { loadTasks } from "./tasks";

const USAGE = `Usage:
  pnpm bench run --agent <id> [options]
  pnpm bench report <runId>
  pnpm bench list

run options:
  --agent <id>             ${ADAPTERS.map((adapter) => adapter.id).join(", ")}
  --tasks <a,b>            task ids (default: all)
  --conditions <a,b>       ${CONDITIONS.join(", ")} (default: both)
  --repeat <n>             runs per task and condition (default: 1)
  --install                install npm dependencies, so the typecheck can run
  --timeout <minutes>      per agent run (default: 20)
  --workspaces <dir>       where projects are created (default: ${DEFAULT_WORKSPACES_DIR})
  --yes-i-understand-this-costs-money
                           required for an agent that bills its account`;

const PAID_FLAG = "yes-i-understand-this-costs-money";

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(2);
}

function list(value: string | undefined): string[] | undefined {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function run(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      agent: { type: "string" },
      tasks: { type: "string" },
      conditions: { type: "string" },
      repeat: { type: "string", default: "1" },
      install: { type: "boolean", default: false },
      timeout: { type: "string", default: "20" },
      workspaces: { type: "string" },
      [PAID_FLAG]: { type: "boolean", default: false },
    },
    strict: true,
  });

  const adapter = values.agent ? findAdapter(values.agent) : undefined;
  if (!adapter) fail(`Choose an agent with --agent.\n\n${USAGE}`);

  const all = loadTasks();
  const wanted = list(values.tasks);
  const unknown = wanted?.filter((id) => !all.some((task) => task.id === id)) ?? [];
  if (unknown.length > 0) fail(`Unknown task(s): ${unknown.join(", ")}.`);
  const tasks = wanted ? all.filter((task) => wanted.includes(task.id)) : all;

  const conditions = (list(values.conditions) ?? [...CONDITIONS]).map((condition) =>
    isCondition(condition) ? condition : fail(`Unknown condition "${condition}".`),
  );

  const repeat = Number(values.repeat);
  if (!Number.isInteger(repeat) || repeat < 1)
    fail("--repeat takes a whole number of 1 or more.");
  const timeoutMinutes = Number(values.timeout);
  if (!(timeoutMinutes > 0)) fail("--timeout takes a number of minutes.");

  assertBuilt();
  const source = sourceCommit(REPO_ROOT);
  const runId = newRunId();
  const workspacesDir = resolve(values.workspaces ?? DEFAULT_WORKSPACES_DIR);
  const total = tasks.length * conditions.length * repeat;

  // Printed before anything starts, so the person sees what they are about to
  // run — and, for a paid agent, what they are about to pay for — first.
  console.log(`
AgentBench run ${runId}
  agent       ${adapter.id} — ${adapter.description}${adapter.paid ? " (paid)" : ""}
  tasks       ${tasks.map((task) => task.id).join(", ")}
  conditions  ${conditions.join(", ")}
  repeat      ${String(repeat)}
  runs        ${String(total)} agent run(s), each up to ${String(timeoutMinutes)} min
  install     ${values.install ? "yes (pnpm install per workspace)" : "no — typecheck will be skipped"}
  source      ${source.commit}${source.dirty ? " (uncommitted changes)" : ""}
  workspaces  ${workspacesDir}
  results     ${relative(process.cwd(), join(RESULTS_DIR, runId)) || "."}
`);

  if (adapter.paid && !values[PAID_FLAG]) {
    fail(
      `${adapter.id} runs against your own account and is billed per run. ` +
        `This would start ${String(total)} run(s).\n` +
        `Pass --${PAID_FLAG} to go ahead.`,
    );
  }
  if (!adapter.available()) fail(`${adapter.id} is not available on this machine.`);

  await runBench({
    runId,
    adapter,
    tasks,
    conditions,
    repeat,
    install: values.install,
    timeoutMs: timeoutMinutes * 60_000,
    workspacesDir,
    resultsDir: RESULTS_DIR,
    log: (line) => console.log(`  ${line}`),
  });

  const summary = writeSummary(join(RESULTS_DIR, runId), runId);
  printSummary(summary);
  console.log(
    `Summary: ${relative(process.cwd(), join(RESULTS_DIR, runId, "summary.json"))}\n`,
  );
}

function format(value: number | null, rate: boolean): string {
  if (value === null) return "—";
  return rate ? `${(value * 100).toFixed(0)}%` : value.toFixed(2);
}

function printSummary(summary: Summary): void {
  for (const agent of summary.agents) {
    const cells = summary.cells.filter((cell) => cell.agent === agent.id);
    console.log(`\n${agent.id}${agent.version ? ` (${agent.version})` : ""}`);
    console.log(
      `  ${"metric".padEnd(28)}${cells.map((cell) => `${cell.condition} (mean, n)`.padEnd(26)).join("")}`,
    );
    for (const metric of METRICS) {
      const columns = cells.map((cell) => {
        const value = cell.metrics[metric.id];
        return `${format(value?.mean ?? null, metric.rate)}, n=${String(value?.n ?? 0)}`.padEnd(
          26,
        );
      });
      console.log(`  ${metric.label.padEnd(28)}${columns.join("")}`);
    }
  }
  console.log("");
}

function report(args: string[]): void {
  const runId = args[0];
  if (!runId) fail(`Name the run.\n\n${USAGE}`);
  const dir = [join(RESULTS_DIR, runId), join(PUBLISHED_DIR, runId)].find((path) =>
    existsSync(path),
  );
  if (!dir) fail(`No run "${runId}" in ${RESULTS_DIR} or ${PUBLISHED_DIR}.`);
  const summary = writeSummary(dir, runId);
  printSummary(summary);
  console.log(`Summary: ${relative(process.cwd(), join(dir, "summary.json"))}\n`);
}

function listAll(): void {
  console.log("\nAgents");
  for (const adapter of ADAPTERS) {
    console.log(
      `  ${adapter.id.padEnd(14)}${adapter.description}${adapter.paid ? " (paid)" : ""}`,
    );
  }
  console.log("\nTasks");
  for (const task of loadTasks()) console.log(`  ${task.id.padEnd(18)}${task.title}`);

  const runs = (dir: string): string[] =>
    existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && entry.name !== "published")
          .map((entry) => entry.name)
          .sort()
      : [];
  console.log("\nRuns");
  for (const id of runs(RESULTS_DIR)) console.log(`  ${id}`);
  console.log("\nPublished");
  for (const id of runs(PUBLISHED_DIR)) console.log(`  ${id}`);
  console.log("");
}

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case "run":
    await run(rest);
    break;
  case "report":
    report(rest);
    break;
  case "list":
    listAll();
    break;
  default:
    console.log(USAGE);
    if (command !== undefined && command !== "help" && command !== "--help") process.exit(2);
}
