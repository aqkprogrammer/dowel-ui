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

      const extension = entry.slice(entry.lastIndexOf("."));
      if (TEXT_EXTENSIONS.has(extension)) {
        results.push(relative(root, absolute));
      }
    }
  }

  visit(root);
  return results.sort();
}
