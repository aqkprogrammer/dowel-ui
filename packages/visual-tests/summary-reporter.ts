/**
 * Turns a run into the three things the rest of the workflow needs.
 *
 * After a baseline run: `baseline.json` next to the images, listing every story
 * in that build, and no image left behind for a story that is gone or failed.
 *
 * After a compare run: which stories changed, which are new, which were
 * removed, as `test-results/summary.json` and as `test-results/summary.md` (the
 * pull request's job summary in CI).
 *
 * And the verdict. A compare run whose only failures are visual differences
 * passes when VISUAL_CHANGES_APPROVED is `true`, which CI sets from the
 * `visual-change` label. A story that fails to render or cannot be captured
 * twice the same way fails the run regardless: the label approves a change in
 * how something looks, not a broken story.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
} from "@playwright/test/reporter";

import { exclusions } from "./exclusions";
import { manifestPath, resultsDir, snapshotDir, snapshotPath, storybookDir } from "./paths";
import { readManifest, readStories, type Manifest } from "./stories";

interface Entry {
  id: string;
  title: string;
  /** Why: the exclusion's reason, or the first line of the error. */
  note?: string;
}

export interface Summary {
  mode: "baseline" | "compare";
  /** Stories in the build under test. */
  stories: number;
  /** Stories that ran and matched (compare) or were captured (baseline). */
  passed: number;
  /** Stories whose screenshot differs from the baseline. */
  changed: Entry[];
  /** Stories in this build that the baseline build does not have. */
  added: Entry[];
  /** Story ids in the baseline build that this build does not have. */
  removed: string[];
  /** Stories that did not render, or never produced a stable screenshot. */
  errors: Entry[];
  /** Stories that failed, then passed on a retry. */
  flaky: Entry[];
  /** Stories in both builds with no baseline image to compare against. */
  notCompared: Entry[];
  excluded: Entry[];
  /** Whether VISUAL_CHANGES_APPROVED let the differences through. */
  approved: boolean;
}

function annotation(test: TestCase, type: string): string | undefined {
  const all = [...test.annotations, ...test.results.flatMap((result) => result.annotations)];
  return all.find((entry) => entry.type === type)?.description;
}

function has(test: TestCase, type: string): boolean {
  return annotation(test, type) !== undefined;
}

