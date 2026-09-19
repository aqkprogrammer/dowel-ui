"use client";

// Ported from bencho Drag stepper (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Direction } from "radix-ui";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import { focusRingInset } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A pill number stepper: − and + either side of the value. A tap steps once;
 * pressing and holding a side button for `holdDelay` enters *sweep mode*,
 * where the pill stretches, the number swells, a faint fill shows where the
 * value sits in its range, and dragging sideways scrubs the value until the
 * pointer lifts.
 *
 * The source's value was a plain label. Here it is a real spinbutton: an
 * <input> you can arrow, page, Home/End and type into. Nothing carries gesture
 * velocity, so every animation is a CSS transition on data-sweep and the global
 * reduced-motion rule stops it.
 */

const dragStepperVariants = cva(
  cn(
    "group/stepper relative isolate inline-flex h-[2.875rem] items-stretch overflow-hidden rounded-full select-none",
    "transition-[scale] duration-[calc(320ms*var(--motion-scale))] ease-[cubic-bezier(.24,1.34,.38,1)]",
    "data-[sweep]:scale-x-[1.06]",
  ),
  {
    variants: {
      /** `light` sits on the card surface; `dark` inverts to a foreground slab. */
      fill: {
        light: "bg-card text-card-foreground",
        dark: "bg-foreground text-background",
      },
    },
    defaultVariants: {
      fill: "light",
    },
  },
);

export interface DragStepperProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof dragStepperVariants> {
  /** Controlled value. */
  value?: number;
  /** Initial value when uncontrolled. */
  defaultValue?: number;
  /** Called on every change: tap, key, typed entry and each sweep move. */
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Steps moved by Page Up / Page Down (multiplied by `step`). */
  largeStep?: number;
  /** Milliseconds a side button must be held to enter sweep mode. */
  holdDelay?: number;
  /** Units scrubbed per pixel of horizontal drag in sweep mode. */
  sensitivity?: number;
  /** A 1px inset hairline ring around the pill. */
  stroke?: boolean;
  disabled?: boolean;
  /** Submits the value with a form under this name. */
  name?: string;
  /** Spoken value (`aria-valuetext`), for units: `(v) => \`${v} guests\``. */
  formatValue?: (value: number) => string;
  /** Accessible name of the − button. */
  decrementLabel?: string;
  /** Accessible name of the + button. */
  incrementLabel?: string;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

function precisionOf(step: number): number {
  const text = String(step);
  const exponent = /e-(\d+)$/.exec(text);
  if (exponent) return Number(exponent[1]);
  return text.split(".")[1]?.length ?? 0;
}

function Glyph({ plus }: { plus?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      className="size-4"
    >
      {/* rtl-ok: a minus sign, not an arrow; it means the same in every direction. */}
      <path d="M5 12h14" />
      {plus ? <path d="M12 5v14" /> : null}
    </svg>
  );
}

/** A pill stepper whose side buttons, held, turn into a drag-to-scrub sweep. */
export function DragStepper({
  className,
  fill,
  stroke = false,
  value: valueProp,
  defaultValue = 24,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  largeStep = 10,
  holdDelay = 250,
  sensitivity = 0.6,
  disabled = false,
  name,
  formatValue,
  decrementLabel = "Decrease",
  incrementLabel = "Increase",
  dir: dirProp,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: DragStepperProps) {
  const dir = Direction.useDirection(dirProp as "ltr" | "rtl" | undefined);
  const decimals = precisionOf(step);
  const snap = (raw: number) =>
    Number(clamp(Math.round((raw - min) / step) * step + min, min, max).toFixed(decimals));

  const [uncontrolled, setUncontrolled] = useState(() => snap(defaultValue));
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : uncontrolled;
  const [draft, setDraft] = useState<string | null>(null);
  const [sweep, setSweep] = useState(false);

  // The latest value, readable from window listeners registered mid-gesture.
  const current = useRef(value);
  useEffect(() => {
    current.current = value;
  }, [value]);
  // A hold that became a sweep swallows the click the release produces.
  const swallowClick = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);
  useMissingNameWarning(ariaLabel, ariaLabelledBy);

  function setValue(raw: number) {
    const next = snap(raw);
    if (next === current.current) return;
    // Controlled: the parent's re-render moves `current`, or leaves it be.
    if (!controlled) {
      current.current = next;
      setUncontrolled(next);
    }
    onValueChange?.(next);
  }

  function handleSidePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (disabled || event.button !== 0) return;
    cleanup.current?.();
    swallowClick.current = false;
    const startX = event.clientX;
    let startValue = current.current;
    let sweeping = false;

    const move = (e: globalThis.PointerEvent) => {
      if (!sweeping) return;
      const dx = (e.clientX - startX) * (dir === "rtl" ? -1 : 1);
      setValue(startValue + dx * sensitivity);
    };
    const end = () => {
      if (sweeping) swallowClick.current = true;
      stop();
    };
    const timer = window.setTimeout(() => {
      sweeping = true;
      startValue = current.current;
      setSweep(true);
    }, holdDelay);

    function stop() {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      cleanup.current = null;
      setSweep(false);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    cleanup.current = stop;
  }

  function handleSideClick(event: MouseEvent<HTMLButtonElement>, direction: 1 | -1) {
    // A keyboard click (detail 0) is never the tail of a hold.
    if (swallowClick.current && event.detail !== 0) {
      swallowClick.current = false;
      return;
    }
    swallowClick.current = false;
    if (disabled) return;
    setValue(current.current + direction * step);
  }

  function commitDraft() {
    if (draft === null) return;
    const parsed = Number.parseFloat(draft.replace(",", "."));
    setDraft(null);
    if (Number.isFinite(parsed)) setValue(parsed);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Escape") {
      if (draft === null) return;
      event.preventDefault();
      setDraft(null);
      return;
    }
    const forward = dir === "rtl" ? -1 : 1;
    const moves: Record<string, number> = {
      ArrowUp: 1,
      ArrowDown: -1,
      PageUp: largeStep,
      PageDown: -largeStep,
    };
    // Left/Right step only while not typing, so the caret still moves in a draft.
    if (draft === null) {
      moves.ArrowRight = forward;
      moves.ArrowLeft = -forward;
    }
    let next: number;
    if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    else if (event.key in moves) next = current.current + (moves[event.key] ?? 0) * step;
    else return;
    event.preventDefault();
    setDraft(null);
    setValue(next);
  }

