"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A headline number with an honest change indicator.
 *
 * The visual is a commodity; the correctness is not. Three things go wrong in
 * almost every hand-rolled version, and all three are handled here:
 *
 * 1. Direction is assumed to be good news. Rising churn, rising latency and
 *    rising cost are all bad, and painting them green is worse than showing no
 *    colour at all. `polarity` decides.
 * 2. A zero baseline produces `+∞%` or `NaN`. There is no percentage change
 *    from nothing, so this says so in words instead of inventing one.
 * 3. Meaning is carried by colour and an arrow alone, which fails WCAG 1.4.1
 *    and is unreadable to anyone who does not already know the convention. The
 *    direction is always stated in text.
 *
 * What this deliberately does NOT do is claim statistical significance. A
 * component holding two numbers cannot know whether a change is significant —
 * that needs the sample size and a test. `insignificantBelow` is a presentation
 * threshold and is described as one; passing `sampleSize` only adds it to the
 * accessible description, it does not license a stronger claim.
 */

export type MetricPolarity = "higher-is-better" | "lower-is-better" | "neutral";

const deltaVariants = cva("inline-flex items-center gap-1 text-xs font-medium tabular-nums", {
  variants: {
    sentiment: {
      good: "text-success",
      bad: "text-destructive",
      neutral: "text-muted-foreground",
    },
  },
  defaultVariants: { sentiment: "neutral" },
});

/** What the change means, once polarity is applied. */
function sentimentOf(
  change: number,
  polarity: MetricPolarity,
  meaningful: boolean,
): "good" | "bad" | "neutral" {
  if (!meaningful || change === 0 || polarity === "neutral") return "neutral";
  const improved = polarity === "higher-is-better" ? change > 0 : change < 0;
  return improved ? "good" : "bad";
}

export interface MetricDeltaProps
  extends Omit<ComponentPropsWithRef<"div">, "children">, VariantProps<typeof deltaVariants> {
  /** The current value. */
  value: number;
  /** The value being compared against. Omit when there is nothing to compare. */
  previous?: number;
  /** Names the metric. */
  label: string;
  /**
   * Whether a rise is good news. Churn, latency, error rate and cost are all
   * `lower-is-better`, and getting this wrong paints bad news green.
   */
  polarity?: MetricPolarity;
  /**
   * Relative change below which the delta is shown without sentiment, as a
   * fraction. Presentation only — this is not a significance test.
   */
  insignificantBelow?: number;
  /**
   * Included in the accessible description when given, so a reader can judge
   * the change for themselves. Never used to compute significance.
   */
  sampleSize?: number;
  /** What the previous value represents, e.g. "vs last week". */
  comparisonLabel?: string;
  /** Formats the headline value. */
  format?: (value: number) => string;
}

function defaultFormat(value: number): string {
  return new Intl.NumberFormat().format(value);
}

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function MetricDelta({
  className,
  value,
  previous,
  label,
  polarity = "higher-is-better",
  insignificantBelow = 0,
  sampleSize,
  comparisonLabel = "vs previous period",
  format = defaultFormat,
  ...props
}: MetricDeltaProps) {
  const hasComparison = previous !== undefined;
  const absoluteChange = hasComparison ? value - previous : 0;

  // A percentage change from zero is undefined, not infinite. Reporting it as
  // a number at all is the lie; the component says "no prior value" instead.
  const canComputeRelative = hasComparison && previous !== 0;
  const relativeChange = canComputeRelative ? absoluteChange / Math.abs(previous) : null;

  const meaningful =
    relativeChange === null
      ? absoluteChange !== 0
      : Math.abs(relativeChange) >= insignificantBelow;

  const sentiment = hasComparison
    ? sentimentOf(absoluteChange, polarity, meaningful)
    : "neutral";

  const direction = absoluteChange > 0 ? "up" : absoluteChange < 0 ? "down" : "flat";

  const changeText = !hasComparison
    ? null
    : relativeChange !== null
      ? percentFormatter.format(relativeChange)
      : `${absoluteChange > 0 ? "+" : ""}${format(absoluteChange)}`;

  // Everything a screen reader needs, in one sentence, in the order it matters.
  const description = [
    `${label}: ${format(value)}`,
    hasComparison
      ? relativeChange !== null
        ? `${direction === "flat" ? "unchanged" : direction} ${changeText ?? ""} ${comparisonLabel}`
        : `${direction === "flat" ? "unchanged" : direction} by ${format(Math.abs(absoluteChange))} ${comparisonLabel}, no percentage available from a zero baseline`
      : null,
    hasComparison && !meaningful && direction !== "flat" ? "not a meaningful change" : null,
    sampleSize !== undefined ? `sample size ${format(sampleSize)}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      data-slot="metric-delta"
      data-direction={direction}
      data-sentiment={sentiment}
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      <p className="text-xs text-muted-foreground">{label}</p>

      {/* One accessible sentence for the whole tile. The parts below are hidden
          so the reader gets the meaning once, not as three fragments. */}
      <p className="sr-only">{description}</p>

      <p
        aria-hidden="true"
        className="text-2xl leading-tight font-semibold tracking-tight tabular-nums"
      >
        {format(value)}
      </p>

      {hasComparison ? (
        <p aria-hidden="true" className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className={cn(deltaVariants({ sentiment }))} data-slot="metric-delta-change">
            <span aria-hidden="true">
              {direction === "up" ? "↑" : direction === "down" ? "↓" : "→"}
            </span>
            {changeText}
          </span>
          <span className="text-xs text-muted-foreground">{comparisonLabel}</span>
        </p>
      ) : null}
    </div>
  );
}

export { deltaVariants };
