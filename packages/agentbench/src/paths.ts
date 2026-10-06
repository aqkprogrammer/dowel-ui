import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Where everything the harness reads and writes lives.
 *
 * Every tool a run uses is the build in this checkout — the scaffolder, the
 * CLI, the MCP server and the registry — never what is on npm. A run is a
 * measurement of one commit, and a result that silently mixed in whatever was
 * published last week could not be reproduced by checking that commit out.
 */

const here = dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = join(here, "..");
export const REPO_ROOT = join(PACKAGE_ROOT, "..", "..");

export const TASKS_DIR = join(PACKAGE_ROOT, "tasks");
export const RESULTS_DIR = join(PACKAGE_ROOT, "results");
export const PUBLISHED_DIR = join(RESULTS_DIR, "published");

export const REGISTRY_DIR = join(REPO_ROOT, "packages", "registry", "r");
export const SCAFFOLDER_BIN = join(
  REPO_ROOT,
  "packages",
  "create-dowel-app",
  "dist",
  "index.js",
);
export const CLI_BIN = join(REPO_ROOT, "packages", "cli", "dist", "index.js");
export const MCP_BIN = join(REPO_ROOT, "packages", "mcp", "dist", "index.js");
export const UI_PACKAGE_JSON = join(REPO_ROOT, "packages", "ui", "package.json");

/**
 * Where the projects an agent works in are created.
 *
 * Outside this repository on purpose. Coding agents read instructions from the
 * directories above the one they start in — Claude Code reads every CLAUDE.md
 * up to the filesystem root — and ESLint and TypeScript look upward for
 * configuration. A workspace inside this checkout would hand the agent the
 * monorepo's own CLAUDE.md and AGENTS.md in both conditions, which is exactly
 * the difference the benchmark exists to measure.
 */
export const DEFAULT_WORKSPACES_DIR = join(tmpdir(), "dowel-agentbench");

/** Throws with the command to run when a local build the harness needs is missing. */
export function assertBuilt(): void {
  const missing = [
    [SCAFFOLDER_BIN, "create-dowel-app"],
    [CLI_BIN, "@dowel-ui/cli"],
    [MCP_BIN, "@dowel-ui/mcp"],
    [join(REGISTRY_DIR, "index.json"), "@dowel-ui/registry"],
  ].filter(([path]) => !existsSync(path ?? ""));

  if (missing.length > 0) {
    throw new Error(
      `Missing local builds: ${missing.map(([, name]) => name).join(", ")}. ` +
        "Run `pnpm build` at the repository root first.",
    );
  }
}
