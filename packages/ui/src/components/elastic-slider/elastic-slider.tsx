"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Direction, Slider as SliderPrimitive } from "radix-ui";
import {
  useRef,
  useState,
  type ComponentPropsWithRef,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A slider made of rubber. Drag past either end and the track stretches after
 * the pointer, harder the further you pull, with the thumb riding the
 * stretched end and the icon on that side pushed outwards; let go and it
 * springs back. While held, the thumb swells and its value floats above it.
 *
 * The stretch is a displacement with resistance — the pointer's overshoot
 * through an exponential that approaches `maxStretch` — and the return is a
 * spring, which is what `motion` is here for. Everything that makes it a
 * slider is Radix's: the role="slider" thumb, arrow keys, Home/End, Page
 * Up/Down, right-to-left and a form input. Under reduced motion it never
 * stretches.
 */

const elasticSliderVariants = cva("flex w-full touch-none items-center select-none", {
  variants: {
    size: {
      sm: "gap-2 [--elastic-thumb:1rem] [--elastic-track:0.375rem]",
      md: "gap-3 [--elastic-thumb:1.25rem] [--elastic-track:0.5rem]",
    },
  },
  defaultVariants: { size: "md" },
});

type RootProps = ComponentPropsWithRef<typeof SliderPrimitive.Root>;

export interface ElasticSliderProps
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
    VariantProps<typeof elasticSliderVariants> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
  /** Shown at the inline start; nudged outwards when the track is pulled past it. */
  startIcon?: ReactNode;
  /** Shown at the inline end; nudged outwards when the track is pulled past it. */
  endIcon?: ReactNode;
  /** The furthest the track stretches past an end, in px. */
  maxStretch?: number;
  /** Float the value above the thumb while it is held. Default true. */
  showValue?: boolean;
  /** Formats the floating value and the spoken `aria-valuetext`. */
  formatValue?: (value: number) => string;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

/** Overshoot with resistance: grows quickly, then ever more slowly, to `max`. */
export function rubberBand(overshoot: number, max: number) {
  if (max <= 0 || overshoot === 0) return 0;
  return Math.sign(overshoot) * max * (1 - Math.exp(-Math.abs(overshoot) / (max * 2.5)));
}

export function ElasticSlider({
  className,
  size,
  value: valueProp,
  defaultValue = 50,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  startIcon,
  endIcon,
  maxStretch = 16,
  showValue = true,
  formatValue = String,
  disabled,
  dir: dirProp,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-valuetext": ariaValueText,
  ...props
}: ElasticSliderProps) {
  const dir = Direction.useDirection(dirProp);
  const reduce = useReducedMotion();
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const controlled = valueProp !== undefined;
  const value = clamp(controlled ? valueProp : uncontrolled, min, max);
  const [held, setHeld] = useState(false);

  const track = useRef<HTMLSpanElement>(null);
  /** Signed stretch in physical px: positive pulls to the right. */
  const stretch = useMotionValue(0);
  const width = useRef(1);
  const scaleX = useTransform(stretch, (s) => 1 + Math.abs(s) / width.current);
  const scaleY = useTransform(stretch, (s) => 1 - Math.min(0.35, Math.abs(s) / 60));
  const originX = useTransform(stretch, (s) => (s >= 0 ? 0 : 1));
  const rightNudge = useTransform(stretch, (s) => Math.max(0, s));
  const leftNudge = useTransform(stretch, (s) => Math.min(0, s));

  function update(next: number) {
    if (next === value) return;
    if (!controlled) setUncontrolled(next);
    onValueChange?.(next);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    onPointerDown?.(event);
    if (disabled || event.defaultPrevented) return;
    setHeld(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    if (!held || reduce || !track.current) return;
    const rect = track.current.getBoundingClientRect();
    width.current = Math.max(1, rect.width);
    const overshoot =
      event.clientX > rect.right
        ? event.clientX - rect.right
        : event.clientX < rect.left
          ? event.clientX - rect.left
          : 0;
    stretch.set(rubberBand(overshoot, maxStretch));
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    onPointerUp?.(event);
    setHeld(false);
    if (stretch.get() !== 0) {
      void animate(stretch, 0, { type: "spring", stiffness: 520, damping: 14, mass: 0.6 });
    }
  }

  // The icon on the physical right is the end icon, or the start one in RTL.
  const startNudge = dir === "rtl" ? rightNudge : leftNudge;
  const endNudge = dir === "rtl" ? leftNudge : rightNudge;
  const iconClass =
    "flex shrink-0 items-center text-muted-foreground transition-colors [&_svg]:size-4";

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-slot="elastic-slider-root"
        dir={dirProp}
        className={cn(
          elasticSliderVariants({ size }),
          disabled && "cursor-not-allowed opacity-55",
          className,
        )}
      >
        {startIcon ? (
          <motion.span
            aria-hidden="true"
            data-slot="elastic-slider-icon"
            className={iconClass}
            style={{ x: startNudge }}
          >
            {startIcon}
          </motion.span>
        ) : null}
        <SliderPrimitive.Root
          data-slot="elastic-slider"
          data-held={held ? "" : undefined}
          value={[value]}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          dir={dirProp}
          onValueChange={([next]) => next !== undefined && update(next)}
          onValueCommit={([next]) => next !== undefined && onValueCommit?.(next)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={release}
          onPointerCancel={release}
          className="relative flex h-(--elastic-thumb) grow items-center"
          {...props}
        >
          <SliderPrimitive.Track asChild>
            <motion.span
              ref={track}
              data-slot="elastic-slider-track"
              className="relative h-(--elastic-track) grow overflow-hidden rounded-full bg-muted"
              style={{ scaleX, scaleY, originX }}
            >
              <SliderPrimitive.Range
                data-slot="elastic-slider-range"
                className="absolute h-full rounded-full bg-primary"
              />
            </motion.span>
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb asChild>
            <motion.span
              data-slot="elastic-slider-thumb"
              data-held={held ? "" : undefined}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              aria-valuetext={ariaValueText ?? formatValue(value)}
              className={cn(
                "group/thumb relative block size-(--elastic-thumb) rounded-full border-2 border-primary bg-background shadow-sm",
                "transition-[scale] duration-[var(--duration-fast)] ease-[var(--ease-overshoot)]",
                "data-[disabled]:pointer-events-none data-[held]:scale-125",
                focusRing,
              )}
              // The thumb rides the stretched end, so it only moves at an end.
              style={{ x: value === max || value === min ? stretch : 0 }}
            >
              {showValue ? (
                <span
                  aria-hidden="true"
                  data-slot="elastic-slider-value"
                  className={cn(
                    "pointer-events-none absolute start-1/2 bottom-full mb-2 -translate-x-1/2 rtl:translate-x-1/2",
                    "rounded-md bg-foreground px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-background tabular-nums",
                    "scale-75 opacity-0 transition-[opacity,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
                    "group-data-[held]/thumb:scale-100 group-data-[held]/thumb:opacity-100",
                    "group-focus-visible/thumb:scale-100 group-focus-visible/thumb:opacity-100",
                  )}
                >
                  {formatValue(value)}
                </span>
              ) : null}
            </motion.span>
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Root>
        {endIcon ? (
          <motion.span
            aria-hidden="true"
            data-slot="elastic-slider-icon"
            className={iconClass}
            style={{ x: endNudge }}
          >
            {endIcon}
          </motion.span>
        ) : null}
      </div>
    </MotionConfig>
  );
}

export { elasticSliderVariants };
