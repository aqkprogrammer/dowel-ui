"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/*
 * A glassy placeholder card with one soft diagonal shimmer sweeping across it.
 *
 * The light is a single overlay over the whole card rather than a gradient per
 * shape, so it reads as one sheen travelling across a pane of glass — the
 * shapes underneath stay flat and the band crosses them all at once. The band
 * is a 115° gradient three times the card's width; moving its position carries
 * it from beyond one edge to beyond the other, then it rests for the remainder
 * of the cycle before the next pass. It runs from the inline start, so in RTL
 * it is reversed with `:dir(rtl)`.
 *
 * Accessibility: the root is a polite `role="status"` named by `label`
 * ("Loading" by default) so a screen reader hears that content is on its way
 * once, and every shape is aria-hidden — a grey rectangle means nothing read
 * aloud. The shimmer is decoration: under reduced motion the global blanket
 * stops it and the card is a still placeholder.
 */

const PREFIX = "dowel-shimmer-skeleton";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `
@keyframes ${PREFIX}-sweep{0%{background-position:100% 0}70%,100%{background-position:0% 0}}
[data-slot=shimmer-skeleton-sheen]{background-image:linear-gradient(115deg,transparent 38%,color-mix(in oklab,var(--color-foreground) 14%,transparent) 50%,transparent 62%);background-size:300% 100%;background-repeat:no-repeat;animation:${PREFIX}-sweep ${scaled(2000)} var(--ease-in-out-quint) infinite}
[data-slot=shimmer-skeleton-sheen]:dir(rtl){animation-direction:reverse}
`;

const shimmerSkeletonVariants = cva(
  cn(
    "relative isolate overflow-hidden rounded-2xl border border-foreground/10",
    "bg-foreground/[0.04] shadow-sm backdrop-blur-md",
  ),
  {
    variants: {
      size: {
        sm: "w-40 p-3 text-[0.75rem]",
        md: "w-56 p-4 text-[1rem]",
        lg: "w-72 p-5 text-[1.25rem]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const shimmerSkeletonShapeVariants = cva("block shrink-0 bg-foreground/15", {
  variants: {
    shape: {
      circle: "size-[2em] rounded-full",
      line: "h-[0.375em] w-full rounded-full",
      block: "h-[2.5em] w-full rounded-xl",
    },
  },
  defaultVariants: { shape: "line" },
});

export interface ShimmerSkeletonShapeProps
  extends ComponentPropsWithRef<"span">, VariantProps<typeof shimmerSkeletonShapeVariants> {}

/** One placeholder shape inside a ShimmerSkeleton: a circle, a text line or a block. */
export function ShimmerSkeletonShape({
  className,
  shape,
  ...props
}: ShimmerSkeletonShapeProps) {
  return (
    <span
      aria-hidden="true"
      data-slot="shimmer-skeleton-shape"
      data-shape={shape ?? "line"}
      className={cn(shimmerSkeletonShapeVariants({ shape }), className)}
      {...props}
    />
  );
}

/** The reference layout: an avatar beside two text lines, over a large media block. */
function CardPreset() {
  return (
    <span className="flex flex-col gap-[0.75em]">
      <span className="flex items-center gap-[0.75em]">
        <ShimmerSkeletonShape shape="circle" />
        <span className="flex flex-1 flex-col gap-[0.4em]">
          <ShimmerSkeletonShape shape="line" />
          <ShimmerSkeletonShape shape="line" className="w-3/4" />
        </span>
      </span>
      <ShimmerSkeletonShape shape="block" />
    </span>
  );
}

export interface ShimmerSkeletonProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof shimmerSkeletonVariants> {
  /** Announced once to assistive technology. Pass an empty string to stay silent. */
  label?: string;
  /** Play the shimmer. Set false to show a still placeholder. */
  shimmer?: boolean;
}

/**
 * A glassy card skeleton with a diagonal shimmer. With no children it draws
 * the preset card (avatar, two lines, a block); compose `ShimmerSkeletonShape`
 * children for any other layout.
 */
export function ShimmerSkeleton({
  className,
  size,
  label = "Loading",
  shimmer = true,
  children,
  ...props
}: ShimmerSkeletonProps) {
  return (
    <div
      role={label ? "status" : undefined}
      aria-busy="true"
      data-slot="shimmer-skeleton"
      className={cn(shimmerSkeletonVariants({ size }), className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {label ? <span className="sr-only">{label}</span> : null}
      <span aria-hidden="true" className="block">
        {children ?? <CardPreset />}
      </span>
      {shimmer ? (
        <span
          aria-hidden="true"
          data-slot="shimmer-skeleton-sheen"
          className="pointer-events-none absolute inset-0"
        />
      ) : null}
    </div>
  );
}

export { shimmerSkeletonShapeVariants, shimmerSkeletonVariants };
