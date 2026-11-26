"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * A radar scope: faint range rings, a sweep and the blips it finds.
 *
 * The sweep is one rotating layer holding a conic gradient — bright at the
 * leading edge, fading to nothing a quarter-turn behind it — and a hairline
 * along that edge. Each blip runs a keyframe on the same period that flares
 * when the edge crosses it and decays until the next pass; its negative delay
 * is its bearing as a fraction of the turn, so blip and sweep stay in phase
 * without any script.
 *
 * It is decoration, not an indicator: under reduced motion the global rule
 * runs each loop once, instantly, so the sweep settles pointing up and the
 * blips rest at their dim afterglow. Durations also run through
 * --motion-scale.
 *
 * Without `label` the whole scope is aria-hidden. With one it is an image of
 * that name ("Scanning for devices"); put any real status in text beside it.
 * Everything is drawn in currentColor. A rotation does not mirror, so there
 * is nothing to flip in right-to-left layouts; `direction: ltr` keeps the
 * blip coordinates absolute anyway.
 */

const PREFIX = "dowel-radar";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const PERIOD = "--radar-period";
const DELAY = "--radar-delay";

const STYLES = `
@keyframes ${PREFIX}-sweep{to{rotate:360deg}}
@keyframes ${PREFIX}-blip{0%{opacity:1;scale:1.5}12%{opacity:.95;scale:1.15}70%,100%{opacity:.22;scale:1}}
[data-slot=radar-sweep]{animation:${PREFIX}-sweep var(${PERIOD}) linear infinite}
[data-slot=radar-blip]{animation:${PREFIX}-blip var(${PERIOD}) ease-out var(${DELAY}) infinite both}
`;

const radarVariants = cva(
  "relative isolate inline-block shrink-0 overflow-hidden rounded-full text-foreground [direction:ltr]",
  {
    variants: {
      size: {
        sm: "size-20",
        md: "size-32",
        lg: "size-48",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface RadarBlip {
  /** Bearing in degrees, clockwise from the top. */
  angle: number;
  /** Distance from the centre, 0–1. */
  distance: number;
}

const DEFAULT_BLIPS: RadarBlip[] = [
  { angle: 48, distance: 0.5 },
  { angle: 150, distance: 0.62 },
  { angle: 262, distance: 0.72 },
];

export interface RadarProps
  extends Omit<ComponentPropsWithRef<"div">, "children">, VariantProps<typeof radarVariants> {
  /** Points the sweep lights up as it passes. */
  blips?: RadarBlip[];
  /** One full turn, in milliseconds. Scaled by --motion-scale. */
  period?: number;
  /** Number of range rings, outermost included. */
  rings?: number;
  /** Accessible name. Omit it and the scope is decorative (aria-hidden). */
  label?: string;
}

/** A radar scope whose sweep rotates over faint range rings and brightens the blips it passes. */
export function Radar({
  className,
  size,
  blips = DEFAULT_BLIPS,
  period = 2000,
  rings = 3,
  label,
  style,
  ...props
}: RadarProps) {
  const ringRadii = Array.from({ length: rings }, (_, index) => (48 * (index + 1)) / rings);

  return (
    <div
      data-slot="radar"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={cn(radarVariants({ size }), className)}
      style={{ [PERIOD]: scaled(period), ...style } as CSSProperties}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 size-full">
        {ringRadii.map((radius) => (
          <circle
            key={radius}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.16"
            strokeWidth="0.8"
          />
        ))}
      </svg>
      <div
        data-slot="radar-sweep"
        aria-hidden="true"
        className="absolute inset-[2%] rounded-full"
        style={{
          backgroundImage:
            "conic-gradient(from 0deg, transparent 0deg 270deg, " +
            "color-mix(in oklab, currentColor 8%, transparent) 300deg, " +
            "color-mix(in oklab, currentColor 55%, transparent) 360deg)",
        }}
      >
        <span className="absolute inset-x-0 top-0 mx-auto h-1/2 w-[1.5px] rounded-full bg-current" />
      </div>
      {blips.map((blip, index) => {
        const radians = (blip.angle * Math.PI) / 180;
        const reach = Math.min(1, Math.max(0, blip.distance)) * 46;
        return (
          <span
            key={index}
            data-slot="radar-blip"
            aria-hidden="true"
            className="absolute size-[5%] -translate-1/2 rounded-full bg-current"
            style={
              {
                // rtl-ok: polar coordinates on a scope that never mirrors.
                left: `${String(50 + Math.sin(radians) * reach)}%`,
                top: `${String(50 - Math.cos(radians) * reach)}%`,
                [DELAY]: `calc(${scaled(period)} * ${String((blip.angle % 360) / 360 - 1)})`,
              } as CSSProperties
            }
          />
        );
      })}
      <span
        aria-hidden="true"
        className="absolute inset-0 m-auto size-[7%] rounded-full bg-current shadow-[0_0_0.5em_currentColor]"
      />
    </div>
  );
}

export { radarVariants };
