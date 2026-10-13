// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/*
 * A short light that travels round the border of whatever it sits in.
 *
 * Drop it inside any positioned element — a button, a card, an input's
 * wrapper — and it takes that element's radius. It is one CSS animation and
 * no JavaScript, so it renders on the server and costs nothing per frame on
 * the main thread:
 *
 * - The light is a conic gradient whose start angle, a registered `<angle>`
 *   custom property, turns a full circle per pass. A bright head and a tail
 *   that fades to the second colour make the beam; the rest of the circle is
 *   transparent.
 * - The gradient fills the element's border box and is masked down to its
 *   border ring (the padding box subtracted from the border box), so only a
 *   `thickness`-wide band of it shows.
 * - The glow is a drop-shadow on an outer wrapper, because a filter on the
 *   masked element itself would be masked away with everything else.
 *
 * Decoration only: aria-hidden, no pointer events. Under reduced motion the
 * global blanket settles the animation on its last frame, which is its
 * first, so the beam rests at the start of its path; in forced-colours mode
 * it is removed and the element's own border carries the shape.
 */

const PREFIX = "dowel-border-beam";

const STYLES = `
@property --${PREFIX}-angle{syntax:"<angle>";inherits:false;initial-value:0deg}
[data-slot=border-beam-line]{position:absolute;inset:0;border-radius:inherit;border:var(--${PREFIX}-thickness,1px) solid transparent;background:conic-gradient(from var(--${PREFIX}-angle),transparent 0deg,transparent calc(360deg - var(--${PREFIX}-length,72deg)),var(--${PREFIX}-to) calc(360deg - var(--${PREFIX}-length,72deg) * 0.6),var(--${PREFIX}-from) calc(360deg - var(--${PREFIX}-length,72deg) * 0.15),var(--${PREFIX}-from) 359.5deg,transparent 360deg) border-box;-webkit-mask:linear-gradient(var(--color-foreground) 0 0) padding-box,linear-gradient(var(--color-foreground) 0 0);-webkit-mask-composite:xor;mask:linear-gradient(var(--color-foreground) 0 0) padding-box exclude,linear-gradient(var(--color-foreground) 0 0);animation:${PREFIX}-turn var(--${PREFIX}-duration) linear var(--${PREFIX}-delay) infinite var(--${PREFIX}-direction,normal)}
[data-slot=border-beam][data-trigger=hover]{opacity:0;transition:opacity var(--duration-normal) var(--ease-out-quint)}
[data-slot=border-beam][data-trigger=hover]>[data-slot=border-beam-line]{animation-play-state:paused}
:hover>[data-slot=border-beam][data-trigger=hover],:focus-visible>[data-slot=border-beam][data-trigger=hover],:focus-within>[data-slot=border-beam][data-trigger=hover]{opacity:1}
:hover>[data-slot=border-beam][data-trigger=hover]>[data-slot=border-beam-line],:focus-visible>[data-slot=border-beam][data-trigger=hover]>[data-slot=border-beam-line],:focus-within>[data-slot=border-beam][data-trigger=hover]>[data-slot=border-beam-line]{animation-play-state:running}
@keyframes ${PREFIX}-turn{to{--${PREFIX}-angle:360deg}}
@media (forced-colors:active){[data-slot=border-beam]{display:none}}
`;

/** The beam's colours. `color` and `colorTo` override them with any CSS colour. */
const borderBeamVariants = cva("pointer-events-none absolute -inset-px rounded-[inherit]", {
  variants: {
    tone: {
      primary:
        "[--dowel-border-beam-from:var(--color-primary)] [--dowel-border-beam-to:color-mix(in_oklab,var(--color-primary)_45%,transparent)]",
      foreground:
        "[--dowel-border-beam-from:var(--color-foreground)] [--dowel-border-beam-to:color-mix(in_oklab,var(--color-foreground)_35%,transparent)]",
      info: "[--dowel-border-beam-from:var(--color-info)] [--dowel-border-beam-to:color-mix(in_oklab,var(--color-info)_45%,transparent)]",
      success:
        "[--dowel-border-beam-from:var(--color-success)] [--dowel-border-beam-to:color-mix(in_oklab,var(--color-success)_45%,transparent)]",
      warning:
        "[--dowel-border-beam-from:var(--color-warning)] [--dowel-border-beam-to:color-mix(in_oklab,var(--color-warning)_45%,transparent)]",
      destructive:
        "[--dowel-border-beam-from:var(--color-destructive)] [--dowel-border-beam-to:color-mix(in_oklab,var(--color-destructive)_45%,transparent)]",
      /** The brand pair: a primary head with a warm tail. */
      brand:
        "[--dowel-border-beam-from:var(--color-primary)] [--dowel-border-beam-to:var(--color-warning)]",
    },
    glow: {
      true: "[filter:drop-shadow(0_0_var(--dowel-border-beam-glow,6px)_var(--dowel-border-beam-from))]",
      false: "",
    },
  },
  defaultVariants: {
    tone: "primary",
    glow: false,
  },
});

export type BorderBeamTone = NonNullable<VariantProps<typeof borderBeamVariants>["tone"]>;

export interface BorderBeamProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children" | "color">,
    VariantProps<typeof borderBeamVariants> {
  /** One full trip round the border, in milliseconds. Default 6000. */
  duration?: number;
  /** Wait before the first trip, in milliseconds. Negative starts part-way round. Default 0. */
  delay?: number;
  /** How much of the border the beam covers, 0–1. Default 0.2. */
  length?: number;
  /** Width of the beam in pixels. Default 1 — the width of a hairline border. */
  thickness?: number;
  /** The colour of the beam's head, overriding `tone`. Any CSS colour; prefer a token. */
  color?: string;
  /** The colour its tail fades through, overriding `tone`. */
  colorTo?: string;
  /** Travel anticlockwise. */
  reverse?: boolean;
  /** `always` runs continuously; `hover` shows and runs it only while the parent is hovered or holds focus. */
  trigger?: "always" | "hover";
}

/**
 * A light that travels round its parent's border. Place it as the last child
 * of a positioned element (`relative`); it inherits the parent's radius.
 */
export function BorderBeam({
  tone,
  glow,
  duration = 6000,
  delay = 0,
  length = 0.2,
  thickness = 1,
  color,
  colorTo,
  reverse = false,
  trigger = "always",
  className,
  style,
  ...props
}: BorderBeamProps) {
  const vars: Record<string, string> = {
    [`--${PREFIX}-duration`]: scaled(Math.max(0, duration)),
    [`--${PREFIX}-delay`]: scaled(delay),
    [`--${PREFIX}-length`]: `${String(Math.round(clamp(Number.isFinite(length) ? length : 0.2, 0.02, 1) * 360))}deg`,
    [`--${PREFIX}-thickness`]: `${String(Math.max(0, thickness))}px`,
  };
  if (reverse) vars[`--${PREFIX}-direction`] = "reverse";
  if (color !== undefined) vars[`--${PREFIX}-from`] = color;
  if (colorTo !== undefined) vars[`--${PREFIX}-to`] = colorTo;

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        data-slot="border-beam"
        data-trigger={trigger}
        className={cn(borderBeamVariants({ tone, glow }), className)}
        style={{ ...vars, ...style }}
        {...props}
      >
        <span data-slot="border-beam-line" />
      </span>
    </>
  );
}

/** Milliseconds, scaled so --motion-scale reaches it. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export { borderBeamVariants };
