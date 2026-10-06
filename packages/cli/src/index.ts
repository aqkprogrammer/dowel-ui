#!/usr/bin/env node
import { readFileSync } from "node:fs";

import { Command } from "commander";

import { branding } from "./branding";
import { add } from "./commands/add";
import { agents } from "./commands/agents";
import { audit } from "./commands/audit";
import { login, logout, whoami } from "./commands/auth";
import { diff } from "./commands/diff";
import { doctor } from "./commands/doctor";
import { init } from "./commands/init";
import { plan } from "./commands/plan";
import { list } from "./commands/list";
import { remove } from "./commands/remove";
import { update } from "./commands/update";
import { CliError } from "./lib/errors";
import { logger, pc } from "./lib/logger";

/**
 * Read from the manifest rather than hardcoded, so `--version` cannot drift
 * away from what was actually published. `src/index.ts` and the built
 * `dist/index.js` both sit one directory below package.json, so this resolves
 * to the same file whether the CLI is run from source or from the tarball.
 */
const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

const program = new Command();

program
  .name(branding.cliName)
  .description(`Add ${branding.libraryName} components to your project as source you own.`)
  .version(version)
  .option("-c, --cwd <path>", "project root", process.cwd())
  .option("-r, --registry <url>", "registry base URL, or a directory on disk");

interface GlobalOptions {
  cwd: string;
  registry?: string;
}

function globals(): GlobalOptions {
  return program.opts<GlobalOptions>();
}

program
  .command("init")
  .description("set the project up: config, utilities and design tokens")
  .option("-y, --yes", "accept every default and never prompt", false)
  .option("--skip-install", "write files but do not install dependencies", false)
  .action(async (options: { yes: boolean; skipInstall: boolean }) => {
    const { cwd, registry } = globals();
    await init({
      cwd,
      registry: registry ?? branding.registryUrl,
      yes: options.yes,
      skipInstall: options.skipInstall,
    });
  });

program
  .command("add")
  .description("add one or more components, with everything they depend on")
  .argument("[components...]", "component names")
  .option("-y, --yes", "do not ask for confirmation", false)
  .option("-o, --overwrite", "replace files that have local changes", false)
  .option("--skip-install", "write files but do not install dependencies", false)
  .action(
    async (
      components: string[],
      options: { yes: boolean; overwrite: boolean; skipInstall: boolean },
    ) => {
      const { cwd, registry } = globals();
      await add(components, {
        cwd,
        registry,
        yes: options.yes,
        overwrite: options.overwrite,
        skipInstall: options.skipInstall,
      });
    },
  );

program
  .command("list")
  .alias("ls")
  .description("list everything in the registry, marking what is installed")
  .option("--category <name>", "show one category only")
  .option("--json", "machine-readable output", false)
  .action(async (options: { category?: string; json: boolean }) => {
    const { cwd, registry } = globals();
    await list({ cwd, registry, category: options.category, json: options.json });
  });

program
  .command("remove")
  .alias("rm")
  .description("delete installed components, keeping anything you have edited")
  .argument("[components...]", "component names")
  .option("-y, --yes", "do not ask for confirmation", false)
  .option("-f, --force", "delete files that have local changes too", false)
  .action(async (components: string[], options: { yes: boolean; force: boolean }) => {
    const { cwd } = globals();
    await remove(components, { cwd, yes: options.yes, force: options.force });
  });

program
  .command("agents")
  .description("write documentation for the coding agents working in this project")
  .argument("[targets...]", "any of: dowel, agents, claude, cursor (default: all)")
  .option("--check", "report what is out of date and exit non-zero, writing nothing", false)
  .action(async (targets: string[], options: { check: boolean }) => {
    const { cwd, registry } = globals();
    await agents({ cwd, registry, targets, check: options.check });
  });

program
  .command("login")
  .description("store a licence key, so licensed components can be installed")
  .argument("[key]", "the licence key; prompted for when omitted")
  .option("-y, --yes", "do not prompt; requires the key as an argument", false)
  .action(async (key: string | undefined, options: { yes: boolean }) => {
    const { registry } = globals();
    await login({
      registry: registry ?? branding.registryUrl,
      token: key,
      yes: options.yes,
    });
  });

