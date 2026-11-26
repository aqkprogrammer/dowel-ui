"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * Rounded vertical bars whose heights ripple in a travelling wave: a voice
 * or audio-level indicator.
 *
 * Each bar runs the same keyframe (short and dim, then tall and bright) with
 * its delay a fixed step behind its neighbour's, so the crest travels from
 * the first bar to the last and wraps round. Bars scale from their centre,
 * which keeps the row vertically balanced the way a level meter is.
 *
 * It is an indicator: it reports that sound is being heard or played, and a
 * frozen meter would say the opposite. So the root is data-motion="indicator"
 * and every duration runs on --motion-scale-indicator: under reduced motion
 * it slows rather than stops. With `active={false}` the bars settle to a
 * resting height, which is the honest picture of silence.
 *
 * Geometry is in em, so `size` scales the whole thing, and the colour is
 * currentColor. `direction: ltr` on the root: the wave's travel is a
 * picture, not reading order, and mirroring it would change nothing useful.
 *
 * With `label` it is role="status" with that text visually hidden; without
 * one it is aria-hidden decoration beside a label you provide.
 */

const PREFIX = "dowel-wave-bars";

/** A duration in seconds on the indicator motion scale. */
function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--motion-scale-indicator, 1))`;
}

const CYCLE = 1;

const STYLES = `
.${PREFIX}{direction:ltr}
.${PREFIX} [data-part=bar]{transform:scaleY(.32);opacity:.5;transition:transform var(--duration-slow) var(--ease-out-quint),opacity var(--duration-slow) var(--ease-out-quint)}
.${PREFIX}[data-state=active] [data-part=bar]{animation:${PREFIX}-wave ${scaled(CYCLE)} var(--ease-in-out-quint) infinite;animation-delay:var(--delay)}
@keyframes ${PREFIX}-wave{0%,100%{transform:scaleY(.32);opacity:.5}50%{transform:scaleY(1);opacity:1}}
`;

const waveBarsVariants = cva(
  cn(PREFIX, "inline-flex shrink-0 items-center justify-center gap-[0.75em] text-foreground"),
  {
    variants: {
      size: {
        sm: "text-[0.25rem]",
        md: "text-[0.375rem]",
        lg: "text-[0.5rem]",
        xl: "text-[0.75rem]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface WaveBarsProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof waveBarsVariants> {
  /** How many bars. */
  bars?: number;
  /** Whether sound is flowing. Inactive, the bars rest low and still. */
  active?: boolean;
  /** An accessible name. With one it is a polite status; without, it is hidden decoration. */
  label?: string;
}

/** Rounded bars that ripple in a travelling wave, for voice or audio activity. */
export function WaveBars({
  className,
  bars = 5,
  active = true,
  label,
  size,
  ...props
}: WaveBarsProps) {
  const count = Math.max(1, Math.round(bars));
  const step = CYCLE / count;

  return (
    <div
      data-slot="wave-bars"
      data-motion="indicator"
      data-state={active ? "active" : "idle"}
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
      className={cn(waveBarsVariants({ size }), className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          data-part="bar"
          data-motion="indicator"
          aria-hidden="true"
          className="block h-[6em] w-[1em] rounded-full bg-current"
          // Negative delays start each bar mid-cycle, so the wave is already
          // travelling on the first frame rather than rising out of a flat row.
          style={{ "--delay": scaled(-(count - index) * step) } as CSSProperties}
        />
      ))}
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

export { waveBarsVariants };
