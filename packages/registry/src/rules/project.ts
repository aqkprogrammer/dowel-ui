import { ARBITRARY_COLOUR, INLINE_STYLE_COLOUR, PALETTE_CLASS } from "./colour";
import { findPhysicalProperties } from "./rtl";

/**
 * What `dowel audit` looks for in a project's own code.
 *
 * Every rule here is a pattern that is wrong whenever it appears, so a finding
 * is something to fix rather than something to judge. That is why the list is
 * short: hardcoded spacing is only flagged when it is an arbitrary value off
 * the scale, colour only when it skips a token in a class or an inline style,
 * and a native element only when the project has the Dowel component that
 * replaces it installed. An audit that flags what might be fine teaches people
 * to stop reading it.
 */

export const AUDIT_RULES = [
  {
    id: "palette-colour",
    group: "consistency",
    summary: "Tailwind palette colour instead of a semantic token",
  },
  {
    id: "arbitrary-colour",
    group: "consistency",
    summary: "literal colour in a class instead of a semantic token",
  },
  {
    id: "inline-colour",
    group: "consistency",
    summary: "literal colour in an inline style instead of a semantic token",
  },
  {
    id: "off-scale",
    group: "consistency",
    summary: "arbitrary spacing, radius or type size off the scale",
  },
  {
    id: "physical-direction",
    group: "rtl",
    summary: "physical direction utility with an exact logical equivalent",
  },
  {
    id: "native-element",
    group: "drift",
    summary: "native element where the project has the Dowel component installed",
  },
] as const;

export type AuditRuleId = (typeof AUDIT_RULES)[number]["id"];

export interface AuditFinding {
  rule: AuditRuleId;
  /** 1-based. */
  line: number;
  /** The text that matched. */
  found: string;
  /** What to use instead, when there is one answer. */
  suggestion?: string;
  /** Whether `--fix` can apply the suggestion mechanically. */
  fixable: boolean;
}

export interface AuditContext {
  /** Registry names installed in the project, from `components.json`. */
  installed: ReadonlySet<string>;
}

/** Native elements and the Dowel component that replaces each. */
const NATIVE_ELEMENTS: { pattern: RegExp; component: string; use: string }[] = [
  { pattern: /<button\b/g, component: "button", use: "<Button>" },
  {
    pattern: /<input\b[^>]*\btype=["']checkbox["']/g,
    component: "checkbox",
    use: "<Checkbox>",
  },
  {
    pattern: /<input\b[^>]*\btype=["']radio["']/g,
    component: "radio-group",
    use: "<RadioGroup>",
  },
  { pattern: /<input\b[^>]*\btype=["']range["']/g, component: "slider", use: "<Slider>" },
  {
    pattern: /<input\b[^>]*\btype=["']file["']/g,
    component: "file-upload",
    use: "<FileUpload>",
  },
  {
    pattern:
      /<input\b(?![^>]*\btype=["'](?:hidden|checkbox|radio|range|file|submit|button)["'])/g,
    component: "input",
    use: "<Input>",
  },
  { pattern: /<select\b/g, component: "select", use: "<Select>" },
  { pattern: /<textarea\b/g, component: "textarea", use: "<Textarea>" },
  { pattern: /<dialog\b|\brole=["']dialog["']/g, component: "dialog", use: "<Dialog>" },
  { pattern: /\brole=["']alertdialog["']/g, component: "alert-dialog", use: "<AlertDialog>" },
  { pattern: /<table\b/g, component: "table", use: "<Table>" },
  { pattern: /<progress\b/g, component: "progress", use: "<Progress>" },
];

/**
 * Arbitrary sizes in px or rem on the spacing, radius and type utilities.
 *
 * `p-[13px]` is a value the scale does not have; `w-[640px]` is a layout
 * constraint, and is left alone.
 */
const OFF_SCALE =
  /(?<![\w-])(-?)(p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|rounded|rounded-[a-z]{1,2}|text)-\[(\d+(?:\.\d+)?)(px|rem)\]/g;

const SPACING =
  /^(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y)$/;

/** The scale step for a spacing value, when it lands exactly on one. */
function spacingStep(value: number, unit: string): string | undefined {
  const quarterRems = unit === "px" ? value / 4 : value * 4;
  return Number.isInteger(quarterRems * 2) ? String(quarterRems) : undefined;
}

function isComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

export function auditSource(source: string, context: AuditContext): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    if (isComment(line)) return;
    const at = index + 1;

    for (const match of line.matchAll(PALETTE_CLASS)) {
      findings.push({ rule: "palette-colour", line: at, found: match[0], fixable: false });
    }
    for (const match of line.matchAll(ARBITRARY_COLOUR)) {
      findings.push({ rule: "arbitrary-colour", line: at, found: match[0], fixable: false });
    }
    for (const match of line.matchAll(INLINE_STYLE_COLOUR)) {
      findings.push({ rule: "inline-colour", line: at, found: match[0], fixable: false });
    }

    for (const match of line.matchAll(OFF_SCALE)) {
      const [found, negative = "", utility = "", value = "", unit = ""] = match;
      const step = SPACING.test(utility) ? spacingStep(Number(value), unit) : undefined;
      findings.push({
        rule: "off-scale",
        line: at,
        found,
        suggestion: step === undefined ? undefined : `${negative}${utility}-${step}`,
        fixable: false,
      });
    }

    // The plain-input pattern excludes the specific types, so a checkbox is
    // reported once, as a checkbox.
    for (const element of NATIVE_ELEMENTS) {
      if (!context.installed.has(element.component)) continue;
      for (const match of line.matchAll(element.pattern)) {
        findings.push({
          rule: "native-element",
          line: at,
          found: match[0],
          suggestion: element.use,
          fixable: false,
        });
      }
    }
  });

  for (const property of findPhysicalProperties(source)) {
    findings.push({
      rule: "physical-direction",
      line: property.line,
      found: property.found,
      suggestion: property.suggestion,
      fixable: true,
    });
  }

  return findings.sort((a, b) => a.line - b.line);
}
