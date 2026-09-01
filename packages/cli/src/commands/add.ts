import * as prompts from "@clack/prompts";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { hashContent, type RegistryItem } from "@dowel-ui/registry";

import { readConfig, writeConfig, type Config } from "../lib/config";
import { CliError } from "../lib/errors";
import { logger, pc } from "../lib/logger";
import { installDependencies, missingDependencies } from "../lib/package-manager";
import { resolveDestination, rewriteImports } from "../lib/paths";
import { inspectProject } from "../lib/project";
import { resolveItems } from "../lib/registry-client";

export interface AddOptions {
  cwd: string;
  registry?: string;
  yes: boolean;
  overwrite: boolean;
  skipInstall: boolean;
}

/** What `add` intends to do with one file, decided before anything is written. */
export type FileAction = "write" | "unchanged" | "modified";

export interface PlannedFile {
  destination: string;
  content: string;
  hash: string;
  action: FileAction;
}

/**
 * Classifies an existing file against what we previously wrote there.
 *
 * Three outcomes, and the distinction matters. A file whose content still
 * matches what we installed is ours to replace silently, which is what makes
 * re-running `add` a no-op. A file that differs from what we installed has been
 * edited by the user — the entire point of a source-first library — and must
 * never be overwritten without them saying so.
 */
export function classifyFile(
  absolutePath: string,
  incomingHash: string,
  recordedHash: string | undefined,
): FileAction {
  if (!existsSync(absolutePath)) return "write";

  const currentHash = hashContent(readFileSync(absolutePath, "utf8"));

  if (currentHash === incomingHash) return "unchanged";
  // Still exactly what we last wrote, just superseded upstream: ours to replace.
  if (recordedHash !== undefined && currentHash === recordedHash) return "write";

  return "modified";
}

export function planFiles(cwd: string, config: Config, items: RegistryItem[]): PlannedFile[] {
  const planned: PlannedFile[] = [];

  for (const item of items) {
    const recorded = config.installed[item.name]?.files ?? {};

    for (const file of item.files) {
      if (file.type === "registry:style") continue;

      const destination = resolveDestination(config, file.path);
      const content = rewriteImports(file.content, config);
      // Hashed after rewriting, because the rewritten text is what actually
      // lands on disk — comparing against the published text would report every
      // file as modified in any project that does not use the `@/` prefix.
      const hash = hashContent(content);

      planned.push({
        destination,
        content,
        hash,
        action: classifyFile(join(cwd, destination), hash, recorded[destination]),
      });
    }
  }

  return planned;
}

export async function add(names: string[], options: AddOptions): Promise<void> {
  if (names.length === 0) {
    throw new CliError(
      "Name at least one component to add.",
      "For example: `add button dialog`.",
    );
  }

  const { cwd, yes, overwrite } = options;
  const config = readConfig(cwd);
  const registry = options.registry ?? config.registry;
  const project = inspectProject(cwd);

  const items = await resolveItems(registry, names);
  const requested = new Set(names);
  const pulledIn = items.filter((item) => !requested.has(item.name));

  const planned = planFiles(cwd, config, items);
  const toWrite = planned.filter((file) => file.action === "write");
  const modified = planned.filter((file) => file.action === "modified");
  const unchanged = planned.filter((file) => file.action === "unchanged");

  if (modified.length > 0 && !overwrite) {
    logger.warn("These files have local changes and were left alone:");
    for (const file of modified) logger.info(`  ${file.destination}`);
    logger.blank();
    logger.info(pc.dim("Re-run with --overwrite to replace them."));

    if (toWrite.length === 0) {
      logger.blank();
      logger.info("Nothing else to do.");
      return;
    }
  }

  const writable = overwrite ? [...toWrite, ...modified] : toWrite;

  if (writable.length === 0) {
    logger.success(unchanged.length > 0 ? "Already up to date." : "Nothing to write.");
    return;
  }

  const dependencies = [...new Set(items.flatMap((item) => item.dependencies))];
  const missing = missingDependencies(
    { ...project.packageJson.dependencies, ...project.packageJson.devDependencies },
    dependencies,
  );

  if (!yes) {
    logger.info(pc.dim("Will write:"));
    for (const file of writable) logger.info(`  ${file.destination}`);
    if (pulledIn.length > 0) {
      logger.info(
        pc.dim(`Pulled in as dependencies: ${pulledIn.map((i) => i.name).join(", ")}`),
      );
    }
    if (missing.length > 0) logger.info(pc.dim(`Will install: ${missing.join(", ")}`));
    logger.blank();

    const proceed = await prompts.confirm({ message: "Continue?", initialValue: true });
    if (prompts.isCancel(proceed) || !proceed) {
      throw new CliError("Cancelled — nothing was changed.");
    }
  }

  for (const file of writable) {
    const absolute = join(cwd, file.destination);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, file.content);
  }

  // Recorded after writing, and only for files that actually landed, so the
  // config never claims to have installed something it did not.
  const writtenPaths = new Set(writable.map((file) => file.destination));
  for (const item of items) {
    const files: Record<string, string> = { ...config.installed[item.name]?.files };

    for (const file of planFiles(cwd, config, [item])) {
      if (writtenPaths.has(file.destination) || file.action === "unchanged") {
        files[file.destination] = file.hash;
      }
    }

    if (Object.keys(files).length > 0) {
      config.installed[item.name] = {
        from: item.registryVersion.toString(),
        files,
        dependsOn: item.registryDependencies,
      };
    }
  }

  writeConfig(cwd, config);

  if (missing.length > 0 && !options.skipInstall) {
    installDependencies(project.packageManager, cwd, missing);
  }

  logger.blank();
  logger.success(`Added ${items.map((item) => item.name).join(", ")}`);
  if (missing.length > 0) {
    logger.success(
      options.skipInstall
        ? `Install these yourself: ${missing.join(" ")}`
        : `Installed ${missing.join(", ")}`,
    );
  }
  logger.blank();
  logger.info(pc.dim("Files:"));
  for (const file of writable) logger.info(`  ${file.destination}`);
  if (unchanged.length > 0) {
    logger.info(pc.dim(`  (${String(unchanged.length)} already up to date)`));
  }
}
