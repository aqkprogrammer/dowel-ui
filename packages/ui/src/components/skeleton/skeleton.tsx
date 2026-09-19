// Motion from SmoothUI SkeletonLoader (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

const PREFIX = "dowel-skeleton";

/* The highlight travels from the inline start to the inline end. The gradient
 * is twice the element's width, so moving its position from 150% to -50%
 * carries the bright band from just outside one edge to just outside the other. */
const STYLES = `
@keyframes ${PREFIX}-shimmer{from{background-position:150% 0}to{background-position:-50% 0}}
[data-slot=skeleton][data-variant=shimmer]:dir(rtl){animation-direction:reverse}
`;

/* A plain map rather than cva: one axis of two values does not justify adding a
 * dependency to a component that had none. */
const variants = {
  pulse: "animate-pulse-soft",
  // Spelled out because Tailwind reads class names from the source.
  shimmer: cn(
    "bg-[linear-gradient(90deg,transparent_30%,color-mix(in_oklab,var(--color-background)_55%,transparent)_50%,transparent_70%)]",
    "bg-[length:200%_100%] bg-no-repeat",
    "animate-[dowel-skeleton-shimmer_calc(1.6s*var(--motion-scale))_linear_infinite]",
  ),
} as const;

export interface SkeletonProps extends ComponentPropsWithRef<"span"> {
  /** `pulse` fades in and out; `shimmer` sweeps a band of light across. */
  variant?: keyof typeof variants;
}

/**
 * Placeholder shown while content loads.
 *
 * Rendered aria-hidden: the shape is meaningless to a screen reader, and the
 * loading state belongs on the region that owns the data (via aria-busy) rather
 * than on each individual placeholder.
 *
 * A `span` set to `display: block`, not a `div`. A skeleton stands in for
 * whatever was going to be there, so it gets placed inside paragraphs, headings
 * and labels as often as inside layout containers — and a `div` inside a `p` is
 * invalid HTML that the parser corrects, which breaks hydration rather than
 * merely looking wrong. Phrasing content is valid in both places, and `block`
 * keeps the box behaviour identical.
 *
 * `variant="shimmer"` swaps the pulse for a band of light sweeping across. Both
 * are decoration: under reduced motion they stop and the placeholder is a plain
 * block.
 */
export function Skeleton({ className, variant = "pulse", ...props }: SkeletonProps) {
  const shimmer = variant === "shimmer";

  return (
    <>
      {shimmer ? (
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
      ) : null}
      <span
        data-slot="skeleton"
        data-variant={shimmer ? "shimmer" : undefined}
        aria-hidden="true"
        className={cn("block rounded-md bg-muted", variants[variant], className)}
        {...props}
      />
    </>
  );
}
