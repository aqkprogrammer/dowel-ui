"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A horizontal stepper: nodes joined by a hairline, with ‹ › buttons below.
 * Moving forward, a bright line grows along the track to the new node and the
 * node swells as the line arrives; finished nodes stay small and solid, the
 * ones ahead are hollow rings. Moving back, the line retracts and the old node
 * shrinks to a ring.
 *
 * The line is one element whose inline size is the share of the track behind
 * the active node; nodes change size with a springy scale. Durations scale
 * with --motion-scale, so under reduced motion the state simply changes.
 *
 * Semantics: an ordered list, the active item marked aria-current="step" and
 * each node carrying "Step n of N" (plus its label) as hidden text. The buttons
 * are real buttons, disabled at either end, and a polite live region says which
 * step is now current, once per change. The track follows the reading
 * direction, so in right-to-left it fills from the right and the chevrons flip.
 */

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const stepTrackVariants = cva("inline-flex flex-col items-center", {
  variants: {
    size: {
      sm: "w-28 gap-2.5 [--node:0.5rem]",
      md: "w-40 gap-3.5 [--node:0.625rem]",
      lg: "w-56 gap-4 [--node:0.75rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface StepTrackProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof stepTrackVariants> {
  /** How many steps, or a label for each. */
  steps?: number | readonly string[];
  /** Controlled active step, zero-based. */
  value?: number;
  /** Initial active step when uncontrolled. */
  defaultValue?: number;
  /** Called with the new step when the buttons move it. */
  onValueChange?: (value: number) => void;
  /** Accessible name of the previous button. */
  previousLabel?: string;
  /** Accessible name of the next button. */
  nextLabel?: string;
  /** Hides the ‹ › buttons, for a read-only progress track. */
  hideControls?: boolean;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

/** A four-node stepper with a filling line and ‹ › buttons. */
export function StepTrack({
  className,
  size,
  steps = 4,
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  previousLabel = "Previous step",
  nextLabel = "Next step",
  hideControls = false,
  "aria-label": ariaLabel,
  ...props
}: StepTrackProps) {
  const labels = typeof steps === "number" ? null : steps;
  const total = Math.max(2, labels ? labels.length : Math.round(steps as number));
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const controlled = valueProp !== undefined;
  const value = clamp(controlled ? valueProp : uncontrolled, 0, total - 1);

  function go(next: number) {
    const target = clamp(next, 0, total - 1);
    if (target === value) return;
    if (!controlled) setUncontrolled(target);
    onValueChange?.(target);
  }

  const describe = (index: number) => {
    const label = labels?.[index];
    return `Step ${String(index + 1)} of ${String(total)}${label ? `: ${label}` : ""}`;
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? "Progress"}
      data-slot="step-track"
      className={cn(stepTrackVariants({ size }), className)}
      {...props}
    >
      <div className="relative w-full" style={{ "--n": total - 1 } as CSSProperties}>
        {/* The track runs between the centres of the first and last nodes. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-[calc(var(--node)/2)] top-1/2 h-px -translate-y-1/2 bg-foreground/20"
        >
          <span
            data-slot="step-track-fill"
            className="absolute inset-y-0 start-0 block h-full bg-foreground"
            style={{
              width: `${String((value / (total - 1)) * 100)}%`,
              transition: `width ${s(0.45)} cubic-bezier(.65,0,.35,1)`,
            }}
          />
        </span>
        <ol className="relative flex items-center justify-between">
          {Array.from({ length: total }, (_, index) => {
            const state = index < value ? "complete" : index === value ? "current" : "upcoming";
            return (
              <li
                key={index}
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
                className="grid size-(--node) place-items-center"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block size-full rounded-full border border-foreground",
                    state === "upcoming"
                      ? "scale-90 border-foreground/35 bg-card"
                      : "bg-foreground",
                    state === "current" && "scale-[1.6]",
                  )}
                  style={{
                    transition:
                      `scale ${s(0.45)} cubic-bezier(.34,1.56,.64,1) ${state === "current" ? s(0.2) : "0s"},` +
                      `background-color ${s(0.25)} ease ${state === "upcoming" ? "0s" : s(0.2)},` +
                      `border-color ${s(0.25)} ease`,
                  }}
                />
                <span className="sr-only">{describe(index)}</span>
              </li>
            );
          })}
        </ol>
      </div>
      {hideControls ? null : (
        <div className="flex items-center gap-2">
          <NavButton
            label={previousLabel}
            disabled={value === 0}
            onClick={() => go(value - 1)}
            path="m15 18-6-6 6-6"
          />
          <NavButton
            label={nextLabel}
            disabled={value === total - 1}
            onClick={() => go(value + 1)}
            path="m9 18 6-6-6-6"
          />
        </div>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {describe(value)}
      </span>
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  path,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  path: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-6 place-items-center rounded-full bg-foreground/10 text-foreground",
        "transition-[background-color,opacity,scale] duration-(--duration-fast)",
        "hover:bg-foreground/20 active:scale-90 disabled:pointer-events-none disabled:opacity-40",
        focusRing,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("size-3", mirrorForDirection)}
      >
        <path d={path} />
      </svg>
    </button>
  );
}

export { stepTrackVariants };
