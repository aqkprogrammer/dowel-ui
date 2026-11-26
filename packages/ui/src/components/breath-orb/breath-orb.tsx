"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentPropsWithRef, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * A large soft orb inside a faint ring. The orb breathes: it shrinks to about
 * two thirds of its size and swells back, easing at both ends, on a two-second
 * loop. The ring answers a beat later and much more quietly, drawing in a
 * little and brightening as the orb exhales, so the two read as one breath
 * rather than two pulses.
 *
 * Both are CSS keyframes on `scale`, with durations through --motion-scale.
 * This is decoration, not a progress indicator, so it takes no exemption from
 * reduced motion: the global rule ends the loop and the orb settles at full
 * size, still. `paused` holds it on the current frame.
 *
 * It is aria-hidden by default. Pass `label` when the breath means something
 * (a guided breathing exercise, a listening state) and it becomes role="img"
 * with that name. Geometry is in `em`, so the size variants change one font
 * size; colours are the foreground token, so it inverts with the theme.
 */

const P = "dowel-breath-orb";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const STYLES = `
.${P} [data-part]{animation-duration:var(--dur);animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.45,0,.55,1)}
.${P} [data-part=orb]{animation-name:${P}-orb}
.${P} [data-part=ring]{animation-name:${P}-ring}
.${P}[data-paused] [data-part]{animation-play-state:paused}
@keyframes ${P}-orb{0%,100%{scale:1}50%{scale:.62}}
@keyframes ${P}-ring{0%,100%{scale:1;opacity:.75}55%{scale:.95;opacity:1}}
`;

const breathOrbVariants = cva("relative inline-grid shrink-0 place-items-center", {
  variants: {
    size: {
      sm: "text-[0.375rem]",
      md: "text-[0.5rem]",
      lg: "text-[0.75rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface BreathOrbProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof breathOrbVariants> {
  /** Seconds for one full breath, in and out. */
  duration?: number;
  /** Holds the breath on its current frame. */
  paused?: boolean;
  /** Names it as an image. Without it, the orb is hidden from assistive tech. */
  label?: string;
}

/** A soft orb breathing inside a faint ring. Decorative. */
export function BreathOrb({
  className,
  size,
  duration = 2,
  paused = false,
  label,
  style,
  ...props
}: BreathOrbProps) {
  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <span
        data-slot="breath-orb"
        data-paused={paused ? "" : undefined}
        {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
        className={cn(P, breathOrbVariants({ size }), className)}
        style={{
          width: "12em",
          height: "12em",
          ...({ "--dur": s(duration) } as CSSProperties),
          ...style,
        }}
        {...props}
      >
        <span
          data-part="ring"
          className="absolute inset-0 rounded-full border border-foreground/15 bg-foreground/[0.03] shadow-[inset_0_0_1.5em] shadow-foreground/5"
        />
        <span
          data-part="orb"
          className="block size-[5.5em] rounded-full bg-foreground shadow-[0_0_2.5em] shadow-foreground/20"
        />
      </span>
    </>
  );
}

export { breathOrbVariants };
