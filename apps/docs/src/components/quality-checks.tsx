import { cn } from "@dowel-ui/react";
import { Check, Minus, X } from "lucide-react";

import { componentQuality, type QualityCheck } from "~/lib/quality.generated";

const ICON = {
  pass: Check,
  fail: X,
  "not-applicable": Minus,
} as const;

const TONE = {
  pass: "text-success",
  fail: "text-destructive",
  "not-applicable": "text-muted-foreground",
} as const;

const WORDING = {
  pass: "passes",
  fail: "fails",
  "not-applicable": "does not apply",
} as const;

/**
 * What was checked, and what it came to.
 *
 * The list is shown rather than only the number, because a number nobody can
 * trace is decoration. Checks that do not apply are shown too — a Separator
 * having no focus ring is a fact about Separator, not a mark against it, and
 * hiding those would make the denominator unexplainable.
 */
export function QualityChecks({ name }: { name: string }) {
  const quality = componentQuality[name];
  if (!quality) return null;

  const applicable = quality.checks.filter((check) => check.state !== "not-applicable");
  const passed = applicable.filter((check) => check.state === "pass").length;

  return (
    <section aria-labelledby={`quality-${name}`} className="not-prose my-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`quality-${name}`} className="text-lg font-semibold tracking-tight">
          Quality
        </h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-foreground tabular-nums">
            {String(passed)}/{String(applicable.length)}
          </span>{" "}
          checks, measured from the source and its tests
        </p>
      </div>

      <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {quality.checks.map((check) => (
          <QualityRow key={check.id} check={check} />
        ))}
      </ul>
    </section>
  );
}

function QualityRow({ check }: { check: QualityCheck }) {
  const Icon = ICON[check.state];

  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className={cn("size-4 shrink-0", TONE[check.state])} aria-hidden />
      <span className={check.state === "not-applicable" ? "text-muted-foreground" : undefined}>
        {check.label}
      </span>
      <span className="sr-only"> — {WORDING[check.state]}</span>
    </li>
  );
}
