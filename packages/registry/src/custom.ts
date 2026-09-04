import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { hashContent } from "./hash";
import {
  REGISTRY_VERSION,
  registryAccessSchema,
  registryIndexSchema,
  registryItemSchema,
  registryItemTypeSchema,
  type RegistryFile,
  type RegistryFileType,
  type RegistryItem,
} from "./schema";

/**
 * Building a registry of your own components.
 *
 * The CLI has always been able to install from any registry — `--registry`
 * takes a URL or a directory — but producing one meant reimplementing this
 * package. So an organisation that wanted its own components installed the same
 * way had the consumer half and none of the producer half.
 *
 * The authoring shape is declared here rather than imported from the component
 * package, because the registry *is* the contract. A team publishing their own
 * components should not have to depend on somebody else's component library to
 * describe their own.
 */

/** Where an item's files are written in the consuming project. */
export const itemGroupSchema = z.enum(["ui", "blocks", "lib", "hooks"]);

export type ItemGroup = z.infer<typeof itemGroupSchema>;

const GROUP_FILE_TYPE: Record<ItemGroup, RegistryFileType> = {
  ui: "registry:ui",
  blocks: "registry:block",
  lib: "registry:lib",
  hooks: "registry:hook",
};

export const itemSourceSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  description: z.string().min(10),
  category: z.string().min(1),
  status: z.enum(["stable", "beta", "experimental"]).default("stable"),
  /** Where the files land. Defaults to `ui`. */
  group: itemGroupSchema.default("ui"),
  /** npm packages the source imports. */
  dependencies: z.array(z.string()).default([]),
  /** Other registry items this one imports, upstream ones included. */
  registryDependencies: z.array(z.string()).default([]),
  /** Files to publish, relative to the item's own directory. */
  files: z.array(z.string().min(1)).min(1),
  a11y: z.string().optional(),
  access: registryAccessSchema,
  /**
   * Overrides where the item's directory is, relative to the registry root.
   * Defaults to `<group>/<name>`, which is the layout this repository uses.
   */
  directory: z.string().optional(),
});

export type ItemSource = z.input<typeof itemSourceSchema>;

export const registryConfigSchema = z.object({
  /** Absolute path the item directories are resolved against. */
  root: z.string().min(1),
  items: z.array(itemSourceSchema).min(1),
  /**
   * A registry to layer on top of — a URL, or a directory on disk.
   *
   * The reason a private registry is worth having at all: one URL that serves
   * both the upstream components and yours, so a consumer configures one place
   * and `add` resolves across both.
   */
  extends: z.string().min(1).optional(),
  /** Written into the index, so a consumer can see what produced it. */
  generatedFrom: z.string().min(1).default("custom-registry"),
});

export type RegistryConfig = z.input<typeof registryConfigSchema>;

/** Identity helper, for editor autocomplete inside a config file. */
export function defineRegistryConfig(config: RegistryConfig): RegistryConfig {
  return config;
}

export interface BuildResult {
  items: RegistryItem[];
  /**
   * Names that exist upstream and were replaced by a local item.
   *
   * Reported rather than applied silently. Overriding upstream's Button is a
   * legitimate thing to want and a catastrophic thing to do by accident, and
   * the difference is entirely whether anyone was told.
   */
  overridden: string[];
  /** How many items came from upstream unchanged. */
  inherited: number;
}

/**
 * Every `@/...` import a source file makes, as `[group, rest]`.
 *
 * Published source is authored against the library's own aliases and rewritten
 * at install time to wherever the consuming project keeps things. Both checks
 * below depend on reading those imports.
 */
function authoredImports(content: string): { group: string; rest: string }[] {
  const found: { group: string; rest: string }[] = [];
  const pattern = /["']@\/(components|lib|hooks|blocks)\/([^"']+)["']/g;

  for (const match of content.matchAll(pattern)) {
    if (match[1] && match[2]) found.push({ group: match[1], rest: match[2] });
  }

  return found;
}

/**
 * Catches source written against the *installed* paths instead of the authored
 * ones.
 *
 * `@/components/ui/badge` looks right — it is where the file ends up — and
 * rewrites to `@/components/ui/ui/badge`, because the rewriter maps
 * `@/components/` to wherever the project keeps its components. The result
 * compiles nowhere and the doubled segment is easy to stare past. The authored
 * form is `@/components/badge`.
 */
function assertAuthoredPaths(name: string, content: string): void {
  const groups = new Set<string>(["ui", "blocks", "lib", "hooks"]);

  const mistaken = authoredImports(content)
    .filter((entry) => groups.has(entry.rest.split("/")[0] ?? ""))
    .map((entry) => `@/${entry.group}/${entry.rest}`);

  if (mistaken.length > 0) {
    throw new Error(
      `Item "${name}" imports from an installed path rather than an authored one:\n` +
        `  ${[...new Set(mistaken)].join("\n  ")}\n` +
        "Write `@/components/badge`, not `@/components/ui/badge` — the leading group is " +
        "rewritten to wherever the consuming project keeps its components, so naming it " +
        "twice produces a path that resolves nowhere.",
    );
  }
}

