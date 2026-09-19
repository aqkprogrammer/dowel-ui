"use client";

// Motion from SmoothUI AnimatedTooltip (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
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
 *
 * It pops toward the side it opens on: a few pixels of travel away from the
 * trigger plus a slight overshoot in scale. The instant re-open when moving
 * between tooltips is not animated, and the pop stops under reduced motion.
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

const PREFIX = "dowel-tooltip";

/* Travel comes from the side Radix placed the tooltip on (a physical side, so
 * no RTL flip is needed): it starts 4px back toward the trigger. */
const STYLES = `
@keyframes ${PREFIX}-in{from{opacity:0;transform:translate(var(--${PREFIX}-x,0),var(--${PREFIX}-y,0)) scale(.95)}}
[data-slot=tooltip-content][data-side=top]{--${PREFIX}-y:4px}
[data-slot=tooltip-content][data-side=bottom]{--${PREFIX}-y:-4px}
[data-slot=tooltip-content][data-side=left]{--${PREFIX}-x:4px}
[data-slot=tooltip-content][data-side=right]{--${PREFIX}-x:-4px}
`;

export type TooltipContentProps = ComponentPropsWithRef<typeof TooltipPrimitive.Content>;

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          data-slot="tooltip-content"
          sideOffset={sideOffset}
          className={cn(
            "z-[var(--z-tooltip)] max-w-64 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md",
            "origin-[var(--radix-tooltip-content-transform-origin)] text-balance",
            "data-[state=closed]:animate-float-out",
            // Spelled out because Tailwind reads class names from the source.
            "data-[state=delayed-open]:animate-[dowel-tooltip-in_calc(250ms*var(--motion-scale))_var(--ease-overshoot)]",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </>
  );
}
