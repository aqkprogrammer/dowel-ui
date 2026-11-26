"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * A filled dot inside two thin rings, breathing.
 *
 * One two-second cycle, ease-in-out: the dot contracts and swells back, the
 * inner ring answers by a hair, and the fainter outer ring drifts outward and
 * dims on the in-breath. The three keyframes share a duration so they stay in
 * phase, and the outer ring trails slightly so the breath reads as a wave
 * moving out from the centre. Everything is drawn in `em` and `currentColor`,
 * so `size` and a text colour are all the styling it needs.
 *
 * It is a calm "listening" or "idle" cue, not a progress spinner, so it does
 * not opt out of reduced motion: under the global blanket each keyframe runs
 * once in an instant and the rings settle at rest. Every duration also runs
 * through --motion-scale. The artwork is aria-hidden; pass `label` and a
 * polite role="status" announces it.
 */

const PREFIX = "dowel-breath-rings";

/** A duration in seconds on the motion scale. */
function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--motion-scale, 1))`;
}

const STYLES = `
@keyframes ${PREFIX}-dot{0%,100%{transform:scale(1)}50%{transform:scale(.72)}}
@keyframes ${PREFIX}-inner{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(.94);opacity:.7}}
@keyframes ${PREFIX}-outer{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.07);opacity:.22}}
.${PREFIX} [data-part]{animation-duration:var(--${PREFIX}-period);animation-timing-function:ease-in-out;animation-iteration-count:infinite}
.${PREFIX} [data-part=dot]{animation-name:${PREFIX}-dot}
.${PREFIX} [data-part=inner]{animation-name:${PREFIX}-inner}
.${PREFIX} [data-part=outer]{animation-name:${PREFIX}-outer;animation-delay:${scaled(0.12)}}
`;

const breathRingsVariants = cva(
  "relative inline-grid shrink-0 place-items-center text-foreground select-none",
  {
    variants: {
      size: {
        sm: "text-[0.625rem]",
        md: "text-base",
        lg: "text-2xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface BreathRingsProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof breathRingsVariants> {
  /** Announced through a polite live region. Omit it when the context already says what is happening. */
  label?: string;
  /** Length of one breath, in seconds, before the motion scale. */
  period?: number;
}

/** A breathing dot-and-rings cue for an idle or listening state. */
export function BreathRings({
  className,
  size,
  label,
  period = 2,
  style,
  ...props
}: BreathRingsProps) {
  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        data-slot="breath-rings"
        className={cn(PREFIX, breathRingsVariants({ size }), className)}
        style={{ [`--${PREFIX}-period`]: scaled(period), ...style } as CSSProperties}
        {...props}
      >
        <span aria-hidden="true" className="relative grid size-[4.5em] place-items-center">
          <span
            data-part="outer"
            className="absolute inset-0 rounded-full border-[0.0625em] border-current"
          />
          <span
            data-part="inner"
            className="absolute inset-[0.9em] rounded-full border-[0.125em] border-current"
          />
          <span data-part="dot" className="size-[1.4em] rounded-full bg-current" />
        </span>
        {label ? (
          <span role="status" className="sr-only">
            {label}
          </span>
        ) : null}
      </span>
    </>
  );
}

export { breathRingsVariants };
