import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

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
 */
export function Skeleton({ className, ...props }: ComponentPropsWithRef<"span">) {
  return (
    <span
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("block animate-pulse-soft rounded-md bg-muted", className)}
      {...props}
    />
  );
}
