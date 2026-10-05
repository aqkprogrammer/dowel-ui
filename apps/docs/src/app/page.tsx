import { Button } from "@dowel-ui/react/button";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Braces,
  Brain,
  FileCode2,
  GitCompareArrows,
  Layers,
  MessagesSquare,
  Palette,
  Quote,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

import { AstraHero, AstraScrollCue } from "~/components/astra";
import { LiveStory } from "~/components/home/live-story";
import { MiniPlayground } from "~/components/home/mini-playground";
import { ThemeShowcase } from "~/components/home/theme-showcase";
import { InstallCommand } from "~/components/install-command";
import {
  ComponentShowcase,
  type MarqueeEntry,
  type ShowcaseTile,
} from "~/components/showcase/component-showcase";
import { CodePanel } from "~/components/site/code-panel";
import { Reveal } from "~/components/site/reveal";
import { SectionHeader } from "~/components/site/section-header";
import { SiteFooter } from "~/components/site-footer";
import { SiteHeader } from "~/components/site-header";
import { branding } from "~/lib/branding";
import { averageQuality } from "~/lib/quality.generated";
import { CATEGORY_LABELS, getBlocks, getComponents, getRegistryItem } from "~/lib/registry";
import { SITE_KEYWORDS, SITE_NAME, pageMetadata } from "~/lib/site";
import { getEcosystemStats } from "~/lib/stats";
import { componentVariants } from "~/lib/variants.generated";
import { version } from "~/lib/version.generated";

/**
 * The home page's own canonical.
 *
 * The root layout deliberately declares none, so this is the only place "/" is
 * claimed — and it has to be claimed somewhere, or the page ships without one.
 */
export const metadata: Metadata = pageMetadata({
  title: `${SITE_NAME} — source-first React UI system for SaaS and AI products`,
  description:
    "Dowel is a source-first React UI system: accessible components, production-ready blocks and AI interface primitives you install as TypeScript you own. Built on Tailwind CSS 4 and Radix UI, themed with OKLCH tokens.",
  path: "/",
  keywords: [...SITE_KEYWORDS],
});

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/**
 * The live showcase, in bento order.
 *
 * Picked for range — an assistant, a chart, three controls, two text effects —
 * and for moving on their own or answering a pointer, so the section looks
 * alive before anyone touches it. Each story must also be listed in
 * `showcase-stories.tsx`, which is what keeps the rest of the library out of
 * this page's bundle.
 */
const SHOWCASE: Pick<
  ShowcaseTile,
  "name" | "story" | "size" | "hint" | "stageWidth" | "maxScale"
>[] = [
  { name: "fluid-orb", story: "Default", size: "hero", stageWidth: 300, maxScale: 1.8 },
  { name: "typewriter-text", story: "Cycling", size: "wide", stageWidth: 620 },
  {
    name: "liquid-toggle",
    story: "Default",
    size: "base",
    hint: "Drag it",
    stageWidth: 120,
    maxScale: 1.6,
  },
  {
    name: "orb-face",
    story: "Default",
    size: "base",
    hint: "It watches you",
    stageWidth: 200,
    maxScale: 0.62,
  },
  { name: "dither-donut", story: "Default", size: "wide", stageWidth: 520 },
  {
    name: "magnify-dock",
    story: "Default",
    size: "wide",
    hint: "Sweep across",
    stageWidth: 360,
  },
  {
    name: "dial",
    story: "Default",
    size: "base",
    hint: "Turn it",
    stageWidth: 220,
    maxScale: 0.85,
  },
  { name: "shimmer-text", story: "Default", size: "base", stageWidth: 300 },
  { name: "contribution-graph", story: "Default", size: "wide", stageWidth: 760 },
];

/**
 * The blocks section: whole screens, at a size where they read as screens.
 * Each must also be in `showcase-stories.tsx`.
 */
const BLOCK_PREVIEWS = [
  {
    name: "dashboard",
    story: "Default",
    stageWidth: 1180,
    span: "lg:col-span-2 lg:row-span-2",
  },
  { name: "login", story: "Default", stageWidth: 560, span: "" },
  { name: "pricing-three-tier", story: "Default", stageWidth: 1180, span: "" },
  { name: "analytics", story: "Default", stageWidth: 1280, span: "lg:col-span-3" },
] as const;

