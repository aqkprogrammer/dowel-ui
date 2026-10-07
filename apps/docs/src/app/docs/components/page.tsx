import type { Metadata } from "next";

import {
  ComponentsBrowser,
  type BrowserGroup,
  type FeaturedItem,
} from "~/components/components-browser";
import { JsonLd } from "~/components/json-ld";
import { PageHeader } from "~/components/site/page-header";
import { getBlocks, getComponentGroups, getComponents } from "~/lib/registry";
import { breadcrumbSchema, collectionSchema, graph } from "~/lib/structured-data";
import { version } from "~/lib/version.generated";

const COUNT = getComponents().length;

export const metadata: Metadata = {
  title: `${String(COUNT)} free React UI components`,
  description: `Browse ${String(COUNT)} accessible React components — buttons, dialogs, data tables, forms, AI chat and more. Built with TypeScript, Tailwind CSS and Radix UI, and installed as source you own.`,
  keywords: [
    "react ui components",
    "react component library",
    "free react components",
    "tailwind react components",
    "accessible react components",
    "shadcn ui alternative",
    "react component list",
  ],
  alternates: { canonical: "/docs/components" },
  openGraph: { type: "website", url: "/docs/components" },
};

/**
 * The first tab: what someone new to the library should see move.
 *
 * Chosen for range — an AI surface, a chart, a control, an effect — and for
 * previews that read at card size. Names the registry no longer has are
 * skipped by the browser rather than breaking the page.
 */
const FEATURED: FeaturedItem[] = [
  { name: "fluid-orb", size: "hero" },
  { name: "number-flow", size: "base" },
  { name: "liquid-toggle", size: "base" },
  { name: "dither-donut", size: "base" },
  { name: "scramble-text", size: "base" },
  { name: "ai-reasoning", size: "wide" },
  { name: "card-stack", size: "base" },
  { name: "slide-to-confirm", size: "base" },
  { name: "carousel-3d", size: "wide" },
  { name: "gooey-nav", size: "base" },
  { name: "contribution-graph", size: "base" },
  { name: "fireworks-background", size: "wide" },
  { name: "file-tree", size: "base" },
  { name: "flip-card", size: "base" },
];

export default function ComponentsIndexPage() {
  const groups = getComponentGroups();
  const componentNames = new Set(
    groups.flatMap((group) => group.items.map((item) => item.name)),
  );
  const total = groups.reduce((count, group) => count + group.items.length, 0);

  // Only what the browser shows crosses to the client — not the dependency
  // lists and file counts the index also carries.
  const browserGroups: BrowserGroup[] = groups.map((group) => ({
    category: group.category,
    label: group.label,
    items: group.items.map((item) => ({
      name: item.name,
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      // Only the dependencies that are themselves components: the map draws
      // the lines between stars, and the theme and utils are not stars.
      uses: item.registryDependencies.filter((name) => componentNames.has(name)),
    })),
  }));

  // Blocks, for the map's galaxies: each pulls in what it is built from.
  const mapBlocks = getBlocks().map((block) => ({
    name: block.name,
    title: block.title,
    uses: block.registryDependencies.filter((name) => componentNames.has(name)),
  }));

  // The whole catalogue as one list, so a crawler that reaches this page has
  // every component page from it rather than only the ones above the fold.
  const structuredData = graph(
    collectionSchema({
      name: "React UI components",
      description: `${String(total)} accessible React components, installed as source.`,
      path: "/docs/components",
      items: groups.flatMap((group) =>
        group.items.map((item) => ({
          name: item.name,
          title: item.title,
          description: item.description,
          path: `/docs/components/${item.name}`,
        })),
      ),
    }),
    breadcrumbSchema([
      { name: "Docs", path: "/docs" },
      { name: "Components", path: "/docs/components" },
    ]),
  );

  return (
    <article>
      <JsonLd json={structuredData} />

      <PageHeader
        eyebrow={`Components · v${version} · MIT`}
        title="Composable React primitives, live."
        cosmic="ambient"
        seed={11}
        description={`${String(total)} accessible components across ${String(groups.length)} categories, installed as source you own. Every preview below is the real component — open one for its variants, its props and the exact file the CLI writes.`}
      />

      <ComponentsBrowser groups={browserGroups} featured={FEATURED} blocks={mapBlocks} />
    </article>
  );
}
