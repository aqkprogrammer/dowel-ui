/**
 * The accessibility baseline: violations that are known, each with a reason.
 *
 * The suite fails on any violation not listed here, and on any entry that no
 * longer occurs. The second half is what makes this a ratchet rather than a
 * place to put problems: fixing something forces its entry out, so the list
 * can only shrink, and a stale entry cannot sit there quietly exempting the
 * next regression of the same rule on the same story.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { Theme } from "./storybook";

export interface KnownViolation {
  /** Storybook story id. */
  story: string;
  /** axe rule id. */
  rule: string;
  /** The colour modes it occurs in. */
  themes: Theme[];
  /**
   * Why it is accepted. "to fix: …" for a real defect waiting on a component
   * change; anything else is a judgement a reviewer can disagree with.
   */
  reason: string;
}

export const BASELINE_PATH = join(import.meta.dirname, "..", "known-violations.json");

/**
 * What each test saw, one file per story and colour mode. Written on every
 * run, read by `pnpm a11y:baseline`; never compared against anything itself.
 */
export const OBSERVED_DIR = join(import.meta.dirname, "..", "test-results", "a11y-observed");

export interface Observation {
  story: string;
  theme: Theme;
  rules: string[];
}

export function readBaseline(): KnownViolation[] {
  if (!existsSync(BASELINE_PATH)) return [];
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as KnownViolation[];
}

export function readObservations(): Observation[] {
  if (!existsSync(OBSERVED_DIR)) return [];
  return readdirSync(OBSERVED_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(join(OBSERVED_DIR, file), "utf8")) as Observation);
}

export function observationFile(story: string, theme: Theme): string {
  return join(OBSERVED_DIR, `${story}--${theme}.json`);
}

/**
 * Folds a run's observations into the baseline.
 *
 * Only the story/mode pairs that were actually observed are touched, so a
 * partial run (`--grep`) cannot drop entries for stories it never opened. New
 * entries get an empty reason, which the suite rejects: an exemption has to be
 * written by a person, never generated.
 */
export function mergeBaseline(
  baseline: KnownViolation[],
  observations: Observation[],
): { next: KnownViolation[]; added: string[]; removed: string[] } {
  const seen = new Map<string, Set<string>>();
  for (const { story, theme, rules } of observations)
    seen.set(`${story}|${theme}`, new Set(rules));

  const added: string[] = [];
  const removed: string[] = [];

  const next = baseline
    .map((entry) => {
      const themes = entry.themes.filter((theme) => {
        const rules = seen.get(`${entry.story}|${theme}`);
        const stillThere = rules === undefined || rules.has(entry.rule);
        if (!stillThere) removed.push(`${entry.story} ${entry.rule} (${theme})`);
        return stillThere;
      });
      return { ...entry, themes };
    })
    .filter((entry) => entry.themes.length > 0);

  for (const { story, theme, rules } of observations) {
    for (const rule of rules) {
      const existing = next.find((entry) => entry.story === story && entry.rule === rule);
      if (existing === undefined) {
        next.push({ story, rule, themes: [theme], reason: "" });
        added.push(`${story} ${rule} (${theme})`);
      } else if (!existing.themes.includes(theme)) {
        existing.themes.push(theme);
        added.push(`${story} ${rule} (${theme})`);
      }
    }
  }

  const order: Record<Theme, number> = { light: 0, dark: 1 };
  for (const entry of next) entry.themes.sort((a, b) => order[a] - order[b]);
  next.sort((a, b) => a.story.localeCompare(b.story) || a.rule.localeCompare(b.rule));

  return { next, added, removed };
}
