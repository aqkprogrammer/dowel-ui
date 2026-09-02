import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".turbo",
  "storybook-static",
  ".next",
]);

const IGNORED_FILES = new Set(["pnpm-lock.yaml", "CHANGELOG.md"]);

/**
 * Text files that carry no extension.
 *
 * Without these the walker skips them silently, which is not hypothetical: the
 * LICENSE kept its placeholder copyright through a full rename because neither
 * `rebrand` nor `check-branding` could see it.
 */
const EXTENSIONLESS_TEXT_FILES = new Set([
  "LICENSE",
  "LICENCE",
  "NOTICE",
  "AUTHORS",
  "CONTRIBUTORS",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".md",
  ".mdx",
  ".yaml",
  ".yml",
  ".html",
]);

/** Every tracked, text-like file path, relative to `root`. */
export function walkTextFiles(root: string): string[] {
  const results: string[] = [];

  function visit(directory: string) {
    for (const entry of readdirSync(directory)) {
      const absolute = join(directory, entry);

      if (statSync(absolute).isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry)) visit(absolute);
        continue;
      }

      if (IGNORED_FILES.has(entry)) continue;

      if (EXTENSIONLESS_TEXT_FILES.has(entry)) {
        results.push(relative(root, absolute));
        continue;
      }

      // lastIndexOf returns -1 when there is no dot, and slice(-1) then yields
      // the final character — so "LICENSE" reported an extension of "E". Guard
      // the -1 rather than relying on the slice.
      const dot = entry.lastIndexOf(".");
      const extension = dot === -1 ? "" : entry.slice(dot);
      if (TEXT_EXTENSIONS.has(extension)) {
        results.push(relative(root, absolute));
      }
    }
  }

  visit(root);
  return results.sort();
}