program
  .command("logout")
  .description("remove the stored licence key from this machine")
  .action(() => {
    logout();
  });

program
  .command("whoami")
  .description("report whether this machine is signed in")
  .option("--check", "ask the registry whether the licence is still active", false)
  .action(async (options: { check: boolean }) => {
    const { registry } = globals();
    await whoami({ registry, check: options.check });
  });

program
  .command("update")
  .description("compare installed components against the registry")
  .argument("[components...]", "component names; defaults to everything installed")
  .option("-y, --yes", "do not ask for confirmation", false)
  .option("-o, --overwrite", "replace files that have local changes", false)
  .action(async (components: string[], options: { yes: boolean; overwrite: boolean }) => {
    const { cwd, registry } = globals();
    await update(components, {
      cwd,
      registry,
      yes: options.yes,
      overwrite: options.overwrite,
    });
  });

program
  .command("plan")
  .description("choose the components and blocks for a screen you describe")
  .argument("<prompt>", 'what to build, e.g. "a billing page with usage and invoices"')
  .option("--model [id]", "plan with a Claude model, using your own Anthropic credentials")
  .option("--format <format>", "brief, code or both", "both")
  .action(async (prompt: string, options: { model?: string | boolean; format: string }) => {
    const { cwd, registry } = globals();
    if (!["brief", "code", "both"].includes(options.format)) {
      throw new CliError(`Unknown format "${options.format}".`, "Choose brief, code or both.");
    }
    await plan(prompt, {
      cwd,
      registry,
      model: options.model,
      format: options.format as "brief" | "code" | "both",
    });
  });

program
  .command("doctor")
  .description("check the project's setup, installed components and agent docs")
  .option("--offline", "skip the checks that need the registry", false)
  .option("--json", "print the checks as JSON", false)
  .action(async (options: { offline: boolean; json: boolean }) => {
    const { cwd, registry } = globals();
    await doctor({ cwd, registry, offline: options.offline, json: options.json });
  });

program
  .command("diff")
  .description("show how installed files differ from the registry's current ones")
  .argument("[components...]", "component names; defaults to everything installed")
  .action(async (components: string[]) => {
    const { cwd, registry } = globals();
    await diff(components, { cwd, registry });
  });

program
  .command("audit")
  .description(
    "find hardcoded colours, off-scale sizes, physical directions and bypassed components",
  )
  .argument(
    "[paths...]",
    "files or directories to scan (default: src, app, components, pages, lib)",
  )
  .option("--rule <ids>", "only these rules, comma-separated")
  .option("--json", "print the findings as JSON", false)
  .option("--fix", "rewrite the findings that have one exact fix, after asking", false)
  .option("-y, --yes", "with --fix, do not ask first", false)
  .option("--include-installed", "also scan the files Dowel installed", false)
  .action(
    async (
      paths: string[],
      options: {
        rule?: string;
        json: boolean;
        fix: boolean;
        yes: boolean;
        includeInstalled: boolean;
      },
    ) => {
      const { cwd } = globals();
      await audit({
        cwd,
        paths,
        rules: options.rule ? options.rule.split(",").map((rule) => rule.trim()) : [],
        json: options.json,
        fix: options.fix,
        yes: options.yes,
        includeInstalled: options.includeInstalled,
      });
    },
  );

/**
 * A CliError is a message for the person running the command; anything else is
 * a bug, and its stack trace is the useful part.
 */
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    logger.blank();
    if (error instanceof CliError) {
      logger.error(error.message);
      if (error.hint) logger.info(pc.dim(`  ${error.hint}`));
    } else {
      logger.error("Something went wrong.");
      logger.info(String(error instanceof Error ? (error.stack ?? error.message) : error));
    }
    logger.blank();
    process.exitCode = 1;
  }
}

void main();

export { add, agents, init, login, logout, list, remove, update, whoami };
