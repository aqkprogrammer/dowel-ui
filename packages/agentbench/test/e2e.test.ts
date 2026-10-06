import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { noop } from "../src/adapters/noop";
import { reference } from "../src/adapters/reference";
import { loadResults, summarise } from "../src/report";
import { runOne, type RunResult } from "../src/run";
import { loadTasks } from "../src/tasks";

/**
 * prepare → run → score → report, on one task, with the local scaffolder, CLI,
 * MCP build and registry, and no network: dependencies are not installed, so
 * the typecheck must say it was skipped rather than pass or fail.
 */

const task = loadTasks().find((entry) => entry.id === "login")!;
const root = mkdtempSync(join(tmpdir(), "agentbench-e2e-"));
const options = {
  runId: "test-run",
  install: false,
  timeoutMs: 10_000,
  workspacesDir: join(root, "workspaces"),
  resultsDir: join(root, "results"),
};

let empty: RunResult;
let solved: RunResult;

beforeAll(async () => {
  empty = await runOne({ ...options, adapter: noop, task, condition: "without", repeat: 1 });
  solved = await runOne({
    ...options,
    adapter: reference,
    task,
    condition: "with-dowel",
    repeat: 1,
  });
}, 120_000);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("the without condition", () => {
  it("has Dowel and the task's components but no agent files or MCP config", () => {
    const dir = empty.workspace.dir;
    expect(existsSync(join(dir, "components.json"))).toBe(true);
    for (const name of task.install) {
      expect(empty.workspace.installed).toContain(name);
    }
    expect(empty.workspace.agentSupport).toEqual([]);
    for (const path of ["AGENTS.md", ".dowel", ".claude", ".cursor", ".mcp.json"]) {
      expect(existsSync(join(dir, path)), path).toBe(false);
    }
  });

  it("scores a run that changed nothing as the floor", () => {
    const { scores } = empty;
    expect(scores.files).toEqual({ count: 0, changed: [], routeExists: false });
    expect(scores.typecheck.status).toBe("skipped");
    expect(scores.audit.status).toBe("skipped");
    expect(scores.a11yLint.status).toBe("skipped");
    expect(scores.invented.count).toBe(0);
    expect(scores.recall.value).toBe(0);
  });
});

describe("the with-dowel condition", () => {
  it("adds the agent files and an MCP config pointing at the local build", () => {
    const dir = solved.workspace.dir;
    expect(solved.workspace.agentSupport).toEqual([
      "AGENTS.md",
      ".dowel",
      ".claude",
      ".cursor",
      ".mcp.json",
    ]);
    const mcp = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf8")) as {
      mcpServers: { dowel: { args: string[] } };
    };
    expect(mcp.mcpServers.dowel.args[0]).toMatch(/packages\/mcp\/dist\/index\.js$/);
    expect(mcp.mcpServers.dowel.args).toContain("@/components/ui");
  });

  it("installs the same components as the without condition", () => {
    expect(solved.workspace.installed).toEqual(empty.workspace.installed);
  });

  it("scores the reference solution as clean", () => {
    const { scores } = solved;
    expect(scores.files.changed).toEqual([{ status: "A", path: task.route }]);
    expect(scores.files.routeExists).toBe(true);
    expect(scores.typecheck.status).toBe("skipped");
    expect(scores.invented.count).toBe(0);
    expect(scores.uninstalled.count).toBe(0);
    expect(scores.recall.value).toBe(1);
    expect(scores.audit).toMatchObject({ status: "ok", scanned: 1, total: 0 });
    expect(scores.a11yLint).toMatchObject({ status: "ok", errors: 0, parseErrors: 0 });
  });
});

describe("results", () => {
  it("writes result.json, transcript.json and diff.patch for each run", () => {
    const out = join(options.resultsDir, "test-run", "reference", "with-dowel", "login", "1");
    for (const file of ["result.json", "transcript.json", "diff.patch"]) {
      expect(existsSync(join(out, file)), file).toBe(true);
    }
    expect(readFileSync(join(out, "diff.patch"), "utf8")).toContain(`+++ b/${task.route}`);
  });

  it("aggregates into a summary per agent and condition, with n", () => {
    const summary = summarise("test-run", loadResults(join(options.resultsDir, "test-run")));
    expect(summary.cells.map((cell) => [cell.agent, cell.condition, cell.runs])).toEqual([
      ["noop", "without", 1],
      ["reference", "with-dowel", 1],
    ]);
    const cell = summary.cells.find((entry) => entry.agent === "reference")!;
    expect(cell.metrics.recall).toEqual({ n: 1, mean: 1, median: 1 });
    expect(cell.metrics.typecheckPass).toEqual({ n: 0, mean: null, median: null });
    expect(summary.dependenciesInstalled).toBe(false);
  });
});
