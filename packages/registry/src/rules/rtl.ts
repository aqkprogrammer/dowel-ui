/**
 * Direction-dependent styling written physically rather than logically.
 *
 * `ml-`, `pl-`, `left-` and `text-right` invert wrongly in Arabic, Hebrew,
 * Persian and Urdu; their logical equivalents (`ms-`, `ps-`, `start-`,
 * `text-end`) resolve against the writing direction, so one class is right in
 * both. The library's own audit and `dowel audit` in a project both run this,
 * so the rule a component is held to is the rule a project is told about.
 */

/**
 * Physical utilities that have a logical equivalent, and what it is.
 *
 * Only utilities where the swap is exact. `top-` and `bottom-` are absent
 * because block direction is not what changes between these languages, and
 * `float-left` is absent because the swap is not exact in every browser.
 */
const REPLACEMENTS: { pattern: RegExp; replace: (match: string) => string; why: string }[] = [
  {
    pattern: /\bm[lr]-(?!auto\b)[a-z0-9.[\]/-]+|\bm[lr]-auto\b/g,
    replace: (match) => match.replace(/^ml-/, "ms-").replace(/^mr-/, "me-"),
    why: "margin",
  },
  {
    pattern: /\bp[lr]-[a-z0-9.[\]/-]+/g,
    replace: (match) => match.replace(/^pl-/, "ps-").replace(/^pr-/, "pe-"),
    why: "padding",
  },
  {
    pattern: /\b(?:left|right)-[a-z0-9.[\]/-]+/g,
    replace: (match) => match.replace(/^left-/, "start-").replace(/^right-/, "end-"),
    why: "inset",
  },
  {
    pattern: /\btext-(?:left|right)\b/g,
    replace: (match) => (match === "text-left" ? "text-start" : "text-end"),
    why: "text alignment",
  },
  {
    pattern: /\bborder-[lr]\b/g,
    replace: (match) => (match === "border-l" ? "border-s" : "border-e"),
    why: "border side",
  },
  {
    pattern: /\bborder-[lr]-[a-z0-9.[\]/-]+/g,
    replace: (match) =>
      match.replace(/^border-l-/, "border-s-").replace(/^border-r-/, "border-e-"),
    why: "border side",
  },
  {
    pattern: /\brounded-(?:[lr]|tl|tr|bl|br)-[a-z0-9.[\]/-]+/g,
    replace: (match) =>
      match
        .replace(/^rounded-l-/, "rounded-s-")
        .replace(/^rounded-r-/, "rounded-e-")
        .replace(/^rounded-tl-/, "rounded-ss-")
        .replace(/^rounded-tr-/, "rounded-se-")
        .replace(/^rounded-bl-/, "rounded-es-")
        .replace(/^rounded-br-/, "rounded-ee-"),
    why: "corner radius",
  },
];

/**
 * Utilities that read as physical and are not.
 *
 * `bg-left` and `origin-top-right` position a background or a transform
 * origin; there is no logical form and no direction bug. Matching them would
 * make the audit noise, and an audit people learn to ignore is worse than none.
 */
const NOT_DIRECTIONAL = /\b(?:bg|object|origin|from|via|to|translate|rotate|scroll)-$/;

/**
 * Centring, which only looks like a direction.
 *
 * `left-1/2` with `-translate-x-1/2` puts the element's midpoint on its
 * container's. It is symmetric, so already right in both directions, and the
 * logical form is worse: `start-1/2` flips in RTL while `translate-x` does not.
 */
const CENTRING = /-translate-x-1\/2/;

/**
 * A line may opt out with a reason, for styling that must follow the visual
 * side whatever the language — a resize handle, a scrollbar.
 */
export const RTL_OPT_OUT = /rtl-ok:/;

/** True when a contiguous comment block above the line carries the marker. */
function optedOutAbove(lines: string[], index: number): boolean {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const line = (lines[cursor] ?? "").trim();
    const isComment = line.startsWith("//") || line.startsWith("*") || line.startsWith("/*");
    if (!isComment) return false;
    if (RTL_OPT_OUT.test(line)) return true;
  }
  return false;
}

export interface PhysicalProperty {
  /** 1-based. */
  line: number;
  found: string;
  suggestion: string;
  why: string;
}

/** Every physical utility in a source file that has an exact logical form. */
export function findPhysicalProperties(source: string): PhysicalProperty[] {
  const lines = source.split("\n");
  const found: PhysicalProperty[] = [];

  lines.forEach((line, index) => {
    if (RTL_OPT_OUT.test(line)) return;
    // The whole comment block above, not just the line before: a justification
    // worth writing is usually more than one line.
    if (optedOutAbove(lines, index)) return;

    for (const rule of REPLACEMENTS) {
      for (const match of line.matchAll(rule.pattern)) {
        const utility = match[0];
        if (/^(?:left|right)-1\/2$/.test(utility) && CENTRING.test(line)) continue;
        // "right-to-left" in prose is the name of the problem, not an inset.
        if (/^(?:left|right)-to-(?:left|right)\b/.test(utility)) continue;
        // Skip a hit that is the tail of a utility with no logical form, such
        // as `bg-left-top`. Only the text joined to the match counts: testing
        // the dozen characters before it skipped `ml-2` whenever a class like
        // `bg-muted` happened to sit in front of it.
        const before = line.slice(Math.max(0, match.index - 12), match.index);
        if (NOT_DIRECTIONAL.test(before)) continue;

        const suggestion = rule.replace(utility);
        if (suggestion === utility) continue;

        found.push({ line: index + 1, found: utility, suggestion, why: rule.why });
      }
    }
  });

  return found;
}

/**
 * Rewrites every physical utility `findPhysicalProperties` reports, and
 * nothing else. Each swap is exact, which is the only reason a rewrite is
 * offered at all.
 */
export function fixPhysicalProperties(source: string): string {
  const lines = source.split("\n");
  for (const finding of findPhysicalProperties(source)) {
    const index = finding.line - 1;
    const line = lines[index] ?? "";
    lines[index] = line.replace(
      new RegExp(`(^|[^\\w])${escapeRegExp(finding.found)}(?![\\w/-])`),
      `$1${finding.suggestion}`,
    );
  }
  return lines.join("\n");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}
