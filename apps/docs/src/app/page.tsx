import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
import Link from "next/link";

import { InstallCommand } from "~/components/install-command";
import { SiteHeader } from "~/components/site-header";
import { branding } from "~/lib/branding";
import { getComponentGroups, getComponents } from "~/lib/registry";

export default function HomePage() {
  const components = getComponents();
  const groups = getComponentGroups();

  const searchEntries = groups.flatMap((group) =>
    group.items.map((item) => ({
      name: item.name,
      title: item.title,
      description: item.description,
      category: group.label,
      href: `/docs/components/${item.name}`,
    })),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader searchEntries={searchEntries} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-20">
        <Badge variant="secondary" size="sm">
          {components.length} components · v0.1.0
        </Badge>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance">
          Source-first React components for SaaS and AI products.
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
          {branding.description} Components install into your repository as code you own — read
          it, change it, keep it.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/docs/installation">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/docs/components">Browse components</Link>
          </Button>
        </div>

        <div className="mt-10 max-w-xl">
          <InstallCommand args="add button dialog data-table" />
        </div>

        <section className="mt-20 grid gap-6 sm:grid-cols-2">
          {[
            {
              title: "Accessible by construction",
              body: "Every component has an axe assertion and keyboard tests. Where the accessible choice differs from the common one — a streaming transcript that is not a live region, a loading button that keeps focus — the reason is written down.",
            },
            {
              title: "You own the source",
              body: "The CLI copies real files into your project and records a hash of what it wrote, so updates can tell your edits apart from upstream changes and never overwrite them silently.",
            },
            {
              title: "One design system",
              body: "Two-tier OKLCH tokens with seven presets. Components reference semantic tokens only, so re-skinning the system touches no component file.",
            },
            {
              title: "Built for AI products",
              body: "Conversation, streaming responses, tool calls, reasoning, citations and token budgets — the parts every AI interface needs and most rebuild badly.",
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-xl border border-border p-5">
              <h2 className="text-sm font-medium">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-4xl px-4 text-xs text-muted-foreground">
          MIT licensed. Built with {branding.libraryName}.
        </div>
      </footer>
    </div>
  );
}
