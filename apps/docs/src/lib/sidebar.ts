import { BLOCK_GROUPS, blockGroupOf } from "./block-taxonomy";
import { GUIDES, TOOLS, type NavLink } from "./navigation";
import { getBlocks, getComponentGroups } from "./registry";

/**
 * The documentation sidebar's contents, from the site map and the registry.
 *
 * Components and blocks come as collapsible sections — the flat list this
 * replaced was two hundred and seventy links long. The galleries are the way
 * to browse; this is the way to jump.
 */

export interface SidebarSection {
  id: string;
  label: string;
  /** The gallery view of this section. */
  href: string;
  items: (NavLink & { pro?: boolean })[];
}

export interface SidebarTree {
  guides: NavLink[];
  tools: NavLink[];
  components: SidebarSection[];
  blocks: SidebarSection[];
}

export function getSidebarTree(): SidebarTree {
  const components = getComponentGroups().map((group) => ({
    id: group.category,
    label: group.label,
    href: `/docs/components#${group.category}`,
    items: group.items.map((item) => ({
      title: item.title,
      href: `/docs/components/${item.name}`,
    })),
  }));

  const blocks = getBlocks();
  const blockSections = BLOCK_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    href: `/docs/blocks#${group.id}`,
    items: blocks
      .filter((block) => blockGroupOf(block) === group.id)
      .map((block) => ({
        title: block.title,
        href: `/docs/blocks/${block.name}`,
        pro: block.access === "pro",
      })),
  })).filter((section) => section.items.length > 0);

  return {
    guides: GUIDES.items.map(({ title, href }) => ({ title, href })),
    tools: TOOLS.items.map(({ title, href }) => ({ title, href })),
    components,
    blocks: blockSections,
  };
}
