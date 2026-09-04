import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  registryIndexSchema,
  registryItemSchema,
  type RegistryIndex,
  type RegistryItem,
} from "@dowel-ui/registry";

import { readToken } from "./auth";
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

/**
 * How a licensed item is requested.
 *
 * A separate path rather than a header on the normal one, because the free
 * items are static files on a CDN: there is no server in front of them to read
 * a header, and there should not be. Everything that needs a decision made
 * about it goes somewhere a decision can be made.
 */
function licensedPath(name: string): string {
  return `pro/${name}.json`;
}

async function readJson(
  baseUrl: string,
  file: string,
  what: string,
  options: { authenticated?: boolean } = {},
): Promise<unknown> {
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
  const credentials = options.authenticated ? readToken() : undefined;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: credentials ? { authorization: `Bearer ${credentials.token}` } : undefined,
    });
  } catch (cause) {
    throw new CliError(
      `Could not reach the registry at ${url}.`,
      cause instanceof Error ? cause.message : undefined,
    );
  }

  if (response.status === 404) {
    throw new CliError(`${what} not found in the registry.`);
  }

  // Each of these is a different problem with a different fix, and collapsing
  // them into "request failed" leaves someone guessing which one they have.
  if (response.status === 401) {
    throw new CliError(
      `${what} needs a licence, and this machine is not signed in.`,
      "Run `login` with your licence key, or set DOWEL_TOKEN for CI.",
    );
  }
  if (response.status === 403) {
    throw new CliError(
      `${what} is not included in your plan.`,
      "Check what your licence covers, or upgrade.",
    );
  }
  if (response.status === 402) {
    throw new CliError(
      `The licence for ${what} is no longer active.`,
      "Renew it, or run `logout` if you are signing in with a different one.",
    );
  }
  if (response.status === 429) {
    throw new CliError(
      "The registry is rate limiting this machine.",
      "Wait a moment and try again.",
    );
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

export interface FetchItemOptions {
  /**
   * Fetch from the licensed path, sending credentials.
   *
   * Decided by the caller from the index rather than by trying the public path
   * and falling back: a fallback turns "you are not signed in" into "not
   * found", which is the least useful thing it could say.
   */
  licensed?: boolean;
}

export async function fetchItem(
  baseUrl: string,
  name: string,
  options: FetchItemOptions = {},
): Promise<RegistryItem> {
  const file = options.licensed ? licensedPath(name) : `${name}.json`;
  const raw = await readJson(baseUrl, file, `Component "${name}"`, {
    authenticated: options.licensed,
  });
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
export async function resolveItems(
  baseUrl: string,
  names: string[],
  /** Names the index says are licensed. Anything absent is fetched publicly. */
  licensed: ReadonlySet<string> = new Set(),
): Promise<RegistryItem[]> {
  const cache = new Map<string, RegistryItem>();
  const ordered: RegistryItem[] = [];
  const placed = new Set<string>();
  const visiting = new Set<string>();

  async function load(name: string): Promise<RegistryItem> {
    const cached = cache.get(name);
    if (cached) return cached;

    const item = await fetchItem(baseUrl, name, { licensed: licensed.has(name) });
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
