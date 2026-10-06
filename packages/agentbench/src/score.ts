import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

import type { Linter } from "eslint";
import { z } from "zod";

import { execSync, workspaceEnv } from "./exec";
import type { ChangedFile } from "./git";
import { CLI_BIN } from "./paths";
import { loadRegistry, withDependencies, type Registry } from "./registry";
import type { Task } from "./tasks";

/**
 * Scoring: every check is a program, so two people scoring the same diff get
 * the same numbers.
 *
 * There is deliberately no visual-quality score. Whether a page looks good is
 * a judgement, and a number standing in for a judgement would be the one
 * figure here nobody could reproduce. The roadmap leaves it out until there is
 * a way to measure it that two people would agree on.
 */

const SOURCE = /\.(?:tsx|ts|jsx|js)$/;
const JSX = /\.(?:tsx|jsx)$/;

export interface ImportRef {
  file: string;
  line: number;
  specifier: string;
}

export interface Scores {
  files: { count: number; changed: ChangedFile[]; routeExists: boolean };
  typecheck:
    | { status: "pass" | "fail"; errors: number; output: string }
    | { status: "skipped"; reason: string };
  audit:
    | {
        status: "ok";
        scanned: number;
        total: number;
        counts: Record<string, number>;
        findings: { file: string; findings: unknown[] }[];
      }
    | { status: "skipped" | "error"; reason: string };
  invented: { count: number; imports: (ImportRef & { resolves: boolean })[] };
  uninstalled: { count: number; imports: (ImportRef & { items: string[] })[] };
  recall: {
    value: number;
    expected: string[];
    matched: string[];
    /** Imported by name, rather than reached through a block or component that uses it. */
    matchedDirectly: string[];
    missing: string[];
  };
  a11yLint:
    | {
        status: "ok";
        errors: number;
        /** Files the parser could not read; their rules did not run. */
        parseErrors: number;
        messages: { file: string; line: number; rule: string | null; message: string }[];
      }
    | { status: "skipped"; reason: string };
}

// ── Imports ──────────────────────────────────────────────────────────────────

const IMPORT =
  /\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\bimport\s+["']([^"']+)["']|\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

/** Every module specifier a file imports or re-exports, with its line. */
export function findImports(source: string): { specifier: string; line: number }[] {
  const found: { specifier: string; line: number }[] = [];
  for (const match of source.matchAll(IMPORT)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? match[4];
    if (!specifier) continue;
    const line = source.slice(0, match.index).split("\n").length;
    found.push({ specifier, line });
  }
  return found;
}

interface ProjectAliases {
  prefix: string;
  base: string;
  ui: string;
  blocks: string;
}

const componentsJsonSchema = z.object({
  aliases: z.object({ ui: z.string(), blocks: z.string().optional() }).loose(),
  resolve: z.object({ prefix: z.string(), base: z.string() }).optional(),
});

/** Where this project's `@/` points and where its UI and blocks aliases lead, from components.json. */
export function readAliases(dir: string): ProjectAliases {
  const config = componentsJsonSchema.parse(
    JSON.parse(readFileSync(join(dir, "components.json"), "utf8")),
  );
  const prefix = config.resolve?.prefix ?? "@/";
  const base = config.resolve?.base ?? "src";
  const toPath = (alias: string): string =>
    alias.startsWith(prefix) ? normalize(join(base, alias.slice(prefix.length))) : alias;
  return {
    prefix,
    base,
    ui: toPath(config.aliases.ui),
    blocks: toPath(config.aliases.blocks ?? config.aliases.ui.replace(/\/ui$/, "/blocks")),
  };
}

/**
 * The registry module an import names (`ui/button`, `blocks/login`), or
 * undefined when it points somewhere else entirely.
 */
export function moduleOf(
  specifier: string,
  fromFile: string,
  aliases: ProjectAliases,
): { key: string; path: string } | undefined {
  let path: string;
  if (specifier.startsWith(aliases.prefix)) {
    path = normalize(join(aliases.base, specifier.slice(aliases.prefix.length)));
  } else if (specifier.startsWith(".")) {
    path = normalize(join(dirname(fromFile), specifier));
  } else {
    return undefined;
  }

  for (const [root, dir] of [
    ["ui", aliases.ui],
    ["blocks", aliases.blocks],
  ] as const) {
    if (path.startsWith(`${dir}/`)) {
      const rest = path
        .slice(dir.length + 1)
        .replace(/\.[jt]sx?$/, "")
        .replace(/\/index$/, "");
      return { key: `${root}/${rest}`, path };
    }
  }
  return undefined;
}