/** The AI primitives named in the AI section — every one a real component page. */
const AI_PRIMITIVES = [
  { name: "ai-conversation", label: "Conversation", icon: MessagesSquare },
  { name: "ai-prompt-input", label: "Prompt input", icon: Terminal },
  { name: "ai-reasoning", label: "Reasoning", icon: Brain },
  { name: "ai-tool", label: "Tool calls", icon: Wrench },
  { name: "ai-sources", label: "Citations", icon: Quote },
  { name: "ai-agent-plan", label: "Agent plans", icon: Bot },
  { name: "ai-approval-request", label: "Approvals", icon: ShieldCheck },
  { name: "ai-structured-output", label: "Structured output", icon: Braces },
] as const;

/**
 * Two rows of names for the marquee: every category taken in turn, so a row
 * reads as the breadth of the library rather than forty form controls.
 */
function marqueeRows(
  components: ReturnType<typeof getComponents>,
  exclude: Set<string>,
): [MarqueeEntry[], MarqueeEntry[]] {
  const byCategory = new Map<string, MarqueeEntry[]>();
  for (const item of [...components].sort((a, b) => a.title.localeCompare(b.title))) {
    if (exclude.has(item.name)) continue;
    const entries = byCategory.get(item.category) ?? [];
    entries.push({ name: item.name, title: item.title, category: item.category });
    byCategory.set(item.category, entries);
  }

  const interleaved: MarqueeEntry[] = [];
  const queues = [...byCategory.values()];
  while (interleaved.length < 72 && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) interleaved.push(next);
    }
  }

  const capped = interleaved.slice(0, 72);
  return [
    capped.filter((_, index) => index % 2 === 0),
    capped.filter((_, index) => index % 2 === 1),
  ];
}

/**
 * Lines `from`–`to` of the button's installed source: the variant table, which
 * is the part someone reaches into first. Read from the registry, so the
 * excerpt is always the file the CLI writes today.
 */
function buttonExcerpt(): { code: string; firstLine: number } {
  try {
    const source = getRegistryItem("button").files[0]?.content ?? "";
    const lines = source.split("\n");
    const start = lines.findIndex((line) => line.startsWith("const buttonVariants"));
    if (start < 0) return { code: "", firstLine: 1 };
    return { code: lines.slice(start, start + 22).join("\n"), firstLine: start + 1 };
  } catch {
    return { code: "", firstLine: 1 };
  }
}

/**
 * The front page opens on the star field.
 *
 * The first viewport is the galaxy with the product statement over it.
 * Scrolling disperses it into a sky the introduction sits in, gathers it into
 * the CLI's prompt beside the install story, lets it rest behind the rest of
 * the page, and gathers it once more into the dowel at the close. Everything
 * the scene needs from the page is marked: the intro block the stars part
 * around, the heading that drifts, and the cues where each outline forms.
 */