  const range = max - min;
  const ratio = range > 0 ? (clamp(value, min, max) - min) / range : 0;
  const text = value.toFixed(decimals);
  const atMin = value <= min;
  const atMax = value >= max;

  const side = cn(
    "relative z-[1] flex size-[2.875rem] shrink-0 items-center justify-center rounded-full",
    "opacity-55 transition-opacity duration-[var(--duration-fast)] hover:opacity-100",
    "disabled:opacity-25 aria-disabled:opacity-25 aria-disabled:hover:opacity-25",
    disabled ? "cursor-not-allowed" : "cursor-pointer",
    focusRingInset,
  );

  return (
    <div
      role="group"
      data-slot="drag-stepper"
      data-sweep={sweep ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      dir={dirProp}
      className={cn(
        dragStepperVariants({ fill }),
        stroke && "shadow-[inset_0_0_0_1px_var(--color-border)]",
        disabled && "opacity-55",
        className,
      )}
      {...props}
    >
      <i
        data-slot="drag-stepper-fill"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 -z-[1] bg-current/7 opacity-0",
          "transition-opacity duration-[calc(220ms*var(--motion-scale))] group-data-[sweep]/stepper:opacity-100",
        )}
        style={{
          transform: `scaleX(${String(ratio)})`,
          transformOrigin: dir === "rtl" ? "right" : "left",
        }}
      />
      <button
        type="button"
        data-slot="drag-stepper-decrement"
        aria-label={decrementLabel}
        aria-disabled={atMin || undefined}
        disabled={disabled}
        className={side}
        onPointerDown={handleSidePointerDown}
        onClick={(event) => (atMin ? undefined : handleSideClick(event, -1))}
      >
        <Glyph />
      </button>
      <input
        type="text"
        role="spinbutton"
        inputMode="numeric"
        autoComplete="off"
        data-slot="drag-stepper-input"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={formatValue?.(value)}
        disabled={disabled}
        value={draft ?? text}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        className={cn(
          "relative z-[1] w-[3.625rem] min-w-0 rounded-full bg-transparent text-center text-[1.0625rem] font-medium tabular-nums",
          "transition-[scale] duration-[calc(320ms*var(--motion-scale))] ease-[cubic-bezier(.24,1.34,.38,1)]",
          "group-data-[sweep]/stepper:scale-[1.18] disabled:cursor-not-allowed",
          focusRingInset,
        )}
      />
      <button
        type="button"
        data-slot="drag-stepper-increment"
        aria-label={incrementLabel}
        aria-disabled={atMax || undefined}
        disabled={disabled}
        className={side}
        onPointerDown={handleSidePointerDown}
        onClick={(event) => (atMax ? undefined : handleSideClick(event, 1))}
      >
        <Glyph plus />
      </button>
      {name ? <input type="hidden" name={name} value={value} disabled={disabled} /> : null}
    </div>
  );
}

/** Warns, in development only, when the spinbutton would render unnamed. */
function useMissingNameWarning(ariaLabel?: string, ariaLabelledBy?: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (ariaLabel ?? ariaLabelledBy) return;
    console.warn(
      "[DragStepper] The value has no accessible name. Pass aria-label or aria-labelledby.",
    );
  }, [ariaLabel, ariaLabelledBy]);
}

export { dragStepperVariants };
