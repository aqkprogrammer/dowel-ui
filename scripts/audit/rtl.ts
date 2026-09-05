/**
 * Checks that direction-dependent styling is written logically.
 *
 * A component built with `ml-`, `pl-`, `left-` and `text-right` is a component
 * that inverts wrongly in Arabic, Hebrew, Persian and Urdu: the icon sits on
 * the wrong side of the label, the indent runs the wrong way, and the caret
 * points out of the field instead of into it. Nothing about it looks broken in
 * English, which is why it survives review.
 *
 * The logical equivalents — `ms-`, `ps-`, `start-`, `text-end` — resolve
 * against the writing direction, so one class is correct in both. They are the
 * same length to type and the same cost to render; the only thing physical
 * properties buy is a bug nobody who speaks the language will file.
 *
 * The library claims WCAG 2.2 AA and audits 322 contrast pairs across every
 * preset. Shipping a component set that cannot be read right-to-left is out of
 * step with that, and unlike contrast it is not something a test environment
 * has to paint to detect.
 *
 * The second half is icons. Logical CSS mirrors the box an icon sits in and not
 * the glyph inside it, so a page can invert perfectly and still have a "next"
 * chevron pointing back the way you came. Any icon whose meaning is directional
 * has to be flipped explicitly, and this knows which paths those are.
 *
 *   pnpm audit:rtl
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const uiSrc = join(repoRoot, "packages", "ui", "src");

/**
 * Physical utilities that have a logical equivalent, and what it is.
 *
 * Only utilities where the swap is exact. `top-` and `bottom-` are absent
 * because block direction is not what changes between these languages, and
 * `float-left` is absent because nothing here floats.
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
const NOT_DIRECTIONAL = /\b(?:bg|object|origin|from|via|to|translate|rotate|scroll)-/;

/**
 * Centring, which only looks like a direction.
 *
 * `left-1/2` with `-translate-x-1/2` puts the midpoint of the element on the
 * midpoint of its container. It is symmetric, so it is already correct in both
 * directions — and the logical form is *worse*: `start-1/2` flips in RTL while
 * `translate-x` does not, which lands the element half a width off the middle.
 *
 * Matched as a pair rather than exempting `left-1/2` outright, because
 * `left-1/2` without the translate really is a direction bug.
 */
const CENTRING = /-translate-x-1\/2/;

/**
 * A line may opt out with a reason.
 *
 * There is one legitimate case: styling that must follow the *visual* side
 * regardless of language — a resize handle, a scrollbar. It has to be argued
 * for in a comment on the line above rather than merely asserted, because
 * "this one is fine" with no reason is how the rule erodes.
 */
const OPT_OUT = /rtl-ok:/;

/** True when a contiguous comment block above the line carries the marker. */
function optedOutAbove(lines: string[], index: number): boolean {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const line = (lines[cursor] ?? "").trim();
    const isComment = line.startsWith("//") || line.startsWith("*") || line.startsWith("/*");
    if (!isComment) return false;
    if (OPT_OUT.test(line)) return true;
  }
  return false;
}

/**
 * Icon paths that point along the reading direction.
 *
 * Listed by their exact path data rather than detected, because "is this glyph
 * directional?" is not a question a regular expression can answer, and a
 * heuristic that guesses would either flip the tick in a checkbox or miss a
 * chevron drawn a pixel differently. These are this library's own icons; a new
 * one that points sideways gets added here, and adding it is the moment to
 * think about whether it should mirror.
 *
 * A chevron pointing *down* to open a select means down in every language and
 * is deliberately absent.
 */
const DIRECTIONAL_PATHS = new Set([
  "m9 18 6-6-6-6", // chevron right
  "m15 18-6-6 6-6", // chevron left
  "m9 6 6 6-6 6", // chevron right, alternate
  "m15 6-6 6 6 6", // chevron left, alternate
  "m12 5 7 7-7 7", // arrow right
  "m12 19-7-7 7-7", // arrow left
  "M5 12h14", // arrow shaft, right
  "M19 12H5", // arrow shaft, left
]);

/** The class that flips a glyph, from `@/lib/styles`. */
const MIRROR_CLASS = "mirrorForDirection";

interface Finding {
  file: string;
  line: number;
  found: string;
  suggestion: string;
  why: string;
}