export default async function HomePage() {
  const components = getComponents();
  const blocks = getBlocks();
  const stats = await getEcosystemStats();
  const aiCount = components.filter((item) => item.category === "ai").length;
  const excerpt = buttonExcerpt();

  const showcaseTiles: ShowcaseTile[] = SHOWCASE.flatMap((tile) => {
    const item = components.find((component) => component.name === tile.name);
    return item
      ? [
          {
            ...tile,
            title: item.title,
            description: item.description,
            category: item.category,
            label: CATEGORY_LABELS[item.category] ?? item.category,
          },
        ]
      : [];
  });
  const marquee = marqueeRows(components, new Set(SHOWCASE.map((tile) => tile.name)));

  const blockPreviews = BLOCK_PREVIEWS.flatMap((preview) => {
    const block = blocks.find((entry) => entry.name === preview.name);
    return block ? [{ ...preview, title: block.title, description: block.description }] : [];
  });

  const aiPrimitives = AI_PRIMITIVES.filter((primitive) =>
    components.some((component) => component.name === primitive.name),
  );

  // What is measured, in the order someone deciding whether to adopt this
  // would ask: how much is there, is it any good, is anyone else using it.
  // A stat with no figure is left out, never shown as zero.
  const figures: { label: string; value: string; href: string }[] = [
    { label: "Components", value: String(components.length), href: "/docs/components" },
    { label: "Blocks", value: String(blocks.length), href: "/docs/blocks" },
    { label: "AI components", value: String(aiCount), href: "/docs/components#ai" },
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

  const pillars = [
    {
      icon: FileCode2,
      title: "Source-first",
      body: "Every component lands in your repository as a file. Read it, change it, keep it — and `update` can tell your edits from ours.",
    },
    {
      icon: ShieldCheck,
      title: "Accessible by construction",
      body: "Keyboard, focus and announcements are part of each component, asserted with axe in CI and tested in real screen readers.",
    },
    {
      icon: Sparkles,
      title: "Built for AI products",
      body: `${String(aiCount)} components for streaming, reasoning, tool calls, citations and approvals — the parts every AI interface needs.`,
    },
    {
      icon: Palette,
      title: "One token system",
      body: "OKLCH design tokens and thirteen presets. Re-skin the whole system without opening a single component file.",
    },
  ];

  const developerKit = [
    {
      icon: Terminal,
      title: "A CLI that respects your edits",
      body: "init, add, update and diff. Every file is hashed when written, so an update never overwrites your changes silently.",
      href: "/docs/cli",
    },
    {
      icon: Bot,
      title: "Your coding agent already knows it",
      body: "One command writes the catalogue into AGENTS.md for Claude, Cursor and the rest; an MCP server answers live.",
      href: "/docs/ai-agents",
    },
    {
      icon: Layers,
      title: "Whole screens, not just parts",
      body: `${String(blocks.length)} blocks assemble the components into dashboards, sign-in, billing and AI surfaces.`,
      href: "/docs/blocks",
    },
    {
      icon: GitCompareArrows,
      title: "Your own registry",
      body: "Serve your organisation's components through the same CLI, extending ours.",
      href: "/docs/private-registry",
    },
  ];

  const buttonAxes = (componentVariants.button ?? []).map((axis) => ({
    prop: axis.prop,
    options: [...axis.options],
    fallback: axis.fallback,
  }));

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id="content" className="flex-1">
        {/* The galaxy and the statement over it. Labels off: the heading is the
          words here, and two headlines side by side would compete. */}
        <AstraHero leftLabel="" rightLabel="" veil={0.72}>
          <div className="pointer-events-none relative z-[2] mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-4xl flex-col items-center px-4 pt-[9vh] text-center sm:pt-[11vh]">
            <Link
              href="/docs/components"
              className="glass pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--hairline-strong)] px-3 py-1 text-xs text-[color:color-mix(in_srgb,var(--astra-ink)_78%,transparent)] transition-colors outline-none hover:text-[var(--astra-ink)] focus-visible:ring-2 focus-visible:ring-ring/55"
            >
              <span className="size-1.5 rounded-full bg-[var(--cosmic-orange)] shadow-[0_0_8px_var(--cosmic-orange)]" />
              v{version} · {components.length} components · {blocks.length} blocks
              <ArrowRight aria-hidden="true" className="size-3" />
            </Link>

            {/* A pool of the page's own colour behind the words, so the core of
              the galaxy glows around the statement rather than through it. */}
            <div
              aria-hidden="true"
              className="absolute top-[6vh] left-1/2 -z-10 h-[34rem] w-[min(60rem,120vw)] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--background)_82%,transparent)_35%,transparent)] opacity-75 sm:opacity-100"
            />

            <h1
              className="display-xl mt-7 max-w-[15ch] text-[var(--astra-ink)]"
              style={{ textShadow: "var(--astra-ink-shadow)" }}
            >
              Build the interface. Own every line.
            </h1>

            <p
              className="mt-6 max-w-2xl text-base text-pretty text-[color:color-mix(in_srgb,var(--astra-ink)_88%,transparent)] sm:text-lg sm:text-[color:color-mix(in_srgb,var(--astra-ink)_76%,transparent)]"
              style={{ textShadow: "var(--astra-ink-shadow)" }}
            >
              {branding.libraryName} is a source-first React UI system for SaaS and AI products
              — accessible components, whole-screen blocks and themes that install into your
              repository as TypeScript you own.
            </p>

            <div className="pointer-events-auto mt-9 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[var(--astra-ink)] px-6 text-[color:var(--background)] hover:bg-[color:color-mix(in_srgb,var(--astra-ink)_88%,transparent)]"
              >
                <Link href="/docs/installation">
                  Get started
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="glass border-[var(--hairline-strong)] px-6 text-[var(--astra-ink)] hover:bg-[color:color-mix(in_srgb,var(--astra-ink)_10%,transparent)]"
              >
                <Link href="/docs/components">Explore components</Link>
              </Button>
            </div>

            <div className="pointer-events-auto mt-6 w-full max-w-md">
              <InstallCommand args="init" compact className="glass" />
            </div>

            <p className="mt-auto pb-8 font-mono text-[0.6875rem] tracking-[0.14em] text-[color:color-mix(in_srgb,var(--astra-ink)_55%,transparent)] uppercase">
              React 19 · TypeScript · Tailwind CSS 4 · Radix UI
            </p>
          </div>
        </AstraHero>

        {/* 2 — what it is. The stars scatter around this block. */}
        <section
          data-astra-intro="true"
          aria-labelledby="why"
          className="mx-auto w-full max-w-6xl px-4 pt-28 pb-24 sm:px-6 sm:pt-36"
        >
          {/* Spelled out rather than a SectionHeader: the heading itself has
              to carry data-astra-title, because the parallax translates it and
              an inline span cannot be translated. */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Why Dowel</p>
            <h2 id="why" data-astra-title="true" className="display-lg text-luminous mt-4">
              Not a package to fight. A system you own.
            </h2>
            <p className="mt-4 text-base text-pretty text-muted-foreground sm:text-lg">
              Components, blocks, themes and tooling designed as one — and delivered as source,
              so nothing between you and the markup is a black box.
            </p>
          </div>
          <Reveal
            as="ul"
            className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--hairline)] sm:grid-cols-2 lg:grid-cols-4"
          >
            {pillars.map((pillar, index) => (
              <li
                key={pillar.title}
                data-reveal=""
                style={{ "--reveal-delay": `${String(index * 80)}ms` } as CSSProperties}
                className="bg-background/80 p-6 backdrop-blur-sm"
              >
                <pillar.icon aria-hidden="true" className="size-5 text-[var(--cosmic-blue)]" />
                <h3 className="mt-5 font-medium tracking-tight">{pillar.title}</h3>
                <p className="mt-2 text-sm text-pretty text-muted-foreground">
                  {pillar.body.split("`").map((part, partIndex) =>
                    partIndex % 2 === 1 ? (
                      <code key={partIndex} className="font-mono text-[0.85em] text-foreground">
                        {part}
                      </code>
                    ) : (
                      part
                    ),
                  )}
                </p>
              </li>
            ))}
          </Reveal>
        </section>

        {/* 3 — the source-first workflow, beside the stars forming the prompt. */}
        <section
          aria-labelledby="workflow"
          className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div>
            <SectionHeader
              id="workflow"
              eyebrow="Source-first"
              tone="orange"
              title="Install it. Then it is yours."
              description="No runtime package sits between you and the markup. The CLI writes real files into your project — the same bytes this site documents."
            />
            <ol className="mt-10 grid gap-8">
              <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4">
                <span className="font-mono text-sm text-[var(--cosmic-blue)]">01</span>
                <div className="min-w-0">
                  <h3 className="font-medium">Install</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    One command adds the component and anything it imports.
                  </p>
                  <InstallCommand args="add button" className="mt-4" />
                </div>
              </li>
              <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4">
                <span className="font-mono text-sm text-[var(--cosmic-blue)]">02</span>
                <div className="min-w-0">
                  <h3 className="font-medium">Compose</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Import it from your own path, like any file you wrote.
                  </p>
                  <CodePanel
                    className="mt-4"
                    title="app/page.tsx"
                    code={`import { Button } from "@/components/ui/button";\n\n<Button variant="primary">Continue</Button>`}
                    highlight={[3]}
                  />
                </div>
              </li>
              <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4">
                <span className="font-mono text-sm text-[var(--cosmic-blue)]">03</span>
                <div className="min-w-0">
                  <h3 className="font-medium">Own</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The source is in your repository. Change the variants, the markup, anything
                    — <code className="font-mono text-foreground">update</code> will not
                    overwrite your edits silently.
                  </p>
                  {excerpt.code ? (
                    <CodePanel
                      className="mt-4"
                      title="components/ui/button.tsx"
                      code={excerpt.code}
                      collapseAfter={10}
                      highlight={[11, 12, 13]}
                    />
                  ) : null}
                </div>
              </li>
            </ol>
          </div>
          {/* Where the stars gather into the CLI's prompt. */}
          <div className="hidden lg:block">
            <AstraScrollCue shape="prompt" heightVh={70} maxWidth={460} />
          </div>
        </section>

        {/* 4 — the live component showcase. */}
        <section
          aria-labelledby="showcase"
          className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6"
        >
          <SectionHeader
            id="showcase"
            eyebrow="Components · live on this page"
            title="Not screenshots. The real components."
            description="Drag the toggle, sweep across the dock, turn the dial. Each one is the code the CLI installs, running the same story its tests run."
            align="center"
            className="mb-14"
          />
          <ComponentShowcase
            tiles={showcaseTiles}
            marquee={marquee}
            total={components.length}
          />
        </section>

        {/* 5 — AI. */}
        <section aria-labelledby="ai" className="relative isolate py-24">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 -z-10 h-[38rem] -translate-y-1/2 bg-[radial-gradient(50%_50%_at_70%_50%,var(--glow-blue),transparent_70%)]"
          />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <SectionHeader
                id="ai"
                eyebrow="AI interfaces"
                title="UI infrastructure for AI products."
                description="Conversation, streaming, reasoning, tool calls, citations and approvals — built accessible, so a streamed answer is announced once instead of every token."
              />
              <ul className="mt-8 grid grid-cols-2 gap-2">
                {aiPrimitives.map((primitive) => (
                  <li key={primitive.name}>
                    <Link
                      href={`/docs/components/${primitive.name}`}
                      className="group flex items-center gap-2.5 rounded-lg border border-[var(--hairline)] px-3 py-2 text-sm text-muted-foreground transition-colors outline-none hover:border-[var(--hairline-strong)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
                    >
                      <primitive.icon
                        aria-hidden="true"
                        className="size-4 shrink-0 text-[var(--cosmic-blue)]"
                      />
                      <span className="truncate">{primitive.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="border-[var(--hairline-strong)] bg-transparent"
                >
                  <Link href="/docs/components#ai">
                    All {aiCount} AI components
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/docs/blocks/ai-chat">The AI chat block</Link>
                </Button>
              </div>
            </div>

            {/* The AI chat block, live: expand the reasoning, open a source. */}
            <figure className="overflow-hidden rounded-2xl border border-[var(--hairline-strong)] bg-background shadow-[0_40px_120px_-40px_var(--glow-blue)]">
              <div className="flex items-center gap-2 border-b border-[var(--hairline)] px-4 py-2.5">
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-[var(--hairline-strong)]" />
                  <span className="size-2.5 rounded-full bg-[var(--hairline-strong)]" />
                  <span className="size-2.5 rounded-full bg-[var(--hairline-strong)]" />
                </span>
                <figcaption className="ms-2 font-mono text-xs text-muted-foreground">
                  blocks/ai-chat · live
                </figcaption>
              </div>
              <LiveStory
                name="ai-chat"
                story="Default"
                interactive
                stageWidth={680}
                fill={1}
                maxScale={1}
                className="h-[30rem] sm:h-[34rem]"
              />
            </figure>
          </div>
        </section>

        {/* 6 — blocks. */}
        <section
          aria-labelledby="blocks"
          className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6"
        >
          <SectionHeader
            id="blocks"
            eyebrow="Blocks"
            title="Whole screens, assembled."
            description="Dashboards, sign-in, pricing, analytics — built from the components, installed with the same command, and yours to edit."
            action={
              <Button
                asChild
                variant="outline"
                className="border-[var(--hairline-strong)] bg-transparent"
              >
                <Link href="/docs/blocks">
                  Explore all {blocks.length} blocks
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <Reveal as="ul" className="mt-12 grid gap-3 lg:auto-rows-[17rem] lg:grid-cols-3">
            {blockPreviews.map((preview, index) => (
              <li
                key={preview.name}
                data-reveal=""
                style={{ "--reveal-delay": `${String(index * 90)}ms` } as CSSProperties}
                className={`group lift relative isolate flex min-h-[18rem] flex-col overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--pane)] ${preview.span}`}
              >
                <div className="relative min-h-0 flex-1">
                  <LiveStory
                    name={preview.name}
                    story={preview.story}
                    stageWidth={preview.stageWidth}
                    fit={preview.name === "login" ? "contain" : "width"}
                    fill={preview.name === "login" ? 0.9 : 1}
                    maxScale={1}
                    className="stage-surface absolute inset-0"
                  />
                  {/* The crop fades rather than cuts: it reads as a screen that
                      continues, not a broken image. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--pane)] to-transparent"
                  />
                </div>
                <Link
                  href={`/docs/blocks/${preview.name}`}
                  className="flex items-center gap-3 border-t border-[var(--hairline)] px-4 py-3 outline-none after:absolute after:inset-0 after:z-10 focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-inset"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{preview.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {preview.description}
                    </span>
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--duration-normal)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                  />
                </Link>
              </li>
            ))}
          </Reveal>
        </section>

        {/* 7 — themes. */}
        <section
          aria-labelledby="themes"
          className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6"
        >
          <SectionHeader
            id="themes"
            eyebrow="Themes"
            tone="orange"
            title="One system. Every brand."
            description="A preset reassigns a handful of semantic tokens; every component follows. Pick one, or build your own from a single colour with contrast checked as you go."
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="border-[var(--hairline-strong)] bg-transparent"
                >
                  <Link href="/theme-studio">
                    Create your own theme
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            }
          />
          <div className="mt-14">
            <ThemeShowcase />
          </div>
        </section>

        {/* 8 — the playground, in miniature. */}
        <section
          aria-labelledby="playground"
          className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6"
        >
          <SectionHeader
            id="playground"
            eyebrow="Playground"
            title="Turn the knobs. Copy the code."
            description="Every variant comes from the component's own definition, so the playground cannot offer something the component does not do."
            className="mb-12"
          />
          <MiniPlayground axes={buttonAxes} />
        </section>

        {/* 9 — developer experience, and the numbers. */}
        <section
          aria-labelledby="developers"
          className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6"
        >
          <SectionHeader
            id="developers"
            eyebrow="Developer experience"
            title="Built like infrastructure."
            description="Counted from the registry and measured by the audits; the outside figures refresh hourly. Nothing here is typed in."
          />
          {/* As many columns as there are figures, so a figure that is left
              out (no data) does not leave a hole. */}
          <dl
            className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--hairline)] sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--figures),minmax(0,1fr))]"
            style={{ "--figures": figures.length } as CSSProperties}
          >
            {figures.map((figure) => (
              <div key={figure.label} className="bg-background p-5">
                <dt className="text-xs text-muted-foreground">{figure.label}</dt>
                <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
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
          <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {developerKit.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--hairline)] bg-[var(--pane)]">
                  <item.icon aria-hidden="true" className="size-4 text-[var(--cosmic-blue)]" />
                </span>
                <div>
                  <h3 className="font-medium tracking-tight">
                    <Link
                      href={item.href}
                      className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/55"
                    >
                      {item.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-pretty text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 10 — the close, where the stars gather into the dowel. */}
        <section
          aria-labelledby="start"
          className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-16 pb-8 sm:px-6 lg:grid-cols-2"
        >
          <div>
            <p className="eyebrow">Start building</p>
            <h2 id="start" className="display-lg text-luminous mt-4">
              Your next interface starts with one command.
            </h2>
            <p className="mt-4 max-w-lg text-base text-pretty text-muted-foreground sm:text-lg">
              Every component and every free block is MIT, and stays that way. Pro adds whole
              application surfaces on top.
            </p>
            <InstallCommand args="init" className="mt-8 max-w-lg" />
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-foreground px-6 text-background hover:bg-foreground/90"
              >
                <Link href="/docs/installation">
                  Read the guide
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:block">
            <AstraScrollCue shape="dowel" heightVh={70} maxWidth={420} />
          </div>
        </section>

        {/* The last cue: where the field lets go of its outline. */}
        <AstraScrollCue />
      </main>

      <SiteFooter />
    </div>
  );
}
