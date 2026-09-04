import * as prompts from "@clack/prompts";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { branding } from "./branding";
import { CreateError } from "./lib/errors";
import { copyLayer, isEmptyDirectory, type Replacements } from "./lib/files";
import {
  detectPackageManager,
  install,
  installCommand,
  isPackageManager,
  runCommand,
  runDowel,
  type PackageManager,
} from "./lib/pm";
import { logger, pc } from "./lib/logger";
import { findTemplate, isTheme, TEMPLATES, THEMES, type Template } from "./templates";

export interface CreateOptions {
  /** Directory to create, relative to cwd or absolute. */
  directory?: string;
  template?: string;
  theme?: string;
  packageManager?: string;
  /** Accept every default and never prompt. */
  yes: boolean;
  skipInstall: boolean;
  /** Write files but do not fetch components. Mostly for tests. */
  skipComponents: boolean;
  cwd: string;
}

/** Where the shipped templates live, relative to the built entry point. */
const templatesRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "templates");

/**
 * npm's rules for a package name, which is what this becomes.
 *
 * Checked before anything is written rather than after: a directory created and
 * then abandoned because the name was rejected is worse than a question asked
 * twice.
 */
export function validateProjectName(name: string): string | undefined {
  if (name.length === 0) return "Give the project a name.";
  if (name.length > 214) return "That is longer than npm allows for a package name.";
  if (name.startsWith(".") || name.startsWith("_")) {
    return "A package name cannot start with a dot or an underscore.";
  }
  if (name !== name.toLowerCase()) return "A package name has to be lowercase.";
  if (!/^[a-z0-9._-]+$/.test(name)) {
    return "Use lowercase letters, digits, dots, hyphens and underscores only.";
  }
  return undefined;
}

/** The last segment of a path, as a package name. */
export function projectNameFrom(directory: string): string {
  return directory.split("/").filter(Boolean).pop() ?? "app";
}

/** The nav for the app shell, written into its layout. */
function appLinks(template: Template): string {
  const labels: Record<string, string> = {
    "/app": template.id === "ai" ? "Chat" : "Dashboard",
    "/app/analytics": "Analytics",
    "/app/billing": "Billing",
    "/app/settings": "Settings",
    "/app/agents": "Agents",
    "/app/usage": "Usage",
  };

  const links = template.routes
    .filter((route) => route !== "/")
    .map((route) => `  { href: "${route}", label: "${labels[route] ?? route}" },`);

  return `[\n${links.join("\n")}\n]`;
}

export async function create(options: CreateOptions): Promise<void> {
  const interactive = !options.yes;

  if (interactive) {
    prompts.intro(`${branding.libraryName} — create an app`);
  }

  const directory = await resolveDirectory(options, interactive);
  const target = isAbsolute(directory) ? directory : resolve(options.cwd, directory);
  const name = projectNameFrom(directory);

  const invalid = validateProjectName(name);
  if (invalid) throw new CreateError(invalid);

  if (!isEmptyDirectory(target)) {
    throw new CreateError(
      `${directory} already exists and is not empty.`,
      "Choose another name, or empty the directory first.",
    );
  }

  const template = await resolveTemplate(options, interactive);
  const theme = await resolveTheme(options, interactive);
  const manager = resolvePackageManager(options);

  const replacements: Replacements = {
    PROJECT_NAME: name,
    LIBRARY_NAME: branding.libraryName,
    CLI_PACKAGE: branding.cliPackage,
    DOCS_URL: branding.docsUrl,
    THEME: theme,
    APP_LINKS: appLinks(template),
  };

  mkdirSync(target, { recursive: true });

  const written: string[] = [];
  for (const layer of template.layers) {
    const from = join(templatesRoot, layer);
    if (!existsSync(from)) {
      throw new CreateError(
        `The ${layer} template is missing from this installation.`,
        "Reinstall create-dowel-app, or report this if it persists.",
      );
    }
    written.push(...copyLayer(from, target, replacements));
  }

  logger.blank();
  logger.success(`Created ${pc.bold(name)} from the ${pc.bold(template.title)} template.`);
  logger.info(pc.dim(`  ${String(new Set(written).size)} files in ${directory}`));

  if (!options.skipInstall) {
    logger.blank();
    logger.step(`Installing dependencies with ${manager}`);
    install(manager, target);
  }

  if (!options.skipComponents) {
    logger.blank();
    logger.step("Fetching components from the registry");

    // Through the real CLI, not a bundled copy. A template that carried its own
    // Button would be carrying whichever Button was current the day it was
    // written, and nothing would ever say so.
    runDowel(manager, target, branding.cliPackage, ["init", "--yes", "--skip-install"]);
    runDowel(manager, target, branding.cliPackage, [
      "add",
      ...template.items,
      "--yes",
      ...(options.skipInstall ? ["--skip-install"] : []),
    ]);
  }

  summarise({ directory, template, theme, manager, options });
}

