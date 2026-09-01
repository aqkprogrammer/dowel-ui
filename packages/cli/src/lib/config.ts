import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import { CliError } from "./errors";

export const CONFIG_FILE = "components.json";

/**
 * How the CLI turns an import alias into a directory.
 *
 * Stored as a prefix/base pair taken from the project's tsconfig paths, rather
 * than as absolute directories, so the config stays readable and survives the
 * project being moved or checked out somewhere else.
 */
export const resolveSchema = z.object({
  /** Alias prefix, e.g. "@/" for `"@/*": ["./src/*"]`. */
  prefix: z.string().min(1),
  /** Directory the prefix maps to, relative to the project root, e.g. "src". */
  base: z.string(),
});

export const aliasesSchema = z.object({
  components: z.string().min(1),
  ui: z.string().min(1),
  lib: z.string().min(1),
  hooks: z.string().min(1),
  utils: z.string().min(1),
  /**
   * Where blocks are installed.
   *
   * Optional so a components.json written before blocks existed still parses;
   * `blocksAlias()` derives a sensible default from `components` when it is
   * absent. Silently failing to install a block would be worse than either.
   */
  blocks: z.string().min(1).optional(),
});

export const installedItemSchema = z.object({
  /** Registry version the item was installed from. */
  from: z.string(),
  /** Project-relative file path to the hash of the content we wrote. */
  files: z.record(z.string(), z.string()),
  /**
   * Registry entries this one imports.
   *
   * Recorded so `remove` can refuse to delete something another installed
   * component still needs, without having to reach the registry to find out.
   * Optional, because installs made before this existed have no record of it.
   */
  dependsOn: z.array(z.string()).optional(),
});

export const configSchema = z.object({
  $schema: z.string().optional(),
  version: z.literal(1),
  typescript: z.boolean(),
  registry: z.string().min(1),
  tailwind: z.object({
    /** Project-relative path to the stylesheet that imports Tailwind. */
    css: z.string().min(1),
  }),
  aliases: aliasesSchema,
  resolve: resolveSchema,
  /**
   * What has been installed, and the hash of what was written.
   *
   * This is what lets `update` tell an untouched file from one the user has
   * edited. It has to be recorded at install time — an install that skipped it
   * leaves no way to ever know what it originally wrote.
   */
  installed: z.record(z.string(), installedItemSchema).default({}),
});

export type Config = z.infer<typeof configSchema>;
export type Aliases = z.infer<typeof aliasesSchema>;

/** The blocks alias, or a default derived from where components live. */
export function blocksAlias(config: Config): string {
  return config.aliases.blocks ?? `${config.aliases.components}/blocks`;
}

export function configPath(cwd: string): string {
  return join(cwd, CONFIG_FILE);
}

export function configExists(cwd: string): boolean {
  return existsSync(configPath(cwd));
}

export function readConfig(cwd: string): Config {
  const path = configPath(cwd);

  if (!existsSync(path)) {
    throw new CliError(
      `No ${CONFIG_FILE} found in ${cwd}.`,
      "Run `init` first to set the project up.",
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new CliError(`${CONFIG_FILE} is not valid JSON.`);
  }

  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new CliError(`${CONFIG_FILE} is not valid:\n${issues}`);
  }

  return parsed.data;
}

export function writeConfig(cwd: string, config: Config): void {
  writeFileSync(configPath(cwd), `${JSON.stringify(config, null, 2)}\n`);
}
