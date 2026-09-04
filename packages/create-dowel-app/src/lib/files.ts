import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

/**
 * Placeholders substituted into template files.
 *
 * Written as `__NAME__` rather than as a template syntax so every template file
 * stays valid TypeScript, valid JSON and valid CSS. A template you cannot
 * typecheck is a template that ships broken, and the only way to find out is to
 * generate from it.
 */
export type Replacements = Record<string, string>;

/** Files npm will not publish under their real name. */
const RENAME_ON_COPY: Record<string, string> = {
  gitignore: ".gitignore",
  npmrc: ".npmrc",
  "env.example": ".env.example",
};

/** Extensions worth substituting into. Anything else is copied byte for byte. */
const TEXT_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".json", ".css", ".md", ".txt"];

function isText(path: string): boolean {
  return TEXT_EXTENSIONS.some((extension) => path.endsWith(extension)) || !path.includes(".");
}

export function substitute(content: string, replacements: Replacements): string {
  let result = content;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(`__${key}__`, value);
  }
  return result;
}

/**
 * Copies one template layer over a destination, substituting as it goes.
 *
 * Layers are applied in order and a later one overwrites an earlier one, which
 * is how `saas` replaces the base landing page without the base having to know
 * that anything might.
 */
export function copyLayer(from: string, to: string, replacements: Replacements): string[] {
  const written: string[] = [];

  const walk = (source: string, target: string, prefix: string): void => {
    mkdirSync(target, { recursive: true });

    for (const entry of readdirSync(source, { withFileTypes: true })) {
      const name = RENAME_ON_COPY[entry.name] ?? entry.name;
      const sourcePath = join(source, entry.name);
      const targetPath = join(target, name);
      const relative = prefix ? `${prefix}/${name}` : name;

      if (entry.isDirectory()) {
        walk(sourcePath, targetPath, relative);
        continue;
      }

      if (isText(sourcePath)) {
        writeFileSync(targetPath, substitute(readFileSync(sourcePath, "utf8"), replacements));
      } else {
        cpSync(sourcePath, targetPath);
      }

      written.push(relative);
    }
  };

  walk(from, to, "");
  return written;
}

/** True when the directory does not exist, or exists and holds nothing. */
export function isEmptyDirectory(path: string): boolean {
  if (!existsSync(path)) return true;
  if (!statSync(path).isDirectory()) return false;
  return readdirSync(path).length === 0;
}

export { renameSync };
