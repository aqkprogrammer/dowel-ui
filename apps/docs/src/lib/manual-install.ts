import type { RegistryItem } from "@dowel-ui/registry";

import type { CodeLanguage } from "./highlight";
import { getRegistryItem, isLicensed } from "./registry";

/**
 * Everything `add` does, written out as steps someone can follow by hand.
 *
 * Built from the same registry bytes the CLI fetches: the npm packages, the
 * shared utilities and tokens `init` would have written, every component the
 * item imports — however deep — and the item's own files. The imports are
 * rewritten exactly as the CLI rewrites them for a project on its default
 * aliases, so what is copied from here compiles in a project set up the usual
 * way, and the last step says what to change if yours is not.
 */

export interface ManualFile {
  /** Where the file goes, relative to the alias root: `components/ui/button.tsx`. */
  path: string;
  language: CodeLanguage;
  code: string;
}

export interface ManualPart {
  name: string;
  title: string;
  files: ManualFile[];
}

export interface ManualInstall {
  /** Every npm package the item and everything it pulls in needs, utilities included. */
  dependencies: string[];
  /** The design tokens, for the stylesheet that imports Tailwind. */
  tokens: ManualFile;
  /** `cn()` and the shared style fragments, which every component imports. */
  utils: ManualFile[];
  /** Components this one imports, nearest first. */
  parts: ManualPart[];
  /** The item's own files. */
  files: ManualFile[];
}

/** Where each registry group lands under the CLI's default aliases. */
const DESTINATIONS: Record<string, string> = {
  ui: "components/ui",
  blocks: "components/blocks",
  lib: "lib",
  hooks: "hooks",
};

/**
 * The CLI's `rewriteImports`, for the default `components.json`.
 *
 * Only the aliases that differ from the published source change: `@/lib/*` and
 * `@/hooks/*` are already where a default project keeps them.
 */
export function rewriteForDefaults(content: string): string {
  return content
    .replace(
      /(["'])@\/components\/([^"']+)\1/g,
      (_match, quote: string, rest: string) => `${quote}@/components/ui/${rest}${quote}`,
    )
    .replace(
      /(["'])@\/blocks\/([^"']+)\1/g,
      (_match, quote: string, rest: string) => `${quote}@/components/blocks/${rest}${quote}`,
    );
}

function languageFor(path: string): CodeLanguage {
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".ts")) return "ts";
  return "tsx";
}

function toManualFile(file: RegistryItem["files"][number]): ManualFile {
  const [group, ...rest] = file.path.split("/");
  const directory = group ? DESTINATIONS[group] : undefined;
  return {
    path: directory ? `${directory}/${rest.join("/")}` : file.path,
    language: languageFor(file.path),
    code: rewriteForDefaults(file.content),
  };
}

/**
 * The manual steps for one item, or nothing for a licensed one: its source is
 * not public, and neither is anything a page could copy from it.
 */
export function manualInstallFor(item: RegistryItem): ManualInstall | undefined {
  if (isLicensed(item)) return undefined;

  // Breadth first, so the list reads nearest dependency first, and each item
  // once however many paths lead to it.
  const seen = new Set<string>([item.name]);
  const queue = [...item.registryDependencies];
  const parts: ManualPart[] = [];
  const dependencies = new Set<string>(item.dependencies);

  while (queue.length > 0) {
    const name = queue.shift();
    if (name === undefined || seen.has(name)) continue;
    seen.add(name);

    const dependency = getRegistryItem(name);
    // A free item never imports a licensed one; if it ever did, its page
    // could not hand over that source, so it says nothing rather than half.
    if (isLicensed(dependency)) return undefined;

    parts.push({
      name: dependency.name,
      title: dependency.title,
      files: dependency.files.map(toManualFile),
    });
    for (const pkg of dependency.dependencies) dependencies.add(pkg);
    queue.push(...dependency.registryDependencies);
  }

  const utils = getRegistryItem("utils");
  const theme = getRegistryItem("theme");
  for (const pkg of utils.dependencies) dependencies.add(pkg);

  const tokens = theme.files[0];
  if (!tokens) return undefined;

  return {
    dependencies: [...dependencies].sort(),
    tokens: { path: "app/globals.css", language: "css", code: tokens.content },
    utils: utils.files.map(toManualFile),
    parts,
    files: item.files.map(toManualFile),
  };
}
