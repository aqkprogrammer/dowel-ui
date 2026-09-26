import type { Metadata } from "next";
import type { CSSProperties } from "react";

import {
  ComponentsBrowser,
  type BrowserGroup,
  type FeaturedItem,
} from "~/components/components-browser";
import { JsonLd } from "~/components/json-ld";
import { getComponentGroups, getComponents } from "~/lib/registry";
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
];

export default function ComponentsIndexPage() {
  const groups = getComponentGroups();
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
    })),
  }));

  const countOf = (category: string) =>
    groups.find((group) => group.category === category)?.items.length ?? 0;

  const figures = [
    { label: "Components", value: total, href: "#all" },
    { label: "Categories", value: groups.length, href: "#all" },
    { label: "Built for AI", value: countOf("ai"), href: "#ai" },
    { label: "Effects & motion", value: countOf("effects"), href: "#effects" },
  ];

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

      <header className="relative isolate overflow-hidden rounded-3xl border border-border bg-card/40 px-6 py-10 sm:px-10 sm:py-14">
        <div aria-hidden="true" className="docs-hero-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="docs-glow docs-glow-a -z-10" />
        <div aria-hidden="true" className="docs-glow docs-glow-b -z-10" />

        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full rounded-full bg-success opacity-70 motion-safe:animate-ping" />
            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
          </span>
          v{version} · MIT · installed as source
        </p>

        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          React UI components, <span className="docs-gradient-text">built to be owned.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
          {total} components, installed as source you own. Every preview below is the live
          component; each page shows the exact file the CLI writes and what it needs to work.
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {figures.map((figure, index) => (
            <li
              key={figure.label}
              className="docs-card-in"
              style={{ "--card-delay": `${String(120 + index * 70)}ms` } as CSSProperties}
            >
              <a
                href={figure.href}
                className="block h-full rounded-2xl border border-border bg-background/60 p-4 backdrop-blur-sm transition-[border-color,transform] duration-[var(--duration-normal)] outline-none hover:-translate-y-0.5 hover:border-primary/45 focus-visible:ring-2 focus-visible:ring-ring/55"
              >
                <span className="block text-3xl font-semibold tracking-tight tabular-nums">
                  {figure.value}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{figure.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </header>

      <ComponentsBrowser groups={browserGroups} featured={FEATURED} />
    </article>
  );
}
