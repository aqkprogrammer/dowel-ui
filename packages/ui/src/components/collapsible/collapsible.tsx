"use client";

import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A section that opens and closes.
 *
 * Unlike Accordion, there is no set: one region, one trigger, no notion of
 * "only one open at a time". Reaching for an Accordion with a single item
 * gives that item a `heading` role and a position in a list of one, both of
 * which are noise.
 *
 * The height animation is driven by the primitive's own measured height rather
 * than a guess, so content of any size opens smoothly, and it derives from
 * `--duration-*` so the motion scale applies.
 */

export type CollapsibleProps = ComponentPropsWithRef<typeof CollapsiblePrimitive.Root>;

/**
 * Wrapped rather than re-exported.
 *
 * A bare `export const Collapsible = CollapsiblePrimitive.Root` leaves the
 * inferred type pointing into the primitive's own package, which TypeScript
 * cannot name in declaration output (TS2883). It also gives every other
 * component's `data-slot` a hole where this one should be.
 */
export function Collapsible({ className, ...props }: CollapsibleProps) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" className={className} {...props} />;
}

export function CollapsibleTrigger({
  className,
  ...props
}: ComponentPropsWithRef<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

export function CollapsibleContent({
  className,
  ...props
}: ComponentPropsWithRef<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden",
        "data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down",
        className,
      )}
      {...props}
    />
  );
}