interface SummaryContext {
  directory: string;
  template: Template;
  theme: string;
  manager: PackageManager;
  options: CreateOptions;
}

function summarise({ directory, template, theme, manager, options }: SummaryContext): void {
  logger.blank();
  logger.success("Done.");
  logger.blank();

  logger.info(pc.dim("Next:"));
  logger.info(`  cd ${directory}`);
  if (options.skipInstall) logger.info(`  ${installCommand(manager)}`);
  logger.info(`  ${runCommand(manager, "dev")}`);

  logger.blank();
  logger.info(pc.dim("Routes:"));
  for (const route of template.routes) logger.info(`  ${route}`);

  logger.blank();
  logger.info(
    pc.dim(
      `Theme: ${theme}. Change it on <html data-theme> in src/app/layout.tsx — no component file changes.`,
    ),
  );
  logger.info(
    pc.dim(`Teach your coding agent what is installed: npx ${branding.cliPackage} agents`),
  );
}

async function resolveDirectory(options: CreateOptions, interactive: boolean): Promise<string> {
  if (options.directory) return options.directory;
  if (!interactive) {
    throw new CreateError(
      "No directory given.",
      "Pass one, e.g. `create-dowel-app my-app`, or drop --yes to be asked.",
    );
  }

  const answer = await prompts.text({
    message: "Where should it go?",
    placeholder: "my-app",
    defaultValue: "my-app",
    validate: (value) => validateProjectName(projectNameFrom(value || "my-app")),
  });

  if (prompts.isCancel(answer)) throw new CreateError("Cancelled — nothing was written.");
  return answer || "my-app";
}

async function resolveTemplate(
  options: CreateOptions,
  interactive: boolean,
): Promise<Template> {
  if (options.template) {
    const found = findTemplate(options.template);
    if (!found) {
      throw new CreateError(
        `Unknown template "${options.template}".`,
        `Choose from: ${TEMPLATES.map((entry) => entry.id).join(", ")}.`,
      );
    }
    return found;
  }

  if (!interactive) return TEMPLATES[0]!;

  const answer = await prompts.select({
    message: "What are you building?",
    options: TEMPLATES.map((entry) => ({
      value: entry.id,
      label: entry.title,
      hint: entry.description,
    })),
  });

  if (prompts.isCancel(answer)) throw new CreateError("Cancelled — nothing was written.");
  return findTemplate(answer) ?? TEMPLATES[0]!;
}

async function resolveTheme(options: CreateOptions, interactive: boolean): Promise<string> {
  if (options.theme) {
    if (!isTheme(options.theme)) {
      throw new CreateError(
        `Unknown theme "${options.theme}".`,
        `Choose from: ${THEMES.join(", ")}.`,
      );
    }
    return options.theme;
  }

  if (!interactive) return "default";

  const answer = await prompts.select({
    message: "Which theme?",
    options: THEMES.map((entry) => ({
      value: entry,
      label: entry,
      hint:
        entry === "monochrome"
          ? "No colour at all — a standing check that nothing relies on it"
          : undefined,
    })),
  });

  if (prompts.isCancel(answer)) throw new CreateError("Cancelled — nothing was written.");
  return answer;
}

function resolvePackageManager(options: CreateOptions): PackageManager {
  if (!options.packageManager) return detectPackageManager();

  if (!isPackageManager(options.packageManager)) {
    throw new CreateError(
      `Unknown package manager "${options.packageManager}".`,
      "Choose from: pnpm, npm, yarn, bun.",
    );
  }

  return options.packageManager;
}

export { readdirSync };
