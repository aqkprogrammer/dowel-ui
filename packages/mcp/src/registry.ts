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
export class RegistryClient {
  readonly baseUrl: string;
  #index: Promise<RegistryIndex> | undefined;
  readonly #items = new Map<string, Promise<RegistryItem>>();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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
    const response = await fetch(url);
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
