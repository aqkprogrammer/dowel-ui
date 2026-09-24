"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, useState, type ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A light/dark toggle whose sun sets into a crescent moon.
 *
 * One SVG draws both: a disc, eight rays, and a mask. Going dark, the rays
 * retract into the disc, the disc swells, and a circle cut out of its mask
 * slides in from the upper corner to eclipse it into a crescent, while the
 * whole glyph turns back by one ray-step (45°, so the resting sun looks the
 * same either way) and the rays twist as they go. Coming back, every part reverses
 * — the shadow slides off first and the rays spring back out after it. Only
 * transforms and opacity move, all of them CSS transitions keyed off Radix's
 * `data-state`, so reduced motion (the global blanket) makes the swap instant.
 *
 * Semantics: `role="switch"`, via the Radix switch primitive, rather than a
 * toggle button with aria-pressed. The control flips a setting that takes
 * effect at once between two named states, which is exactly what a switch is,
 * and "Dark mode, switch, on" says what is true now. aria-pressed on a button
 * whose picture is a sun or a moon invites the question of whether the picture
 * shows the current state or the one you will get; "on/off" does not. Both
 * variants — a bare icon button and a switch track — share the one role.
 *
 * It never touches the document. It reports the theme it wants through
 * `onThemeChange`; the consumer sets the class, the attribute or the cookie.
 */

const PREFIX = "dowel-theme-toggle";

/* Selectors are scoped to the root's data-slot so an ancestor's data-state cannot leak in. */
const ROOT = "[data-slot=theme-toggle]";
const DARK = `${ROOT}[data-state=checked]`;

const STYLES = `
${ROOT} [data-slot=theme-toggle-icon]{transform:rotate(45deg);transition:transform var(--duration-slower) var(--ease-out-quint)}
${DARK} [data-slot=theme-toggle-icon]{transform:rotate(0deg)}
${ROOT} [data-slot=theme-toggle-disc]{transform-box:fill-box;transform-origin:center;transform:scale(.5);transition:transform var(--duration-slow) var(--ease-overshoot)}
${DARK} [data-slot=theme-toggle-disc]{transform:scale(1);transition-timing-function:var(--ease-out-quint)}
${ROOT} [data-slot=theme-toggle-shadow]{transform:translate(9px,-9px);transition:transform var(--duration-normal) var(--ease-in-quint)}
${DARK} [data-slot=theme-toggle-shadow]{transform:translate(0,0);transition-duration:var(--duration-slow);transition-timing-function:var(--ease-out-quint);transition-delay:var(--duration-instant)}
${ROOT} [data-slot=theme-toggle-rays]{transform-box:fill-box;transform-origin:center;transform:scale(1);opacity:1;transition:transform var(--duration-slow) var(--ease-overshoot) var(--duration-fast),opacity var(--duration-normal) var(--ease-out-quint) var(--duration-fast)}
${DARK} [data-slot=theme-toggle-rays]{transform:scale(.4) rotate(-30deg);opacity:0;transition-duration:var(--duration-normal),var(--duration-fast);transition-timing-function:var(--ease-in-quint);transition-delay:0s}
`;

const themeToggleVariants = cva(
  cn(
    "group/theme relative inline-flex shrink-0 items-center select-none",
    "[--theme-toggle-dir:1] rtl:[--theme-toggle-dir:-1]",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRing,
  ),
  {
    variants: {
      /**
       * `icon` is a bare icon button; `switch` is a track whose knob carries
       * the icon across.
       */
      variant: {
        icon: cn(
          "justify-center rounded-md text-foreground",
          "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
          "hover:bg-accent hover:text-accent-foreground",
        ),
        switch: cn(
          "rounded-full bg-input p-0.5 data-[state=checked]:bg-primary",
          "transition-colors duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
        ),
      },
      size: {
        sm: "[--theme-toggle-icon:1rem]",
        md: "[--theme-toggle-icon:1.25rem]",
        lg: "[--theme-toggle-icon:1.5rem]",
      },
    },
    compoundVariants: [
      { variant: "icon", size: "sm", className: "size-8" },
      { variant: "icon", size: "md", className: "size-9" },
      { variant: "icon", size: "lg", className: "size-10" },
      // The knob is the track height less its padding; travel is what is left.
      {
        variant: "switch",
        size: "sm",
        className:
          "h-6 w-10 [--theme-toggle-icon:0.8125rem] [--theme-toggle-knob:1.25rem] [--theme-toggle-travel:1rem]",
      },
      {
        variant: "switch",
        size: "md",
        className:
          "h-7 w-12 [--theme-toggle-icon:1rem] [--theme-toggle-knob:1.5rem] [--theme-toggle-travel:1.25rem]",
      },
      {
        variant: "switch",
        size: "lg",
        className:
          "h-8 w-14 [--theme-toggle-icon:1.125rem] [--theme-toggle-knob:1.75rem] [--theme-toggle-travel:1.5rem]",
      },
    ],
    defaultVariants: { variant: "icon", size: "md" },
  },
);

