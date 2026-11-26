"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentPropsWithRef, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * Eight small dots sit on a ring. A bright head and the two dots behind it
 * swell as they pass, so two or three large dots appear to chase each other
 * round while the rest stay small and grey.
 *
 * There is no rotating layer: each dot runs the same swell keyframe, offset by
 * its place on the ring, and the offsets are negative so the chase is already
 * under way on the first frame. Geometry is in `em` (the size variants change
 * one font size) and the colour is `currentColor`.
 *
 * This is a loading indicator, so it is marked data-motion="indicator" and its
 * timing runs through --motion-scale-indicator: under reduced motion it slows
 * rather than stopping, because a frozen loader reads as a hang. The root is
 * role="status" with a visually hidden label; the dots are aria-hidden. The
 * chase runs clockwise in every writing direction (`direction: ltr`): it is a
 * spinner, not reading order.
 */

const P = "dowel-ring-dots";

const scaled = (seconds: number) =>
  `calc(${String(seconds)}s * var(--motion-scale-indicator, 1))`;

const STYLES = `
.${P}{direction:ltr}
.${P} [data-part=dot]{scale:.45;opacity:.35;animation:${P}-chase var(--dur) linear infinite;animation-delay:var(--delay)}
@keyframes ${P}-chase{0%{scale:1;opacity:1}12.5%{scale:.92;opacity:.9}25%{scale:.65;opacity:.55}40%,100%{scale:.45;opacity:.35}}
`;

const ringDotsVariants = cva("relative inline-block shrink-0 text-foreground", {
  variants: {
    size: {
      sm: "text-[0.25rem]",
      md: "text-[0.375rem]",
      lg: "text-[0.5rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface RingDotsProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof ringDotsVariants> {
  /** Announced to assistive technology while the loader is shown. */
  label?: string;
  /** Number of dots on the ring. */
  count?: number;
  /** Seconds for the bright dots to go once round. */
  duration?: number;
}

/** A ring of dots with a few larger, brighter ones chasing round it. */
export function RingDots({
  className,
  size,
  label = "Loading",
  count = 8,
  duration = 2,
  style,
  ...props
}: RingDotsProps) {
  const dots = Math.max(3, Math.round(count));
  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <span
        role="status"
        data-slot="ring-dots"
        // Exempt from the reduced-motion blanket: this only says "still working",
        // and stopping it would say the opposite. It is slowed instead.
        data-motion="indicator"
        className={cn(P, ringDotsVariants({ size }), className)}
        style={{ width: "7em", height: "7em", ...style }}
        {...props}
      >
        <span aria-hidden="true" className="absolute inset-0">
          {Array.from({ length: dots }, (_, index) => (
            <span
              key={index}
              className="absolute inset-0 grid place-items-center"
              style={{ transform: `rotate(${String((index * 360) / dots)}deg)` }}
            >
              <span
                data-part="dot"
                data-motion="indicator"
                className="block size-[1.5em] rounded-full bg-current"
                style={
                  {
                    translate: "0 -2.75em",
                    "--dur": scaled(duration),
                    "--delay": scaled(duration * (index / dots - 1)),
                  } as CSSProperties
                }
              />
            </span>
          ))}
        </span>
        <span className="sr-only">{label}</span>
      </span>
    </>
  );
}

export { ringDotsVariants };
