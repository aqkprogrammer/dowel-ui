import axe, { type RunOptions, type Result } from "axe-core";

/**
 * axe rules that cannot produce a meaningful result under jsdom.
 *
 * jsdom does not lay out or paint, so anything depending on computed geometry
 * or rendered colour is either unrunnable or wrong. Those dimensions are covered
 * by the Storybook a11y addon in a real browser instead.
 */
const JSDOM_UNSUPPORTED_RULES = ["color-contrast", "target-size"] as const;

/**
 * Rules that judge a whole document. A component test renders a fragment into a
 * bare body, so these would report the harness rather than the component. They
 * belong in a page-level audit, not here.
 */
const PAGE_LEVEL_RULES = [
  "region",
  "landmark-one-main",
  "page-has-heading-one",
  "html-has-lang",
  "document-title",
  "bypass",
] as const;

const DISABLED_RULES = [...JSDOM_UNSUPPORTED_RULES, ...PAGE_LEVEL_RULES];

function format(violations: Result[]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes.map((node) => `      ${node.html}`).join("\n");
      return [
        `  [${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help}`,
        `    ${violation.helpUrl}`,
        nodes,
      ].join("\n");
    })
    .join("\n\n");
}

/**
 * Asserts that a rendered subtree has no detectable accessibility violations.
 *
 * Deliberately a plain async assertion rather than a custom matcher: no module
 * augmentation, no dependency on a matcher package tracking Vitest majors.
 */
export async function expectNoA11yViolations(
  element: Element,
  options: RunOptions = {},
): Promise<void> {
  const results = await axe.run(element, {
    ...options,
    rules: {
      ...Object.fromEntries(DISABLED_RULES.map((id) => [id, { enabled: false }])),
      ...options.rules,
    },
  });

  if (results.violations.length > 0) {
    throw new Error(
      `Expected no accessibility violations, found ${results.violations.length}:\n\n${format(
        results.violations,
      )}`,
    );
  }
}
