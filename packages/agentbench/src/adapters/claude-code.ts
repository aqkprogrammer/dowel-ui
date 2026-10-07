import { join } from "node:path";

import { z } from "zod";

import { execAsync, execSync, workspaceEnv } from "../exec";
import type { Condition } from "../conditions";
import type { AgentAdapter, AgentUsage } from "./types";

/**
 * Claude Code, run headless.
 *
 * Every flag below was checked against `claude --help` for Claude Code
 * 2.1.245. An adapter that guessed at flags would fail in the one place that
 * costs money, so a flag that is not in the help text is not used here.
 */

/** The arguments for one run. Separate from `run` so they can be tested without starting Claude. */
export function claudeArgs(cwd: string, prompt: string, condition: Condition): string[] {
  const args = [
    "-p",
    prompt,
    "--output-format",
    "json",
    // There is no one to approve a tool call in a headless run, and a run that
    // stops to ask is a run that times out. The workspace is a throwaway
    // directory outside any real project.
    "--permission-mode",
    "bypassPermissions",
    // Project settings only. The person running the benchmark has their own
    // user settings — plugins, hooks, permissions, possibly Dowel's own MCP
    // server configured globally — and loading them would give both conditions
    // whatever that person happens to have installed. `project` still loads
    // what the workspace itself contains, which in `with-dowel` includes the
    // Claude skill `dowel agents` wrote.
    "--setting-sources",
    "project",
    // Only the MCP servers named on this command line. MCP servers configured
    // for the user live outside the settings files `--setting-sources` governs,
    // so without this one a `without` run could still reach a Dowel MCP server
    // the person had set up for themselves.
    "--strict-mcp-config",
  ];

  if (condition === "with-dowel") {
    args.push("--mcp-config", join(cwd, ".mcp.json"));
  }

  // Not `--bare`. It would isolate the run further, but it also turns off
  // CLAUDE.md discovery and skill loading — the very files the with-dowel
  // condition is testing — so both conditions would measure the same thing.

  return args;
}

/**
 * The parts of the JSON result the summary uses.
 *
 * The field names are taken from the Claude Agent SDK's `SDKResultMessage`
 * type, which is what the CLI's `--output-format json` result is expected to
 * be. That was not confirmed against real output — no run was made while
 * writing this — so every field is optional and anything missing is simply not
 * reported. The complete output is kept in the transcript regardless.
 */
const resultSchema = z
  .object({
    type: z.string().optional(),
    is_error: z.boolean().optional(),
    num_turns: z.number().optional(),
    total_cost_usd: z.number().optional(),
    duration_api_ms: z.number().optional(),
  })
  .loose();

export function parseClaudeResult(stdout: string): AgentUsage | undefined {
  const candidates = [stdout.trim(), stdout.trim().split("\n").pop() ?? ""];
  for (const candidate of candidates) {
    let json: unknown;
    try {
      json = JSON.parse(candidate);
    } catch {
      continue;
    }
    const parsed = resultSchema.safeParse(json);
    if (!parsed.success) continue;
    const usage: AgentUsage = {};
    if (parsed.data.num_turns !== undefined) usage.turns = parsed.data.num_turns;
    if (parsed.data.total_cost_usd !== undefined) usage.costUsd = parsed.data.total_cost_usd;
    if (parsed.data.duration_api_ms !== undefined) {
      usage.durationApiMs = parsed.data.duration_api_ms;
    }
    if (parsed.data.is_error !== undefined) usage.isError = parsed.data.is_error;
    return usage;
  }
  return undefined;
}

function claudeVersion(): string | undefined {
  try {
    const result = execSync("claude", ["--version"], { cwd: process.cwd() });
    return result.exitCode === 0 ? result.stdout.trim() : undefined;
  } catch {
    return undefined;
  }
}

export const claudeCode: AgentAdapter = {
  id: "claude-code",
  description: "Claude Code (`claude -p`), with the person's own Anthropic account",
  paid: true,
  available: () => claudeVersion() !== undefined,
  version: claudeVersion,
  run: async ({ cwd, prompt, condition, timeoutMs }) => {
    const result = await execAsync("claude", claudeArgs(cwd, prompt, condition), {
      cwd,
      env: workspaceEnv(),
      timeoutMs,
    });
    return {
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      timedOut: result.timedOut,
      transcript: result.stdout,
      stderr: result.stderr,
      usage: parseClaudeResult(result.stdout),
    };
  },
};