/**
 * Catches a component importing something it never declared.
 *
 * The undeclared dependency is not installed alongside it, so the install
 * succeeds and the project fails to build — in someone else's repository, where
 * it is hardest to trace back to here.
 */
function assertDeclaredDependencies(
  source: z.infer<typeof itemSourceSchema>,
  content: string,
): void {
  const declared = new Set([...source.registryDependencies, source.name]);

  const undeclared = authoredImports(content)
    .filter((entry) => entry.group === "components" || entry.group === "blocks")
    // `@/lib/utils` and `@/lib/styles` are written by `init`, so they are
    // present before any component is and are never declared.
    .map((entry) => entry.rest.split("/")[0] ?? "")
    .filter((imported) => imported.length > 0 && !declared.has(imported));

  if (undeclared.length > 0) {
    throw new Error(
      `Item "${source.name}" imports ${[...new Set(undeclared)].join(", ")} but does not ` +
        "list them in registryDependencies. They would not be installed alongside it, and " +
        "the failure would surface as a build error in the consuming project.",
    );
  }
}

function toItem(root: string, source: z.infer<typeof itemSourceSchema>): RegistryItem {
  const directory = source.directory ?? join(source.group, source.name);
  const itemDir = join(root, directory);

  const files: RegistryFile[] = source.files.map((file) => {
    const path = join(itemDir, file);
    if (!existsSync(path)) {
      throw new Error(
        `Item "${source.name}" lists ${file}, but ${path} does not exist. ` +
          "A registry that names a file it cannot read produces a broken install " +
          "in someone else's project, where it is hardest to diagnose.",
      );
    }

    const content = readFileSync(path, "utf8");
    assertAuthoredPaths(source.name, content);
    assertDeclaredDependencies(source, content);

    return {
      path: `${source.group}/${file}`,
      type: GROUP_FILE_TYPE[source.group],
      content,
      hash: hashContent(content),
    };
  });

  return registryItemSchema.parse({
    registryVersion: REGISTRY_VERSION,
    name: source.name,
    type: registryItemTypeSchema.parse(GROUP_FILE_TYPE[source.group]),
    title: source.title,
    description: source.description,
    category: source.category,
    status: source.status,
    dependencies: source.dependencies,
    registryDependencies: source.registryDependencies,
    files,
    a11y: source.a11y,
    access: source.access,
  });
}

async function readUpstream(base: string): Promise<RegistryItem[]> {
  const isHttp = base.startsWith("http://") || base.startsWith("https://");

  const load = async (file: string): Promise<unknown> => {
    if (!isHttp) {
      const root = base.startsWith("file:") ? fileURLToPath(base) : base;
      const path = join(root, file);
      if (!existsSync(path)) throw new Error(`Upstream registry has no ${file} at ${path}.`);
      return JSON.parse(readFileSync(path, "utf8"));
    }

    const url = `${base.replace(/\/$/, "")}/${file}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Upstream registry returned ${String(response.status)} for ${url}.`);
    }
    return await response.json();
  };

  const index = registryIndexSchema.parse(await load("index.json"));

  const items: RegistryItem[] = [];
  for (const entry of index.items) {
    // Licensed upstream items have no public body to inherit. They stay out of
    // the derived registry rather than appearing in it as something that cannot
    // be fetched, which would fail at install time instead of at build time.
    if (entry.access === "pro") continue;
    items.push(registryItemSchema.parse(await load(`${entry.name}.json`)));
  }

  return items;
}

/**
 * Every `registryDependencies` name must exist in the finished registry.
 *
 * Checked here, once, rather than discovered by a consumer whose `add` walks
 * into a name nothing serves. This is the single most common way a
 * hand-assembled registry is broken, and it is invisible until someone installs.
 */
export function assertResolvable(items: RegistryItem[]): void {
  const known = new Set(items.map((item) => item.name));
  const missing: string[] = [];

  for (const item of items) {
    for (const dependency of item.registryDependencies) {
      if (!known.has(dependency)) missing.push(`${item.name} → ${dependency}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `These registry dependencies are not in the registry:\n  ${missing.join("\n  ")}\n` +
        "Add them, or extend a registry that has them.",
    );
  }
}

export async function buildCustomRegistry(config: RegistryConfig): Promise<BuildResult> {
  const parsed = registryConfigSchema.parse(config);
  const local = parsed.items.map((item) => toItem(parsed.root, item));

  const duplicates = local
    .map((item) => item.name)
    .filter((name, index, all) => all.indexOf(name) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Declared more than once: ${[...new Set(duplicates)].join(", ")}.`);
  }

  if (!parsed.extends) {
    assertResolvable(local);
    return { items: local, overridden: [], inherited: 0 };
  }

  const upstream = await readUpstream(parsed.extends);
  const localNames = new Set(local.map((item) => item.name));
  const overridden = upstream
    .filter((item) => localNames.has(item.name))
    .map((item) => item.name);

  // Local wins. That is the point of extending rather than mirroring: an
  // organisation replaces the components it has opinions about and inherits the
  // rest.
  const inherited = upstream.filter((item) => !localNames.has(item.name));
  const items = [...inherited, ...local].sort((a, b) => a.name.localeCompare(b.name));

  assertResolvable(items);

  return { items, overridden, inherited: inherited.length };
}
