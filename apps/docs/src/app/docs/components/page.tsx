import { Badge } from "@dowel-ui/react/badge";
import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "~/components/json-ld";
import { Prose } from "~/components/prose";
import { getComponentGroups, getComponents } from "~/lib/registry";
import { breadcrumbSchema, collectionSchema, graph } from "~/lib/structured-data";

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

export default function ComponentsIndexPage() {
  const groups = getComponentGroups();
  const total = groups.reduce((count, group) => count + group.items.length, 0);

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
    <article className="max-w-3xl">
      <JsonLd json={structuredData} />
      <h1 className="text-2xl font-semibold tracking-tight">React UI components</h1>
      <Prose>
        <p>
          {total} components, installed as source you own. Each page shows the component, the
          exact file the CLI writes, and what it needs to work.
        </p>
      </Prose>

      {groups.map((group) => (
        <section key={group.category} className="mt-10">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            {group.label}
            <Badge size="sm" variant="secondary">
              {group.items.length}
            </Badge>
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <li key={item.name}>
                <Link
                  href={`/docs/components/${item.name}`}
                  className="block rounded-lg border border-border p-3 transition-colors outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/55"
                >
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
