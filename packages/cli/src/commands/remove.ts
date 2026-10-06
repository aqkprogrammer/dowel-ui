import * as prompts from "@clack/prompts";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { isAbsolute, join, normalize, relative } from "node:path";

import { hashContent } from "@dowel-ui/registry";

import { blocksAlias, CONFIG_FILE, readConfig, writeConfig, type Config } from "../lib/config";
import { CliError } from "../lib/errors";
import { logger, pc } from "../lib/logger";
import { aliasToDirectory } from "../lib/paths";

export interface RemoveOptions {
  cwd: string;
  yes: boolean;
  /** Delete files that no longer match what was installed. */
  force: boolean;
}

export type RemovalState = "unchanged" | "modified" | "missing";

export interface PlannedRemoval {
  component: string;
  path: string;
  state: RemovalState;
}

/**
 * Classifies a file before deleting it.
 *
 * Deleting is the one irreversible thing this CLI does, so it distinguishes a
 * file still exactly as installed — safe to remove — from one that has been
 * edited, which is the user's work and not ours to throw away.
 */
export function classifyRemoval(
  absolutePath: string,
  recordedHash: string | undefined,
): RemovalState {
  if (!existsSync(absolutePath)) return "missing";
  if (recordedHash === undefined) return "modified";
  return hashContent(readFileSync(absolutePath, "utf8")) === recordedHash
    ? "unchanged"
    : "modified";
}

/**
 * Components that other installed entries still import.
 *
 * Removing a component something else depends on would break the project, so
 * those are reported and skipped rather than deleted with a warning after the
 * fact.
 */
export function findDependents(
  installed: Record<string, { files: Record<string, string> }>,
  registryDependencies: Map<string, string[]>,
  removing: Set<string>,
): Map<string, string[]> {
  const blockers = new Map<string, string[]>();

  for (const name of removing) {
    const dependents = Object.keys(installed).filter(
      (candidate) =>
        !removing.has(candidate) && (registryDependencies.get(candidate) ?? []).includes(name),
    );
    if (dependents.length > 0) blockers.set(name, dependents);
  }

  return blockers;
}

/**
 * Whether a recorded path is one this CLI could have written, and so one it
 * may delete.
 *
 * The paths come from `components.json`, which is part of the repository and
 * may have been written by anyone. Only files inside the directories `add`
 * installs into qualify; anything else is refused outright rather than
 * skipped, because a config naming files elsewhere is one that should not be
 * trusted for the rest of the removal either.
 */
export function isRemovablePath(config: Config, path: string): boolean {
  if (isAbsolute(path)) return false;

  const target = normalize(path);
  const roots = [
    config.aliases.components,
    config.aliases.ui,
    config.aliases.lib,
    config.aliases.hooks,
    blocksAlias(config),
  ].map((alias) => normalize(aliasToDirectory(config, alias)));

  return roots.some((root) => {
    const inside = relative(root, target);
    return inside !== "" && !inside.startsWith("..") && !isAbsolute(inside);
  });
}

export async function remove(names: string[], options: RemoveOptions): Promise<void> {
  if (names.length === 0) {
    throw new CliError("Name at least one component to remove.");
  }

  const { cwd } = options;
  const config = readConfig(cwd);

  const unknown = names.filter((name) => !(name in config.installed));
  if (unknown.length > 0) {
    throw new CliError(
      `Not installed: ${unknown.join(", ")}.`,
      "Run `list` to see what is installed.",
    );
  }

  // Dependency edges are read from what was installed, not fetched: removing
  // something should not need the registry to be reachable.
  const registryDependencies = new Map<string, string[]>();
  for (const [name, entry] of Object.entries(config.installed)) {
    registryDependencies.set(name, entry.dependsOn ?? []);
  }

  const removing = new Set(names);
  const blockers = findDependents(config.installed, registryDependencies, removing);

  if (blockers.size > 0) {
    logger.error("These are still needed by something else:");
    for (const [name, dependents] of blockers) {
      logger.info(`  ${name} — required by ${dependents.join(", ")}`);
    }
    throw new CliError("Nothing was removed.", "Remove the dependents first, or keep these.");
  }

  // The stylesheet `init` added the tokens to is the project's own file, with
  // the project's own CSS in it. Deleting it to remove the tokens would take
  // everything else with it, so it is never deleted, forced or not.
  const stylesheet = normalize(config.tailwind.css);

  const planned: PlannedRemoval[] = [];
  const outside: string[] = [];
  let keptStylesheet = false;
  for (const name of names) {
    for (const [path, hash] of Object.entries(config.installed[name]?.files ?? {})) {
      if (normalize(path) === stylesheet) {
        keptStylesheet = true;
        continue;
      }
      if (!isRemovablePath(config, path)) {
        outside.push(path);
        continue;
      }
      planned.push({ component: name, path, state: classifyRemoval(join(cwd, path), hash) });
    }
  }

  if (outside.length > 0) {
    logger.error(
      `${CONFIG_FILE} lists files outside the directories components are installed in:`,
    );
    for (const path of outside) logger.info(`  ${path}`);
    throw new CliError(
      "Nothing was removed.",
      `Check the "installed" entries in ${CONFIG_FILE}; they should only name files the CLI wrote.`,
    );
  }

  if (keptStylesheet) {
    logger.info(
      pc.dim(
        `${config.tailwind.css} is your stylesheet, so it was kept. Remove the tokens from it by hand if you want them gone.`,
      ),
    );
  }

  const modified = planned.filter((file) => file.state === "modified");
  const deletable = planned.filter(
    (file) => file.state === "unchanged" || (options.force && file.state === "modified"),
  );

  if (modified.length > 0 && !options.force) {
    logger.warn("These have local changes and will be kept:");
    for (const file of modified) logger.info(`  ${file.path}`);
    logger.blank();
    logger.info(pc.dim("Re-run with --force to delete them as well."));
  }

  if (deletable.length === 0) {
    logger.blank();
    logger.info("Nothing to delete.");
    return;
  }

  if (!options.yes) {
    logger.info(pc.dim("Will delete:"));
    for (const file of deletable) logger.info(`  ${file.path}`);
    logger.blank();

    const proceed = await prompts.confirm({
      message: `Delete ${String(deletable.length)} file(s)?`,
      initialValue: false,
    });
    if (prompts.isCancel(proceed) || !proceed) {
      throw new CliError("Cancelled — nothing was deleted.");
    }
  }

  for (const file of deletable) {
    rmSync(join(cwd, file.path), { force: true });
  }

  // An entry whose files were kept stays recorded, so `update` still knows what
  // it wrote there.
  const deleted = new Set(deletable.map((file) => file.path));
  for (const name of names) {
    const entry = config.installed[name];
    if (!entry) continue;

    const remaining = Object.fromEntries(
      Object.entries(entry.files).filter(([path]) => !deleted.has(path)),
    );

    if (Object.keys(remaining).length === 0) delete config.installed[name];
    else entry.files = remaining;
  }

  writeConfig(cwd, config);

  logger.blank();
  logger.success(`Removed ${String(deletable.length)} file(s).`);
  if (modified.length > 0 && !options.force) {
    logger.warn(`${String(modified.length)} locally modified file(s) were kept.`);
  }
  logger.blank();
  logger.info(pc.dim("npm packages are left installed — other code may still use them."));
}
