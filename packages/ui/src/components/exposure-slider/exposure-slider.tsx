"use client";

// Ported from SmoothUI Exposure Slider (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Direction } from "radix-ui";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * An iOS-camera exposure dial: a ruler of notches slides under a fixed centre
 * mark, and a ring above it fills clockwise for positive values and
 * anticlockwise for negative ones.
 *
 * It is a real slider. The ruler is the `role="slider"` element — focusable,
 * named, with aria-valuenow/-valuetext — and every drag has a keyboard
 * equivalent (arrows, Page Up/Down, Home/End). Dragging is relative, as on the
 * camera: the ruler moves with the finger rather than jumping to it.
 *
 * The source smoothed the drag with a `motion` spring. Nothing here carries
 * gesture velocity — release snaps to the nearest notch — so the settle is a
 * CSS transition on `transform`, switched off while the pointer is down so the
 * ruler tracks the finger exactly. The global reduced-motion rule stops it.
 */

/** Pixels per notch: a 3px mark plus a 10px gap, as in the source. */
const NOTCH = 13;

const exposureSliderVariants = cva(
  "flex w-full max-w-md flex-col items-center gap-6 text-foreground",
  {
    variants: {
      /** The colour of the centre notch, the ring and a non-neutral value. */
      accent: {
        primary: "[--exposure-accent:var(--color-primary)]",
        warning: "[--exposure-accent:var(--color-warning)]",
        destructive: "[--exposure-accent:var(--color-destructive)]",
        success: "[--exposure-accent:var(--color-success)]",
        info: "[--exposure-accent:var(--color-info)]",
        foreground: "[--exposure-accent:var(--color-foreground)]",
      },
    },
    defaultVariants: {
      accent: "warning",
    },
  },
);

export interface ExposureSliderProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof exposureSliderVariants> {
  /** Controlled value. */
  value?: number;
  /** Initial value when uncontrolled. */
  defaultValue?: number;
  /** Called on every change — each notch crossed while dragging, each key press. */
  onValueChange?: (value: number) => void;
  /** Called when an interaction ends: pointer released, or a key press. */
  onValueCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Steps moved by Page Up / Page Down. */
  largeStep?: number;
  /** Show the ring with the current value above the ruler. */
  showIndicator?: boolean;
  /** Formats the value for the ring and for `aria-valuetext`, e.g. `v => \`${v} EV\``. */
  formatValue?: (value: number) => string;
  disabled?: boolean;
  /** Submits the value with a form under this name. */
  name?: string;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

/** Opacity and clip for a notch, from its distance to the centre in notches. */
function notchStyle(distance: number): { opacity: number; clip: number } {
  const opacity =
    distance <= 1 ? 1 - distance * 0.4 : distance <= 3 ? 0.6 - (distance - 1) * 0.15 : 0.3;
  const clip = distance <= 1 ? distance * 30 : distance <= 2 ? 30 + (distance - 1) * 20 : 50;
  return { opacity, clip };
}

/** An exposure-style dial: a draggable ruler of notches with a value ring. */
export function ExposureSlider({
  className,
  style,
  accent,
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  onValueCommit,
  min = -20,
  max = 20,
  step = 1,
  largeStep = 10,
  showIndicator = true,
  formatValue = String,
  disabled = false,
  name,
  dir: dirProp,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-valuetext": ariaValueText,
  ...props
}: ExposureSliderProps) {
  const dir = Direction.useDirection(dirProp as "ltr" | "rtl" | undefined);
  const count = Math.max(1, Math.floor((max - min) / step) + 1);
  const toIndex = (v: number) => clamp(Math.round((v - min) / step), 0, count - 1);
  const toValue = (index: number) => Number((min + index * step).toFixed(10));

  const [uncontrolled, setUncontrolled] = useState(() => toValue(toIndex(defaultValue)));
  const controlled = valueProp !== undefined;
  const value = controlled ? toValue(toIndex(valueProp)) : uncontrolled;
  const index = toIndex(value);

  // The fractional notch under the centre mark while a drag is in progress.
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const drag = useRef<{ startX: number; startPosition: number; value: number } | null>(null);
  const position = dragPosition ?? index;
  const dragging = dragPosition !== null;
  const forward = dir === "rtl" ? -1 : 1;

  useMissingNameWarning(ariaLabel, ariaLabelledBy);

  function setValue(next: number) {
    if (next === value) return;
    if (!controlled) setUncontrolled(next);
    onValueChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const moves: Record<string, number> = {
      ArrowRight: forward,
      ArrowLeft: -forward,
      ArrowUp: 1,
      ArrowDown: -1,
      PageUp: largeStep,
      PageDown: -largeStep,
    };
    let target: number;
    if (event.key === "Home") target = 0;
    else if (event.key === "End") target = count - 1;
    else if (event.key in moves) target = clamp(index + (moves[event.key] ?? 0), 0, count - 1);
    else return;
    event.preventDefault();
    const next = toValue(target);
    setValue(next);
    onValueCommit?.(next);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startPosition: index, value };
    setDragPosition(index);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;
    // Dragging the ruler towards the start brings higher notches to the centre.
    const moved = (-(event.clientX - current.startX) * forward) / NOTCH;
    const next = clamp(current.startPosition + moved, 0, count - 1);
    setDragPosition(next);
    const nextValue = toValue(Math.round(next));
    if (nextValue !== current.value) {
      current.value = nextValue;
      setValue(nextValue);
    }
  }

