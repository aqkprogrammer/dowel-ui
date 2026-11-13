import { Badge } from "@dowel-ui/react/badge";
import { cn } from "@dowel-ui/react";
import { THEME_PRESETS } from "@dowel-ui/themes";
import { Check, Minus, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "~/components/site/page-header";
import { SiteShell } from "~/components/site/site-shell";
import { branding } from "~/lib/branding";
import { pageMetadata } from "~/lib/site";
import lighthouse from "~/lib/lighthouse.json";
import { averageQuality, componentQuality } from "~/lib/quality.generated";
import { getBlocks, getComponents, getRegistryIndex } from "~/lib/registry";

export const metadata: Metadata = pageMetadata({
  title: "Component quality and accessibility scores",
  description:
    "Every React component measured against the accessibility, contrast, bundle size, motion and RTL rules the audits enforce, with the checks that produced each number.",
  path: "/quality",
  keywords: [
    "accessible react components",
    "react accessibility audit",
    "wcag react components",
    "react component bundle size",
  ],
});

const LIGHTHOUSE_COLUMNS = [
  "Performance",
  "Accessibility",
  "Best practices",
  "SEO",
  "LCP",
  "TBT",
  "CLS",
  "Measured",
];

const ICON = { pass: Check, fail: X, "not-applicable": Minus } as const;
const TONE = {
  pass: "text-success",
  fail: "text-destructive",
  "not-applicable": "text-muted-foreground/50",
} as const;
const WORDING = { pass: "passes", fail: "fails", "not-applicable": "n/a" } as const;

export default function QualityPage() {
  const components = getComponents();
  const blocks = getBlocks();
  const index = getRegistryIndex();

  const assessed = Object.entries(componentQuality).sort(
    ([nameA, a], [nameB, b]) => a.score - b.score || nameA.localeCompare(nameB),
  );

  // Every assessment runs the same rules, so the first one names all of them.
  const columns = assessed[0]?.[1].checks.map((check) => check.label) ?? [];

  const perfect = assessed.filter(([, quality]) => quality.score === 100).length;
  const gaps = assessed.filter(([, quality]) => quality.score < 100);

  const stats = [
    { value: String(components.length), label: "Components" },
    { value: String(blocks.length), label: "Blocks" },
    { value: String(index.items.length), label: "Registry items" },
    { value: `${String(averageQuality)}%`, label: "Average score" },
    { value: `${String(perfect)}/${String(assessed.length)}`, label: "Perfect" },
    { value: String(THEME_PRESETS.length), label: "Theme presets" },
  ];

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Measured, not claimed"
        title="Quality"
        seed={19}
        description={
          <>
            Measured at build time from each component&rsquo;s own source and test file, against
            the rules <code className="font-mono text-[0.9em]">audit:api</code> and{" "}
            <code className="font-mono text-[0.9em]">audit:tokens</code> already enforce across
            the set. A check that does not apply — a focus ring on something that is not
            interactive — is recorded as such and left out of the score, so the denominator
            means something.
          </>
        }
      />

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="pane rounded-xl p-4">
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 font-mono text-xl tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {/* The site itself, measured the same way: by a tool, on a date, with the
          unflattering figures left in. `scripts/lighthouse.ts` writes them. */}
      <section aria-labelledby="site-speed" className="mt-12">
        <h2 id="site-speed" className="text-xl font-semibold tracking-tight">
          This site, under Lighthouse
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-pretty text-muted-foreground">
          One run a page against the live site, with Lighthouse&rsquo;s mobile emulation: a
          mid-range phone on a throttled connection, which is where a slow page shows. Scores
          move a few points between runs, so each is shown with the day it was taken.
        </p>
        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Lighthouse scores and loading metrics for three pages of this site
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 text-left font-medium text-foreground">
                  Page
                </th>
                {LIGHTHOUSE_COLUMNS.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-3 py-2 text-right font-medium whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lighthouse.pages.map((page) => (
                <tr key={page.id} className="border-b border-border last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-normal whitespace-nowrap">
                    <Link
                      href={page.path}
                      className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/55"
                    >
                      {page.label}
                    </Link>
                    <span className="ms-2 font-mono text-xs text-muted-foreground">
                      {page.path}
                    </span>
                  </th>
                  {[
                    page.scores.performance,
                    page.scores.accessibility,
                    page.scores.bestPractices,
                    page.scores.seo,
                  ].map((score, index) => (
                    <td
                      key={index}
                      className={cn(
                        "px-3 py-2 text-right font-mono tabular-nums",
                        score >= 90
                          ? "text-success"
                          : score >= 50
                            ? "text-foreground"
                            : "text-destructive",
                      )}
                    >
                      {score}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground tabular-nums">
                    {(page.metrics.lcp / 1000).toFixed(1)} s
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground tabular-nums">
                    {page.metrics.tbt} ms
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground tabular-nums">
                    {page.metrics.cls}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {page.measured}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-2xl text-xs text-pretty text-muted-foreground">
          Lighthouse {lighthouse.pages[0]?.version}. LCP is the largest contentful paint, TBT
          the total time the main thread was blocked, CLS the cumulative layout shift.
          Performance is the open gap: most of the blocked time is the page hydrating on a
          throttled processor, and the home page adds a WebGL star field to that.
        </p>
      </section>

      {gaps.length > 0 ? (
        <div className="mt-8 rounded-lg border border-border bg-muted/40 p-4">
          <h2 className="text-sm font-medium">{String(gaps.length)} with an open gap</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Listed first below. Every one is a check that could pass and does not — this page
            exists to make that visible rather than to round it away.
          </p>
        </div>
      ) : null}

      {/* The table is wider than the prose column on any narrow screen, so it
            scrolls inside its own container rather than widening the page. */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Every component and block, with each quality check and the resulting score
          </caption>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th scope="col" className="px-4 py-2 text-left font-medium">
                Component
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap text-muted-foreground"
                >
                  {column}
                </th>
              ))}
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {assessed.map(([name, quality]) => (
              <tr key={name} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-2 text-left font-normal whitespace-nowrap">
                  <Link
                    href={`/docs/components/${name}`}
                    className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/55"
                  >
                    {name}
                  </Link>
                </th>
                {quality.checks.map((check) => {
                  const Icon = ICON[check.state];
                  return (
                    <td key={check.id} className="px-2 py-2">
                      <Icon className={cn("size-4", TONE[check.state])} aria-hidden />
                      <span className="sr-only">
                        {check.label} {WORDING[check.state]}
                      </span>
                    </td>
                  );
                })}
                <td className="px-4 py-2 text-right">
                  <Badge size="sm" variant={quality.score === 100 ? "success" : "warning"}>
                    {String(quality.score)}%
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
        Contrast is checked separately, because a test environment that never paints cannot
        check it: <code className="font-mono">audit:contrast</code> converts the OKLCH tokens to
        sRGB and verifies every semantic pair across both modes and all{" "}
        {String(THEME_PRESETS.length)} presets, in CI. Build your own and see the same check
        live in the{" "}
        <Link className="underline underline-offset-4" href="/theme-studio">
          Theme Studio
        </Link>
        . Generated from {branding.libraryName} {index.generatedFrom.split("@").pop()}.
      </p>
    </SiteShell>
  );
}