function resolves(dir: string, path: string): boolean {
  if (/\.[jt]sx?$/.test(path)) return existsSync(join(dir, path));
  return [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"].some((suffix) =>
    existsSync(join(dir, `${path}${suffix}`)),
  );
}

export interface ImportAnalysis {
  invented: Scores["invented"];
  uninstalled: Scores["uninstalled"];
  /** Registry items imported by name somewhere in the changed files. */
  used: Set<string>;
}

/**
 * Sorts every import under the Dowel aliases in the changed files into three:
 * a registry module that is installed, one that is not, and a name the
 * registry does not have at all.
 *
 * Only the Dowel aliases are read. A component the agent writes in a folder
 * of its own is ordinary application code; a file the agent puts under
 * `components/ui` and imports as if it were part of the design system is the
 * failure this counts.
 */
export function analyseImports(
  dir: string,
  files: string[],
  registry: Registry = loadRegistry(),
): ImportAnalysis {
  const aliases = readAliases(dir);
  const invented: Scores["invented"]["imports"] = [];
  const uninstalled: Scores["uninstalled"]["imports"] = [];
  const used = new Set<string>();

  for (const file of files) {
    const absolute = join(dir, file);
    if (!SOURCE.test(file) || !existsSync(absolute)) continue;
    for (const { specifier, line } of findImports(readFileSync(absolute, "utf8"))) {
      const module = moduleOf(specifier, file, aliases);
      if (!module) continue;
      const owners = registry.modules.get(module.key);
      const present = resolves(dir, module.path);
      if (!owners) {
        invented.push({ file, line, specifier, resolves: present });
        continue;
      }
      for (const owner of owners) used.add(owner);
      if (!present) uninstalled.push({ file, line, specifier, items: owners });
    }
  }

  return {
    invented: { count: invented.length, imports: invented },
    uninstalled: { count: uninstalled.length, imports: uninstalled },
    used,
  };
}

/**
 * The share of the task's expected components the solution uses.
 *
 * A component counts if it is imported or if something imported is built
 * from it: an agent that installs and uses the `login` block has used the
 * input and button inside it, which is what the agent files tell it to do.
 */
export function recall(task: Task, used: Set<string>, registry: Registry): Scores["recall"] {
  const reached = withDependencies(registry, used);
  const matched = task.expect.filter((name) => reached.has(name));
  return {
    value: task.expect.length === 0 ? 0 : matched.length / task.expect.length,
    expected: task.expect,
    matched,
    matchedDirectly: task.expect.filter((name) => used.has(name)),
    missing: task.expect.filter((name) => !reached.has(name)),
  };
}

// ── Checks that run a tool ───────────────────────────────────────────────────

/** `tsc --noEmit` with the workspace's own TypeScript, if its dependencies were installed. */
export function typecheck(dir: string): Scores["typecheck"] {
  const tsc = join(dir, "node_modules", "typescript", "bin", "tsc");
  if (!existsSync(tsc)) {
    return {
      status: "skipped",
      reason: "Dependencies were not installed in the workspace (run with --install).",
    };
  }
  const result = execSync(process.execPath, [tsc, "--noEmit", "-p", "tsconfig.json"], {
    cwd: dir,
    env: workspaceEnv(),
  });
  const output = `${result.stdout}${result.stderr}`;
  return {
    status: result.exitCode === 0 ? "pass" : "fail",
    errors: (output.match(/error TS\d+:/g) ?? []).length,
    // Enough to read what went wrong; a page that fails everywhere can print
    // megabytes, and the full output is one `tsc` away in the workspace.
    output: output.slice(0, 20_000),
  };
}

const auditSchema = z.object({
  scanned: z.number(),
  counts: z.record(z.string(), z.number()),
  files: z.array(z.object({ file: z.string(), findings: z.array(z.unknown()) })),
});

/**
 * `dowel audit --json` over the files the agent changed, with the CLI from
 * this commit: the design-system rules of ADR 16.
 *
 * Only changed files, because the starter template and the installed
 * components are the same in both conditions and would only add the same
 * constant to each side.
 */
