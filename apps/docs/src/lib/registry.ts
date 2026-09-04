import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { RegistryIndex, RegistryItem } from "@dowel-ui/registry";

/**
 * Reads the registry the site itself serves.
 *
 * Deliberately reads `public/r` rather than importing from the registry package:
 * that is the exact bytes a consumer's CLI will fetch, so the documentation
 * cannot describe something different from what gets installed.
 */

const registryDir = join(process.cwd(), "public", "r");

function read<T>(file: string): T {
  return JSON.parse(readFileSync(join(registryDir, file), "utf8")) as T;
}

export function getRegistryIndex(): RegistryIndex {
  return read<RegistryIndex>("index.json");
}

export function getRegistryItem(name: string): RegistryItem {
  return read<RegistryItem>(`${name}.json`);
}

/**
 * Every item, fully loaded.
 *
 * Only for the agent-facing text routes, which need the accessibility notes the
 * index does not carry. Pages that render one component read one file.
 */
export function getRegistryItems(): RegistryItem[] {
  return getRegistryIndex().items.map((entry) => getRegistryItem(entry.name));
}

/** Components only — the theme and utility items are install details. */
export function getComponents() {
  return getRegistryIndex().items.filter((item) => item.type === "registry:ui");
}

/** Blocks: whole page sections assembled from components. */
export function getBlocks() {
  return getRegistryIndex()
    .items.filter((item) => item.type === "registry:block")
    .sort((a, b) => a.title.localeCompare(b.title));
}

export const CATEGORY_ORDER = [
  "foundation",
  "form",
  "overlay",
  "navigation",
  "display",
  "data",
  "feedback",
  "layout",
  "ai",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  foundation: "Foundation",
  form: "Forms",
  overlay: "Overlays",
  navigation: "Navigation",
  display: "Display",
  data: "Data",
  feedback: "Feedback",
  layout: "Layout",
  ai: "AI",
};

export interface ComponentGroup {
  category: string;
  label: string;
  items: ReturnType<typeof getComponents>;
}

/**
 * Grouped in a deliberate reading order, not alphabetically by category.
 *
 * Categories the order does not name are appended rather than dropped. The
 * order is a curation of what is already known; the registry is the source of
 * truth for what exists. Filtering to the known list instead meant a component
 * in a new category simply never appeared on the page, with nothing failing to
 * say so — which is how Avatar, Badge and Card went missing.
 */
export function getComponentGroups(): ComponentGroup[] {
  const components = getComponents();

  const known = new Set<string>(CATEGORY_ORDER);
  const extra = [...new Set(components.map((item) => item.category))]
    .filter((category) => !known.has(category))
    .sort();

  return [...CATEGORY_ORDER, ...extra]
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      items: components
        .filter((item) => item.category === category)
        .sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .filter((group) => group.items.length > 0);
}
