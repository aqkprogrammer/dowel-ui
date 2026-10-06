import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { REGISTRY_DIR, UI_PACKAGE_JSON } from "./paths";

/**
 * The registry this commit built, read the way the CLI reads it.
 *
 * Only the fields the harness uses are validated; the registry's own schema is
 * the authority on the rest.
 */

const indexSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      access: z.string().optional(),
      dependencies: z.array(z.string()).default([]),
      registryDependencies: z.array(z.string()).default([]),
    }),
  ),
});

const itemSchema = z.object({
  name: z.string(),
  files: z.array(z.object({ path: z.string() })).default([]),
});

export interface RegistryItemSummary {
  name: string;
  type: string;
  access: string;
  dependencies: string[];
  registryDependencies: string[];
}

export interface Registry {
  dir: string;
  items: Map<string, RegistryItemSummary>;
  /**
   * Which item installs each module, keyed `ui/<file>` or `blocks/<file>` with
   * no extension: what an import of `@/components/ui/<file>` names.
   *
   * Keyed by file rather than item because an item can install several
   * (`input` writes `floating-label-input.tsx` too), and importing one of those
   * is using the registry, not inventing a component.
   */
  modules: Map<string, string[]>;
}

const cache = new Map<string, Registry>();

export function loadRegistry(dir: string = REGISTRY_DIR): Registry {
  const cached = cache.get(dir);
  if (cached) return cached;

  const index = indexSchema.parse(JSON.parse(readFileSync(join(dir, "index.json"), "utf8")));
  const items = new Map<string, RegistryItemSummary>();
  const modules = new Map<string, string[]>();

  const addModule = (key: string, name: string): void => {
    const owners = modules.get(key) ?? [];
    if (!owners.includes(name)) owners.push(name);
    modules.set(key, owners);
  };

  for (const entry of index.items) {
    items.set(entry.name, {
      name: entry.name,
      type: entry.type,
      access: entry.access ?? "free",
      dependencies: entry.dependencies,
      registryDependencies: entry.registryDependencies,
    });

    const file = join(dir, `${entry.name}.json`);
    if (existsSync(file)) {
      const item = itemSchema.parse(JSON.parse(readFileSync(file, "utf8")));
      for (const { path } of item.files) {
        const [root, ...rest] = path.split("/");
        if ((root === "ui" || root === "blocks") && rest.length > 0) {
          addModule(`${root}/${rest.join("/").replace(/\.[jt]sx?$/, "")}`, entry.name);
        }
      }
    } else {
      // Licensed items are listed in the public index but their bodies are not
      // published, so their file names are unknown here. A block installs one
      // file named after itself, which is the import an agent would write.
      addModule(
        `${entry.type === "registry:block" ? "blocks" : "ui"}/${entry.name}`,
        entry.name,
      );
    }
  }

  const registry: Registry = { dir, items, modules };
  cache.set(dir, registry);
  return registry;
}

/** The items these names install, themselves included. */
export function withDependencies(registry: Registry, names: Iterable<string>): Set<string> {
  const seen = new Set<string>();
  const queue = [...names];
  while (queue.length > 0) {
    const name = queue.pop()!;
    if (seen.has(name)) continue;
    seen.add(name);
    queue.push(...(registry.items.get(name)?.registryDependencies ?? []));
  }
  return seen;
}

/**
 * Exact versions for the npm packages installed components import.
 *
 * The registry lists dependencies by bare name, and `add` installs whatever is
 * latest the day it runs. That is right for a person and wrong for a
 * benchmark: two runs a month apart would typecheck against different
 * releases. These are the versions `packages/ui` is built and tested with in
 * this commit.
 */
export function pinnedVersions(): Record<string, string> {
  const pkg = JSON.parse(readFileSync(UI_PACKAGE_JSON, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return { ...pkg.devDependencies, ...pkg.dependencies };
}
