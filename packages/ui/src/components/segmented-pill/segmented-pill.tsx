"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A segmented control whose thumb is a bright pill that slides to the chosen
 * option and stretches like taffy on the way.
 *
 * The segments share one width (an auto-column grid), so the thumb is one
 * segment wide and its position is a single `translate` of `index * 100%`:
 * no measuring, no layout effect, correct on the server. It glides there on a
 * slightly overshooting curve while an inner layer plays a stretch keyframe,
 * wider and a touch flatter mid-move, then a small rebound before it settles.
 * The stretch is keyed by a move counter, so it replays on every change and
 * never on first paint. Durations are tokens on --motion-scale; under reduced
 * motion the thumb simply appears in its new place.
 *
 * Semantics are a Radix radio group: role="radiogroup" with one radio per
 * option, roving focus, arrow keys that move and select, and a visible focus
 * ring on the focused segment. In right-to-left layouts `--dir` flips the
 * translation so the thumb follows the mirrored order.
 */

const PREFIX = "dowel-segmented-pill";

const STYLES = `
@keyframes ${PREFIX}-stretch{0%{transform:scale(1,1)}38%{transform:scale(var(--${PREFIX}-reach),.9)}72%{transform:scale(.96,1.03)}100%{transform:scale(1,1)}}
.${PREFIX} [data-part=pill][data-moving]{animation:${PREFIX}-stretch var(--duration-slower) var(--ease-out-quint)}
`;

const segmentedPillVariants = cva(
  cn(
    PREFIX,
    "relative isolate inline-grid shrink-0 auto-cols-fr grid-flow-col rounded-full bg-muted p-[0.25em]",
    "[--dir:1] rtl:[--dir:-1]",
  ),
  {
    variants: {
      size: {
        sm: "text-[0.625rem]",
        md: "text-xs",
        lg: "text-sm",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface SegmentedPillOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedPillProps
  extends
    Omit<
      ComponentPropsWithRef<typeof RadioGroupPrimitive.Root>,
      "children" | "value" | "defaultValue" | "onValueChange" | "orientation"
    >,
    VariantProps<typeof segmentedPillVariants> {
  /** The segments, as labels or `{ value, label }`. */
  options?: (string | SegmentedPillOption)[];
  /** Controlled selection. */
  value?: string;
  /** Initial selection when uncontrolled. Defaults to the first option. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

function normalise(option: string | SegmentedPillOption): SegmentedPillOption {
  return typeof option === "string" ? { value: option, label: option } : option;
}

/** A segmented single-choice control with an elastic sliding thumb. */
export function SegmentedPill({
  className,
  size,
  options = ["Day", "Week", "Month"],
  value: valueProp,
  defaultValue,
  onValueChange,
  style,
  ...props
}: SegmentedPillProps) {
  const items = options.map(normalise);
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? items[0]?.value ?? "");
  const value = valueProp ?? uncontrolled;
  const index = items.findIndex((item) => item.value === value);

  // How far the last move went, derived during render so a controlled change
  // stretches the thumb just as a click does.
  const [previous, setPrevious] = useState(index);
  const [move, setMove] = useState({ count: 0, distance: 0 });
  if (previous !== index) {
    setPrevious(index);
    if (previous !== -1 && index !== -1) {
      setMove({ count: move.count + 1, distance: Math.abs(index - previous) });
    }
  }

  return (
    <RadioGroupPrimitive.Root
      data-slot="segmented-pill"
      orientation="horizontal"
      value={value}
      onValueChange={(next) => {
        if (valueProp === undefined) setUncontrolled(next);
        onValueChange?.(next);
      }}
      className={cn(segmentedPillVariants({ size }), className)}
      style={
        {
          "--n": items.length,
          "--i": Math.max(index, 0),
          [`--${PREFIX}-reach`]: 1 + Math.min(move.distance, 3) * 0.22,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        data-part="thumb"
        className={cn(
          "pointer-events-none absolute inset-y-[0.25em] start-[0.25em] -z-10",
          "w-[calc((100%-0.5em)/var(--n))]",
          "translate-x-[calc(var(--i)*100%*var(--dir))]",
          "transition-[translate] duration-[var(--duration-slower)] ease-[var(--ease-overshoot)]",
          index === -1 && "opacity-0",
        )}
      >
        <span
          key={move.count}
          data-part="pill"
          data-moving={move.count > 0 ? "" : undefined}
          className="block size-full rounded-full bg-foreground shadow-sm"
        />
      </span>
      {items.map((item) => (
        <RadioGroupPrimitive.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          data-slot="segmented-pill-item"
          className={cn(
            "relative h-[2.5em] min-w-[4.5em] cursor-pointer rounded-full px-[1em] font-medium whitespace-nowrap",
            "text-muted-foreground transition-colors duration-[var(--duration-normal)]",
            "hover:text-foreground data-[state=checked]:text-background",
            "disabled:cursor-not-allowed disabled:opacity-55",
            focusRing,
          )}
        >
          {item.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

export { segmentedPillVariants };
