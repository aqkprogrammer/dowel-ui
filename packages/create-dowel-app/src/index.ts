#!/usr/bin/env node
import { readFileSync } from "node:fs";

import { Command } from "commander";

import { branding } from "./branding";
import { create } from "./create";
import { CreateError } from "./lib/errors";
import { logger, pc } from "./lib/logger";
import { TEMPLATES, THEMES } from "./templates";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

const program = new Command();

program
  .name("create-dowel-app")
  .description(
    `Creates a Next.js application wired to ${branding.libraryName}, with the components ` +
      `fetched from the registry rather than copied out of a template.`,
  )
  .version(version)
  .argument("[directory]", "where to create it")
  .option("-t, --template <name>", `one of: ${TEMPLATES.map((entry) => entry.id).join(", ")}`)
  .option("--theme <name>", `one of: ${THEMES.join(", ")}`)
  .option("--pm <manager>", "pnpm, npm, yarn or bun; detected from how this was run")
  .option("-y, --yes", "accept every default and never prompt", false)
  .option("--skip-install", "write files but do not install dependencies", false)
  .option("--skip-components", "write files but do not fetch components", false)
  .action(
    async (
      directory: string | undefined,
      options: {
        template?: string;
        theme?: string;
        pm?: string;
        yes: boolean;
        skipInstall: boolean;
        skipComponents: boolean;
      },
    ) => {
      await create({
        directory,
        template: options.template,
        theme: options.theme,
        packageManager: options.pm,
        yes: options.yes,
        skipInstall: options.skipInstall,
        skipComponents: options.skipComponents,
        cwd: process.cwd(),
      });
    },
  );

/**
 * A CreateError is a message for the person running the command; anything else
 * is a bug, and its stack trace is the useful part.
 */
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    logger.blank();
    if (error instanceof CreateError) {
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

export { create };
