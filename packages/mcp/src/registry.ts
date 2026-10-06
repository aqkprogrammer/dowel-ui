import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  registryIndexSchema,
  registryItemNameSchema,
  registryItemSchema,
  type RegistryIndex,
  type RegistryIndexEntry,
  type RegistryItem,
} from "@dowel-ui/registry";

/**
 * Reads the registry over HTTP, or from a directory on disk.
 *
 * A deliberate copy of the CLI's client rather than a shared module: this
 * process is long-lived and answers many questions about the same registry, so
 * it caches, while the CLI runs once and does not. Sharing the code would mean
 * one of the two carrying machinery it does not want.
 */
/**
 * The key for a private registry, from the environment.
 *
 * The same pair the CLI reads in CI: `DOWEL_TOKEN`, and `DOWEL_TOKEN_REGISTRY`
 * naming the registry it belongs to. Returned only when that registry is this
 * one, over HTTPS or to this machine, so a key configured for one registry is
 * never sent to another.
 */
export function keyFor(
  baseUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const token = env.DOWEL_TOKEN?.trim();
  const owner = env.DOWEL_TOKEN_REGISTRY?.trim();
  if (!token || !owner) return undefined;
  let target: URL;
  try {
    target = new URL(baseUrl);
    if (new URL(owner).origin !== target.origin) return undefined;
  } catch {
    return undefined;
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
  return target.protocol === "https:" || (target.protocol === "http:" && loopback)
    ? token
    : undefined;
}

export class RegistryClient {
  readonly baseUrl: string;
  readonly #key: string | undefined;
  #index: Promise<RegistryIndex> | undefined;
  readonly #items = new Map<string, Promise<RegistryItem>>();

  constructor(baseUrl: string, env: NodeJS.ProcessEnv = process.env) {
    this.baseUrl = baseUrl;
    this.#key = keyFor(baseUrl, env);
  }

  get #isHttp(): boolean {
    return this.baseUrl.startsWith("http://") || this.baseUrl.startsWith("https://");
  }

  async #readJson(file: string): Promise<unknown> {
    if (!this.#isHttp) {
      const root = this.baseUrl.startsWith("file:")
        ? fileURLToPath(this.baseUrl)
        : this.baseUrl;
      const path = join(root, file);
      if (!existsSync(path)) throw new Error(`Not found in the registry: ${file}`);
      return JSON.parse(readFileSync(path, "utf8"));
    }

    const url = `${this.baseUrl.replace(/\/$/, "")}/${file}`;
    let response = await fetch(url);
    // A private registry answers 401; the key goes only in reply to that, so
    // a public registry never receives it.
    if (response.status === 401 && this.#key !== undefined) {
      response = await fetch(url, { headers: { authorization: `Bearer ${this.#key}` } });
    }
    if (response.status === 401) {
      throw new Error(
        `The registry at ${this.baseUrl} requires a key. Set DOWEL_TOKEN, and DOWEL_TOKEN_REGISTRY=${this.baseUrl}, in this server's environment.`,
      );
    }
    if (response.status === 404) throw new Error(`Not found in the registry: ${file}`);
    if (!response.ok) {
      throw new Error(`Registry returned ${String(response.status)} for ${url}`);
    }
    return await response.json();
  }

  /**
   * Cached for the life of the process.
   *
   * The registry is immutable for a given release, and an agent asks about it
   * dozens of times in a session; refetching would add latency to every tool
   * call for data that cannot have changed.
   */
  index(): Promise<RegistryIndex> {
    this.#index ??= this.#readJson("index.json").then((raw) => {
      const parsed = registryIndexSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          "The registry index does not match the format this server understands. " +
            "Update @dowel-ui/mcp, or point it at a compatible registry.",
        );
      }
      return parsed.data;
    });
    return this.#index;
  }

  item(name: string): Promise<RegistryItem> {
    // The name becomes a file path or a URL segment a few lines further down,
    // so it is checked here, where it stops being a string and starts being an
    // address. "../../etc/passwd" is not a component, and a tool that forgot to
    // look the name up in the index first must not be able to read it as one.
    if (!registryItemNameSchema.safeParse(name).success) {
      return Promise.reject(new Error(`"${name}" is not a registry item name.`));
    }

    let cached = this.#items.get(name);
    if (!cached) {
      cached = this.#readJson(`${name}.json`).then((raw) => {
        const parsed = registryItemSchema.safeParse(raw);
        if (!parsed.success) {
          throw new Error(`Registry entry "${name}" is malformed.`);
        }
        return parsed.data;
      });
      // A rejected promise must not be cached, or one network blip poisons the
      // name for the rest of the session.
      cached.catch(() => this.#items.delete(name));
      this.#items.set(name, cached);
    }
    return cached;
  }

  /**
   * Items and everything they depend on, dependencies first — from the index.
   *
   * The index alone, not the item bodies: it already carries every entry's
   * registry and npm dependencies, and a licensed item has no public body to
   * fetch. Walking the bodies made a Pro item read as "not found" when the
   * truth is that it exists and needs a licence. A name missing from the index
   * is an error here rather than a request for a file that is not there.
   */
  async resolve(names: string[]): Promise<RegistryIndexEntry[]> {
    const index = await this.index();
    const byName = new Map(index.items.map((entry) => [entry.name, entry]));
    const ordered: RegistryIndexEntry[] = [];
    const placed = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string, requiredBy?: string): void => {
      if (placed.has(name) || visiting.has(name)) return;

      const entry = byName.get(name);
      if (!entry) {
        throw new Error(
          requiredBy === undefined
            ? `"${name}" is not in the registry index.`
            : `"${requiredBy}" depends on "${name}", which is not in the registry index.`,
        );
      }

      visiting.add(name);
      for (const dependency of entry.registryDependencies) visit(dependency, name);
      visiting.delete(name);
      placed.add(name);
      ordered.push(entry);
    };

    for (const name of names) visit(name);
    return ordered;
  }
}
