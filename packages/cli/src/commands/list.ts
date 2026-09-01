import { configExists, readConfig } from "../lib/config";
import { logger, pc } from "../lib/logger";
import { fetchIndex } from "../lib/registry-client";
import { branding } from "../branding";

export interface ListOptions {
  cwd: string;
  registry?: string;
  category?: string;
  json: boolean;
}

export async function list(options: ListOptions): Promise<void> {
  // Usable before init: browsing what exists should not require a project.
  const config = configExists(options.cwd) ? readConfig(options.cwd) : undefined;
  const registry = options.registry ?? config?.registry ?? branding.registryUrl;

  const index = await fetchIndex(registry);
  const installed = new Set(Object.keys(config?.installed ?? {}));

  const items = index.items
    .filter((item) => item.type === "registry:ui")
    .filter((item) => !options.category || item.category === options.category);

  if (options.json) {
    logger.info(
      JSON.stringify(
        items.map((item) => ({ ...item, installed: installed.has(item.name) })),
        null,
        2,
      ),
    );
    return;
  }

  if (items.length === 0) {
    logger.warn(
      options.category
        ? `No components in category "${options.category}".`
        : "The registry has no components.",
    );
    return;
  }

  const byCategory = new Map<string, typeof items>();
  for (const item of items) {
    byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
  }

  const width = Math.max(...items.map((item) => item.name.length));

  for (const [category, categoryItems] of [...byCategory].sort()) {
    logger.blank();
    logger.info(pc.bold(category));
    for (const item of categoryItems) {
      const mark = installed.has(item.name) ? pc.green("✓") : " ";
      logger.info(`  ${mark} ${item.name.padEnd(width)}  ${pc.dim(item.description)}`);
    }
  }

  logger.blank();
  logger.info(
    pc.dim(
      `${String(items.length)} components · ${String(installed.size)} installed · ${registry}`,
    ),
  );
}
