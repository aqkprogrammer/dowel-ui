import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { execOrThrow, workspaceEnv } from "./exec";
import { commitBaseline, git } from "./git";
import { assertBuilt, CLI_BIN, MCP_BIN, REGISTRY_DIR, SCAFFOLDER_BIN } from "./paths";
import { loadRegistry, pinnedVersions } from "./registry";
import type { Condition } from "./conditions";
import type { Task } from "./tasks";

export { CONDITIONS, isCondition, type Condition } from "./conditions";

/**
 * Installed in every workspace whatever the task: the starter template's home
 * page imports them, and a project that fails to typecheck before the agent
 * starts would make every typecheck result meaningless.
 */
export const STARTER_ITEMS = ["button", "card", "badge"];

/** The files `dowel agents` writes, and the MCP config: what `without` must not have. */
export const AGENT_SUPPORT_PATHS = ["AGENTS.md", ".dowel", ".claude", ".cursor", ".mcp.json"];

export interface PrepareOptions {
  task: Task;
  condition: Condition;
  /** Created; must not exist or be empty. Its last segment becomes the package name. */
  dir: string;
  /**
   * Install npm dependencies before the baseline commit. Needs the network
   * and takes a while, so it is a separate choice; without it the typecheck
   * is reported as skipped rather than failed.
   */
  install: boolean;
}

export interface PreparedWorkspace {
  dir: string;
  /** The commit the agent's diff is taken against. */
  baseline: string;
  /** Registry items installed, as `components.json` records them. */
  installed: string[];
  /** Agent files and MCP config present at the baseline. Empty for `without`. */
  agentSupport: string[];
  dependenciesInstalled: boolean;
}

function node(args: string[], cwd: string): void {
  execOrThrow(process.execPath, args, { cwd, env: workspaceEnv() });
}

function cli(dir: string, args: string[]): void {
  node([CLI_BIN, "--cwd", dir, "--registry", REGISTRY_DIR, ...args], dir);
}

interface ComponentsJson {
  aliases: { ui: string };
  installed: Record<string, unknown>;
}

export function readComponentsJson(dir: string): ComponentsJson {
  return JSON.parse(readFileSync(join(dir, "components.json"), "utf8")) as ComponentsJson;
}

/**
 * Writes every npm package the installed components import into
 * package.json, at the versions this commit tests with.
 *
 * `add --skip-install` leaves them out and prints them instead. Writing them
 * here, pinned, is what makes `pnpm install` produce the same tree on every
 * machine — and makes the project's dependencies part of the baseline, so the
 * agent's diff does not include them.
 */
function writeDependencies(dir: string, installed: string[]): void {
  const registry = loadRegistry();
  const pins = pinnedVersions();
  const needed = new Set(
    installed.flatMap((name) => registry.items.get(name)?.dependencies ?? []),
  );

  const unpinned = [...needed].filter((name) => pins[name] === undefined);
  if (unpinned.length > 0) {
    throw new Error(
      `No pinned version for ${unpinned.join(", ")}. ` +
        "packages/ui/package.json is where the versions come from; add it there.",
    );
  }

  const file = join(dir, "package.json");
  const pkg = JSON.parse(readFileSync(file, "utf8")) as {
    dependencies?: Record<string, string>;
  };
  const dependencies = { ...pkg.dependencies };
  for (const name of needed) dependencies[name] = pins[name]!;
  pkg.dependencies = Object.fromEntries(
    Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
}

/**
 * The MCP server, as the docs tell people to configure it, but pointed at the
 * local build and the local registry so the agent queries this commit.
 */
export function mcpConfig(importFrom: string): string {
  return `${JSON.stringify(
    {
      mcpServers: {
        dowel: {
          command: "node",
          args: [MCP_BIN, "--registry", REGISTRY_DIR, "--import-from", importFrom],
        },
      },
    },
    null,
    2,
  )}\n`;
}

/** Which agent-support paths exist in a workspace. */
export function agentSupportIn(dir: string): string[] {
  return AGENT_SUPPORT_PATHS.filter((path) => existsSync(join(dir, path)));
}

export function prepareWorkspace(options: PrepareOptions): PreparedWorkspace {
  const { task, condition, dir } = options;
  assertBuilt();

  if (existsSync(dir) && readdirSync(dir).length > 0) {
    throw new Error(`${dir} already exists and is not empty.`);
  }
  mkdirSync(dirname(dir), { recursive: true });

  // The local scaffolder, with components skipped so the local CLI can install
  // them from the local registry below. Left to itself it would run the
  // published CLI against the published registry.
  node(
    [
      SCAFFOLDER_BIN,
      basename(dir),
      "--template",
      "starter",
      "--theme",
      "default",
      "--yes",
      "--skip-install",
      "--skip-components",
    ],
    dirname(dir),
  );

  cli(dir, ["init", "--yes", "--skip-install"]);
  const items = [...new Set([...STARTER_ITEMS, ...task.install])];
  cli(dir, ["add", ...items, "--yes", "--skip-install"]);

  const config = readComponentsJson(dir);
  const installed = Object.keys(config.installed);
  writeDependencies(dir, installed);

  if (condition === "with-dowel") {
    // After `add`, so the catalogue marks what this project has installed.
    cli(dir, ["agents"]);
    writeFileSync(join(dir, ".mcp.json"), mcpConfig(config.aliases.ui));
  }

  const agentSupport = agentSupportIn(dir);
  if (condition === "without" && agentSupport.length > 0) {
    // The scaffolder writes agent files when it fetches components. It is told
    // not to; this is the check that it did not, because a `without` workspace
    // with an AGENTS.md in it would quietly turn the comparison into noise.
    throw new Error(
      `The without condition has agent support files: ${agentSupport.join(", ")}`,
    );
  }

  if (options.install) {
    execOrThrow("pnpm", ["install"], { cwd: dir, env: workspaceEnv() });
  }

  const baseline = commitBaseline(dir);
  // A sanity check that the baseline really is clean, so a stray file written
  // after the commit cannot show up as the agent's work.
  if (git(dir, ["status", "--porcelain"]).trim() !== "") {
    throw new Error(`${dir} has uncommitted changes after the baseline commit.`);
  }

  return {
    dir,
    baseline,
    installed,
    agentSupport,
    dependenciesInstalled: options.install,
  };
}
