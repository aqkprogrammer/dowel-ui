"use client";

// Motion from SmoothUI AnimatedProgressBar (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Progress as ProgressPrimitive } from "radix-ui";
import { useEffect, useState, type ComponentPropsWithRef } from "react";

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

const PREFIX = "dowel-progress";

/*
 * Stripes and shine are decoration on a bar whose value already says how far
 * along it is, so they stop under reduced motion like any other decoration:
 * the global rule runs each once, in a hundredth of a millisecond, which
 * leaves the stripes still and the shine parked off the end of the bar. They
 * apply only while the value is known — an indeterminate bar is an indicator
 * with its own sweep, and a second motion on top of it would say nothing new.
 *
 * Unlayered, so it outranks utilities; it touches only its own data-effect
 * selectors, which nothing else sets.
 */
const STYLES = `
@keyframes ${PREFIX}-stripes { from { background-position: 1rem 0; } to { background-position: 0 0; } }
@keyframes ${PREFIX}-shine { from { translate: -100% 0; } to { translate: 100% 0; } }
[data-slot="progress-indicator"][data-effect="striped"] {
  background-image: linear-gradient(45deg, color-mix(in oklab, var(--color-background) 22%, transparent) 25%, transparent 25%, transparent 50%, color-mix(in oklab, var(--color-background) 22%, transparent) 50%, color-mix(in oklab, var(--color-background) 22%, transparent) 75%, transparent 75%, transparent);
  background-size: 1rem 1rem;
  animation: ${PREFIX}-stripes calc(1s * var(--motion-scale, 1)) linear infinite;
}
[data-slot="progress-indicator"][data-effect="shine"] { position: relative; overflow: hidden; }
[data-slot="progress-indicator"][data-effect="shine"]::after {
  content: "";
  position: absolute;
  inset: 0;
  translate: -100% 0;
  background-image: linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-background) 40%, transparent), transparent);
  animation: ${PREFIX}-shine calc(1.6s * var(--motion-scale, 1)) var(--ease-in-out-quint) infinite;
}
`;

export interface ProgressProps
  extends
    ComponentPropsWithRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  /**
   * How the fill travels to a new value. `smooth` eases in, as it always has;
   * `spring` carries slightly past the value and settles, like SmoothUI's
   * spring. Default `smooth`.
   */
  easing?: "smooth" | "spring";
  /**
   * Fills from empty on mount instead of appearing at its value. For a bar
   * that is revealed once, like a result or a quota; not for one that is
   * polled, which would replay on every remount. Default `false`.
   */
  fillOnMount?: boolean;
  /**
   * A moving texture on the fill while the value is known: `striped` runs
   * diagonal stripes along it, `shine` sweeps a highlight across it.
   * Decoration — both stop under reduced motion. Default `none`.
   */
  effect?: "none" | "striped" | "shine";
}

/**
 * False for the first painted frame, then true.
 *
 * Two animation frames rather than one effect: an effect can run before the
 * browser has painted the empty bar, and a transition needs a painted start.
 */
function usePainted(enabled: boolean): boolean {
  const [painted, setPainted] = useState(!enabled);
  useEffect(() => {
    if (!enabled) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setPainted(true);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [enabled]);
  return painted;
}

/**
 * Shows how far along a task is.
 *
 * Pass `value={null}` for work whose duration is unknown — that is a genuinely
 * different state from zero percent, and it is announced as such rather than as
 * "no progress". For a short wait with no measurable progress, a Spinner says
 * the same thing with less furniture.
 */
export function Progress({
  className,
  size,
  tone,
  value,
  easing = "smooth",
  fillOnMount = false,
  effect = "none",
  ...props
}: ProgressProps) {
  const indeterminate = value === null || value === undefined;
  const painted = usePainted(fillOnMount);
  const percent = indeterminate || !painted ? 0 : Math.min(100, Math.max(0, value));
  const decorated = !indeterminate && effect !== "none";

  return (
    <>
      {decorated ? (
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
      ) : null}
      <ProgressPrimitive.Root
        data-slot="progress"
        value={value}
        className={cn(progressVariants({ size, tone }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          // Only while indeterminate: the sweep is the signal that work is
          // ongoing, and freezing it reads as a stalled zero percent.
          data-motion={indeterminate ? "indicator" : undefined}
          data-effect={decorated ? effect : undefined}
          className={cn(
            "h-full w-full flex-1 rounded-full bg-[var(--progress-fill)]",
            "transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
            // With no known value the bar sweeps instead of filling, so it reads
            // as "working" rather than as a stalled 0%.
            indeterminate && "animate-pulse-soft",
            easing === "spring" && "ease-[var(--ease-overshoot)]",
          )}
          style={
            indeterminate ? undefined : { transform: `translateX(-${String(100 - percent)}%)` }
          }
        />
      </ProgressPrimitive.Root>
    </>
  );
}

export { progressVariants };
