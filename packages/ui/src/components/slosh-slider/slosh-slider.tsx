"use client";

// Ported from bencho Slosh slider (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { MotionConfig, motion, useSpring, useTransform, useVelocity } from "motion/react";
import { Direction, Slider as SliderPrimitive } from "radix-ui";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A slider whose fill behaves like liquid in a tube. The knob — the Radix
 * thumb, drawn as a thin bar — jumps to the value at once; the fill behind it
 * is a damped spring chasing that value, so it lags on the way, overshoots
 * when you stop and settles. Its leading edge is a parallelogram whose lean
 * follows the fill's velocity, so the surface tilts in the direction of travel.
 *
 * That is continuous physics with velocity, which is what `motion` is for here.
 * Under reduced motion the fill jumps with the knob and never leans.
 *
 * Semantics are entirely Radix's: a role="slider" thumb with pointer
 * jump-to-value, arrows, Home/End, right-to-left and a form input. Page Up/Down
 * are taken over so they move by `largeStep` rather than Radix's fixed ten
 * steps.
 */

/** Extra width the fill carries past its value, so the lean has room to show. */
const PAD = 16;
/** The furthest the leading edge may lean, in px. */
const MAX_LEAN = 12;

const sloshSliderVariants = cva(
  cn(
    "relative flex h-10 w-full touch-none items-center overflow-hidden select-none",
    "cursor-ew-resize bg-(--slosh-track) data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55",
    "has-[[data-slot=slosh-slider-thumb]:focus-visible]:ring-2 has-[[data-slot=slosh-slider-thumb]:focus-visible]:ring-ring/55",
    "has-[[data-slot=slosh-slider-thumb]:focus-visible]:ring-offset-2 has-[[data-slot=slosh-slider-thumb]:focus-visible]:ring-offset-background",
  ),
  {
    variants: {
      /** `light`: a muted track filled with the card surface. `dark`: a foreground slab. */
      fill: {
        light: cn(
          "[--slosh-track:color-mix(in_oklab,var(--color-foreground)_11%,var(--color-card))]",
          "[--slosh-fill:var(--color-card)] [--slosh-knob:var(--color-foreground)]",
        ),
        dark: cn(
          "[--slosh-knob:var(--color-background)] [--slosh-track:var(--color-foreground)]",
          "[--slosh-fill:color-mix(in_oklab,var(--color-background)_15%,var(--color-foreground))]",
        ),
      },
    },
    defaultVariants: {
      fill: "light",
    },
  },
);

type RootProps = ComponentPropsWithRef<typeof SliderPrimitive.Root>;

