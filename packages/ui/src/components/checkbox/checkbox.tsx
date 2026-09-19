"use client";

// Motion from SmoothUI Checkbox (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A control for a single on/off choice, or one of several independent choices.
 *
 * Supports the indeterminate state (`checked="indeterminate"`) for a parent box
 * summarising a partially-selected group. Indeterminate is a state the
 * *application* sets, never a third value the user cycles into.
 */
export type CheckboxProps = ComponentPropsWithRef<typeof CheckboxPrimitive.Root>;

/**
 * Draws a mark along its own length when it appears.
 *
 * `pathLength={1}` normalises the stroke so one dash covers the whole path;
 * `@starting-style` (the `starting:` variant) gives the first frame an offset
 * of a full length, and the transition runs it to zero. It is a transition,
 * not a keyframe, so there is no stylesheet to ship, it re-runs whenever the
 * mark is shown again (checked ↔ indeterminate toggles `display`), and a
 * browser without `@starting-style` simply shows the mark drawn. Reduced
 * motion collapses the transition, which also leaves it drawn.
 */
const drawn = cn(
  "[stroke-dasharray:1] [stroke-dashoffset:0] starting:[stroke-dashoffset:1]",
  "transition-[stroke-dashoffset] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
);

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-xs border border-input bg-background shadow-xs",
        "transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)]",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        "disabled:cursor-not-allowed disabled:opacity-55",
        "aria-invalid:border-destructive",
        focusRing,
        className,
      )}
      {...props}
    >
      {/* The indicator carries data-state, so both marks live here and CSS picks
          one. Rendering conditionally in JS would need the checked value, which
          an uncontrolled checkbox does not expose. */}
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="group grid place-items-center text-current"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="size-3.5 group-data-[state=indeterminate]:hidden"
        >
          <path
            data-slot="checkbox-check"
            d="m5 13 4 4L19 7"
            pathLength={1}
            className={drawn}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="hidden size-3.5 group-data-[state=indeterminate]:block"
        >
          <path
            data-slot="checkbox-dash"
            d="M6 12h12"
            pathLength={1}
            className={drawn}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
