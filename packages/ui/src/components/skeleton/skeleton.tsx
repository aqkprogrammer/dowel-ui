import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Placeholder shown while content loads.
 *
 * Rendered aria-hidden: the shape is meaningless to a screen reader, and the
 * loading state belongs on the region that owns the data (via aria-busy) rather
 * than on each individual placeholder.
 */
export function Skeleton({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse-soft rounded-md bg-muted", className)}
      {...props}
    />
  );
}
