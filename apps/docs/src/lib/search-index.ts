import { THEME_PRESETS } from "@dowel-ui/themes";

import { blockGroupLabel, blockGroupOf } from "./block-taxonomy";
import { GUIDES, TOOLS } from "./navigation";
import { CATEGORY_LABELS, getBlocks, getComponentGroups } from "./registry";

/**
 * Everything the ⌘K palette can find, built once on the server.
 *
 * It was assembled by each page before, and three of them passed an empty
 * list — so search on the playground, the generator and pricing found nothing
 * at all. The header builds it now, from the registry and the site map, and
 * every page gets the same index.
 */

export type SearchKind = "Guide" | "Tool" | "Component" | "Block" | "Theme";

export interface SearchEntry {
  /** Unique: the palette identifies items by it. */
  href: string;
  title: string;
  description: string;
  kind: SearchKind;
  /** Grouping in the palette. */
  group: string;
  /** Extra terms that match but are not shown. */
  keywords: string[];
  pro?: boolean;
}

let cached: SearchEntry[] | undefined;

export function getSearchIndex(): SearchEntry[] {
  if (cached) return cached;

  const guides: SearchEntry[] = GUIDES.items.map((item) => ({
    href: item.href,
    title: item.title,
    description: item.description ?? "",
    kind: "Guide",
    group: "Docs",
    keywords: ["docs", "guide"],
  }));

  const tools: SearchEntry[] = TOOLS.items.map((item) => ({
    href: item.href,
    title: item.title,
    description: item.description ?? "",
    kind: "Tool",
    group: "Tools",
    keywords: ["tool"],
  }));

  const components: SearchEntry[] = getComponentGroups().flatMap((group) =>
    group.items.map((item) => ({
      href: `/docs/components/${item.name}`,
      title: item.title,
      description: item.description,
      kind: "Component" as const,
      group: "Components",
      keywords: [item.name, CATEGORY_LABELS[item.category] ?? item.category, "component"],
      pro: item.access === "pro",
    })),
  );

  const blocks: SearchEntry[] = getBlocks().map((block) => ({
    href: `/docs/blocks/${block.name}`,
    title: block.title,
    description: block.description,
    kind: "Block",
    group: "Blocks",
    keywords: [block.name, blockGroupLabel(blockGroupOf(block)), "block", "template", "page"],
    pro: block.access === "pro",
  }));

  // A preset is applied site-wide from the themes page, so that is where a
  // search for one goes — with the preset named in the hash for the gallery.
  const themes: SearchEntry[] = THEME_PRESETS.map((preset) => ({
    href: `/docs/themes#preset-${preset}`,
    title: `${preset.charAt(0).toUpperCase()}${preset.slice(1)} theme`,
    description: "Theme preset — preview it on real components",
    kind: "Theme",
    group: "Themes",
    keywords: [preset, "theme", "preset", "colour", "color"],
  }));

  cached = [...guides, ...tools, ...components, ...blocks, ...themes];
  return cached;
}
