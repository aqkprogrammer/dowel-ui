/**
 * Checks that motion goes through the scale.
 *
 * `--motion-scale` only works if every duration derives from it. One hardcoded
 * `200ms` in a component is a piece of the system that ignores the knob and
 * keeps moving when a reader has asked it not to — and because it still looks
 * right at the default scale, nothing reveals it until someone turns the scale
 * down and one component carries on.
 *
 * The existing API audit already forbids literal milliseconds in transitions.
 * This checks the other half: that the tokens themselves are derived, and that
 * anything exempted from reduced motion has earned it.
 *
 *   pnpm audit:motion
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const themesSrc = join(repoRoot, "packages", "themes", "src");
const uiSrc = join(repoRoot, "packages", "ui", "src");

/**
 * Components allowed to keep moving when the reader has asked for less motion.
 *
 * The bar is deliberately high: the animation must *report ongoing state*, so
 * that stopping it would communicate something false. A spinner that freezes
 * says the application has hung. Decoration never qualifies.
 */
const ALLOWED_INDICATORS = new Set([
  "spinner/spinner.tsx",
  "ai-response/ai-response.tsx",
  "progress/progress.tsx",
]);

function walk(directory: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(path, extensions));
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      found.push(path);
    }
  }
  return found;
}

interface Finding {
  file: string;
  line: number;
  detail: string;
}

const findings: Finding[] = [];
const checks: { name: string; passed: boolean; detail: string }[] = [];

/* 1. Every duration token derives from the scale. ------------------------- */
const tokens = readFileSync(join(themesSrc, "tokens.css"), "utf8");
const durationDeclarations = [...tokens.matchAll(/--duration-([\w-]+):\s*([^;]+);/g)];
const underived = durationDeclarations.filter(
  ([, , value]) => !(value ?? "").includes("var(--motion-scale"),
);

for (const [, name] of underived) {
  findings.push({
    file: "packages/themes/src/tokens.css",
    line: 0,
    detail: `--duration-${String(name)} does not derive from --motion-scale`,
  });
}
checks.push({
  name: "durations-derived",
  passed: underived.length === 0,
  detail: `${String(durationDeclarations.length)} duration tokens derive from --motion-scale`,
});

/* 2. Reduced motion drives the scale rather than only overriding. --------- */
const base = readFileSync(join(themesSrc, "base.css"), "utf8");
const reducedBlock = /prefers-reduced-motion:\s*reduce/.test(base);
const scalesUnderReduced = /prefers-reduced-motion[\s\S]{0,600}--motion-scale:/.test(base);
checks.push({
  name: "reduced-motion-scales",
  passed: reducedBlock && scalesUnderReduced,
  detail: "prefers-reduced-motion collapses the scale, not just individual rules",
});
if (reducedBlock && !scalesUnderReduced) {
  findings.push({
    file: "packages/themes/src/base.css",
    line: 0,
    detail: "reduced-motion block does not set --motion-scale",
  });
}

/* 3. Only components that report state opt out of reduced motion. --------- */
const sources = walk(uiSrc, [".tsx"]).filter(
  (file) => !file.endsWith(".test.tsx") && !file.endsWith(".stories.tsx"),
);

const exemptions: string[] = [];
for (const file of sources) {
  const contents = readFileSync(file, "utf8");
  if (!contents.includes('data-motion="indicator"') && !contents.includes('"indicator"'))
    continue;
  if (!/data-motion[=\s]/.test(contents)) continue;

  const relativePath = relative(join(uiSrc, "components"), file);
  exemptions.push(relativePath);

  if (!ALLOWED_INDICATORS.has(relativePath)) {
    const line = contents.split("\n").findIndex((text) => text.includes("data-motion")) + 1;
    findings.push({
      file: relative(repoRoot, file),
      line,
      detail:
        'data-motion="indicator" exempts this from reduced motion. Only animation that ' +
        "reports ongoing state qualifies — add it to ALLOWED_INDICATORS with a reason, " +
        "or remove the attribute.",
    });
  }
}
const unjustified = exemptions.filter((file) => !ALLOWED_INDICATORS.has(file));
checks.push({
  name: "indicator-exemptions",
  passed: unjustified.length === 0,
  detail:
    unjustified.length === 0
      ? `${String(exemptions.length)} component(s) exempt from reduced motion, all justified`
      : `${String(unjustified.length)} of ${String(exemptions.length)} exemption(s) unjustified`,
});

/* Report ------------------------------------------------------------------ */
console.log("Motion\n");
for (const check of checks) {
  const status = check.passed ? "pass" : "FAIL";
  console.log(`  ${check.name.padEnd(24)} ${status.padEnd(12)} ${check.detail}`);
}

if (findings.length > 0) {
  console.error("\nFindings:\n");
  for (const finding of findings) {
    const where = finding.line > 0 ? `${finding.file}:${String(finding.line)}` : finding.file;
    console.error(`  ${where}\n    ${finding.detail}`);
  }
  process.exit(1);
}

console.log("\nEvery duration derives from --motion-scale.");
