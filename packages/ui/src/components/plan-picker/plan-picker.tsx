"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A row of plan cards where the selection is one outline that travels.
 *
 * The outline is a single absolutely placed ring over the row, with a small
 * dot riding its top end corner. Its two edges are set separately
 * (inset-inline-start and inset-inline-end, computed from the column count and
 * gap), so when the choice moves the leading edge sets off at once and the
 * trailing edge follows a beat later: the ring runs along the cards' edges,
 * stretched across the gap, and closes around the new card when it lands. The
 * dot is pinned to the end edge, so it leads when the ring moves forward and
 * trails when it moves back.
 *
 * Built on the Radix radio group: a radiogroup of radio buttons, arrow keys
 * move and choose (roving focus), each card's name is its plan and price, and a
 * hidden input carries the value inside forms. The ring and dot are
 * aria-hidden; the checked state is what assistive technology hears.
 *
 * Everything is logical, so in a right-to-left layout the row and the ring's
 * travel mirror. Every duration runs through --motion-scale, so under reduced
 * motion the ring jumps.
 */

export interface Plan {
  /** The value submitted and reported when this plan is chosen. */
  value: string;
  /** The plan's name, e.g. "Pro". */
  label: string;
  /** Its price line, e.g. "$4/mo". */
  price?: string;
  disabled?: boolean;
}

const DEFAULT_PLANS: Plan[] = [
  { value: "basic", label: "Basic", price: "Free" },
  { value: "pro", label: "Pro", price: "$4/mo" },
  { value: "team", label: "Team", price: "$12/mo" },
];

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const EASE = "cubic-bezier(.3,.9,.3,1)";
const LEAD = 0.34;
const TRAIL = 0.48;
const LAG = 0.07;

const planPickerVariants = cva("relative isolate grid", {
  variants: {
    size: {
      sm: "gap-1.5 [--plan-gap:0.375rem] [--plan-width:3.5rem]",
      md: "gap-2 [--plan-gap:0.5rem] [--plan-width:4.75rem]",
      lg: "gap-3 [--plan-gap:0.75rem] [--plan-width:6.5rem]",
    },
  },
  defaultVariants: { size: "md" },
});

const planCardVariants = cva(
  cn(
    "group flex cursor-pointer flex-col items-start rounded-xl border border-border bg-muted/50 text-start",
    "text-muted-foreground hover:bg-muted data-[state=checked]:text-foreground",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRing,
  ),
  {
    variants: {
      size: {
        sm: "min-h-11 gap-0.5 p-2 text-[0.625rem]",
        md: "min-h-14 gap-1 p-2.5 text-xs",
        lg: "min-h-18 gap-1.5 p-3.5 text-sm",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface PlanPickerProps
  extends
    Omit<
      ComponentPropsWithRef<typeof RadioGroupPrimitive.Root>,
      "value" | "defaultValue" | "onValueChange" | "children"
    >,
    VariantProps<typeof planPickerVariants> {
  /** The plans, in order. Defaults to Basic, Pro and Team. */
  plans?: Plan[];
  /** The chosen plan's value (controlled). */
  value?: string;
  /** The plan chosen at first (uncontrolled). Defaults to the first plan. */
  defaultValue?: string;
  /** Called with the plan's value when the choice changes. */
  onValueChange?: (value: string) => void;
}

/** Plan cards in a radio group, with a selection outline that travels between them. */
export function PlanPicker({
  className,
  size,
  plans = DEFAULT_PLANS,
  value,
  defaultValue,
  onValueChange,
  style,
  "aria-label": ariaLabel = "Plan",
  ...props
}: PlanPickerProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? plans[0]?.value ?? "");
  const current = value ?? uncontrolled;
  const index = plans.findIndex((plan) => plan.value === current);
  const count = plans.length;

  // Which way the ring last moved, derived during render so the edges take
  // their lead and lag on the same frame as the new position.
  const [shown, setShown] = useState(index);
  const [forward, setForward] = useState(true);
  if (shown !== index) {
    if (index >= 0 && shown >= 0) setForward(index > shown);
    setShown(index);
  }

  // One column plus one gap, as a length the ring can be placed by.
  const step = `((100% - ${String(count - 1)} * var(--plan-gap)) / ${String(count)} + var(--plan-gap))`;
  const edge = (lead: boolean) => `${s(lead ? LEAD : TRAIL)} ${EASE} ${lead ? "0s" : s(LAG)}`;
  const ring: CSSProperties = {
    insetInlineStart: `calc(${String(index)} * ${step})`,
    insetInlineEnd: `calc(${String(count - 1 - index)} * ${step})`,
    transition: `inset-inline-end ${edge(forward)}, inset-inline-start ${edge(!forward)}, opacity ${s(0.2)}`,
  };

  return (
    <RadioGroupPrimitive.Root
      data-slot="plan-picker"
      aria-label={ariaLabel}
      value={current}
      onValueChange={(next) => {
        if (value === undefined) setUncontrolled(next);
        onValueChange?.(next);
      }}
      className={cn(planPickerVariants({ size }), className)}
      style={{
        gridTemplateColumns: `repeat(${String(count)}, minmax(var(--plan-width), 1fr))`,
        ...style,
      }}
      {...props}
    >
      {plans.map((plan) => (
        <RadioGroupPrimitive.Item
          key={plan.value}
          value={plan.value}
          disabled={plan.disabled}
          data-slot="plan-picker-card"
          className={planCardVariants({ size })}
          style={{ transition: `background-color ${s(0.2)}, color ${s(0.2)}` }}
        >
          <span className="font-semibold text-foreground">{plan.label}</span>
          {/* A space, so the accessible name reads "Pro $4/mo", not "Pro$4/mo". */}
          {plan.price ? " " : null}
          {/* Muted cards already use the muted tone; fading it further fails contrast.
              Only the selected card, in full foreground, softens its price. */}
          {plan.price ? (
            <span className="text-[0.9em] group-data-[state=checked]:opacity-70">
              {plan.price}
            </span>
          ) : null}
        </RadioGroupPrimitive.Item>
      ))}

      <span
        aria-hidden="true"
        data-slot="plan-picker-ring"
        className="pointer-events-none absolute inset-y-0 rounded-xl border-[1.5px] border-foreground"
        style={{ ...ring, opacity: index < 0 ? 0 : 1 }}
      >
        <span className="absolute -end-1 -top-1 size-2.5 rounded-full bg-foreground ring-2 ring-background" />
      </span>
    </RadioGroupPrimitive.Root>
  );
}

export { planPickerVariants, planCardVariants };
