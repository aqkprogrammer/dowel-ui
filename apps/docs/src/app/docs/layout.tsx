import type { ReactNode } from "react";

import { SidebarNav, type NavGroup } from "~/components/sidebar-nav";
import { SiteHeader } from "~/components/site-header";
import type { SearchEntry } from "~/components/search";
import { getBlocks, getComponentGroups } from "~/lib/registry";

const GUIDE_GROUP: NavGroup = {
  label: "Getting started",
  items: [
    { title: "Introduction", href: "/docs" },
    { title: "Installation", href: "/docs/installation" },
    { title: "CLI", href: "/docs/cli" },
    { title: "Themes", href: "/docs/themes" },
    { title: "Theme Studio", href: "/theme-studio" },
    { title: "Playground", href: "/playground" },
    { title: "Generate", href: "/generate" },
    { title: "Accessibility", href: "/docs/accessibility" },
    { title: "Quality", href: "/quality" },
    { title: "AI agents", href: "/docs/ai-agents" },
    { title: "Private registries", href: "/docs/private-registry" },
    { title: "Pricing", href: "/pricing" },
    { title: "All components", href: "/docs/components" },
    { title: "Blocks", href: "/docs/blocks" },
  ],
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  const groups = getComponentGroups();

  const blocks = getBlocks();

  const navGroups: NavGroup[] = [
    GUIDE_GROUP,
    {
      label: "Blocks",
      items: blocks.map((block) => ({
        title: block.title,
        href: `/docs/blocks/${block.name}`,
      })),
    },
    ...groups.map((group) => ({
      label: group.label,
      items: group.items.map((item) => ({
        title: item.title,
        href: `/docs/components/${item.name}`,
      })),
    })),
  ];

  const searchEntries: SearchEntry[] = [
    ...GUIDE_GROUP.items.map((item) => ({
      name: item.href,
      title: item.title,
      description: "Guide",
      category: "Guides",
      href: item.href,
    })),
    ...blocks.map((block) => ({
      name: block.name,
      title: block.title,
      description: block.description,
      category: "Blocks",
      href: `/docs/blocks/${block.name}`,
    })),
    ...groups.flatMap((group) =>
      group.items.map((item) => ({
        name: item.name,
        title: item.title,
        description: item.description,
        category: group.label,
        href: `/docs/components/${item.name}`,
      })),
    ),
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader searchEntries={searchEntries} />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4">
        {/* Its own scroll container, so the nav does not scroll away with the
            page on a long article. */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 overflow-y-auto py-8 lg:block">
          <SidebarNav groups={navGroups} />
        </aside>

        <main id="content" className="min-w-0 flex-1 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
