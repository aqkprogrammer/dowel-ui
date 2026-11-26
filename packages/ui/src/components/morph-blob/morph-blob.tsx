"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/*
 * A soft shape that keeps changing its mind: a circle loosens into a blob,
 * firms up into a rounded square, turns a little, leans into a teardrop and
 * rounds back into a circle, on a two-second loop.
 *
 * The whole morph is one element animating its eight-value border-radius
 * (each corner's horizontal and vertical radius as a percentage) with a small
 * rotation and scale riding along, so there is no SVG path to interpolate and
 * the browser composites it cheaply. The fill is `bg-foreground` by default;
 * tint it with a `bg-*` class.
 *
 * It is decorative: aria-hidden, no role. Every duration runs through
 * --motion-scale, and under reduced motion the animation is removed outright
 * and the shape rests as a plain circle.
 */

const P = "dowel-morph-blob";

const STYLES = `
.${P}{border-radius:50%;animation:${P}-morph calc(var(--morph-blob-duration, 2s) * var(--motion-scale, 1)) cubic-bezier(.45,0,.55,1) infinite}
.${P}[data-paused]{animation-play-state:paused}
@keyframes ${P}-morph{
0%{border-radius:50% 50% 50% 50% / 50% 50% 50% 50%;transform:rotate(0) scale(.9)}
14%{border-radius:58% 42% 54% 46% / 44% 56% 46% 56%;transform:rotate(-8deg) scale(1)}
30%{border-radius:30% 30% 30% 30% / 30% 30% 30% 30%;transform:rotate(0) scale(.98)}
46%{border-radius:34% 30% 36% 30% / 30% 36% 30% 34%;transform:rotate(14deg) scale(1.02)}
62%{border-radius:50% 50% 50% 50% / 64% 64% 36% 36%;transform:rotate(-16deg) scale(1)}
76%{border-radius:56% 44% 48% 52% / 58% 48% 52% 42%;transform:rotate(6deg) scale(.94)}
88%,100%{border-radius:50% 50% 50% 50% / 50% 50% 50% 50%;transform:rotate(0) scale(.9)}
}
@media (prefers-reduced-motion:reduce){.${P}{animation:none;border-radius:50%;transform:none}}
`;

const morphBlobVariants = cva("block shrink-0 bg-foreground", {
  variants: {
    size: {
      sm: "size-8",
      md: "size-12",
      lg: "size-20",
    },
  },
  defaultVariants: { size: "md" },
});

export interface MorphBlobProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof morphBlobVariants> {
  /** Length of one full morph, in seconds, before motion scaling. Defaults to 2. */
  duration?: number;
  /** Holds the shape where it is. */
  paused?: boolean;
}

/** A decorative blob that morphs between a circle, a rounded square and a teardrop. */
export function MorphBlob({
  className,
  size,
  duration,
  paused,
  style,
  ...props
}: MorphBlobProps) {
  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        data-slot="morph-blob"
        data-paused={paused ? "" : undefined}
        className={cn(P, morphBlobVariants({ size }), className)}
        style={{
          ...(duration === undefined
            ? null
            : { ["--morph-blob-duration" as string]: `${String(duration)}s` }),
          ...style,
        }}
        {...props}
      />
    </>
  );
}

export { morphBlobVariants };
