import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
import type { Metadata } from "next";
import Link from "next/link";

import { AstraHeaderShell, AstraHero, AstraScrollCue } from "~/components/astra";
import { InstallCommand } from "~/components/install-command";
import { SiteFooter } from "~/components/site-footer";
import { SiteHeader } from "~/components/site-header";
import { branding } from "~/lib/branding";
import { averageQuality } from "~/lib/quality.generated";
import { getBlocks, getComponentGroups, getComponents } from "~/lib/registry";
import { SITE_KEYWORDS, SITE_NAME, pageMetadata } from "~/lib/site";
import { getEcosystemStats } from "~/lib/stats";
import { version } from "~/lib/version.generated";

/**
 * The home page's own canonical.
 *
 * The root layout deliberately declares none, so this is the only place "/" is
 * claimed — and it has to be claimed somewhere, or the page ships without one.
 */
export const metadata: Metadata = pageMetadata({
  title: `${SITE_NAME} — source-first React component library`,
  description:
    "A source-first React UI library for SaaS and AI products. Install accessible, themeable components as TypeScript source you own — no runtime dependency, no wrapper to fight, built on Tailwind CSS 4 and Radix UI.",
  path: "/",
  keywords: [...SITE_KEYWORDS],
});

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/**
 * The front page opens on the star field.
 *
 * The first viewport is the galaxy alone. Scrolling disperses it into a sky
 * the introduction sits in, gathers it twice into an outline — the prompt the
 * CLI is driven from, then the dowel itself — and lets the black go, so the
 * rest of the page is read in the visitor's own theme. Everything the scene
 * needs from the page is marked: the intro block the stars part around, the
 * heading that drifts, and the cues that say where each picture forms.
 */
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

  const principles = [
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
      body: "Two-tier OKLCH tokens with thirteen presets. Components reference semantic tokens only, so re-skinning the system touches no component file.",
    },
  ];

  const surfaces = [
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
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <AstraHeaderShell>
        <SiteHeader searchEntries={searchEntries} />
      </AstraHeaderShell>

      <AstraHero leftLabel={branding.libraryName} rightLabel="UI" veil={0.4} />

      <main className="flex-1">
        {/* The field is behind this stretch, so the copy is spaced for it and
            the veil over it is kept light. */}
        <div>
          <section
            data-astra-intro="true"
            className="mx-auto w-full max-w-3xl px-4 pt-28 pb-20 text-center sm:pt-36"
          >
            <Badge variant="secondary" size="sm">
              {components.length} components · {blocks.length} blocks · v{version}
            </Badge>

            <h1
              data-astra-title="true"
              className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
            >
              Source-first React components for SaaS and AI products.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-muted-foreground">
              {branding.description} Components install into your repository as code you own —
              read it, change it, keep it.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/docs/installation">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/docs/components">Browse components</Link>
              </Button>
            </div>

            <div className="mx-auto mt-10 max-w-xl text-left">
              <InstallCommand args="add button dialog data-table" />
            </div>
          </section>

          <AstraScrollCue shape="prompt" />

          <section aria-labelledby="principles" className="mx-auto w-full max-w-5xl px-4 pb-28">
            <h2 id="principles" className="text-sm font-medium text-muted-foreground">
              Three things it will not compromise on
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {principles.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm"
                >
                  <h3 className="text-sm font-medium">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
                </div>
              ))}
            </div>
          </section>

          <AstraScrollCue shape="dowel" />
        </div>

        {/* The last cue: where the dowel lets go of its outline and the field
            returns to being a background. */}
        <AstraScrollCue />

        <div className="mx-auto w-full max-w-5xl px-4 pt-12 pb-20">
          <section aria-labelledby="surfaces">
            <h2 id="surfaces" className="text-sm font-medium text-muted-foreground">
              And what it is for
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {surfaces.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-border p-5">
                  <h3 className="text-sm font-medium">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
                </div>
              ))}
            </div>
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
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