export interface SloshSliderProps
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
    VariantProps<typeof sloshSliderVariants> {
  /** Controlled value. */
  value?: number;
  /** Initial value when uncontrolled. */
  defaultValue?: number;
  /** Called on every change while dragging or keying. */
  onValueChange?: (value: number) => void;
  /** Called when an interaction ends: pointer released or key pressed. */
  onValueCommit?: (value: number) => void;
  /** Steps moved by Page Up / Page Down (multiplied by `step`). */
  largeStep?: number;
  /** 0–100. Damping: higher is thicker liquid — less slosh, more lag. */
  viscosity?: number;
  /** 0–100. The fill's mass: higher overshoots further and settles slower. */
  momentum?: number;
  /** 0–100. How far the leading edge leans per unit of fill velocity. */
  tilt?: number;
  /** 0–20. Corner radius of the bar, in px. */
  corner?: number;
  /** A 1px inset hairline ring around the bar. */
  stroke?: boolean;
  /** Spoken value (`aria-valuetext`), for units: `(v) => \`${v}%\``. */
  formatValue?: (value: number) => string;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Live: turning the setting on mid-session stops the slosh at once. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Maps the three feel levels to spring constants tuned against the source. */
export function sloshSpring(viscosity: number, momentum: number) {
  return {
    stiffness: 600,
    damping: 20 + clamp(viscosity, 0, 100) * 0.7,
    mass: 0.4 + (clamp(momentum, 0, 100) / 100) * 1.2,
  };
}

/** A liquid-fill slider: the knob jumps, the fill sloshes after it. */
export function SloshSlider({
  className,
  style,
  fill: fillVariant,
  stroke = false,
  value: valueProp,
  defaultValue = 62,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  largeStep = 10,
  viscosity = 15,
  momentum = 55,
  tilt = 45,
  corner = 13,
  disabled,
  formatValue,
  dir: dirProp,
  onKeyDown,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-valuetext": ariaValueText,
  ...props
}: SloshSliderProps) {
  const dir = Direction.useDirection(dirProp);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const controlled = valueProp !== undefined;
  const value = clamp(controlled ? valueProp : uncontrolled, min, max);
  const reduceMotion = usePrefersReducedMotion();

  const range = max - min;
  const percent = range > 0 ? ((value - min) / range) * 100 : 0;
  const level = useSpring(percent, sloshSpring(viscosity, momentum));
  const velocity = useVelocity(level);
  // Read through a ref: a transform's function is not re-bound on re-render.
  const gain = reduceMotion ? 0 : (clamp(tilt, 0, 100) / 100) * 0.07;
  const live = useRef({ gain, rtl: dir === "rtl" });
  useEffect(() => {
    live.current = { gain, rtl: dir === "rtl" };
  }, [gain, dir]);
  const lean = useTransform(velocity, (v) => clamp(v * live.current.gain, -MAX_LEAN, MAX_LEAN));
  const width = useTransform(
    level,
    (p) => `calc(${String(clamp(p, 0, 100))}% + ${String(PAD)}px)`,
  );
  const clipPath = useTransform(lean, (l) =>
    live.current.rtl
      ? `polygon(${String(PAD - l)}px 0, 100% 0, 100% 100%, ${String(PAD + l)}px 100%)`
      : `polygon(0 0, calc(100% - ${String(PAD - l)}px) 0, calc(100% - ${String(PAD + l)}px) 100%, 0 100%)`,
  );

  // The fill chases the value; under reduced motion it simply arrives.
  const first = useRef(true);
  useEffect(() => {
    if (first.current || reduceMotion) level.jump(percent);
    else level.set(percent);
    first.current = false;
  }, [percent, reduceMotion, level]);

  useMissingNameWarning(ariaLabel, ariaLabelledBy);

  function update(next: number) {
    if (next === value) return;
    if (!controlled) setUncontrolled(next);
    onValueChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;
    if (event.key !== "PageUp" && event.key !== "PageDown") return;
    // Handled here, so Radix's own ten-step page jump never runs.
    event.preventDefault();
    const raw = value + (event.key === "PageUp" ? 1 : -1) * largeStep * step;
    const next = clamp(Math.round((raw - min) / step) * step + min, min, max);
    update(next);
    onValueCommit?.(next);
  }

  return (
    <MotionConfig reducedMotion="user">
      <SliderPrimitive.Root
        data-slot="slosh-slider"
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        dir={dirProp}
        onValueChange={([next]) => next !== undefined && update(next)}
        onValueCommit={([next]) => next !== undefined && onValueCommit?.(next)}
        onKeyDown={handleKeyDown}
        className={cn(
          sloshSliderVariants({ fill: fillVariant }),
          stroke && "shadow-[inset_0_0_0_1px_var(--color-border)]",
          className,
        )}
        style={{ borderRadius: `${String(clamp(corner, 0, 20))}px`, ...style }}
        {...props}
      >
        <motion.span
          data-slot="slosh-slider-fill"
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 bg-(--slosh-fill)"
          style={{ width, clipPath }}
        />
        <SliderPrimitive.Thumb
          data-slot="slosh-slider-thumb"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-valuetext={ariaValueText ?? formatValue?.(value)}
          className="block h-7 w-[3px] rounded-full bg-(--slosh-knob) outline-none"
        />
      </SliderPrimitive.Root>
    </MotionConfig>
  );
}

/** Warns, in development only, when the thumb would render unnamed. */
function useMissingNameWarning(ariaLabel?: string, ariaLabelledBy?: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (ariaLabel ?? ariaLabelledBy) return;
    console.warn(
      "[SloshSlider] The slider has no accessible name. Pass aria-label or aria-labelledby.",
    );
  }, [ariaLabel, ariaLabelledBy]);
}

export { sloshSliderVariants };