export type ThemeToggleTheme = "light" | "dark";

export interface ThemeToggleProps
  extends
    Omit<
      ComponentPropsWithRef<typeof SwitchPrimitive.Root>,
      "checked" | "defaultChecked" | "onCheckedChange" | "children" | "asChild"
    >,
    VariantProps<typeof themeToggleVariants> {
  /** Controlled theme. */
  theme?: ThemeToggleTheme;
  /** Initial theme when uncontrolled. Default "light". */
  defaultTheme?: ThemeToggleTheme;
  /** Called with the theme the toggle asks for. Apply it to the document yourself. */
  onThemeChange?: (theme: ThemeToggleTheme) => void;
}

/** The sun-to-moon glyph. Decorative: the state is carried by the switch role. */
function ThemeGlyph({ maskId }: { maskId: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-slot="theme-toggle-icon"
      className="size-[var(--theme-toggle-icon)] shrink-0 overflow-visible"
    >
      {/* A luminance mask: white keeps the disc, the black circle bites it. */}
      <mask id={maskId}>
        <rect width="24" height="24" fill="white" />
        <circle data-slot="theme-toggle-shadow" cx="16.5" cy="7.5" r="8" fill="black" />
      </mask>
      <circle
        data-slot="theme-toggle-disc"
        cx="12"
        cy="12"
        r="8.5"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
      <g
        data-slot="theme-toggle-rays"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M12 1.75v2.5M12 19.75v2.5M1.75 12h2.5M19.75 12h2.5M4.75 4.75l1.77 1.77M17.48 17.48l1.77 1.77M4.75 19.25l1.77-1.77M17.48 6.52l1.77-1.77" />
      </g>
    </svg>
  );
}

/** A light/dark switch whose sun is eclipsed into a crescent moon. */
export function ThemeToggle({
  className,
  variant,
  size,
  theme: themeProp,
  defaultTheme = "light",
  onThemeChange,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: ThemeToggleProps) {
  const [uncontrolled, setUncontrolled] = useState<ThemeToggleTheme>(defaultTheme);
  const theme = themeProp ?? uncontrolled;
  const maskId = `${PREFIX}-${useId().replace(/[^\w-]/g, "")}`;
  const kind = variant ?? "icon";

  function handleCheckedChange(checked: boolean) {
    const next: ThemeToggleTheme = checked ? "dark" : "light";
    if (themeProp === undefined) setUncontrolled(next);
    onThemeChange?.(next);
  }

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="theme-toggle"
        data-variant={kind}
        data-mode={theme}
        checked={theme === "dark"}
        onCheckedChange={handleCheckedChange}
        aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : "Dark mode")}
        aria-labelledby={ariaLabelledBy}
        className={cn(themeToggleVariants({ variant: kind, size }), className)}
        {...props}
      >
        {kind === "switch" ? (
          <span
            aria-hidden="true"
            data-slot="theme-toggle-knob"
            className={cn(
              "pointer-events-none grid size-[var(--theme-toggle-knob)] place-items-center rounded-full",
              "bg-background text-foreground shadow-sm",
              "transition-[translate] duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
              "group-data-[state=checked]/theme:translate-x-[calc(var(--theme-toggle-travel)*var(--theme-toggle-dir))]",
            )}
          >
            <ThemeGlyph maskId={maskId} />
          </span>
        ) : (
          <ThemeGlyph maskId={maskId} />
        )}
      </SwitchPrimitive.Root>
    </>
  );
}

export { themeToggleVariants };
