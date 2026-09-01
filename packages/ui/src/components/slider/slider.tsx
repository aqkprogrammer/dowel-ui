"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import { useEffect, useMemo, type ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Selects a value, or a range, from a continuous span.
 *
 * Renders one thumb per value, so a range slider is just two values. Sliders
 * are imprecise by nature: if the exact number matters, pair it with a numeric
 * input rather than asking people to land on a pixel.
 */
export interface SliderProps extends ComponentPropsWithRef<typeof SliderPrimitive.Root> {
  /**
   * Accessible name per thumb, in order.
   *
   * A range slider is two independent `role="slider"` controls, and naming both
   * of them "Price" tells a screen reader user nothing about which one they are
   * on. Give them distinct names — "Minimum price", "Maximum price".
   */
  thumbLabels?: string[];
  /**
   * Spoken value per thumb, in order, for values whose raw number is not
   * meaningful on its own — a price, a duration, a rating.
   */
  thumbValueTexts?: string[];
}

export function Slider({
  className,
  value,
  defaultValue,
  min = 0,
  max = 100,
  thumbLabels,
  thumbValueTexts,
  // Every naming and value-describing attribute has to move to the thumbs for
  // the same reason: the thumb is the element with role="slider".
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-valuetext": ariaValueText,
  ...props
}: SliderProps) {
  // One thumb per value. Falling back to a single thumb keeps the bare
  // <Slider /> case working without forcing a defaultValue.
  const thumbCount = useMemo(
    () => (value ?? defaultValue ?? [min]).length,
    [value, defaultValue, min],
  );

  // The name has to live on the thumb, because the thumb is the element with
  // role="slider". Left on the root it names an element with no role, and the
  // control a screen reader actually lands on is announced unnamed.
  useMissingLabelWarning(thumbCount, thumbLabels, ariaLabel, ariaLabelledBy);

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        "data-[orientation=vertical]:h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        "data-[disabled]:opacity-55",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full bg-muted",
          "data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute bg-primary",
            "data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }, (_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          data-slot="slider-thumb"
          aria-label={thumbLabels?.[index] ?? ariaLabel}
          aria-labelledby={thumbLabels?.[index] ? undefined : ariaLabelledBy}
          aria-valuetext={thumbValueTexts?.[index] ?? ariaValueText}
          className={cn(
            "block size-4 shrink-0 rounded-full border-2 border-primary bg-background shadow-sm",
            "transition-[box-shadow,transform] duration-[var(--duration-instant)]",
            "hover:scale-110 disabled:pointer-events-none",
            focusRing,
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

/**
 * Warns, in development only, when a thumb would render without a name.
 *
 * An unnamed slider is invisible on screen and serious for screen reader users,
 * so it is surfaced where it is introduced rather than left for an audit.
 */
function useMissingLabelWarning(
  thumbCount: number,
  thumbLabels: string[] | undefined,
  ariaLabel: string | undefined,
  ariaLabelledBy: string | undefined,
) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const fallbackName = ariaLabel ?? ariaLabelledBy;
    const unnamed = Array.from({ length: thumbCount }).some(
      (_, index) => !(thumbLabels?.[index] ?? fallbackName),
    );
    if (!unnamed) return;

    console.warn(
      "[Slider] A thumb has no accessible name. Pass aria-label or aria-labelledby, or " +
        "thumbLabels to name each thumb of a range slider individually.",
    );
  }, [thumbCount, thumbLabels, ariaLabel, ariaLabelledBy]);
}