  function handlePointerEnd() {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    setDragPosition(null);
    onValueCommit?.(current.value);
  }

  const offset = -position * NOTCH * forward;
  const normalized = max === min ? 0 : ((value - min) / (max - min)) * 2 - 1;
  const neutral = Math.abs(normalized) < 0.005;
  const text = formatValue(value);

  return (
    <div
      data-slot="exposure-slider"
      data-disabled={disabled ? "" : undefined}
      dir={dirProp}
      className={cn(exposureSliderVariants({ accent }), disabled && "opacity-55", className)}
      style={style}
      {...props}
    >
      {showIndicator ? (
        <div
          data-slot="exposure-slider-indicator"
          aria-hidden="true"
          className="relative grid size-[4.75rem] place-items-center"
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="currentColor"
              fillOpacity={0.067}
              stroke="currentColor"
              strokeOpacity={0.3}
              strokeWidth="3"
            />
            {/* Positive values fill clockwise, negative ones mirror it. */}
            {[1, -1].map((sign) => {
              const amount = Math.max(0, normalized * sign);
              return (
                <circle
                  key={sign}
                  data-slot="exposure-slider-arc"
                  data-sign={sign > 0 ? "positive" : "negative"}
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  pathLength={1}
                  stroke="var(--exposure-accent)"
                  strokeWidth="3"
                  strokeDasharray={`${String(amount)} ${String(1 - amount)}`}
                  className={cn(
                    "transition-[stroke-dasharray] ease-[var(--ease-out-quint)]",
                    dragging
                      ? "duration-[var(--duration-instant)]"
                      : "duration-[var(--duration-normal)]",
                  )}
                  style={{
                    transform: sign > 0 ? "rotate(-90deg)" : "scaleX(-1) rotate(-90deg)",
                    transformBox: "fill-box",
                    transformOrigin: "50% 50%",
                  }}
                />
              );
            })}
          </svg>
          <span
            data-slot="exposure-slider-value"
            className={cn(
              "relative text-lg font-semibold tabular-nums transition-colors duration-[var(--duration-fast)]",
              !neutral && "text-[var(--exposure-accent)]",
            )}
          >
            {text}
          </span>
        </div>
      ) : null}

      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        data-slot="exposure-slider-ruler"
        data-dragging={dragging ? "" : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-valuemin={min}
        aria-valuemax={toValue(count - 1)}
        aria-valuenow={value}
        aria-valuetext={ariaValueText ?? text}
        aria-orientation="horizontal"
        aria-disabled={disabled || undefined}
        className={cn(
          "relative h-10 w-full touch-pan-y overflow-hidden rounded-md select-none",
          disabled ? "cursor-not-allowed" : "cursor-grab data-[dragging]:cursor-grabbing",
          focusRing,
        )}
        style={{
          maskImage:
            "linear-gradient(to right, transparent, currentColor 20%, currentColor 80%, transparent)",
        }}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
      >
        <div
          data-slot="exposure-slider-track"
          aria-hidden="true"
          className={cn(
            "flex h-full items-center",
            !dragging &&
              "transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
          )}
          style={{
            paddingInline: `calc(50% - ${String(NOTCH / 2)}px)`,
            transform: `translateX(${String(offset)}px)`,
          }}
        >
          {Array.from({ length: count }, (_, notch) => {
            const distance = Math.abs(notch - position);
            const { opacity, clip } = notchStyle(distance);
            const centre = distance < 0.5;
            return (
              <span
                key={notch}
                data-slot="exposure-slider-notch"
                data-centre={centre ? "" : undefined}
                className="flex h-full shrink-0 justify-center"
                style={{ width: NOTCH }}
              >
                <span
                  className={cn(
                    "h-full w-[3px] rounded-sm",
                    centre ? "bg-[var(--exposure-accent)]" : "bg-current",
                    !dragging &&
                      "transition-[opacity,clip-path] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                  )}
                  style={{ opacity, clipPath: `inset(${String(clip)}% 0 0)` }}
                />
              </span>
            );
          })}
        </div>
      </div>
      {name ? <input type="hidden" name={name} value={value} disabled={disabled} /> : null}
    </div>
  );
}

/** Warns, in development only, when the slider would render without a name. */
function useMissingNameWarning(ariaLabel?: string, ariaLabelledBy?: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (ariaLabel || ariaLabelledBy) return;
    console.warn(
      "[ExposureSlider] The slider has no accessible name. Pass aria-label or aria-labelledby.",
    );
  }, [ariaLabel, ariaLabelledBy]);
}

export { exposureSliderVariants };
