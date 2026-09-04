import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { blockMetas, componentMetas, type ComponentMeta } from "@dowel-ui/react/registry";

import { hashContent } from "./hash";
import {
  REGISTRY_VERSION,
  registryIndexSchema,
  registryItemSchema,
  type RegistryFile,
  type RegistryIndexEntry,
  type RegistryItem,
} from "./schema";

/**
 * Emits the public registry.
 *
 * Everything the CLI installs originates here, from the same source files the
 * library itself builds and tests. There is no second copy of a component to
 * drift out of sync.
 */

const here = dirname(fileURLToPath(import.meta.url));
const uiSrc = join(here, "..", "..", "ui", "src");
const themesSrc = join(here, "..", "..", "themes", "src");
const uiPackageJson = JSON.parse(
  readFileSync(join(here, "..", "..", "ui", "package.json"), "utf8"),
) as { name: string; version: string };

function read(path: string): string {
  return readFileSync(path, "utf8");
}

/**
 * Turns a meta into a registry item.
 *
 * Components and blocks differ only in where their source lives and where it is
 * installed, so one function covers both rather than two that drift.
 */
function buildSourceItem(meta: ComponentMeta): RegistryItem {
  const isBlock = meta.kind === "block";
  const sourceDir = join(uiSrc, isBlock ? "blocks" : "components", meta.name);
  const group = isBlock ? "blocks" : "ui";
  const fileType = isBlock ? "registry:block" : "registry:ui";

  const files: RegistryFile[] = meta.files.map((file) => {
    const content = read(join(sourceDir, file));
    return {
      path: `${group}/${file}`,
      type: fileType,
      content,
      hash: hashContent(content),
    };
  });

  return registryItemSchema.parse({
    $schema: "./schema/registry-item.json",
    registryVersion: REGISTRY_VERSION,
    name: meta.name,
    type: fileType,
    title: meta.title,
    description: meta.description,
    category: meta.category,
    status: meta.status,
    dependencies: meta.dependencies,
    registryDependencies: meta.registryDependencies,
    files,
    a11y: meta.a11y,
    access: meta.access ?? "free",
  });
}

/**
 * The utilities every component imports.
 *
 * Written by `init` rather than by `add`, because a project needs them before
 * the first component and every component assumes they are present.
 */
function buildUtilsItem(): RegistryItem {
  const files: RegistryFile[] = (["utils.ts", "styles.ts"] as const).map((file) => {
    const content = read(join(uiSrc, "lib", file));
    return {
      path: `lib/${file}`,
      type: "registry:lib",
      content,
      hash: hashContent(content),
    };
  });

  return registryItemSchema.parse({
    registryVersion: REGISTRY_VERSION,
    name: "utils",
    type: "registry:lib",
    title: "Utilities",
    description:
      "The cn() class merger and the shared interaction-state fragments every component uses.",
    category: "foundation",
    status: "stable",
    dependencies: ["clsx", "tailwind-merge"],
    registryDependencies: [],
    files,
  });
}

/**
 * The design tokens, as CSS to append to the project stylesheet.
 *
 * Appended rather than imported from a package: a consumer who cannot edit the
 * tokens does not really own their design system, which is the whole premise.
 */
function buildThemeItem(): RegistryItem {
  const content = [
    "/* Design tokens. Safe to edit — this is your copy. */",
    read(join(themesSrc, "tokens.css")),
    read(join(themesSrc, "base.css")),
  ].join("\n\n");

  return registryItemSchema.parse({
    registryVersion: REGISTRY_VERSION,
    name: "theme",
    type: "registry:theme",
    title: "Theme",
    description:
      "Design tokens: colour, radius, typography, elevation and motion, in light and dark.",
    category: "foundation",
    status: "stable",
    dependencies: [],
    registryDependencies: [],
    files: [
      {
        path: "theme.css",
        type: "registry:style",
        content,
        hash: hashContent(content),
      },
    ],
  });
}

export function buildRegistry(): RegistryItem[] {
  return [
    buildUtilsItem(),
    buildThemeItem(),
    ...componentMetas.map(buildSourceItem),
    ...blockMetas.map(buildSourceItem),
  ];
}

/** Items whose source anyone may fetch. */
export function freeItems(items: RegistryItem[]): RegistryItem[] {
  return items.filter((item) => item.access !== "pro");
}

/** Items whose source requires a licence. */
export function proItems(items: RegistryItem[]): RegistryItem[] {
  return items.filter((item) => item.access === "pro");
}

export function buildIndex(items: RegistryItem[]) {
  const entries: RegistryIndexEntry[] = items.map((item) => ({
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    category: item.category,
    status: item.status,
    dependencies: item.dependencies,
    registryDependencies: item.registryDependencies,
    access: item.access,
    fileCount: item.files.length,
  }));

  return registryIndexSchema.parse({
    $schema: "./schema/registry-index.json",
    registryVersion: REGISTRY_VERSION,
    // The package version, not a timestamp: the same source must always produce
    // byte-identical output, or every build shows as a change.
    generatedFrom: `${uiPackageJson.name}@${uiPackageJson.version}`,
    items: entries,
  });
}

export interface WriteResult {
  items: number;
  files: number;
  /** Items whose body was withheld from the public directory. */
  licensed: number;
}

/**
 * Writes the public registry.
 *
 * The index lists everything, including licensed items — that is the catalogue,
 * and an item nobody can see is an item nobody buys. What it does *not* write is
 * a licensed item's body: those files never touch the directory a CDN serves,
 * because a paywall that can be stepped around by fetching the JSON directly is
 * not a paywall. Their bodies go to `writeLicensedModule` instead, behind a
 * request the server can refuse.
 */
export function writeRegistry(outDir: string): WriteResult {
  const items = buildRegistry();
  const index = buildIndex(items);
  const free = freeItems(items);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  for (const item of free) {
    writeFileSync(join(outDir, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`);
  }

  return {
    items: items.length,
    files: free.reduce((total, item) => total + item.files.length, 0),
    licensed: items.length - free.length,
  };
}

/**
 * Writes the licensed item bodies as a TypeScript module.
 *
 * A module rather than a directory of JSON, because the server that serves
 * these runs on a platform that traces imports to decide what to deploy. A file
 * read at runtime from a path the bundler never saw is a file that is not there
 * in production — and the failure appears only once someone with a valid
 * licence tries to install something.
 */
export function writeLicensedModule(outFile: string): number {
  const licensed = proItems(buildRegistry());
  const byName = Object.fromEntries(licensed.map((item) => [item.name, item]));

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(
    outFile,
    `// Generated by @dowel-ui/registry. Do not edit.
//
// The bodies of licensed registry items. Imported by the route that serves them
// so the platform's dependency tracing includes them in the deployment; they are
// deliberately absent from the public registry directory.
import type { RegistryItem } from "@dowel-ui/registry";

export const licensedItems: Record<string, RegistryItem> = ${JSON.stringify(byName, null, 2)};
`,
  );

  return licensed.length;
}

// Run directly: `tsx src/build.ts [--out <dir>]`
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const outIndex = process.argv.indexOf("--out");
  const outDir =
    outIndex === -1
      ? join(here, "..", "r")
      : (process.argv[outIndex + 1] ?? join(here, "..", "r"));

  const result = writeRegistry(outDir);
  console.log(
    `Registry written to ${outDir}: ${String(result.items)} items, ${String(result.files)} files` +
      (result.licensed > 0 ? `, ${String(result.licensed)} licensed item(s) withheld.` : "."),
  );
}