export function audit(dir: string, files: string[]): Scores["audit"] {
  const sources = files.filter((file) => SOURCE.test(file) && existsSync(join(dir, file)));
  if (sources.length === 0) {
    return { status: "skipped", reason: "No source files were changed." };
  }
  const result = execSync(
    process.execPath,
    [CLI_BIN, "--cwd", dir, "audit", "--json", ...sources],
    {
      cwd: dir,
      env: workspaceEnv(),
    },
  );
  // `audit` exits 1 when it finds something, which is a result, not a failure.
  try {
    const report = auditSchema.parse(JSON.parse(result.stdout));
    return {
      status: "ok",
      scanned: report.scanned,
      total: Object.values(report.counts).reduce((sum, count) => sum + count, 0),
      counts: report.counts,
      findings: report.files,
    };
  } catch {
    return {
      status: "error",
      reason: `audit exited ${String(result.exitCode)}: ${`${result.stdout}${result.stderr}`.slice(0, 2_000)}`,
    };
  }
}

/**
 * The jsx-a11y rules exactly as this repository configures them, and nothing
 * else.
 *
 * Read out of the shared React config rather than restated, so the agent's
 * page is held to the same accessibility rules — and the same two documented
 * exceptions — as the components themselves. The type-aware TypeScript rules
 * in that config are dropped: they need a project the linter can load and
 * they are not about accessibility.
 *
 * Loaded on first use: the config pulls in typescript-eslint and every plugin
 * the repository lints with, which takes seconds, and a run that changed no
 * .tsx file never needs it.
 */
export async function a11yLintConfig(): Promise<Linter.Config[]> {
  const { react } = await import("@dowel-ui/config/eslint/react");
  const rules: Linter.RulesRecord = {};
  let plugin: NonNullable<Linter.Config["plugins"]>[string] | undefined;
  let parser: Linter.Parser | undefined;

  for (const entry of react) {
    plugin ??= entry.plugins?.["jsx-a11y"];
    parser ??= entry.languageOptions?.parser as Linter.Parser | undefined;
    for (const [rule, setting] of Object.entries(entry.rules ?? {})) {
      if (rule.startsWith("jsx-a11y/") && setting !== undefined) rules[rule] = setting;
    }
  }
  if (!plugin || !parser || Object.keys(rules).length === 0) {
    throw new Error("The shared React ESLint config no longer contains the jsx-a11y rules.");
  }

  return [
    {
      files: ["**/*.{tsx,jsx}"],
      plugins: { "jsx-a11y": plugin },
      languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
      rules,
    },
  ];
}

export async function a11yLint(dir: string, files: string[]): Promise<Scores["a11yLint"]> {
  const targets = files.filter((file) => JSX.test(file) && existsSync(join(dir, file)));
  if (targets.length === 0) {
    return { status: "skipped", reason: "No .tsx or .jsx files were changed." };
  }
  const { ESLint } = await import("eslint");
  const eslint = new ESLint({
    cwd: dir,
    // The workspace's own ESLint setup, if it has one, is not what is being
    // measured; the same rules apply to every run.
    overrideConfigFile: true,
    overrideConfig: await a11yLintConfig(),
  });
  const results = await eslint.lintFiles(targets.map((file) => join(dir, file)));

  const messages: Extract<Scores["a11yLint"], { status: "ok" }>["messages"] = [];
  let parseErrors = 0;
  for (const result of results) {
    const file = result.filePath.slice(dir.length + 1);
    for (const message of result.messages) {
      if (message.fatal) parseErrors += 1;
      if (message.severity !== 2) continue;
      messages.push({
        file,
        line: message.line,
        rule: message.ruleId,
        message: message.message,
      });
    }
  }

  return {
    status: "ok",
    errors: messages.filter((message) => message.rule?.startsWith("jsx-a11y/")).length,
    parseErrors,
    messages,
  };
}

// ── All of it ────────────────────────────────────────────────────────────────

export async function scoreWorkspace(input: {
  dir: string;
  task: Task;
  changed: ChangedFile[];
  registry?: Registry;
}): Promise<Scores> {
  const { dir, task, changed } = input;
  const registry = input.registry ?? loadRegistry();
  const present = changed.filter((file) => file.status !== "D").map((file) => file.path);

  const imports = analyseImports(dir, present, registry);

  return {
    files: {
      count: changed.length,
      changed,
      routeExists: existsSync(join(dir, task.route)),
    },
    typecheck: typecheck(dir),
    audit: audit(dir, present),
    invented: imports.invented,
    uninstalled: imports.uninstalled,
    recall: recall(task, imports.used, registry),
    a11yLint: await a11yLint(dir, present),
  };
}
