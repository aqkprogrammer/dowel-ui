import { join } from "node:path";

import { blocksAlias, type Config } from "./config";
import { CliError } from "./errors";

/**
 * Maps a registry file path to a destination in the project.
 *
 * The registry publishes logical paths — `ui/button.tsx`, `lib/utils.ts` —
 * because it has never seen the project it is being installed into. The leading
 * segment selects which alias the file belongs under, and the alias is resolved
 * through the project's own tsconfig prefix.
 */
export function resolveDestination(config: Config, registryPath: string): string {
  const [group, ...rest] = registryPath.split("/");
  const relative = rest.join("/");

  if (!group || relative === "") {
    throw new CliError(`Registry path "${registryPath}" is not in a recognised group.`);
  }

  const alias =
    group === "ui"
      ? config.aliases.ui
      : group === "lib"
        ? config.aliases.lib
        : group === "hooks"
          ? config.aliases.hooks
          : group === "blocks"
            ? blocksAlias(config)
            : undefined;

  if (!alias) {
    throw new CliError(
      `Registry path "${registryPath}" uses unknown group "${group}".`,
      "This usually means the CLI is older than the registry it is reading.",
    );
  }

  return join(aliasToDirectory(config, alias), relative);
}

/** Turns an import alias such as `@/components/ui` into `src/components/ui`. */
export function aliasToDirectory(config: Config, alias: string): string {
  const { prefix, base } = config.resolve;

  if (!alias.startsWith(prefix)) {
    throw new CliError(
      `Alias "${alias}" does not start with the configured prefix "${prefix}".`,
      `Check the "aliases" and "resolve" entries in components.json.`,
    );
  }

  const withoutPrefix = alias.slice(prefix.length);
  return base ? join(base, withoutPrefix) : withoutPrefix;
}

/**
 * Rewrites the library's own import aliases to the ones the project uses.
 *
 * The published source is written against `@/components/*` and `@/lib/*`. A
 * project that puts its components somewhere else, or uses `~/` instead of
 * `@/`, gets files that import from where they actually live. Getting this
 * wrong is the single most common way a source-first install produces code that
 * does not compile.
 */
export function rewriteImports(content: string, config: Config): string {
  const { aliases } = config;

  return content
    .replace(
      /(["'])@\/lib\/utils\1/g,
      (_match, quote: string) => `${quote}${aliases.utils}${quote}`,
    )
    .replace(
      /(["'])@\/lib\/([^"']+)\1/g,
      (_match, quote: string, rest: string) => `${quote}${aliases.lib}/${rest}${quote}`,
    )
    .replace(
      /(["'])@\/components\/([^"']+)\1/g,
      (_match, quote: string, rest: string) => `${quote}${aliases.ui}/${rest}${quote}`,
    )
    .replace(
      /(["'])@\/hooks\/([^"']+)\1/g,
      (_match, quote: string, rest: string) => `${quote}${aliases.hooks}/${rest}${quote}`,
    )
    .replace(
      /(["'])@\/blocks\/([^"']+)\1/g,
      (_match, quote: string, rest: string) => `${quote}${blocksAlias(config)}/${rest}${quote}`,
    );
}
