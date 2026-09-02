#!/usr/bin/env node
import { readFileSync } from "node:fs";

import { Command } from "commander";

import { branding } from "./branding";
import { add } from "./commands/add";
import { init } from "./commands/init";
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

export { add, init, list, remove, update };
