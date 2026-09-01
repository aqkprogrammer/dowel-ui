"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * An immediate on/off toggle.
 *
 * Use a Switch when the change takes effect at once, and a Checkbox when it is
 * staged until the form is submitted. The difference is real to users: a switch
 * that needs a Save button is a broken promise.
 */
export type SwitchProps = ComponentPropsWithRef<typeof SwitchPrimitive.Root>;

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent p-0.5",
        "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
        "bg-input data-[state=checked]:bg-primary",
        "disabled:cursor-not-allowed disabled:opacity-55",
        focusRing,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0",
          "transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
          "translate-x-0 data-[state=checked]:translate-x-4",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
