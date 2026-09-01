"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import { useEffect, type ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Rich floating content anchored to a trigger.
 *
 * Non-modal by default: the page stays interactive and focus is not trapped,
 * which is right for a surface the user can simply click away from. Pass
 * `modal` when the popover contains a task that must be completed or abandoned.
 *
 * The content carries `role="dialog"`, so it MUST have an accessible name via
 * `aria-label` or `aria-labelledby`. Without one it is announced as an unnamed
 * dialog, which tells a screen reader user nothing about what just opened.
 */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export type PopoverContentProps = ComponentPropsWithRef<typeof PopoverPrimitive.Content>;

export function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: PopoverContentProps) {
  useMissingLabelWarning(props["aria-label"], props["aria-labelledby"]);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[var(--z-popover)] w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg",
          "max-h-[var(--radix-popover-content-available-height)] outline-none",
          // One keyframe pair covers every side and alignment: the primitive
          // computes the origin, so the panel always grows from its anchor.
          "origin-[var(--radix-popover-content-transform-origin)]",
          "data-[state=closed]:animate-float-out data-[state=open]:animate-float-in",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

/**
 * Warns, in development only, when the content has no accessible name.
 *
 * This is a mistake that is invisible in the browser and serious for screen
 * reader users, so it is surfaced at the moment it is introduced rather than
 * left for an audit. Typed as optional rather than required because a name can
 * legitimately come from either attribute, and forcing one at the type level
 * would break composition patterns that supply it dynamically.
 */
function useMissingLabelWarning(label?: string, labelledBy?: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (label ?? labelledBy) return;

    console.warn(
      '[PopoverContent] Missing accessible name. The content has role="dialog", so pass ' +
        "aria-label, or aria-labelledby pointing at a heading inside it.",
    );
  }, [label, labelledBy]);
}

export function PopoverArrow({
  className,
  ...props
}: ComponentPropsWithRef<typeof PopoverPrimitive.Arrow>) {
  return (
    <PopoverPrimitive.Arrow
      data-slot="popover-arrow"
      width={12}
      height={6}
      className={cn("fill-popover stroke-border", className)}
      {...props}
    />
  );
}
