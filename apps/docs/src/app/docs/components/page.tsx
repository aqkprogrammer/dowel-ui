import { Badge } from "@dowel/ui/badge";
import type { Metadata } from "next";
import Link from "next/link";

import { Prose } from "~/components/prose";
import { getComponentGroups } from "~/lib/registry";

export const metadata: Metadata = {
  title: "Components",
  description: "Every component in the registry.",
};

export default function ComponentsIndexPage() {
  const groups = getComponentGroups();
  const total = groups.reduce((count, group) => count + group.items.length, 0);

  return (
    <article className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Components</h1>
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