function firstLine(text: string | undefined): string | undefined {
  // eslint-disable-next-line no-control-regex -- stripping terminal colours
  return text?.replace(/\u001b\[[0-9;]*m/g, "").split("\n")[0];
}

class SummaryReporter implements Reporter {
  private config: FullConfig | undefined;
  private suite: Suite | undefined;

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
  }

  onEnd(result: FullResult): Promise<{ status?: FullResult["status"] } | undefined> {
    return Promise.resolve(this.sumUp(result));
  }

  private sumUp(result: FullResult): { status?: FullResult["status"] } | undefined {
    if (!this.config || !this.suite) return undefined;
    const capturing = this.config.updateSnapshots !== "none";
    const tests = this.suite.allTests();
    // `--list`, or a filter that matched nothing: there is no run to sum up,
    // and a baseline manifest written now would vouch for images nobody took.
    if (!tests.some((test) => test.results.length > 0)) return undefined;
    const built = readStories();
    const baseline = capturing ? undefined : readManifest();
    const builtIds = new Set(built.map((story) => story.id));

    const summary: Summary = {
      mode: capturing ? "baseline" : "compare",
      stories: built.length,
      passed: 0,
      changed: [],
      added: [],
      removed: (baseline?.stories ?? []).filter((id) => !builtIds.has(id)),
      errors: [],
      flaky: [],
      notCompared: [],
      excluded: [],
      approved: false,
    };

    for (const test of tests) {
      const entry: Entry = { id: annotation(test, "story") ?? test.title, title: test.title };
      const last = test.results.at(-1);
      const outcome = test.outcome();

      if (has(test, "excluded")) {
        summary.excluded.push({ ...entry, note: annotation(test, "excluded") });
      } else if (outcome === "unexpected") {
        // Playwright attaches expected, actual and diff images to a failed
        // comparison, and nothing to a story that never got that far.
        const differs = last?.attachments.some((file) => file.name.endsWith("-diff.png"));
        if (differs && !capturing) summary.changed.push(entry);
        else summary.errors.push({ ...entry, note: firstLine(last?.error?.message) });
      } else if (outcome === "skipped") {
        // Interrupted, or stopped by --max-failures: no result either way.
      } else if (has(test, "new")) {
        summary.added.push(entry);
      } else if (has(test, "not compared")) {
        summary.notCompared.push(entry);
      } else {
        summary.passed += 1;
        if (outcome === "flaky") {
          const first = test.results.find((attempt) => attempt.status !== "passed");
          summary.flaky.push({ ...entry, note: firstLine(first?.error?.message) });
        }
      }
    }

    if (capturing) this.finishBaseline(built, tests);

    const onlyDifferences =
      result.status === "failed" && summary.changed.length > 0 && summary.errors.length === 0;
    summary.approved =
      !capturing && onlyDifferences && process.env.VISUAL_CHANGES_APPROVED === "true";

    mkdirSync(resultsDir, { recursive: true });
    writeFileSync(join(resultsDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(resultsDir, "summary.md"), markdown(summary));
    console.log(`\n${headline(summary)}\nSummary: ${join(resultsDir, "summary.md")}`);

    return summary.approved ? { status: "passed" } : undefined;
  }

  /**
   * Leaves the snapshot directory holding exactly the images this build can be
   * compared against: none for a story that failed just now (an image from an
   * earlier baseline would be compared as if it were current), none for a story
   * the build no longer has.
   *
   * A baseline with no images at all leaves no manifest, so a compare run
   * refuses to start. With one, it would find every story "not compared" and
   * pass.
   */
  private finishBaseline(built: { id: string }[], tests: TestCase[]): void {
    for (const test of tests) {
      const id = annotation(test, "story");
      if (id && test.outcome() === "unexpected") rmSync(snapshotPath(id), { force: true });
    }
    const builtIds = new Set(built.map((story) => story.id));
    const images = existsSync(snapshotDir)
      ? readdirSync(snapshotDir).filter((file) => file.endsWith(".png"))
      : [];
    const kept = images.filter((file) => {
      if (builtIds.has(file.slice(0, -".png".length))) return true;
      rmSync(join(snapshotDir, file));
      return false;
    });
    if (kept.length === 0) {
      rmSync(manifestPath, { force: true });
      return;
    }
    const manifest: Manifest = { stories: built.map((story) => story.id) };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  printsToStdio(): boolean {
    return false;
  }
}

function count(amount: number, singular: string, plural = `${singular}s`): string {
  return `${String(amount)} ${amount === 1 ? singular : plural}`;
}

function headline(summary: Summary): string {
  if (summary.mode === "baseline") {
    return (
      `Baseline: ${count(summary.passed, "story", "stories")} captured from ${storybookDir}, ` +
      `${String(summary.excluded.length)} excluded, ${String(summary.errors.length)} failed.`
    );
  }
  return (
    `Visual comparison: ${String(summary.changed.length)} changed, ${String(summary.added.length)} new, ` +
    `${String(summary.removed.length)} removed, ${String(summary.passed)} unchanged, ` +
    `${String(summary.errors.length)} failed, ${String(summary.excluded.length)} excluded.`
  );
}

function section(heading: string, entries: (Entry | string)[], lead?: string): string {
  if (entries.length === 0) return "";
  const lines = entries.map((entry) => {
    if (typeof entry === "string") return `- \`${entry}\``;
    return `- \`${entry.id}\` ${entry.title}${entry.note ? `: ${entry.note}` : ""}`;
  });
  // A token change can touch a thousand stories; fold a long list away.
  const list =
    lines.length > 25
      ? `<details><summary>${count(lines.length, "story", "stories")}</summary>\n\n${lines.join("\n")}\n\n</details>`
      : lines.join("\n");
  return `### ${heading} (${String(entries.length)})\n\n${lead ? `${lead}\n\n` : ""}${list}\n\n`;
}

function markdown(summary: Summary): string {
  if (summary.mode === "baseline") {
    return (
      `## Visual regression: baseline\n\n${headline(summary)}\n\n` +
      section(
        "Failed to capture",
        summary.errors,
        "These stories have no baseline image, so the comparison skips them.",
      ) +
      section("Captured only on a retry", summary.flaky)
    );
  }

  let verdict = "No visual differences.";
  if (summary.errors.length > 0) {
    verdict = "**Failed:** some stories did not render or could not be captured.";
  } else if (summary.changed.length > 0) {
    verdict = summary.approved
      ? "**Passed with differences:** this change is marked as an intended visual change."
      : "**Failed:** some stories look different. If that is intended, add the `visual-change` label to the pull request.";
  }

  return (
    `## Visual regression\n\n${verdict}\n\n${headline(summary)}\n\n` +
    section(
      "Changed",
      summary.changed,
      "The screenshot differs from the base branch. Expected, actual and diff images are in the Playwright report.",
    ) +
    section(
      "Failed",
      summary.errors,
      "The story threw, Storybook could not find it, or the test ran out of time. The `visual-change` label does not cover these.",
    ) +
    section(
      "New",
      summary.added,
      "Not in the base branch, so there is nothing to compare. Each screenshot is attached in the report.",
    ) +
    section("Removed", summary.removed, "In the base branch, not in this build.") +
    section(
      "Not compared",
      summary.notCompared,
      "In both builds, but the baseline has no image: the story could not be captured from the base build.",
    ) +
    section(
      "Passed only on a retry",
      summary.flaky,
      "Worth a look: a story that is only sometimes the same belongs in `packages/visual-tests/exclusions.ts`, or needs pinning down.",
    ) +
    section("Excluded", summary.excluded) +
    (exclusions.length === 0
      ? ""
      : "Exclusions are listed in `packages/visual-tests/exclusions.ts`.\n")
  );
}

export default SummaryReporter;
