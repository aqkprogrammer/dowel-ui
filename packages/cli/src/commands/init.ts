import * as prompts from "@clack/prompts";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { branding } from "../branding";
import { configExists, writeConfig, type Config } from "../lib/config";
import { CliError } from "../lib/errors";
import { logger, pc } from "../lib/logger";
import { installDependencies, missingDependencies } from "../lib/package-manager";
import { resolveDestination, rewriteImports } from "../lib/paths";
import { assertSupported, inspectProject } from "../lib/project";
import { fetchItem } from "../lib/registry-client";

export interface InitOptions {
  cwd: string;
  registry: string;
  yes: boolean;
  skipInstall: boolean;
}

/** Header the registry puts at the top of the token block. */
export const TOKENS_MARKER = "/* Design tokens. Safe to edit — this is your copy. */";

/**
 * Appends the design tokens to the project stylesheet.
 *
 * Appended rather than written as a new file, and inserted after the Tailwind
 * import rather than at the top, because `@theme` has to be processed by
 * Tailwind. The existing stylesheet is never rewritten — whatever the project
 * already had stays exactly where it was.
 *
 * Two separate idempotence checks, because they catch different things. The
 * marker survives the user editing their tokens, which they are meant to do —
 * a content check alone would re-insert the whole block over their changes. The
 * content check covers a token block that carries no marker.
 */
export function insertTokens(stylesheet: string, tokens: string): string {
  if (stylesheet.includes(TOKENS_MARKER)) return stylesheet;
  if (stylesheet.includes(tokens.trim())) return stylesheet;

  const importMatch = /^[^\n]*@import\s+["']tailwindcss["'][^\n]*$/m.exec(stylesheet);

  if (!importMatch) {
    return `${stylesheet.trimEnd()}\n\n${tokens.trim()}\n`;
  }

  const insertAt = importMatch.index + importMatch[0].length;
  return `${stylesheet.slice(0, insertAt)}\n\n${tokens.trim()}\n${stylesheet.slice(insertAt)}`;
}

export async function init(options: InitOptions): Promise<void> {
  const { cwd, registry, yes } = options;

  if (configExists(cwd) && !yes) {
    const overwrite = await prompts.confirm({
      message: "components.json already exists. Overwrite it?",
      initialValue: false,
    });
    if (prompts.isCancel(overwrite) || !overwrite) {
      throw new CliError("Cancelled — nothing was changed.");
    }
  }

  const project = inspectProject(cwd);
  assertSupported(project);

  logger.step(`Detected ${pc.bold(project.framework)} · ${pc.bold(project.packageManager)}`);

  let resolve = project.resolve;
  if (!resolve) {
    if (yes) {
      throw new CliError(
        "Could not read a path alias from tsconfig.json.",
        'Add something like `"paths": { "@/*": ["./src/*"] }` and run init again.',
      );
    }

    const prefix = await prompts.text({
      message: "What import alias do you use?",
      placeholder: "@/",
      initialValue: "@/",
    });
    const base = await prompts.text({
      message: "Which directory does it point at?",
      placeholder: "src",
      initialValue: "src",
    });

    if (prompts.isCancel(prefix) || prompts.isCancel(base)) {
      throw new CliError("Cancelled — nothing was changed.");
    }
    resolve = { prefix, base };
  }

  let cssEntry = project.cssEntry;
  if (!cssEntry) {
    if (yes) {
      throw new CliError(
        "Could not find a stylesheet that imports Tailwind.",
        'Create one containing `@import "tailwindcss";` and run init again.',
      );
    }

    const answer = await prompts.text({
      message: "Where is the stylesheet that imports Tailwind?",
      placeholder: "src/index.css",
    });
    if (prompts.isCancel(answer) || !answer) {
      throw new CliError("Cancelled — nothing was changed.");
    }
    cssEntry = answer;
  }

  const config: Config = {
    $schema: `${branding.registryUrl}/schema/components.json`,
    version: 1,
    typescript: true,
    registry,
    tailwind: { css: cssEntry },
    aliases: {
      components: `${resolve.prefix}components`,
      ui: `${resolve.prefix}components/ui`,
      lib: `${resolve.prefix}lib`,
      hooks: `${resolve.prefix}hooks`,
      utils: `${resolve.prefix}lib/utils`,
      blocks: `${resolve.prefix}components/blocks`,
    },
    resolve,
    installed: {},
  };

  const utils = await fetchItem(registry, "utils");
  const theme = await fetchItem(registry, "theme");

  const written: string[] = [];
  const installedFiles: Record<string, string> = {};

  for (const file of utils.files) {
    const destination = resolveDestination(config, file.path);
    const absolute = join(cwd, destination);

    if (existsSync(absolute)) {
      logger.step(`${pc.dim("skipped")} ${destination} ${pc.dim("(already exists)")}`);
      continue;
    }

    mkdirSync(dirname(absolute), { recursive: true });
    const content = rewriteImports(file.content, config);
    writeFileSync(absolute, content);
    installedFiles[destination] = file.hash;
    written.push(destination);
  }

  config.installed.utils = { from: utils.registryVersion.toString(), files: installedFiles };

  const stylesheetPath = join(cwd, cssEntry);
  if (!existsSync(stylesheetPath)) {
    throw new CliError(`Stylesheet not found at ${cssEntry}.`);
  }

  const tokens = theme.files[0]?.content ?? "";
  const stylesheet = readFileSync(stylesheetPath, "utf8");
  const updated = insertTokens(stylesheet, tokens);

  if (updated === stylesheet) {
    logger.step(`${pc.dim("skipped")} ${cssEntry} ${pc.dim("(tokens already present)")}`);
  } else {
    writeFileSync(stylesheetPath, updated);
    written.push(cssEntry);
  }

  config.installed.theme = {
    from: theme.registryVersion.toString(),
    files: { [cssEntry]: theme.files[0]?.hash ?? "" },
  };

  writeConfig(cwd, config);
  written.unshift("components.json");

  const required = [...utils.dependencies];
  const missing = missingDependencies(
    { ...project.packageJson.dependencies, ...project.packageJson.devDependencies },
    required,
  );

  if (missing.length > 0 && !options.skipInstall) {
    logger.step(`Installing ${missing.join(", ")}`);
    installDependencies(project.packageManager, cwd, missing);
  }

  logger.blank();
  logger.success("Project initialised.");
  logger.blank();
  logger.info(pc.dim("Files:"));
  for (const file of written) logger.info(`  ${file}`);
  if (missing.length > 0) {
    logger.blank();
    logger.info(pc.dim(options.skipInstall ? "Install manually:" : "Dependencies:"));
    logger.info(`  ${missing.join(" ")}`);
  }
  logger.blank();
  // The npx form rather than the bare binary: whoever ran this through npx
  // has no `dowel` on their PATH, and pointing them at a command they do not
  // have is a poor first impression.
  logger.info(`Next: ${pc.bold(`npx ${branding.cliPackage} add button`)}`);
}
