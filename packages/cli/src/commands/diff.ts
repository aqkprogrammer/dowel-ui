import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createTwoFilesPatch } from "diff";

import { readConfig } from "../lib/config";
import { CliError } from "../lib/errors";
import { logger, pc } from "../lib/logger";
import { resolveDestination, rewriteImports } from "../lib/paths";
import { fetchIndex, fetchItem } from "../lib/registry-client";

export interface DiffOptions {
  cwd: string;
  registry?: string;
}

export interface FileDiff {
  component: string;
  path: string;
  /** Unified diff from the local file to the registry's, or undefined when equal. */
  patch: string | undefined;
  missing: boolean;
}

/**
 * The difference between each installed file and the registry's current one.
 *
 * `update` reports that a file changed; this shows how. Before replacing a
 * file you own, the change is the thing you need to read — and for a file you
 * edited, it is the only way to bring an upstream fix across by hand without
 * losing your own.
 */
export async function diffInstalled(
  names: string[],
  options: DiffOptions,
): Promise<FileDiff[]> {
  const config = readConfig(options.cwd);
  const registry = options.registry ?? config.registry;
  const targets = names.length > 0 ? names : Object.keys(config.installed);

  const unknown = targets.filter((name) => !(name in config.installed));
  if (unknown.length > 0) {
    throw new CliError(
      `Not installed: ${unknown.join(", ")}.`,
      "Run `list` to see what is installed.",
    );
  }

  const index = await fetchIndex(registry);
  const licensed = new Set(
    index.items.filter((entry) => entry.access === "pro").map((entry) => entry.name),
  );

  const diffs: FileDiff[] = [];
  for (const name of targets) {
    const item = await fetchItem(registry, name, { licensed: licensed.has(name) });
    for (const file of item.files) {
      // The tokens live inside the project's own stylesheet; a diff against the
      // whole file would be every line the project wrote itself.
      if (file.type === "registry:style") continue;

      const path = resolveDestination(config, file.path);
      const upstream = rewriteImports(file.content, config);
      const absolute = join(options.cwd, path);
      const missing = !existsSync(absolute);
      const local = missing ? "" : readFileSync(absolute, "utf8");

      diffs.push({
        component: name,
        path,
        missing,
        patch:
          local === upstream
            ? undefined
            : createTwoFilesPatch(`${path} (yours)`, `${path} (registry)`, local, upstream),
      });
    }
  }

  return diffs;
}

function colour(patch: string): string {
  return patch
    .split("\n")
    .map((line) =>
      line.startsWith("+++") || line.startsWith("---")
        ? pc.bold(line)
        : line.startsWith("+")
          ? pc.green(line)
          : line.startsWith("-")
            ? pc.red(line)
            : line.startsWith("@@")
              ? pc.cyan(line)
              : line,
    )
    .join("\n");
}

export async function diff(names: string[], options: DiffOptions): Promise<void> {
  const diffs = await diffInstalled(names, options);
  const changed = diffs.filter((entry) => entry.patch !== undefined);

  if (changed.length === 0) {
    logger.success(`${String(diffs.length)} file(s) match the registry.`);
    return;
  }

  for (const entry of changed) {
    logger.blank();
    if (entry.missing) logger.warn(`${entry.path} is missing locally.`);
    logger.info(colour(entry.patch ?? ""));
  }

  logger.info(
    pc.dim(
      `${String(changed.length)} of ${String(diffs.length)} file(s) differ. ` +
        "`-` lines are yours, `+` lines are the registry's.",
    ),
  );
}
