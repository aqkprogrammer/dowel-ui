"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { useState, type ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * [−] 2 [+] in a pill, with "Total $48" underneath. Pressing a button flashes
 * it white for a moment; the number rolls like an odometer, the old digits
 * sliding out and the new ones in, upward when the count rises and downward
 * when it falls; and the total recalculates from `unitPrice`.
 *
 * The roll is two stacked copies of the number, each with a one-shot keyframe
 * keyed to the change, so every press restarts it cleanly. The flash is an
 * overlay that fades from full to nothing. Durations scale with
 * --motion-scale: under reduced motion the number and total just change.
 *
 * Semantics: a role="group" named "Quantity" holding two native buttons
 * ("Decrease quantity", "Increase quantity"), each disabled at its bound, and
 * an <output> live region (polite, atomic) whose hidden text is the count, so
 * each change is read once without the animation being read twice. The
 * visible rolling digits are aria-hidden. The total is ordinary text.
 */

const P = "dowel-quantity-stepper";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const ROLL = `${s(0.38)} cubic-bezier(.3,1.3,.5,1) both`;

const STYLES = `
.${P} [data-part=in][data-dir=up]{animation:${P}-in-up ${ROLL}}
.${P} [data-part=in][data-dir=down]{animation:${P}-in-down ${ROLL}}
.${P} [data-part=out][data-dir=up]{animation:${P}-out-up ${s(0.3)} ease-in both}
.${P} [data-part=out][data-dir=down]{animation:${P}-out-down ${s(0.3)} ease-in both}
.${P} [data-part=flash]{opacity:0}
.${P} [data-part=flash][data-on]{animation:${P}-flash ${s(0.5)} ease-out both}
@keyframes ${P}-in-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes ${P}-in-down{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes ${P}-out-up{from{transform:translateY(0);opacity:1}to{transform:translateY(-100%);opacity:0}}
@keyframes ${P}-out-down{from{transform:translateY(0);opacity:1}to{transform:translateY(100%);opacity:0}}
@keyframes ${P}-flash{0%{opacity:1}100%{opacity:0}}
`;

const quantityStepperVariants = cva("inline-flex flex-col items-center gap-[0.6em]", {
  variants: {
    size: {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: { size: "md" },
});

export interface QuantityStepperProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof quantityStepperVariants> {
  /** Controlled count. */
  value?: number;
  /** Initial count when uncontrolled. */
  defaultValue?: number;
  /** Called with the new count. */
  onValueChange?: (value: number) => void;
  /** Lowest count. */
  min?: number;
  /** Highest count. */
  max?: number;
  /** Price of one item. Leave unset to hide the total. */
  unitPrice?: number;
  /** ISO currency for the total. */
  currency?: string;
  /** Locale for the total. */
  locale?: string;
  /** Writes the total yourself, instead of the currency format. */
  formatTotal?: (total: number) => string;
  /** Word before the total. */
  totalLabel?: string;
  /** Accessible name of the − button. */
  decrementLabel?: string;
  /** Accessible name of the + button. */
  incrementLabel?: string;
  disabled?: boolean;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

/** A − count + pill with an odometer roll, a flash on press and a running total. */
export function QuantityStepper({
  className,
  size,
  value: valueProp,
  defaultValue = 1,
  onValueChange,
  min = 0,
  max = 99,
  unitPrice,
  currency = "USD",
  locale = "en-US",
  formatTotal,
  totalLabel = "Total",
  decrementLabel = "Decrease quantity",
  incrementLabel = "Increase quantity",
  disabled = false,
  "aria-label": ariaLabel,
  ...props
}: QuantityStepperProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const controlled = valueProp !== undefined;
  const value = clamp(controlled ? valueProp : uncontrolled, min, max);

  // The previous count and which way it went, for the roll. Updated while
  // rendering so controlled changes roll too.
  const [roll, setRoll] = useState({
    value,
    previous: null as number | null,
    dir: "up" as "up" | "down",
    key: 0,
  });
  if (roll.value !== value) {
    setRoll({
      value,
      previous: roll.value,
      dir: value > roll.value ? "up" : "down",
      key: roll.key + 1,
    });
  }

  const [flash, setFlash] = useState<{ which: "dec" | "inc"; key: number } | null>(null);

  function step(delta: -1 | 1) {
    const next = clamp(value + delta, min, max);
    setFlash((current) => ({ which: delta < 0 ? "dec" : "inc", key: (current?.key ?? 0) + 1 }));
    if (next === value) return;
    if (!controlled) setUncontrolled(next);
    onValueChange?.(next);
  }

  const total =
    unitPrice === undefined
      ? null
      : formatTotal
        ? formatTotal(unitPrice * value)
        : new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            maximumFractionDigits: Number.isInteger(unitPrice) ? 0 : 2,
          }).format(unitPrice * value);

  const button = (which: "dec" | "inc") => {
    const inc = which === "inc";
    const atBound = inc ? value >= max : value <= min;
    return (
      <button
        type="button"
        aria-label={inc ? incrementLabel : decrementLabel}
        disabled={disabled || atBound}
        onClick={() => step(inc ? 1 : -1)}
        data-slot={`quantity-stepper-${which}`}
        className={cn(
          "relative grid size-[2.5em] place-items-center overflow-hidden rounded-full",
          "transition-[scale,opacity] duration-(--duration-fast) active:scale-90",
          "disabled:pointer-events-none disabled:opacity-40",
          inc ? "bg-foreground text-background" : "bg-foreground/15 text-foreground",
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
          className="size-[1.1em]"
        >
          <path d="M4.5 12h15" />
          {inc ? <path d="M12 4.5v15" /> : null}
        </svg>
        <span
          key={flash?.which === which ? flash.key : 0}
          aria-hidden="true"
          data-part="flash"
          data-on={flash?.which === which ? "" : undefined}
          className="pointer-events-none absolute inset-0 rounded-full bg-foreground"
        />
      </button>
    );
  };

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <div
        role="group"
        aria-label={ariaLabel ?? "Quantity"}
        data-slot="quantity-stepper"
        className={cn(P, quantityStepperVariants({ size }), className)}
        {...props}
      >
        <div className="flex items-center gap-[0.75em] rounded-full bg-muted p-[0.375em] shadow-[inset_0_0_0_1px] shadow-foreground/5">
          {button("dec")}
          <output aria-live="polite" aria-atomic="true" className="block">
            <span className="sr-only">{value}</span>
            <span
              aria-hidden="true"
              data-slot="quantity-stepper-value"
              className="relative grid h-[1.6em] min-w-[1.4em] overflow-hidden text-center text-[1.75em] leading-[1.6em] font-bold text-foreground tabular-nums"
            >
              {roll.previous !== null ? (
                <span
                  key={`out-${String(roll.key)}`}
                  data-part="out"
                  data-dir={roll.dir}
                  className="col-start-1 row-start-1"
                >
                  {roll.previous}
                </span>
              ) : null}
              <span
                key={`in-${String(roll.key)}`}
                data-part={roll.key > 0 ? "in" : "still"}
                data-dir={roll.dir}
                className="col-start-1 row-start-1"
              >
                {value}
              </span>
            </span>
          </output>
          {button("inc")}
        </div>
        {total !== null ? (
          <p data-slot="quantity-stepper-total" className="text-[0.85em] text-muted-foreground">
            {totalLabel} <span className="font-bold text-foreground">{total}</span>
          </p>
        ) : null}
      </div>
    </>
  );
}

export { quantityStepperVariants };
