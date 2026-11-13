import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Measures the live site with Lighthouse and records what it found.
 *
 * The Quality page shows these figures, so they are written to a file that is
 * committed rather than typed into the page: a number there is one this script
 * produced, on the date beside it. Run it after a deploy:
 *
 *   pnpm --filter @dowel-ui/docs exec tsx scripts/lighthouse.ts
 *
 * `--from <dir>` summarises reports already in a directory (`<id>.json`)
 * instead of running Lighthouse again. One run a page, Lighthouse's default
 * mobile emulation and throttling: a snapshot, not a benchmark — the scores
 * move a few points between runs, which is why the date is shown with them.
 */

const SITE = "https://dowel-eight.vercel.app";
const PAGES = [
  { id: "home", label: "Home", path: "/" },
  { id: "docs", label: "A guide", path: "/docs/installation" },
  { id: "component", label: "A component", path: "/docs/components/button" },
];
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"] as const;

interface Report {
  lighthouseVersion: string;
  fetchTime: string;
  categories: Record<string, { score: number | null }>;
  audits: Record<string, { numericValue?: number }>;
}

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src", "lib", "lighthouse.json");
const fromIndex = process.argv.indexOf("--from");
const from = fromIndex > 0 ? process.argv[fromIndex + 1] : undefined;
const dir = from ?? mkdtempSync(join(tmpdir(), "lighthouse-"));

if (!from) {
  for (const page of PAGES) {
    const result = spawnSync(
      "npx",
      [
        "-y",
        "lighthouse@12",
        `${SITE}${page.path}`,
        "--output=json",
        `--output-path=${join(dir, `${page.id}.json`)}`,
        "--chrome-flags=--headless=new",
        `--only-categories=${CATEGORIES.join(",")}`,
        "--quiet",
      ],
      { stdio: "inherit" },
    );
    if (result.status !== 0) throw new Error(`Lighthouse failed for ${page.path}`);
  }
}

const pages = PAGES.map((page) => {
  const file = join(dir, `${page.id}.json`);
  if (!existsSync(file)) throw new Error(`No report at ${file}`);
  const report = JSON.parse(readFileSync(file, "utf8")) as Report;
  const score = (id: string) => Math.round((report.categories[id]?.score ?? 0) * 100);
  const metric = (id: string) => report.audits[id]?.numericValue ?? 0;
  return {
    id: page.id,
    label: page.label,
    path: page.path,
    version: report.lighthouseVersion,
    measured: report.fetchTime.slice(0, 10),
    scores: {
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
    },
    // Milliseconds, except the layout shift, which has no unit.
    metrics: {
      fcp: Math.round(metric("first-contentful-paint")),
      lcp: Math.round(metric("largest-contentful-paint")),
      tbt: Math.round(metric("total-blocking-time")),
      cls: Math.round(metric("cumulative-layout-shift") * 1000) / 1000,
    },
  };
});

writeFileSync(out, `${JSON.stringify({ site: SITE, pages }, null, 2)}\n`);
console.log(`Wrote ${out}`);
for (const page of pages) console.log(page.path, page.scores, page.metrics);
