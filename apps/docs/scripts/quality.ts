import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Per-component quality, measured rather than asserted.
 *
 * A number on a page is worthless unless it can be traced to something. Every
 * check here reads the component's own source and test file, and most are the
 * same rules `pnpm audit:api` and `pnpm audit:tokens` already enforce across
 * the whole set — so this is not a second standard, it is the existing one
 * reported per component instead of in aggregate.
 *
 * Checks that do not apply are recorded as such and left out of the score. A
 * Separator has no focus ring because it is not interactive; counting that
 * against it would make the number measure how many features a component has
 * rather than how well it is built.
 */

export type CheckState = "pass" | "fail" | "not-applicable";

export interface QualityCheck {
  id: string;
  label: string;
  state: CheckState;
}

export interface ComponentQuality {
  checks: QualityCheck[];
  /** Passed as a percentage of applicable checks, rounded. */
  score: number;
}

interface Subject {
  name: string;
  source: string;
  tests: string | undefined;
  stories: string | undefined;
  /** The accessibility note the registry publishes, if any. */
  a11y: string | undefined;
}

/**
 * A Tailwind palette class, which does not follow the theme.
 *
 * Matched by colour name so `bg-primary` and `text-muted-foreground` — the
 * semantic tokens — are untouched, while `bg-slate-900` is caught.
 */
const PALETTE_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

/** A raw colour, in any of the forms someone reaches for out of habit. */
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

const INTERACTIVE = /<button|role="(?:button|option|menuitem|tab|switch|slider|checkbox)"/;

interface Rule {
  id: string;
  label: string;
  /** Undefined means the rule does not apply to this component. */
  check: (subject: Subject) => boolean | undefined;
}

const RULES: Rule[] = [
  {
    id: "tests",
    label: "Tested",
    check: (subject) => subject.tests !== undefined,
  },
  {
    id: "axe",
    label: "axe assertion",
    // The shared helper's name, not a bare `axe`: every suite here reaches axe
    // through `expectNoA11yViolations`, so matching the library name alone
    // reported that none of them did.
    check: (subject) =>
      subject.tests === undefined
        ? undefined
        : /expectNoA11yViolations|\baxe\s*\(/.test(subject.tests),
  },
  {
    id: "keyboard",
    label: "Keyboard tested",
    check: (subject) => {
      if (subject.tests === undefined) return undefined;
      // A component with nothing to focus has no keyboard behaviour to test,
      // and demanding one would be demanding a meaningless test.
      if (!INTERACTIVE.test(subject.source) && !/tabIndex/.test(subject.source)) {
        return undefined;
      }
      return /\.(?:keyboard|tab)\(|keyDown|\{Enter\}|\{Tab\}|\{Escape\}|\{Arrow/.test(
        subject.tests,
      );
    },
  },
  {
    id: "stories",
    label: "Storybook examples",
    check: (subject) => subject.stories !== undefined,
  },
  {
    id: "a11y-notes",
    label: "Accessibility documented",
    check: (subject) => subject.a11y !== undefined && subject.a11y.length > 0,
  },
  {
    id: "semantic-tokens",
    label: "Semantic tokens only",
    check: (subject) => !PALETTE_CLASS.test(subject.source) && !RAW_COLOUR.test(subject.source),
  },
  {
    id: "motion-tokens",
    label: "Motion from tokens",
    check: (subject) =>
      /transition|animate-/.test(subject.source)
        ? !/\bduration-\d+\b/.test(subject.source)
        : undefined,
  },
  {
    id: "classname-merge",
    label: "className merged",
    check: (subject) =>
      subject.source.includes("className") ? subject.source.includes("cn(") : undefined,
  },
  {
    id: "focus-visible",
    label: "Visible focus",
    check: (subject) =>
      INTERACTIVE.test(subject.source)
        ? /focusRing|focus-visible:|tabIndex=\{-1\}/.test(subject.source)
        : undefined,
  },
  {
    id: "responsive",
    label: "No fixed widths",
    check: (subject) =>
      ![...subject.source.matchAll(/\b(?:w|min-w|h|min-h)-\[(\d+)px\]/g)].some(
        (match) => Number(match[1]) > 40,
      ),
  },
];

function readIfPresent(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

export function assess(
  directory: string,
  name: string,
  a11y: string | undefined,
): ComponentQuality | undefined {
  const source = readIfPresent(join(directory, `${name}.tsx`));
  if (source === undefined) return undefined;

  const subject: Subject = {
    name,
    source,
    tests: readIfPresent(join(directory, `${name}.test.tsx`)),
    stories: readIfPresent(join(directory, `${name}.stories.tsx`)),
    a11y,
  };

  const checks: QualityCheck[] = RULES.map((rule) => {
    const result = rule.check(subject);
    return {
      id: rule.id,
      label: rule.label,
      state: result === undefined ? "not-applicable" : result ? "pass" : "fail",
    };
  });

  const applicable = checks.filter((check) => check.state !== "not-applicable");
  const passed = applicable.filter((check) => check.state === "pass");

  return {
    checks,
    score:
      applicable.length === 0 ? 100 : Math.round((passed.length / applicable.length) * 100),
  };
}
