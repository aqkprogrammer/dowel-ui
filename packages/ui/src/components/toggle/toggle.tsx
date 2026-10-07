"use client";

// Original design (pattern inspired by Animate UI Toggle; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";
import { useState, type ComponentPropsWithRef } from "react";

import { disabledStyles, focusRing, iconSlot } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A two-state button that feels physical.
 *
 * Three small movements, each a plain CSS transition or keyframe:
 *
 * - Pressing squishes the button to 92%, and releasing springs it back past
 *   its size through the overshoot curve — the press is quick, the release is
 *   the part with character.
 * - Turning on pours the fill outward from the centre as a growing circle
 *   (a clip-path), and turning off drains it back in, faster.
 * - The icon pops through a small overshoot when it turns on, and dips once
 *   when it turns off. `data-animate` is only set after the state has changed,
 *   so a toggle that starts on does not celebrate on first paint.
 *
 * It is Radix Toggle underneath: a `<button>` with `aria-pressed`, operable
 * with Space and Enter. The fill is an aria-hidden layer. Under reduced motion
 * the scale collapses every duration, so each state is reached at once.
 */

const PREFIX = "dowel-toggle";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `
@keyframes ${PREFIX}-pop{0%{scale:1}30%{scale:.72}62%{scale:1.2}82%{scale:.96}100%{scale:1}}
@keyframes ${PREFIX}-dip{0%{scale:1}45%{scale:.84}100%{scale:1}}
[data-slot=toggle][data-animate=on]>[data-slot=toggle-content] svg{animation:${PREFIX}-pop ${scaled(460)} var(--ease-out-quint) both}
[data-slot=toggle][data-animate=off]>[data-slot=toggle-content] svg{animation:${PREFIX}-dip ${scaled(220)} var(--ease-out-quint)}
`;

const toggleVariants = cva(
  cn(
    "relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden font-medium whitespace-nowrap select-none",
    "text-muted-foreground hover:bg-muted hover:text-foreground data-[state=on]:text-accent-foreground",
    // Quick in, springy out: the release overshoots back to full size.
    "transition-[background-color,color,box-shadow,scale] duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
    "active:duration-[var(--duration-instant)] active:ease-[var(--ease-out-quint)] motion-safe:active:scale-[0.92]",
    focusRing,
    disabledStyles,
    iconSlot,
  ),
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-background shadow-xs",
      },
      size: {
        sm: "h-8 min-w-8 gap-1.5 rounded-md px-2 text-sm",
        md: "h-9 min-w-9 gap-2 rounded-md px-2.5 text-sm",
        lg: "h-10 min-w-10 gap-2 rounded-lg px-3 text-base [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

/**
 * The "on" fill. A circle clipped to nothing at the centre, opened past the
 * corners when the parent is on (71% of the reference radius reaches them).
 * Filling takes the slow ease-out; draining is quicker.
 */
const toggleFillClass = cn(
  "pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-accent",
  "transition-[clip-path] duration-[var(--duration-normal)] ease-[var(--ease-in-quint)] [clip-path:circle(0%_at_50%_50%)]",
  "group-data-[state=on]/toggle:duration-[var(--duration-slower)] group-data-[state=on]/toggle:ease-[var(--ease-out-quint)] group-data-[state=on]/toggle:[clip-path:circle(75%_at_50%_50%)]",
);

export interface ToggleProps
  extends
    Omit<ComponentPropsWithRef<typeof TogglePrimitive.Root>, "asChild">,
    VariantProps<typeof toggleVariants> {}

type Animate = "on" | "off" | undefined;

/** A pressable two-state button whose fill pours out from the centre when it turns on. */
export function Toggle({
  className,
  variant,
  size,
  pressed: pressedProp,
  defaultPressed = false,
  onPressedChange,
  children,
  ...props
}: ToggleProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultPressed);
  const controlled = pressedProp !== undefined;
  const pressed = controlled ? pressedProp : uncontrolled;

  // Which animation to play, derived during render from a change in
  // `pressed`, whoever made it. Nothing plays until the first change.
  const [previous, setPrevious] = useState(pressed);
  const [animate, setAnimate] = useState<Animate>(undefined);
  if (previous !== pressed) {
    setPrevious(pressed);
    setAnimate(pressed ? "on" : "off");
  }

  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      data-animate={animate}
      pressed={pressed}
      onPressedChange={(next) => {
        if (!controlled) setUncontrolled(next);
        onPressedChange?.(next);
      }}
      className={cn("group/toggle", toggleVariants({ variant, size }), className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span data-slot="toggle-fill" aria-hidden="true" className={toggleFillClass} />
      <span data-slot="toggle-content" className="inline-flex items-center gap-[inherit]">
        {children}
      </span>
    </TogglePrimitive.Root>
  );
}

export { toggleVariants };
