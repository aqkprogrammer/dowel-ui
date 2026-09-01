"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A set of mutually exclusive options.
 *
 * Radios are for choosing one of a small, visible set. Once a radio is
 * selected it cannot be unselected by clicking it again, so include an explicit
 * "None" option if the choice must be reversible.
 */
export type RadioGroupProps = ComponentPropsWithRef<typeof RadioGroupPrimitive.Root>;

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

export type RadioGroupItemProps = ComponentPropsWithRef<typeof RadioGroupPrimitive.Item>;

export function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "peer aspect-square size-4 shrink-0 rounded-full border border-input bg-background shadow-xs",
        "transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)]",
        "data-[state=checked]:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-55",
        "aria-invalid:border-destructive",
        focusRing,
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="grid size-full place-items-center"
      >
        <span className="size-2 rounded-full bg-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}
