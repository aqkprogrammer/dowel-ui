import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { AgentAdapter, AgentUsage } from "./adapters";
import type { Condition } from "./conditions";
import { captureChanges, sourceCommit } from "./git";
import { REPO_ROOT } from "./paths";
import { prepareWorkspace, type PreparedWorkspace } from "./prepare";
import { scoreWorkspace, type Scores } from "./score";
import type { Task } from "./tasks";

/** One task, in one condition, by one agent, once: everything result.json holds. */
export interface RunResult {
  schemaVersion: 1;
  runId: string;
  agent: { id: string; version: string | null };
  condition: Condition;
  task: string;
  /** 1-based, when a cell is run more than once. */
  repeat: number;
  /** The Dowel commit the scaffolder, CLI, MCP server and registry were built from. */
  source: { commit: string; dirty: boolean };
  startedAt: string;
  prompt: string;
  workspace: PreparedWorkspace;
  agentRun: {
    exitCode: number | null;
    durationMs: number;
    timedOut: boolean;
    usage: AgentUsage | null;
    /** Set when the adapter itself failed, as opposed to the agent exiting non-zero. */
    error: string | null;
  };
  scores: Scores;
}

export interface RunOptions {
  runId: string;
  adapter: AgentAdapter;
  tasks: Task[];
  conditions: Condition[];
  repeat: number;
  install: boolean;
  timeoutMs: number;
  /** Where the agent's projects are created. Outside the repository; see paths.ts. */
  workspacesDir: string;
  /** Where results are written: `<resultsDir>/<runId>/<agent>/<condition>/<task>/<repeat>/`. */
  resultsDir: string;
  log?: (line: string) => void;
}

/**
 * A new run id: when, and from which commit.
 *
 * Sortable by time, and carrying the commit so a published directory says
 * what it measured without opening it.
 */
export function newRunId(now: Date = new Date()): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z")
    .replace("T", "-");
  return `${stamp}-${sourceCommit(REPO_ROOT).commit.slice(0, 7)}`;
}

/** Writes the transcript as JSON whatever the agent printed, so every run has the same files. */
function transcriptJson(agent: string, stdout: string, stderr: string): string {
  let output: unknown = stdout;
  let format = "text";
  try {
    output = JSON.parse(stdout);
    format = "json";
  } catch {
    // Not JSON; kept as the text it was.
  }
  return `${JSON.stringify({ agent, format, output, stderr }, null, 2)}\n`;
}

export async function runOne(
  options: Omit<RunOptions, "tasks" | "conditions" | "repeat"> & {
    task: Task;
    condition: Condition;
    repeat: number;
  },
): Promise<RunResult> {
  const { adapter, task, condition, repeat, runId } = options;
  const log = options.log ?? (() => undefined);
  const label = `${adapter.id} · ${condition} · ${task.id} #${String(repeat)}`;
  const startedAt = new Date().toISOString();

  log(`${label}: preparing`);
  const workspace = prepareWorkspace({
    task,
    condition,
    dir: join(
      options.workspacesDir,
      runId,
      adapter.id,
      condition,
      `${task.id}-${String(repeat)}`,
    ),
    install: options.install,
  });

  log(`${label}: running the agent`);
  let agentRun: RunResult["agentRun"];
  let stdout = "";
  let stderr = "";
  try {
    const result = await adapter.run({
      cwd: workspace.dir,
      prompt: task.prompt,
      condition,
      timeoutMs: options.timeoutMs,
      task,
    });
    stdout = result.transcript;
    stderr = result.stderr;
    agentRun = {
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      timedOut: result.timedOut,
      usage: result.usage ?? null,
      error: null,
    };
  } catch (error) {
    // Scored anyway: whatever the agent changed before failing is its output,
    // and a run that is dropped when it fails is a result with its failures
    // filtered out.
    agentRun = {
      exitCode: null,
      durationMs: 0,
      timedOut: false,
      usage: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  log(`${label}: scoring`);
  const changes = captureChanges(workspace.dir, workspace.baseline);
  const scores = await scoreWorkspace({ dir: workspace.dir, task, changed: changes.files });

  const result: RunResult = {
    schemaVersion: 1,
    runId,
    agent: { id: adapter.id, version: adapter.version?.() ?? null },
    condition,
    task: task.id,
    repeat,
    source: sourceCommit(REPO_ROOT),
    startedAt,
    prompt: task.prompt,
    workspace,
    agentRun,
    scores,
  };

  const out = join(options.resultsDir, runId, adapter.id, condition, task.id, String(repeat));
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(join(out, "transcript.json"), transcriptJson(adapter.id, stdout, stderr));
  writeFileSync(join(out, "diff.patch"), changes.patch);
  log(`${label}: written to ${out}`);

  return result;
}

/**
 * Every task in every condition, `repeat` times.
 *
 * The conditions alternate within a task rather than running one after the
 * other, so a change in the agent's service over the hours a run takes falls
 * on both sides instead of only the second.
 */
export async function runBench(options: RunOptions): Promise<RunResult[]> {
  const results: RunResult[] = [];
  for (const task of options.tasks) {
    for (let repeat = 1; repeat <= options.repeat; repeat += 1) {
      for (const condition of options.conditions) {
        results.push(await runOne({ ...options, task, condition, repeat }));
      }
    }
  }
  return results;
}
