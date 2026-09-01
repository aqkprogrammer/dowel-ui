"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A short label revealed on hover or focus.
 *
 * A tooltip supplements a control that is already understandable — it must
 * never be the only place information appears, because it is unreachable on
 * touch devices and disappears the moment attention moves. If the content is
 * essential, put it in the interface.
 */
export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export type TooltipProps = ComponentPropsWithRef<typeof TooltipPrimitive.Root>;

/**
 * Self-providing, so a single tooltip works without app-level setup. Wrap a
 * subtree in TooltipProvider to share open/close timing across many tooltips.
 */
export function Tooltip({ children, ...props }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export type TooltipContentProps = ComponentPropsWithRef<typeof TooltipPrimitive.Content>;

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-[var(--z-tooltip)] max-w-64 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md",
          "origin-[var(--radix-tooltip-content-transform-origin)] text-balance",
          "data-[state=closed]:animate-float-out data-[state=delayed-open]:animate-float-in",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
