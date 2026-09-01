import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Scratch projects for the end-to-end tests.
 *
 * Real directories on disk with a real package.json, tsconfig and stylesheet,
 * because the whole job of this CLI is reading and writing someone else's
 * project. A mocked filesystem would test the mock.
 */

const here = dirname(fileURLToPath(import.meta.url));

/** The registry emitted by `@dowel/registry`'s build, in this same commit. */
export const LOCAL_REGISTRY = join(here, "..", "..", "registry", "r");

export interface FixtureOptions {
  /** Alias prefix in tsconfig paths. */
  prefix?: string;
  /** Directory the alias points at. */
  base?: string;
  packageManager?: "pnpm" | "npm" | "yarn" | "bun";
  tailwind?: string | null;
  typescript?: boolean;
  react?: string | null;
  cssPath?: string;
  cssContent?: string;
}

const LOCKFILE: Record<NonNullable<FixtureOptions["packageManager"]>, string> = {
  pnpm: "pnpm-lock.yaml",
  npm: "package-lock.json",
  yarn: "yarn.lock",
  bun: "bun.lock",
};

export function createProject(options: FixtureOptions = {}): string {
  const {
    prefix = "@/",
    base = "src",
    packageManager = "pnpm",
    tailwind = "^4.3.3",
    typescript = true,
    react = "^19.2.8",
    cssPath = "src/index.css",
    cssContent = '@import "tailwindcss";\n\nbody {\n  margin: 0;\n}\n',
  } = options;

  const root = mkdtempSync(join(tmpdir(), "dowel-fixture-"));

  const dependencies: Record<string, string> = {};
  if (react) dependencies.react = react;
  if (react) dependencies["react-dom"] = react;
  const devDependencies: Record<string, string> = {};
  if (tailwind) devDependencies.tailwindcss = tailwind;

  writeFileSync(
    join(root, "package.json"),
    `${JSON.stringify({ name: "fixture", private: true, dependencies, devDependencies }, null, 2)}\n`,
  );

  writeFileSync(join(root, LOCKFILE[packageManager]), "");

  if (typescript) {
    writeFileSync(
      join(root, "tsconfig.json"),
      `${JSON.stringify(
        {
          compilerOptions: {
            // Comments and a trailing comma below are deliberate: real tsconfigs
            // have them, and the detector has to cope.
            jsx: "react-jsx",
            paths: { [`${prefix}*`]: [`./${base ? `${base}/` : ""}*`] },
          },
        },
        null,
        2,
      )}\n`,
    );
  }

  const cssAbsolute = join(root, cssPath);
  mkdirSync(dirname(cssAbsolute), { recursive: true });
  writeFileSync(cssAbsolute, cssContent);

  return root;
}
