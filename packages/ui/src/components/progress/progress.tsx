"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Progress as ProgressPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

const progressVariants = cva("relative w-full overflow-hidden rounded-full bg-muted", {
  variants: {
    size: {
      sm: "h-1",
      md: "h-2",
      lg: "h-3",
    },
    tone: {
      primary: "[--progress-fill:var(--color-primary)]",
      success: "[--progress-fill:var(--color-success)]",
      warning: "[--progress-fill:var(--color-warning)]",
      destructive: "[--progress-fill:var(--color-destructive)]",
    },
  },
  defaultVariants: {
    size: "md",
    tone: "primary",
  },
});

export interface ProgressProps
  extends
    ComponentPropsWithRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {}

/**
 * Shows how far along a task is.
 *
 * Pass `value={null}` for work whose duration is unknown — that is a genuinely
 * different state from zero percent, and it is announced as such rather than as
 * "no progress". For a short wait with no measurable progress, a Spinner says
 * the same thing with less furniture.
 */
export function Progress({ className, size, tone, value, ...props }: ProgressProps) {
  const indeterminate = value === null || value === undefined;
  const percent = indeterminate ? 0 : Math.min(100, Math.max(0, value));

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn(progressVariants({ size, tone }), className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 rounded-full bg-[var(--progress-fill)]",
          "transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
          // With no known value the bar sweeps instead of filling, so it reads
          // as "working" rather than as a stalled 0%.
          indeterminate && "animate-pulse-soft",
        )}
        style={
          indeterminate ? undefined : { transform: `translateX(-${String(100 - percent)}%)` }
        }
      />
    </ProgressPrimitive.Root>
  );
}

export { progressVariants };
