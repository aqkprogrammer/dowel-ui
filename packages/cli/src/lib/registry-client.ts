import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  registryIndexSchema,
  registryItemSchema,
  type RegistryIndex,
  type RegistryItem,
} from "@dowel-ui/registry";

import { CliError } from "./errors";

/**
 * Reads the registry over HTTP, or from a directory on disk.
 *
 * The local path form is not a testing shortcut bolted on afterwards — it is
 * how private forks and enterprise mirrors are meant to work, and it is what
 * lets the end-to-end tests run against a registry built in the same commit
 * rather than against whatever happens to be deployed.
 */
function isHttp(baseUrl: string): boolean {
  return baseUrl.startsWith("http://") || baseUrl.startsWith("https://");
}

function localPath(baseUrl: string, file: string): string {
  const root = baseUrl.startsWith("file:") ? fileURLToPath(baseUrl) : baseUrl;
  return join(root, file);
}

async function readJson(baseUrl: string, file: string, what: string): Promise<unknown> {
  if (!isHttp(baseUrl)) {
    const path = localPath(baseUrl, file);
    if (!existsSync(path)) {
      throw new CliError(`${what} not found at ${path}.`);
    }
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      throw new CliError(`${what} at ${path} is not valid JSON.`);
    }
  }

  const url = `${baseUrl.replace(/\/$/, "")}/${file}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new CliError(
      `Could not reach the registry at ${url}.`,
      cause instanceof Error ? cause.message : undefined,
    );
  }

  if (response.status === 404) {
    throw new CliError(`${what} not found in the registry.`);
  }
  if (!response.ok) {
    throw new CliError(`Registry returned ${String(response.status)} for ${url}.`);
  }

  try {
    return await response.json();
  } catch {
    throw new CliError(`${what} at ${url} is not valid JSON.`);
  }
}

export async function fetchIndex(baseUrl: string): Promise<RegistryIndex> {
  const raw = await readJson(baseUrl, "index.json", "Registry index");
  const parsed = registryIndexSchema.safeParse(raw);

  if (!parsed.success) {
    throw new CliError(
      "The registry index does not match the format this CLI understands.",
      "Update the CLI, or point --registry at a compatible registry.",
    );
  }

  return parsed.data;
}

export async function fetchItem(baseUrl: string, name: string): Promise<RegistryItem> {
  const raw = await readJson(baseUrl, `${name}.json`, `Component "${name}"`);
  const parsed = registryItemSchema.safeParse(raw);

  if (!parsed.success) {
    throw new CliError(
      `Registry entry "${name}" does not match the format this CLI understands.`,
      "Update the CLI, or point --registry at a compatible registry.",
    );
  }

  return parsed.data;
}

/**
 * Resolves items and everything they depend on, dependencies first.
 *
 * Depth-first post-order, so a component is always ordered after the things it
 * imports. A breadth-first walk reversed looks equivalent and is not: if two
 * requested items depend on each other's subtrees it produces the wrong order.
 * The visiting set makes a dependency cycle terminate rather than recurse
 * forever.
 */
export async function resolveItems(baseUrl: string, names: string[]): Promise<RegistryItem[]> {
  const cache = new Map<string, RegistryItem>();
  const ordered: RegistryItem[] = [];
  const placed = new Set<string>();
  const visiting = new Set<string>();

  async function load(name: string): Promise<RegistryItem> {
    const cached = cache.get(name);
    if (cached) return cached;

    const item = await fetchItem(baseUrl, name);
    cache.set(name, item);
    return item;
  }

  async function visit(name: string): Promise<void> {
    if (placed.has(name) || visiting.has(name)) return;
    visiting.add(name);

    const item = await load(name);
    for (const dependency of item.registryDependencies) {
      await visit(dependency);
    }

    visiting.delete(name);
    placed.add(name);
    ordered.push(item);
  }

  for (const name of names) {
    await visit(name);
  }

  return ordered;
}
