"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { useCallback, type ComponentPropsWithRef, type CSSProperties } from "react";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

/*
 * The quiet backgrounds every product needs: dots, a grid, ruled lines,
 * diagonal stripes, a checker, or a fine grain, in a theme colour, behind
 * content.
 *
 * Each is a CSS gradient on one layer, so it costs nothing to paint and
 * renders on the server. `drift` moves the layer by exactly one cell and
 * loops, so the motion is seamless and transform-only; it pauses off-screen,
 * and under reduced motion the global blanket stops it on a frame identical
 * to the first. Decoration: aria-hidden, no pointer events.
 */

const PREFIX = "dowel-pattern-background";

const STYLES = `
@keyframes ${PREFIX}-drift{to{transform:translate3d(var(--${PREFIX}-size),var(--${PREFIX}-size),0)}}
[data-slot=pattern-background][data-paused] [data-slot=pattern-background-layer]{animation-play-state:paused}
@media (forced-colors:active){[data-slot=pattern-background-layer]{display:none}}
`;

export const PATTERN_BACKGROUND_PATTERNS = [
  "dots",
  "grid",
  "lines",
  "diagonal",
  "checker",
  "noise",
] as const;

export type PatternBackgroundPattern = (typeof PATTERN_BACKGROUND_PATTERNS)[number];

/** The grain: SVG turbulence, desaturated, as a data URI. No colours in it. */
const NOISE = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

/**
 * The CSS background for a pattern: the image, and the tile it repeats at.
 * `color` is any CSS colour; `size` and `thickness` are in pixels.
 */
export function patternBackgroundStyle(
  pattern: PatternBackgroundPattern,
  color: string,
  size: number,
  thickness: number,
): Pick<CSSProperties, "backgroundImage" | "backgroundSize"> {
  const s = `${String(size)}px`;
  const t = `${String(thickness)}px`;
  switch (pattern) {
    case "dots":
      return {
        backgroundImage: `radial-gradient(circle at center, ${color} ${t}, transparent calc(${t} + 0.5px))`,
        backgroundSize: `${s} ${s}`,
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(to right, ${color} ${t}, transparent ${t}), linear-gradient(to bottom, ${color} ${t}, transparent ${t})`,
        backgroundSize: `${s} ${s}`,
      };
    case "lines":
      return {
        backgroundImage: `linear-gradient(to bottom, ${color} ${t}, transparent ${t})`,
        backgroundSize: `${s} ${s}`,
      };
    case "diagonal":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${color} 0 ${t}, transparent ${t} calc(${s} / 1.4142))`,
        backgroundSize: `${s} ${s}`,
      };
    case "checker":
      return {
        backgroundImage: `conic-gradient(${color} 25%, transparent 0 50%, ${color} 0 75%, transparent 0)`,
        backgroundSize: `${s} ${s}`,
      };
    case "noise":
      return { backgroundImage: NOISE, backgroundSize: "160px 160px" };
  }
}

const patternBackgroundVariants = cva("relative isolate overflow-hidden", {
  variants: {
    /** Fades the pattern out so it sits inside a section rather than filling it edge to edge. */
    fade: {
      none: "",
      edges:
        "[&>[data-slot=pattern-background-scene]]:[mask-image:radial-gradient(ellipse_at_center,var(--color-foreground)_35%,transparent_80%)]",
      top: "[&>[data-slot=pattern-background-scene]]:[mask-image:linear-gradient(to_top,var(--color-foreground)_30%,transparent)]",
      bottom:
        "[&>[data-slot=pattern-background-scene]]:[mask-image:linear-gradient(to_bottom,var(--color-foreground)_30%,transparent)]",
    },
  },
  defaultVariants: { fade: "none" },
});

export interface PatternBackgroundProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof patternBackgroundVariants> {
  /** What to draw. Default "dots". */
  pattern?: PatternBackgroundPattern;
  /** The pattern colour: a token ("border", "primary") or any CSS colour. Default "border". */
  color?: string;
  /** The repeat, in pixels. Default 24. */
  size?: number;
  /** Dot radius or line width, in pixels. Default 1. */
  thickness?: number;
  /** Strength of the pattern, 0–1. Default 1; grain reads best around 0.2. */
  opacity?: number;
  /** Slowly slide the pattern diagonally. Default false. */
  drift?: boolean;
  /** Seconds per cell of drift. Default 3. */
  driftDuration?: number;
}

/** Dots, a grid, lines, stripes, a checker or grain behind content — CSS only. */
export function PatternBackground({
  pattern = "dots",
  color = "border",
  size = 24,
  thickness = 1,
  opacity = 1,
  drift = false,
  driftDuration = 3,
  fade,
  className,
  children,
  ref,
  ...props
}: PatternBackgroundProps) {
  const { ref: inViewRef, inView } = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      inViewRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [inViewRef, ref],
  );

  const cell = Math.max(4, size);
  const css = /^[a-z][a-z0-9-]*$/.test(color) ? `var(--color-${color})` : color;
  const moving = drift && pattern !== "noise";

  return (
    <div
      ref={setRefs}
      data-slot="pattern-background"
      data-pattern={pattern}
      data-paused={(moving && !inView) || undefined}
      className={cn(patternBackgroundVariants({ fade }), className)}
      {...props}
    >
      {moving ? (
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
      ) : null}
      <div
        aria-hidden="true"
        data-slot="pattern-background-scene"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ opacity: Math.min(1, Math.max(0, opacity)) }}
      >
        <div
          data-slot="pattern-background-layer"
          className="absolute"
          style={
            {
              ...patternBackgroundStyle(pattern, css, cell, Math.max(0.5, thickness)),
              // One cell larger on each side, so the drift never shows an edge.
              inset: moving ? `-${String(cell)}px` : 0,
              [`--${PREFIX}-size`]: `${String(cell)}px`,
              animation: moving
                ? `${PREFIX}-drift calc(${String(Math.max(0.5, driftDuration))}s * var(--motion-scale, 1)) linear infinite`
                : undefined,
            } as CSSProperties
          }
        />
      </div>
      <div data-slot="pattern-background-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

export { patternBackgroundVariants };
