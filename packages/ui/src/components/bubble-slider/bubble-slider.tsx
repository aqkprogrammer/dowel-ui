"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slider as SliderPrimitive } from "radix-ui";
import {
  useEffect,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A slider whose thumb is a pill bubble showing the value, with a double
 * outline and a row of ticks beneath the track.
 *
 * The bubble is elastic in two ways:
 *
 * - Velocity: each change widens it in proportion to how far the value jumped
 *   (a fast drag or a Page Up stretches it more than one arrow step), and a
 *   moment later it is let go and springs back to round on an overshooting
 *   transition.
 * - Rubber band: dragging past either end of the track pulls the bubble on
 *   after the pointer with diminishing give, stretched toward it, and releasing
 *   snaps it home.
 *
 * Both are a transform on an inner element, so the thumb Radix positions (and
 * measures) never changes size. Every duration runs through --motion-scale, so
 * under reduced motion the bubble moves without stretching or springing.
 *
 * Built on the Radix slider: the thumb is role="slider" with aria-valuenow,
 * min and max, and Arrow keys, Page Up/Down, Home and End all work. It has no
 * visible label, so name it with aria-label or aria-labelledby. The number in
 * the bubble and the ticks are aria-hidden; the value is exposed on the thumb,
 * with `formatValue` supplying aria-valuetext for units. Radix mirrors the
 * slider in right-to-left layouts.
 */

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

/** How long a stretch is held before the bubble is let go, in ms. */
const HOLD = 90;
/** Furthest the bubble follows a pointer past the end of the track, in px. */
const MAX_PULL = 14;

const bubbleSliderVariants = cva(
  "relative flex w-40 touch-none items-center select-none data-disabled:opacity-55",
  {
    variants: {
      size: {
        sm: "h-10 text-[0.625rem] [--bubble-thumb-h:1.5rem] [--bubble-thumb-w:2.25rem]",
        md: "h-14 text-xs [--bubble-thumb-h:1.875rem] [--bubble-thumb-w:2.875rem]",
        lg: "h-16 text-sm [--bubble-thumb-h:2.25rem] [--bubble-thumb-w:3.5rem]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type RootProps = ComponentPropsWithRef<typeof SliderPrimitive.Root>;

export interface BubbleSliderProps
  extends
    Omit<
      RootProps,
      | "value"
      | "defaultValue"
      | "onValueChange"
      | "onValueCommit"
      | "orientation"
      | "inverted"
      | "minStepsBetweenThumbs"
      | "children"
    >,
    VariantProps<typeof bubbleSliderVariants> {
  /** Controlled value. */
  value?: number;
  /** Initial value when uncontrolled. Defaults to `min`. */
  defaultValue?: number;
  /** Called on every change while dragging or keying. */
  onValueChange?: (value: number) => void;
  /** Called when an interaction ends: pointer released or key pressed. */
  onValueCommit?: (value: number) => void;
  /** Number of ticks under the track. 0 hides them. Defaults to 11. */
  ticks?: number;
  /** Text shown in the bubble and spoken as aria-valuetext, e.g. for units. */
  formatValue?: (value: number) => string;
}

/** A slider with a pill thumb that shows its value and stretches with speed. */
export function BubbleSlider({
  className,
  size,
  value: valueProp,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  ticks = 11,
  formatValue,
  disabled,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-valuetext": ariaValueText,
  ...props
}: BubbleSliderProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? min);
  const value = valueProp ?? uncontrolled;
  const range = max - min || 1;

  // Stretch with the size of each jump, however it arrives (drag, key or a
  // controlled prop); the effect below lets go of it a moment later.
  const [shown, setShown] = useState(value);
  const [stretch, setStretch] = useState(1);
  if (shown !== value) {
    setShown(value);
    setStretch(1 + Math.min((Math.abs(value - shown) / range) * 6, 0.5));
  }
  useEffect(() => {
    if (stretch === 1) return;
    const id = setTimeout(() => {
      setStretch(1);
    }, HOLD);
    return () => clearTimeout(id);
  }, [stretch, shown]);

  const [pull, setPull] = useState(0);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    if (disabled || (event.buttons & 1) === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const past =
      event.clientX < rect.left
        ? event.clientX - rect.left
        : event.clientX > rect.right
          ? event.clientX - rect.right
          : 0;
    setPull(Math.sign(past) * MAX_PULL * (1 - Math.exp(-Math.abs(past) / 60)));
  }

  function release() {
    setPull(0);
  }

  const text = formatValue ? formatValue(value) : String(value);
  const widen = stretch + Math.abs(pull) / 40;
  const spring = `transform ${s(0.45)} cubic-bezier(.34,1.56,.64,1)`;
  const bubble: CSSProperties = {
    transform: `translateX(${pull.toFixed(2)}px) scaleX(${widen.toFixed(3)})`,
    transition: spring,
  };
  // The number is counter-scaled, so the pill stretches and the digits do not.
  const digits: CSSProperties = {
    transform: `scaleX(${(1 / widen).toFixed(3)})`,
    transition: spring,
  };

  return (
    <SliderPrimitive.Root
      data-slot="bubble-slider"
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={([next]) => {
        if (next === undefined || next === value) return;
        if (valueProp === undefined) setUncontrolled(next);
        onValueChange?.(next);
      }}
      onValueCommit={([next]) => {
        if (next !== undefined) onValueCommit?.(next);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        release();
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        release();
      }}
      onLostPointerCapture={(event) => {
        onLostPointerCapture?.(event);
        release();
      }}
      className={cn(bubbleSliderVariants({ size }), className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-[3px] grow overflow-hidden rounded-full bg-muted-foreground/35">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-muted-foreground/70" />
      </SliderPrimitive.Track>

      {ticks > 0 ? (
        <span
          aria-hidden="true"
          data-slot="bubble-slider-ticks"
          className="pointer-events-none absolute inset-x-[calc(var(--bubble-thumb-w)/2)] top-[calc(50%_+_var(--bubble-thumb-h)/2_+_0.375rem)] flex justify-between"
        >
          {Array.from({ length: ticks }, (_, index) => (
            <span
              key={index}
              className={cn(
                "block w-px rounded-full bg-muted-foreground/60",
                index % 5 === 0 ? "h-2" : "h-1.5",
              )}
            />
          ))}
        </span>
      ) : null}

      <SliderPrimitive.Thumb
        data-slot="bubble-slider-thumb"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-valuetext={ariaValueText ?? formatValue?.(value)}
        className={cn(
          "block h-(--bubble-thumb-h) w-(--bubble-thumb-w) cursor-grab rounded-full active:cursor-grabbing",
          "data-disabled:cursor-not-allowed",
          focusRing,
        )}
      >
        <span
          aria-hidden="true"
          data-slot="bubble-slider-bubble"
          className={cn(
            "flex size-full items-center justify-center rounded-full border-2 border-foreground bg-background",
            "font-semibold text-foreground tabular-nums",
            "shadow-[0_0_0_2px_var(--color-background),0_0_0_3.5px_var(--color-foreground)]",
          )}
          style={bubble}
        >
          <span className="block" style={digits}>
            {text}
          </span>
        </span>
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  );
}

export { bubbleSliderVariants };
