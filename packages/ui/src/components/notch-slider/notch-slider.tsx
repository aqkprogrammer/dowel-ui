"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slider as SliderPrimitive } from "radix-ui";
import { useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * A discrete slider for a short scale of named options (XS S M L XL). Labels
 * sit above a pill track with a notch dot under each one; a dark pill thumb
 * slides between notches, overshooting slightly and settling, and the label
 * over it brightens and turns bold while the rest stay muted.
 *
 * The thumb, notches and labels share one positioning formula on
 * `inset-inline-start`, so they stay aligned at any width and mirror together
 * in right-to-left layouts. Durations scale with --motion-scale, so under
 * reduced motion the thumb simply moves.
 *
 * Semantics are Radix's slider with integer steps over the option indices: a
 * role="slider" thumb whose aria-valuetext is the option's name ("M", or a
 * longer spoken name from `optionLabels`), moved by arrows, Home/End and
 * pointer drag. The visual labels are aria-hidden duplicates, also clickable
 * for pointer users. The focus ring is drawn around the track.
 */

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

/** Where the centre of option `--i` sits, as an inset from the start edge. */
const CENTRE =
  "calc(var(--pad) + var(--thumb-w) / 2 + var(--i) / var(--last) * (100% - var(--thumb-w) - 2 * var(--pad)))";

const notchSliderVariants = cva("inline-flex flex-col gap-2 select-none", {
  variants: {
    size: {
      sm: "w-32 text-[0.5625rem] [--pad:2px] [--thumb-h:0.875rem] [--thumb-w:1.375rem] [--track-h:1.125rem]",
      md: "w-40 text-[0.625rem] [--pad:2px] [--thumb-h:1rem] [--thumb-w:1.75rem] [--track-h:1.25rem]",
      lg: "w-56 text-xs [--pad:3px] [--thumb-h:1.375rem] [--thumb-w:2.25rem] [--track-h:1.75rem]",
    },
  },
  defaultVariants: { size: "md" },
});

type RootProps = ComponentPropsWithRef<typeof SliderPrimitive.Root>;

export interface NotchSliderProps
  extends
    Omit<
      RootProps,
      | "value"
      | "defaultValue"
      | "onValueChange"
      | "onValueCommit"
      | "min"
      | "max"
      | "step"
      | "orientation"
      | "inverted"
      | "minStepsBetweenThumbs"
      | "children"
    >,
    VariantProps<typeof notchSliderVariants> {
  /** The options, in order. Shown as the labels above the track. */
  options?: readonly string[];
  /** Spoken names for the options, if the short labels are abbreviations. */
  optionLabels?: readonly string[];
  /** Controlled selected option. */
  value?: string;
  /** Initial option when uncontrolled. Defaults to the second option. */
  defaultValue?: string;
  /** Called with the option as the thumb moves. */
  onValueChange?: (value: string) => void;
  /** Called when an interaction ends. */
  onValueCommit?: (value: string) => void;
  /** Class for the wrapper that holds the labels and the track. */
  wrapperClassName?: string;
}

const DEFAULT_OPTIONS = ["XS", "S", "M", "L", "XL"] as const;

/** A discrete slider over named notches, with a sliding dark thumb. */
export function NotchSlider({
  className,
  wrapperClassName,
  style,
  size,
  options = DEFAULT_OPTIONS,
  optionLabels,
  value: valueProp,
  defaultValue,
  onValueChange,
  onValueCommit,
  disabled,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: NotchSliderProps) {
  const last = Math.max(1, options.length - 1);
  const [uncontrolled, setUncontrolled] = useState(
    defaultValue ?? options[Math.min(1, options.length - 1)] ?? "",
  );
  const controlled = valueProp !== undefined;
  const index = Math.max(0, options.indexOf(controlled ? valueProp : uncontrolled));

  function update(next: number) {
    const option = options[next];
    if (option === undefined || next === index) return;
    if (!controlled) setUncontrolled(option);
    onValueChange?.(option);
  }

  const at = (i: number) => ({ "--i": i }) as CSSProperties;

  return (
    <span
      data-slot="notch-slider-wrapper"
      className={cn(notchSliderVariants({ size }), wrapperClassName)}
      style={{ "--last": last } as CSSProperties}
    >
      <span aria-hidden="true" className="relative block h-[1.4em]">
        {options.map((option, i) => (
          <span
            key={option}
            data-active={i === index ? "" : undefined}
            onPointerDown={(event) => {
              if (disabled) return;
              event.preventDefault();
              update(i);
              onValueCommit?.(option);
            }}
            className={cn(
              "absolute top-0 w-(--thumb-w) cursor-pointer text-center leading-[1.4em] font-medium",
              "-ms-[calc(var(--thumb-w)/2)] text-muted-foreground",
              "data-[active]:font-bold data-[active]:text-foreground",
            )}
            style={{
              ...at(i),
              insetInlineStart: CENTRE,
              transition: `color ${s(0.3)} ease`,
            }}
          >
            {option}
          </span>
        ))}
      </span>
      <SliderPrimitive.Root
        data-slot="notch-slider"
        min={0}
        max={last}
        step={1}
        value={[index]}
        disabled={disabled}
        onValueChange={([next]) => next !== undefined && update(next)}
        onValueCommit={([next]) => {
          const option = next === undefined ? undefined : options[next];
          if (option !== undefined) onValueCommit?.(option);
        }}
        className={cn(
          "relative flex h-(--track-h) w-full touch-none items-center rounded-full bg-muted",
          "shadow-[inset_0_1px_2px] shadow-foreground/10",
          "cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55",
          "has-[[role=slider]:focus-visible]:ring-2 has-[[role=slider]:focus-visible]:ring-ring/55",
          "has-[[role=slider]:focus-visible]:ring-offset-2 has-[[role=slider]:focus-visible]:ring-offset-background",
          className,
        )}
        style={style}
        {...props}
      >
        <SliderPrimitive.Track className="absolute inset-0 rounded-full">
          {options.map((option, i) => (
            <span
              key={option}
              aria-hidden="true"
              className="absolute top-1/2 -ms-[1.5px] size-[3px] -translate-y-1/2 rounded-full bg-muted-foreground/60"
              style={{ ...at(i), insetInlineStart: CENTRE }}
            />
          ))}
        </SliderPrimitive.Track>
        <span
          aria-hidden="true"
          data-slot="notch-slider-thumb-visual"
          className={cn(
            "pointer-events-none absolute top-1/2 h-(--thumb-h) w-(--thumb-w) -translate-y-1/2 rounded-full",
            "-ms-[calc(var(--thumb-w)/2)] bg-background shadow-[0_1px_3px] shadow-foreground/20",
            "ring-1 ring-foreground/10",
          )}
          style={{
            ...at(index),
            insetInlineStart: CENTRE,
            transition: `inset-inline-start ${s(0.42)} cubic-bezier(.34,1.4,.64,1)`,
          }}
        />
        <SliderPrimitive.Thumb
          data-slot="notch-slider-thumb"
          aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : "Size")}
          aria-labelledby={ariaLabelledBy}
          aria-valuetext={optionLabels?.[index] ?? options[index]}
          className="block h-(--thumb-h) w-(--thumb-w) rounded-full opacity-0 outline-none"
        />
      </SliderPrimitive.Root>
    </span>
  );
}

export { notchSliderVariants };
