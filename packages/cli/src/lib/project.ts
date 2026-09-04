import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { CliError } from "./errors";

export type PackageManager = "pnpm" | "yarn" | "bun" | "npm";

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface ProjectInfo {
  root: string;
  packageManager: PackageManager;
  packageJson: PackageJson;
  isTypeScript: boolean;
  reactVersion: string | undefined;
  tailwindVersion: string | undefined;
  framework: "next" | "vite" | "remix" | "unknown";
  /** Project-relative path to the stylesheet that imports Tailwind, if found. */
  cssEntry: string | undefined;
  /** Alias prefix and base directory taken from tsconfig paths. */
  resolve: { prefix: string; base: string } | undefined;
}

const LOCKFILES: [string, PackageManager][] = [
  ["pnpm-lock.yaml", "pnpm"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

export function detectPackageManager(root: string): PackageManager {
  for (const [lockfile, manager] of LOCKFILES) {
    if (existsSync(join(root, lockfile))) return manager;
  }
  return "npm";
}

function readPackageJson(root: string): PackageJson {
  const path = join(root, "package.json");
  if (!existsSync(path)) {
    throw new CliError(
      `No package.json found in ${root}.`,
      "Run this from the root of your project.",
    );
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as PackageJson;
  } catch {
    throw new CliError("package.json is not valid JSON.");
  }
}

function versionOf(packageJson: PackageJson, name: string): string | undefined {
  return packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];
}

/** Leading integer of a range such as `^4.3.3`, `~4.0.0`, `4.x`. */
export function majorVersion(range: string | undefined): number | undefined {
  if (!range) return undefined;
  const match = /(\d+)/.exec(range);
  return match?.[1] === undefined ? undefined : Number(match[1]);
}

function detectFramework(packageJson: PackageJson): ProjectInfo["framework"] {
  if (versionOf(packageJson, "next")) return "next";
  if (versionOf(packageJson, "@remix-run/react") ?? versionOf(packageJson, "react-router")) {
    return "remix";
  }
  if (versionOf(packageJson, "vite")) return "vite";
  return "unknown";
}

/** Directories worth searching for the stylesheet, in the order projects use them. */
const CSS_SEARCH_DIRS = ["app", "src/app", "src/styles", "styles", "src", "."];

/**
 * Finds the stylesheet that pulls Tailwind in.
 *
 * Located by content rather than by name: `globals.css`, `index.css`,
 * `app.css` and `main.css` are all common, and guessing at the filename would
 * mean appending tokens to a stylesheet that is never loaded.
 */
export function findCssEntry(root: string): string | undefined {
  for (const dir of CSS_SEARCH_DIRS) {
    const absolute = join(root, dir);
    if (!existsSync(absolute) || !statSync(absolute).isDirectory()) continue;

    for (const entry of readdirSync(absolute)) {
      if (!entry.endsWith(".css")) continue;

      const path = join(absolute, entry);
      const content = readFileSync(path, "utf8");
      if (/@import\s+["']tailwindcss["']/.test(content) || /@tailwind\s+/.test(content)) {
        return dir === "." ? entry : `${dir}/${entry}`;
      }
    }
  }

  return undefined;
}

/**
 * Strips comments and trailing commas from JSON with extensions, without
 * touching what is inside a string.
 *
 * A regex cannot do this. `tsconfig.json` aliases are written `"@/*"`, which
 * contains `/*`, and the `include` globs are written `"**\/*.ts"`, which
 * contains `*\/` — so a naive block-comment regex treats everything between
 * them as a comment and eats the `paths` block. Every stock Next.js tsconfig
 * has both, which is exactly the project this tool is most often pointed at.
 * The parse then failed, `detectResolve` returned undefined, and `init`
 * either asked for an alias it could already see or, under `--yes`, refused.
 *
 * So this walks the text instead, and only treats `//` and `/*` as comments
 * when they are outside a string.
 */
export function stripJsonComments(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";
    const next = text[i + 1] ?? "";

    if (inString) {
      out += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }

    if (char === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 1;
      continue;
    }

    if (char === "/" && next === "/") {
      const end = text.indexOf("\n", i);
      if (end === -1) break;
      i = end - 1;
      continue;
    }

    out += char;
  }

  // Trailing commas are legal in tsconfig and not in JSON. Safe to do with a
  // regex now that no string can contain an unbalanced brace from a comment.
  return out.replace(/,(\s*[}\]])/g, "$1");
}

/**
 * Reads the first wildcard alias out of tsconfig paths.
 *
 * `"@/*": ["./src/*"]` becomes `{ prefix: "@/", base: "src" }`. Only the
 * wildcard form is understood, which covers how essentially every React project
 * is set up; anything else falls through to a prompt rather than a wrong guess.
 */
export function detectResolve(root: string): ProjectInfo["resolve"] {
  for (const file of ["tsconfig.json", "jsconfig.json"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;

    let parsed: { compilerOptions?: { paths?: Record<string, string[]> } };
    try {
      parsed = JSON.parse(stripJsonComments(readFileSync(path, "utf8"))) as typeof parsed;
    } catch {
      continue;
    }

    const paths = parsed.compilerOptions?.paths;
    if (!paths) continue;

    for (const [alias, targets] of Object.entries(paths)) {
      const target = targets[0];
      if (!alias.endsWith("/*") || target === undefined || !target.endsWith("/*")) continue;

      return {
        prefix: alias.slice(0, -1),
        base: target.slice(0, -2).replace(/^\.\//, "").replace(/\/$/, ""),
      };
    }
  }

  return undefined;
}

export function inspectProject(root: string): ProjectInfo {
  const packageJson = readPackageJson(root);

  return {
    root,
    packageManager: detectPackageManager(root),
    packageJson,
    isTypeScript: existsSync(join(root, "tsconfig.json")),
    reactVersion: versionOf(packageJson, "react"),
    tailwindVersion: versionOf(packageJson, "tailwindcss"),
    framework: detectFramework(packageJson),
    cssEntry: findCssEntry(root),
    resolve: detectResolve(root),
  };
}

/**
 * Refuses to proceed on a project this version cannot support correctly.
 *
 * Every check here fails loudly on purpose. Writing v4 token syntax into a v3
 * project, or TypeScript source into a JavaScript one, produces a project that
 * does not build — and the person debugging it has no reason to suspect the
 * install rather than their own code.
 */
export function assertSupported(project: ProjectInfo): void {
  if (!project.reactVersion) {
    throw new CliError(
      "This does not look like a React project — react is not in package.json.",
      "Run this from the root of a React application.",
    );
  }

  if (!project.isTypeScript) {
    throw new CliError(
      "JavaScript projects are not supported yet.",
      "The published components are TypeScript. Add a tsconfig.json, or wait for JS output in a future release.",
    );
  }

  const tailwindMajor = majorVersion(project.tailwindVersion);

  if (tailwindMajor === undefined) {
    throw new CliError(
      "Tailwind CSS is not installed.",
      "Install tailwindcss v4 and its plugin for your bundler, then run init again.",
    );
  }

  if (tailwindMajor < 4) {
    throw new CliError(
      `Tailwind CSS v${String(tailwindMajor)} is not supported — v4 or later is required.`,
      "The design tokens are defined with @theme, which v3 cannot parse. Upgrade to Tailwind v4 first.",
    );
  }
}
