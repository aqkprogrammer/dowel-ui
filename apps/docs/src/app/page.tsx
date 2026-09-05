import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
import Link from "next/link";

import { InstallCommand } from "~/components/install-command";
import { SiteHeader } from "~/components/site-header";
import { branding } from "~/lib/branding";
import { averageQuality } from "~/lib/quality.generated";
import { getBlocks, getComponentGroups, getComponents } from "~/lib/registry";
import { getEcosystemStats } from "~/lib/stats";
import { version } from "~/lib/version.generated";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export default async function HomePage() {
  const components = getComponents();
  const blocks = getBlocks();
  const groups = getComponentGroups();
  const stats = await getEcosystemStats();

  // What is measured, in the order someone deciding whether to adopt this
  // would ask: how much is there, is it any good, is anyone else using it.
  // A stat with no figure is left out, never shown as zero.
  const figures: { label: string; value: string; href: string }[] = [
    { label: "Components", value: String(components.length), href: "/docs/components" },
    { label: "Blocks", value: String(blocks.length), href: "/docs/blocks" },
    {
      label: "AI components",
      value: String(components.filter((item) => item.category === "ai").length),
      href: "/docs/components#ai",
    },
    { label: "Average quality", value: `${String(averageQuality)}%`, href: "/quality" },
    ...(stats.downloads === undefined
      ? []
      : [
          {
            label: "npm downloads / month",
            value: compact.format(stats.downloads),
            href: `https://www.npmjs.com/package/${branding.packageScope}/react`,
          },
        ]),
    ...(stats.stars === undefined
      ? []
      : [
          {
            label: "GitHub stars",
            value: compact.format(stats.stars),
            href: `https://github.com/${branding.repository}`,
          },
        ]),
  ];

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
          {components.length} components · {blocks.length} blocks · v{version}
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
            {
              title: "Whole applications, not just parts",
              body: "Blocks assemble the components into sign-in, dashboards, billing and an agent console. Pro adds whole surfaces — a CRM, a command center, an AI workspace, an admin console — installed with the same command.",
            },
            {
              title: "Your coding agent already knows it",
              body: "One command writes the catalogue and conventions into your repository for Claude, Cursor and anything that reads AGENTS.md; an MCP server answers live. The agent stops writing a second Button.",
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-xl border border-border p-5">
              <h2 className="text-sm font-medium">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="by-the-numbers" className="mt-20">
          <h2 id="by-the-numbers" className="text-sm font-medium">
            By the numbers
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Counted from the registry and measured by the audits, with the outside figures
            refreshed hourly. Nothing here is typed in.
          </p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {figures.map((figure) => (
              <div key={figure.label} className="rounded-xl border border-border p-4">
                <dt className="text-xs text-muted-foreground">{figure.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  <Link
                    href={figure.href}
                    className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/55"
                  >
                    {figure.value}
                  </Link>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-20 rounded-2xl border border-border p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Free, and then Pro.</h2>
          <p className="mt-2 max-w-2xl text-sm text-pretty text-muted-foreground">
            Every component and every block above is MIT and stays that way. Pro is the
            catalogue of whole application surfaces on top — previewed live, installed with a
            licence key, yours once installed.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/pricing">See pricing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/docs/blocks">Browse blocks</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-muted-foreground">
          <span>MIT licensed. Built with {branding.libraryName}.</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-4">
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/docs/private-registry" className="hover:text-foreground">
              Private registries
            </Link>
            <a
              href={`https://github.com/${branding.repository}`}
              className="hover:text-foreground"
            >
              GitHub
            </a>
            <a
              href={`https://www.npmjs.com/package/${branding.packageScope}/react`}
              className="hover:text-foreground"
            >
              npm
            </a>
            <Link href="/llms.txt" className="hover:text-foreground">
              llms.txt
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
