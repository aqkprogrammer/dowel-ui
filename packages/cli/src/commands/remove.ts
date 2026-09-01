import * as prompts from "@clack/prompts";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { hashContent } from "@dowel-ui/registry";

import { readConfig, writeConfig } from "../lib/config";
import { CliError } from "../lib/errors";
import { logger, pc } from "../lib/logger";

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

  const planned: PlannedRemoval[] = [];
  for (const name of names) {
    for (const [path, hash] of Object.entries(config.installed[name]?.files ?? {})) {
      planned.push({ component: name, path, state: classifyRemoval(join(cwd, path), hash) });
    }
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
