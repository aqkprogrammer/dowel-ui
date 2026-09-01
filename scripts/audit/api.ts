/**
 * API consistency across the component set.
 *
 * The conventions in ADR 4 are mostly enforced by tests written per component,
 * which means a new component can quietly skip one. These checks apply to every
 * component at once, so consistency does not depend on remembering.
 *
 *   pnpm audit:api
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const uiSrc = join(repoRoot, "packages", "ui", "src");

interface Entry {
  name: string;
  group: "components" | "blocks";
  file: string;
  source: string;
}

function entries(): Entry[] {
  const found: Entry[] = [];

  for (const group of ["components", "blocks"] as const) {
    const root = join(uiSrc, group);
    for (const dir of readdirSync(root, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      for (const file of readdirSync(join(root, dir.name))) {
        if (!file.endsWith(".tsx") || file.includes(".test.") || file.includes(".stories.")) {
          continue;
        }
        found.push({
          name: dir.name,
          group,
          file: join(root, dir.name, file),
          source: readFileSync(join(root, dir.name, file), "utf8"),
        });
      }
    }
  }

  return found.sort((a, b) => a.name.localeCompare(b.name));
}

interface Rule {
  id: string;
  description: string;
  check: (entry: Entry) => string | undefined;
}

/** Components using React state or handlers must declare a client boundary. */
const CLIENT_FEATURES =
  /\b(useState|useEffect|useLayoutEffect|useRef|useId|useMemo|useCallback|useContext|createContext|useSyncExternalStore|useReducer)\b|\bon[A-Z]\w*\s*=\s*\{/;

const RULES: Rule[] = [
  {
    id: "client-directive",
    description: 'files using hooks or handlers declare "use client"',
    check: (entry) => {
      if (!CLIENT_FEATURES.test(entry.source)) return undefined;
      if (entry.source.trimStart().startsWith('"use client"')) return undefined;
      return 'uses React state or handlers without a "use client" directive';
    },
  },
  {
    id: "classname-merge",
    description: "every component merges className through cn()",
    check: (entry) => {
      if (!entry.source.includes("className")) return undefined;
      if (entry.source.includes("cn(")) return undefined;
      return "accepts className but never merges it through cn()";
    },
  },
  {
    id: "variants-exported",
    description: "cva variants are exported for reuse",
    check: (entry) => {
      const declared = [...entry.source.matchAll(/const (\w+Variants) = cva\(/g)].map(
        (m) => m[1],
      );
      const missing = declared.filter(
        (name) =>
          name !== undefined &&
          !new RegExp(`export\\s*\\{[^}]*\\b${name}\\b`).test(entry.source) &&
          !entry.source.includes(`export const ${name}`),
      );
      return missing.length > 0 ? `variants not exported: ${missing.join(", ")}` : undefined;
    },
  },
  {
    id: "no-native-shadowing",
    description: "props do not shadow a global HTML attribute with new meaning",
    check: (entry) => {
      const declares = (prop: string) =>
        new RegExp(`^\\s{2}${prop}\\?:\\s`, "m").test(entry.source);

      // `role` is a *global* attribute, so a prop of that name always shadows
      // it — tooling cannot tell the two apart, and it trips every consumer's
      // accessibility linter. This is what forced Message's prop to be `from`.
      const shadowed = declares("role") ? ["role"] : [];

      // `size` and `type` are only attributes on form controls. A `size` prop on
      // something extending <a> or <button> shadows nothing; on an <input> it
      // does, which is why Input's visual size prop is `inputSize`.
      const formControl = /ComponentPropsWithRef<"(input|select|textarea)">/.test(entry.source);
      if (formControl) {
        for (const prop of ["size", "type", "form", "list"]) {
          if (declares(prop)) shadowed.push(prop);
        }
      }

      return shadowed.length > 0
        ? `props shadow native attributes: ${shadowed.join(", ")}`
        : undefined;
    },
  },
  {
    id: "focus-visible",
    description: "interactive elements use the shared focus ring",
    check: (entry) => {
      const interactive = /<button|role="(button|option|menuitem|tab)"/.test(entry.source);
      if (!interactive) return undefined;
      if (/focusRing|focus-visible:|tabIndex=\{-1\}/.test(entry.source)) return undefined;
      return "renders interactive elements with no focus-visible treatment";
    },
  },
  {
    id: "responsive-sizing",
    description: "no large fixed pixel dimensions",
    check: (entry) => {
      // Small fixed values are legitimate — a 2px caret, a 1px rule. A large
      // one is a component that cannot survive a narrow viewport.
      const offenders = [...entry.source.matchAll(/\b(?:w|min-w|h|min-h)-\[(\d+)px\]/g)].filter(
        (match) => Number(match[1]) > 40,
      );
      return offenders.length > 0
        ? `fixed pixel dimensions: ${offenders.map((match) => match[0]).join(", ")}`
        : undefined;
    },
  },
  {
    id: "transition-tokens",
    description: "transitions use duration tokens, not literal milliseconds",
    check: (entry) => {
      const literal = /duration-\d+/.exec(entry.source);
      return literal ? `literal transition duration: ${literal[0]}` : undefined;
    },
  },
];

interface Finding {
  entry: Entry;
  rule: Rule;
  detail: string;
}

const findings: Finding[] = [];
const all = entries();

for (const entry of all) {
  for (const rule of RULES) {
    const detail = rule.check(entry);
    if (detail) findings.push({ entry, rule, detail });
  }
}

console.log(`API audit: ${String(all.length)} source files, ${String(RULES.length)} rules.\n`);
for (const rule of RULES) {
  const failed = findings.filter((finding) => finding.rule.id === rule.id);
  const mark = failed.length === 0 ? "pass" : `${String(failed.length)} failing`;
  console.log(`  ${rule.id.padEnd(22)} ${mark.padEnd(12)} ${rule.description}`);
}

if (findings.length === 0) {
  console.log("\nAll rules pass.");
  process.exit(0);
}

console.error("\nFindings:\n");
for (const finding of findings) {
  console.error(`  ${relative(repoRoot, finding.entry.file)}\n    ${finding.detail}`);
}
process.exit(1);