function walk(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(path));
    } else if (/\.tsx$/.test(entry.name) && !/\.(test|stories)\.tsx$/.test(entry.name)) {
      found.push(path);
    }
  }
  return found;
}

interface IconFinding {
  file: string;
  line: number;
  path: string;
}

const findings: Finding[] = [];
const iconFindings: IconFinding[] = [];
const files = [...walk(join(uiSrc, "components")), ...walk(join(uiSrc, "blocks"))].sort();

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");

  // An icon's path and the class that flips it sit on different lines, so the
  // check is per-<svg> rather than per-line.
  const source = lines.join("\n");
  for (const match of source.matchAll(/<svg\b[\s\S]*?<\/svg>/g)) {
    const svg = match[0];
    const drawn = [...svg.matchAll(/\bd="([^"]+)"/g)].map((path) => path[1] ?? "");
    const directional = drawn.filter((path) => DIRECTIONAL_PATHS.has(path));

    if (directional.length === 0) continue;
    if (svg.includes(MIRROR_CLASS)) continue;
    if (OPT_OUT.test(svg)) continue;

    iconFindings.push({
      file: relative(repoRoot, file),
      line: source.slice(0, match.index).split("\n").length,
      path: directional[0] ?? "",
    });
  }

  lines.forEach((line, index) => {
    if (OPT_OUT.test(line)) return;
    // Scans the whole comment block above, not just the line before it. A
    // justification worth writing is usually more than one line, and requiring
    // the marker on the last one would be a trap.
    if (optedOutAbove(lines, index)) return;

    for (const rule of REPLACEMENTS) {
      for (const match of line.matchAll(rule.pattern)) {
        const found = match[0];
        if (/^(?:left|right)-1\/2$/.test(found) && CENTRING.test(line)) continue;
        // Skip a hit that is part of a utility with no logical form.
        const before = line.slice(Math.max(0, match.index - 12), match.index);
        if (NOT_DIRECTIONAL.test(before + found)) continue;

        const suggestion = rule.replace(found);
        if (suggestion === found) continue;

        findings.push({
          file: relative(repoRoot, file),
          line: index + 1,
          found,
          suggestion,
          why: rule.why,
        });
      }
    }
  });
}

const affected = new Set(findings.map((finding) => finding.file));

console.log("Right-to-left\n");
console.log(
  `  logical-properties       ${findings.length === 0 ? "pass" : "FAIL"}`.padEnd(40) +
    `${String(files.length)} source files scanned`,
);
console.log(
  `  icon-direction           ${iconFindings.length === 0 ? "pass" : "FAIL"}`.padEnd(40) +
    `${String(DIRECTIONAL_PATHS.size)} directional glyphs known`,
);

if (iconFindings.length > 0) {
  console.error(
    `\n${String(iconFindings.length)} icon(s) point along the reading direction and are ` +
      "not mirrored:\n",
  );

  for (const finding of iconFindings) {
    console.error(`  ${finding.file}:${String(finding.line)}\n    d="${finding.path}"`);
  }

  console.error(
    "\nAdd `mirrorForDirection` from @/lib/styles to the svg. Logical CSS mirrors the\n" +
      'box, not the glyph, so without it a fully mirrored page still has a "next"\n' +
      "chevron pointing back the way you came. If the glyph is not really directional,\n" +
      "say so in a comment containing `rtl-ok:`.",
  );
}

if (findings.length > 0) {
  console.error(
    `\n${String(findings.length)} physical propert${findings.length === 1 ? "y" : "ies"} ` +
      `in ${String(affected.size)} file(s), each with an exact logical equivalent:\n`,
  );

  for (const finding of findings) {
    console.error(
      `  ${finding.file}:${String(finding.line)}\n` +
        `    ${finding.found} → ${finding.suggestion}  (${finding.why})`,
    );
  }

  console.error(
    "\nUse the logical form. If a style must follow the visual side whatever the\n" +
      "language — a resize handle, a scrollbar — say why in a comment containing\n" +
      "`rtl-ok:` on the line or the one above it.",
  );
  process.exit(1);
}

if (iconFindings.length > 0) process.exit(1);

console.log(
  "\nEvery direction-dependent style is written logically, and every\ndirectional icon mirrors.",
);
