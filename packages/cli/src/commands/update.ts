import * as prompts from "@clack/prompts";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { hashContent } from "@dowel-ui/registry";

import { readConfig, writeConfig } from "../lib/config";
import { CliError } from "../lib/errors";
import { logger, pc } from "../lib/logger";
import { resolveDestination, rewriteImports } from "../lib/paths";
import { fetchIndex, fetchItem } from "../lib/registry-client";

export interface UpdateOptions {
  cwd: string;
  registry?: string;
  overwrite: boolean;
  yes: boolean;
}

export type UpdateState = "current" | "outdated" | "modified" | "conflict" | "missing";

export interface UpdateReport {
  component: string;
  destination: string;
  state: UpdateState;
  content: string;
  hash: string;
}

/**
 * Compares three versions of a file: what the registry has now, what we
 * installed, and what is on disk.
 *
 * The three-way comparison is why the install hash had to be recorded from the
 * very first release. Without it there is no way to distinguish "the user
 * edited this" from "upstream changed this", and the only safe behaviour left
 * is to never update anything.
 */
export function compareFile(
  absolutePath: string,
  incomingHash: string,
  recordedHash: string | undefined,
): UpdateState {
  if (!existsSync(absolutePath)) return "missing";

  const currentHash = hashContent(readFileSync(absolutePath, "utf8"));

  if (currentHash === incomingHash) return "current";
  if (recordedHash === undefined) return "conflict";
  if (currentHash === recordedHash) return "outdated";

  // Changed on both sides. Overwriting would silently discard the user's work,
  // which in a source-first library is the whole thing they were promised.
  return incomingHash === recordedHash ? "modified" : "conflict";
}

const STATE_LABEL: Record<UpdateState, string> = {
  current: "up to date",
  outdated: "update available",
  modified: "locally modified",
  conflict: "modified, and changed upstream",
  missing: "missing",
};

export async function update(names: string[], options: UpdateOptions): Promise<void> {
  const { cwd } = options;
  const config = readConfig(cwd);
  const registry = options.registry ?? config.registry;

  const targets = names.length > 0 ? names : Object.keys(config.installed);

  if (targets.length === 0) {
    throw new CliError("Nothing is installed yet.", "Add a component first.");
  }

  const unknown = targets.filter((name) => !(name in config.installed));
  if (unknown.length > 0) {
    throw new CliError(
      `Not installed: ${unknown.join(", ")}.`,
      "Run `list` to see what is installed.",
    );
  }

  // Same as `add`: a licensed item is fetched from the licensed path with
  // credentials, and which items those are is the index's answer to give.
  const index = await fetchIndex(registry);
  const licensed = new Set(
    index.items.filter((entry) => entry.access === "pro").map((entry) => entry.name),
  );

  const reports: UpdateReport[] = [];

  for (const name of targets) {
    const item = await fetchItem(registry, name, { licensed: licensed.has(name) });
    const recorded = config.installed[name]?.files ?? {};

    for (const file of item.files) {
      if (file.type === "registry:style") continue;

      const destination = resolveDestination(config, file.path);
      const content = rewriteImports(file.content, config);
      const hash = hashContent(content);

      reports.push({
        component: name,
        destination,
        hash,
        content,
        state: compareFile(join(cwd, destination), hash, recorded[destination]),
      });
    }
  }

  const actionable = reports.filter(
    (report) => report.state === "outdated" || report.state === "missing",
  );
  const conflicts = reports.filter(
    (report) => report.state === "conflict" || report.state === "modified",
  );

  logger.blank();
  for (const report of reports) {
    const colour =
      report.state === "current"
        ? pc.dim
        : report.state === "outdated" || report.state === "missing"
          ? pc.yellow
          : pc.red;
    logger.info(`  ${colour(STATE_LABEL[report.state].padEnd(30))} ${report.destination}`);
  }
  logger.blank();

  if (actionable.length === 0 && conflicts.length === 0) {
    logger.success("Everything is up to date.");
    return;
  }

  const writable = options.overwrite ? [...actionable, ...conflicts] : actionable;

  if (writable.length === 0) {
    logger.warn("Only locally modified files differ; none were touched.");
    logger.info(pc.dim("Re-run with --overwrite to replace them and lose those edits."));
    return;
  }

  if (!options.yes) {
    const proceed = await prompts.confirm({
      message: options.overwrite
        ? `Overwrite ${String(writable.length)} file(s), discarding any local changes?`
        : `Update ${String(writable.length)} file(s)?`,
      initialValue: !options.overwrite,
    });
    if (prompts.isCancel(proceed) || !proceed) {
      throw new CliError("Cancelled — nothing was changed.");
    }
  }

  for (const report of writable) {
    writeFileSync(join(cwd, report.destination), report.content);

    const entry = config.installed[report.component];
    if (entry) entry.files[report.destination] = report.hash;
  }

  writeConfig(cwd, config);

  logger.blank();
  logger.success(`Updated ${String(writable.length)} file(s).`);
  if (!options.overwrite && conflicts.length > 0) {
    logger.warn(`${String(conflicts.length)} locally modified file(s) were left alone.`);
  }
}
