import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  registryIndexSchema,
  registryItemSchema,
  type RegistryIndex,
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

  /** Items and everything they depend on, dependencies first. */
  async resolve(names: string[]): Promise<RegistryItem[]> {
    const ordered: RegistryItem[] = [];
    const placed = new Set<string>();
    const visiting = new Set<string>();

    const visit = async (name: string): Promise<void> => {
      if (placed.has(name) || visiting.has(name)) return;
      visiting.add(name);

      const item = await this.item(name);
      for (const dependency of item.registryDependencies) {
        await visit(dependency);
      }

      visiting.delete(name);
      placed.add(name);
      ordered.push(item);
    };

    for (const name of names) await visit(name);
    return ordered;
  }
}
