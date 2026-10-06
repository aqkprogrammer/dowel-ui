import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

import { expect, test } from "@playwright/test";
import type { AxeResults, RunOptions } from "axe-core";

import {
  OBSERVED_DIR,
  observationFile,
  readBaseline,
  type KnownViolation,
  type Observation,
} from "../lib/baseline";
import { installStillness, openStory, readStories, THEMES } from "../lib/storybook";

/**
 * axe over every story, in a real browser, light and dark.
 *
 * The component tests run axe under jsdom, which never lays out or paints, so
 * they switch off `color-contrast` and `target-size` (packages/ui/test/a11y.ts):
 * those rules need computed colour and geometry. Here both are on. The palette
 * audit (`audit:contrast`) checks token pairs at the source; this checks what
 * the tokens became once a component combined them — opacity, a muted label on
 * a tinted surface, an icon button 20 px wide.
 */

const AXE_SOURCE = readFileSync(
  createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
  "utf8",
);

/**
 * Rules that judge a whole document. A story is a fragment rendered into
 * Storybook's frame, so these would report the frame, not the component —
 * the same list, for the same reason, as the jsdom harness.
 */
const PAGE_LEVEL_RULES = [
  "region",
  "landmark-one-main",
  "page-has-heading-one",
  "html-has-lang",
  "document-title",
  "bypass",
];

const RUN_OPTIONS: RunOptions = {
  resultTypes: ["violations"],
  rules: {
    ...Object.fromEntries(PAGE_LEVEL_RULES.map((id) => [id, { enabled: false }])),
    // The point of this suite. `target-size` is off in axe's defaults.
    "color-contrast": { enabled: true },
    "target-size": { enabled: true },
  },
};

interface Found {
  rule: string;
  impact: string;
  help: string;
  nodes: string[];
}

function describe(found: Found[]): string {
  return found
    .map(
      (violation) =>
        `  [${violation.impact}] ${violation.rule}: ${violation.help}\n${violation.nodes
          .map((node) => `      ${node}`)
          .join("\n")}`,
    )
    .join("\n\n");
}

const stories = readStories();
const baseline = readBaseline();

test.describe.configure({ mode: "parallel" });

test.beforeAll(() => {
  mkdirSync(OBSERVED_DIR, { recursive: true });
});

/**
 * Checked once, before any story: an exemption without a reason is a silent
 * one, and an exemption for a story that no longer exists can never be
 * reported as stale by the per-story tests below.
 */
test("the baseline is well-formed", () => {
  const ids = new Set(stories.map((story) => story.id));
  const problems: string[] = [];
  const keys = new Set<string>();

  for (const entry of baseline) {
    const label = `${entry.story} ${entry.rule}`;
    if (!ids.has(entry.story)) problems.push(`${label}: no such story`);
    if (entry.reason.trim() === "") problems.push(`${label}: needs a reason`);
    if (entry.themes.length === 0) problems.push(`${label}: lists no colour modes`);
    if (entry.themes.some((theme) => !THEMES.includes(theme))) {
      problems.push(`${label}: unknown colour mode in ${entry.themes.join(", ")}`);
    }
    if (keys.has(label)) problems.push(`${label}: listed twice`);
    keys.add(label);
  }

  expect(problems, problems.join("\n")).toEqual([]);
});

for (const story of stories) {
  for (const theme of THEMES) {
    test(`${story.id} (${theme})`, async ({ page }) => {
      await installStillness(page);
      await openStory(page, story.id, theme, "ltr");

      // Injected after the story, so it is this axe (the version pinned
      // here) on `window.axe`, whatever the Storybook a11y addon loads.
      await page.addScriptTag({ content: AXE_SOURCE });
      const results = await page.evaluate(
        (options) =>
          (
            window as unknown as {
              axe: { run: (c: Document, o: RunOptions) => Promise<AxeResults> };
            }
          ).axe.run(document, options),
        RUN_OPTIONS,
      );

      const found: Found[] = results.violations.map((violation) => ({
        rule: violation.id,
        impact: violation.impact ?? "unknown",
        help: violation.help,
        nodes: violation.nodes.slice(0, 5).map((node) => {
          const why = node.failureSummary?.split("\n").slice(1).join(" ").trim();
          return `${node.target.join(" ")}${why ? ` — ${why}` : ""}`;
        }),
      }));

      const observation: Observation = {
        story: story.id,
        theme,
        rules: [...new Set(found.map((violation) => violation.rule))].sort(),
      };
      writeFileSync(observationFile(story.id, theme), JSON.stringify(observation));

      const known = baseline.filter(
        (entry: KnownViolation) => entry.story === story.id && entry.themes.includes(theme),
      );
      const unexpected = found.filter(
        (violation) => !known.some((entry) => entry.rule === violation.rule),
      );
      const stale = known.filter(
        (entry) => !found.some((violation) => violation.rule === entry.rule),
      );

      expect(
        unexpected,
        `${unexpected.length} accessibility violation(s) not in known-violations.json:\n\n${describe(
          unexpected,
        )}\n\nFix them. If one is genuinely out of the component's hands, run \`pnpm --filter @dowel-ui/browser-tests a11y:baseline\` and write its reason.`,
      ).toEqual([]);

      expect(
        stale.map((entry) => entry.rule),
        `Listed in known-violations.json but no longer found in ${theme} mode — remove the entry (\`pnpm --filter @dowel-ui/browser-tests a11y:baseline\` does it), so the list only shrinks.`,
      ).toEqual([]);
    });
  }
}
