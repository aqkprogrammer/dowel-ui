"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * A planet and two moons: a loading indicator.
 *
 * A large dot holds the centre inside a faint orbit ring. Two satellites
 * circle it on separate rotating layers — the outer one on the ring, larger
 * and slower; the inner one closer in, smaller and quicker — so they drift in
 * and out of step and the figure never looks like it is repeating. Each layer
 * is a square the size of its orbit with the satellite pinned to its top edge,
 * spun linearly; the satellite itself never moves relative to its layer.
 *
 * Geometry is in `em`, so `size` scales the whole figure through one font
 * size, and colour is `currentColor` (the ring at low opacity). The root is
 * `direction: ltr` — an orbit has a handedness, not a reading order.
 *
 * Accessibility: an indicator. A visually hidden `role="status"` carries the
 * `label` ("Loading" by default); the drawing is aria-hidden. Because a frozen
 * loader reads as a hang, the root is `data-motion="indicator"` and its
 * durations run on `--motion-scale-indicator`: reduced motion slows it rather
 * than stopping it.
 */

const PREFIX = "dowel-orbit-dots";

/** A duration in seconds on the indicator motion scale. */
function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--motion-scale-indicator, 1))`;
}

const STYLES = `
@keyframes ${PREFIX}-spin{from{transform:rotate(var(--start,0deg))}to{transform:rotate(calc(var(--start,0deg) + 360deg))}}
[data-slot=orbit-dots-layer]{position:absolute;left:50%;top:50%;border-radius:9999px;translate:-50% -50%;animation:${PREFIX}-spin var(--dur) linear infinite}
[data-slot=orbit-dots-satellite]{position:absolute;left:50%;top:0;border-radius:9999px;background:currentColor;translate:-50% -50%}
`;

const orbitDotsVariants = cva(
  "relative inline-block shrink-0 align-middle text-foreground [direction:ltr]",
  {
    variants: {
      size: {
        sm: "text-[0.625rem]",
        md: "text-[0.875rem]",
        lg: "text-[1.25rem]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/** One orbiting satellite: radius and dot size in em, period in seconds. */
interface Satellite {
  radius: number;
  dot: number;
  period: number;
  start: number;
}

const SATELLITES: Satellite[] = [
  { radius: 2.25, dot: 0.55, period: 2, start: 120 },
  { radius: 1.35, dot: 0.35, period: 1.3, start: 140 },
];

export interface OrbitDotsProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof orbitDotsVariants> {
  /**
   * Announced to assistive technology. Pass an empty string when the loader
   * sits inside something that already reports its busy state.
   */
  label?: string;
  /** Multiplies both orbit periods: 2 is half speed. */
  speed?: number;
}

/** A loading indicator: a centre dot with two satellites orbiting at different radii and speeds. */
export function OrbitDots({
  className,
  size,
  label = "Loading",
  speed = 1,
  style,
  ...props
}: OrbitDotsProps) {
  return (
    <span
      data-slot="orbit-dots"
      // Exempt from the reduced-motion blanket: a loader that stops says the
      // application has hung. It is slowed instead — see ADR 0014.
      data-motion="indicator"
      className={cn(orbitDotsVariants({ size }), className)}
      style={{ width: "5.25em", height: "5.25em", ...style }}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span aria-hidden="true" className="absolute inset-0">
        <span
          data-slot="orbit-dots-ring"
          className="absolute inset-[0.375em] rounded-full border border-current opacity-20"
        />
        <span
          data-slot="orbit-dots-core"
          className="absolute inset-0 m-auto size-[1.1em] rounded-full bg-current"
        />
        {SATELLITES.map((satellite) => (
          <span
            key={satellite.radius}
            data-slot="orbit-dots-layer"
            data-motion="indicator"
            style={
              {
                width: `${String(satellite.radius * 2)}em`,
                height: `${String(satellite.radius * 2)}em`,
                "--dur": scaled(satellite.period * speed),
                "--start": `${String(satellite.start)}deg`,
              } as CSSProperties
            }
          >
            <span
              data-slot="orbit-dots-satellite"
              style={{
                width: `${String(satellite.dot)}em`,
                height: `${String(satellite.dot)}em`,
              }}
            />
          </span>
        ))}
      </span>
      {label ? (
        <span role="status" className="sr-only">
          {label}
        </span>
      ) : null}
    </span>
  );
}

export { orbitDotsVariants };
