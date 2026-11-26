"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * A spinner whose single arc breathes: it shrinks to a sliver and grows back
 * to three quarters of the circle while the whole thing turns, over a faint
 * full-circle track.
 *
 * The arc is one stroked circle with `pathLength="100"`, so its dash pattern
 * is in percent of the circumference. The dash and the gap always sum to 100,
 * which keeps the pattern one period long while its proportions change; the
 * dash offset walks forward by a full turn over the cycle, so the tail chases
 * the head in, then the head runs away again. A second, linear rotation on the
 * SVG keeps the whole arc travelling. Both share a two-second cycle.
 *
 * It is an indicator: it says "still working", and freezing it would say the
 * opposite. So it carries data-motion="indicator" and runs on
 * --motion-scale-indicator, which slows it under reduced motion rather than
 * stopping it. `direction: ltr` on the root: a spinner's travel is not reading
 * order, and mirroring it would only make it run backwards. The artwork is
 * aria-hidden; `label` is announced by a polite role="status" region.
 */

const PREFIX = "dowel-arc-breath";

/** A duration in seconds on the indicator motion scale. */
function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--motion-scale-indicator, 1))`;
}

const STYLES = `
@keyframes ${PREFIX}-turn{to{transform:rotate(360deg)}}
@keyframes ${PREFIX}-breathe{0%{stroke-dasharray:72 28;stroke-dashoffset:0}55%{stroke-dasharray:6 94;stroke-dashoffset:-66}100%{stroke-dasharray:72 28;stroke-dashoffset:-100}}
.${PREFIX}{direction:ltr}
.${PREFIX} [data-part=spin]{transform-origin:center;animation:${PREFIX}-turn var(--${PREFIX}-period) linear infinite}
.${PREFIX} [data-part=arc]{stroke-dasharray:72 28;animation:${PREFIX}-breathe var(--${PREFIX}-period) cubic-bezier(.45,0,.55,1) infinite}
`;

const arcBreathVariants = cva(
  "relative inline-grid shrink-0 place-items-center text-foreground",
  {
    variants: {
      size: {
        sm: "size-6",
        md: "size-12",
        lg: "size-20",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface ArcBreathProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof arcBreathVariants> {
  /**
   * Announced through a polite role="status" region while the spinner shows.
   * Pass an empty string inside something that already reports it is busy.
   */
  label?: string;
  /** Length of one breath, in seconds, before the motion scale. */
  period?: number;
  /** Stroke width in viewBox units (the circle is 48 across). */
  thickness?: number;
}

/** An indeterminate spinner: one arc that grows and shrinks while it turns. */
export function ArcBreath({
  className,
  size,
  label = "Loading",
  period = 2,
  thickness = 3.5,
  style,
  ...props
}: ArcBreathProps) {
  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        data-slot="arc-breath"
        // Exempt from the reduced-motion blanket: a spinner that stops says the
        // application has hung. It slows instead, on --motion-scale-indicator.
        data-motion="indicator"
        className={cn(PREFIX, arcBreathVariants({ size }), className)}
        style={{ [`--${PREFIX}-period`]: scaled(period), ...style } as CSSProperties}
        {...props}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          strokeLinecap="round"
          className="size-full"
        >
          <circle cx="24" cy="24" r="19" opacity=".14" />
          <g data-part="spin" data-motion="indicator">
            <circle
              data-part="arc"
              data-motion="indicator"
              cx="24"
              cy="24"
              r="19"
              pathLength={100}
              transform="rotate(-90 24 24)"
            />
          </g>
        </svg>
        {label ? (
          <span role="status" className="sr-only">
            {label}
          </span>
        ) : null}
      </span>
    </>
  );
}

export { arcBreathVariants };
