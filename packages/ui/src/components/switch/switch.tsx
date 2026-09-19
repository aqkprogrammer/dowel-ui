"use client";

// Motion from SmoothUI AnimatedToggle (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * An immediate on/off toggle.
 *
 * Use a Switch when the change takes effect at once, and a Checkbox when it is
 * staged until the form is submitted. The difference is real to users: a switch
 * that needs a Save button is a broken promise.
 */
export interface SwitchProps extends ComponentPropsWithRef<typeof SwitchPrimitive.Root> {
  /**
   * How the thumb moves. Opt-in, because both change the thumb's shape:
   *
   * - `default` — slides, as it always has.
   * - `squash` — also stretches along its travel while held, like a finger
   *   pushing it.
   * - `morph` — squashes, and rests as a rounded square when off and a circle
   *   when on.
   *
   * The press stretch only exists when the reader has not asked for reduced
   * motion; the shape change still happens, instantly.
   */
  variant?: "default" | "squash" | "morph";
  /**
   * Icons drawn inside the thumb, one per state, that turn and crossfade as
   * it moves. Decorative: the state is announced by the switch role.
   */
  icons?: { checked: ReactNode; unchecked: ReactNode };
}

const iconLayer = cn(
  "col-start-1 row-start-1 flex items-center justify-center [&_svg]:size-3",
  "transition-[opacity,scale,rotate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
);

export function Switch({ className, variant = "default", icons, ...props }: SwitchProps) {
  const squash = variant === "squash" || variant === "morph";

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-variant={variant === "default" ? undefined : variant}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent p-0.5",
        "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
        "bg-input data-[state=checked]:bg-primary",
        "disabled:cursor-not-allowed disabled:opacity-55",
        squash && "group/switch",
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
          // Stretch from the edge it is leaving, so the far edge reaches ahead.
          squash &&
            "origin-left data-[state=checked]:origin-right motion-safe:group-active/switch:scale-x-125",
          variant === "morph" &&
            "rounded-[30%] transition-[transform,translate,scale,border-radius] data-[state=checked]:rounded-[50%]",
          icons && "group/thumb grid place-items-center",
        )}
      >
        {icons ? (
          <>
            <span
              aria-hidden="true"
              data-slot="switch-icon"
              data-icon="unchecked"
              className={cn(
                iconLayer,
                "text-muted-foreground",
                "group-data-[state=checked]/thumb:scale-50 group-data-[state=checked]/thumb:-rotate-90 group-data-[state=checked]/thumb:opacity-0",
              )}
            >
              {icons.unchecked}
            </span>
            <span
              aria-hidden="true"
              data-slot="switch-icon"
              data-icon="checked"
              className={cn(
                iconLayer,
                "text-primary",
                "scale-50 rotate-90 opacity-0",
                "group-data-[state=checked]/thumb:scale-100 group-data-[state=checked]/thumb:rotate-0 group-data-[state=checked]/thumb:opacity-100",
              )}
            >
              {icons.checked}
            </span>
          </>
        ) : null}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}
