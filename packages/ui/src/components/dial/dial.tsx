"use client";

// Original design (pattern inspired by bencho Wheel; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A rotary dial: a knob with a pointer notch inside an arc that fills to the
 * value, ringed by detent ticks.
 *
 * The dial itself is the role="slider" element, so aria-label and the value
 * attributes land where the role is. It turns with the keyboard (arrows by a
 * step, PageUp/PageDown by a page, Home/End), by dragging (the notch points
 * at the pointer — absolute, so there is nothing to "wind"), and by the wheel
 * while it has focus (never on mere hover, so it cannot steal page scroll).
 * Every input snaps to `step`, or to the detents with `snapToDetents`.
 *
 * Clockwise is "more" in every language, so the dial does not mirror in
 * right-to-left layouts, and the arrow keys are not swapped either.
 *
 * Motion is a CSS transition on the knob's rotation, dropped while dragging
 * so it tracks the pointer 1:1; reduced motion collapses it.
 */

const dialVariants = cva(
  cn(
    "group/dial relative inline-grid shrink-0 touch-none place-items-center rounded-full select-none",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-55",
    focusRing,
  ),
  {
    variants: {
      size: {
        sm: "size-28 text-lg",
        md: "size-40 text-2xl",
        lg: "size-52 text-3xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/** Wheel distance, in pixels, per step. */
const WHEEL_STEP = 40;

function point(angle: number, radius: number): string {
  const radians = ((angle - 90) * Math.PI) / 180;
  return `${(50 + radius * Math.cos(radians)).toFixed(2)} ${(50 + radius * Math.sin(radians)).toFixed(2)}`;
}

function arc(sweep: number, radius: number): string {
  const half = sweep / 2;
  return `M ${point(-half, radius)} A ${String(radius)} ${String(radius)} 0 ${sweep > 180 ? 1 : 0} 1 ${point(half, radius)}`;
}

export interface DialProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof dialVariants> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** PageUp/PageDown distance. Defaults to a tenth of the range. */
  pageStep?: number;
  /** Tick marks around the dial, ends included. */
  detents?: number;
  /** Snap every input to the detents rather than to `step`. */
  snapToDetents?: boolean;
  /** Degrees of travel from min to max. */
  sweep?: number;
  /** The readout in the middle, and the default value text. */
  format?: (value: number) => string;
  /** Extra content under the readout, e.g. a unit or caption. */
  caption?: ReactNode;
  disabled?: boolean;
}

/** A rotary dial input with detents: drag, wheel or keys. */
export function Dial({
  className,
  size,
  value: valueProp,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  pageStep,
  detents = 11,
  snapToDetents = false,
  sweep = 270,
  format = (value) => String(value),
  caption,
  disabled = false,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  ref,
  ...props
}: DialProps) {
  const [inner, setInner] = useState(defaultValue ?? min);
  const range = Math.max(Number.EPSILON, max - min);
  const value = Math.min(max, Math.max(min, valueProp ?? inner));
  const fraction = (value - min) / range;
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const wheel = useRef(0);
  const ticks = Math.max(2, Math.round(detents));
  const quantum = snapToDetents ? range / (ticks - 1) : step;

  function snap(raw: number): number {
    const snapped = min + Math.round((raw - min) / quantum) * quantum;
    const decimals = (String(quantum).split(".")[1] ?? "").length;
    return Number(Math.min(max, Math.max(min, snapped)).toFixed(Math.min(10, decimals + 2)));
  }

  function commit(raw: number) {
    const next = snap(raw);
    if (next === value) return;
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
  }

  // The wheel needs a non-passive listener to keep the page still, and only
  // acts while the dial has focus. Re-attached each render so it always sees
  // the current value; attaching a listener is cheap.
  useEffect(() => {
    const element = rootRef.current;
    if (!element || disabled) return;
    function handleWheel(event: WheelEvent) {
      if (document.activeElement !== element) return;
      event.preventDefault();
      const delta = event.deltaMode === 0 ? event.deltaY : event.deltaY * WHEEL_STEP;
      wheel.current -= delta;
      const steps = Math.trunc(wheel.current / WHEEL_STEP);
      if (steps === 0) return;
      wheel.current -= steps * WHEEL_STEP;
      commit(value + steps * quantum);
    }
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  });

  function fromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    if (dx === 0 && dy === 0) return;
    // Degrees clockwise from twelve o'clock, in (−180, 180].
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const turned = Math.min(1, Math.max(0, (angle + sweep / 2) / sweep));
    commit(min + turned * range);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (disabled || event.defaultPrevented) return;
    const page = pageStep ?? Math.max(quantum, range / 10);
    const moves: Record<string, number> = {
      ArrowUp: quantum,
      ArrowRight: quantum,
      ArrowDown: -quantum,
      ArrowLeft: -quantum,
      PageUp: page,
      PageDown: -page,
      Home: min - value,
      End: max - value,
    };
    const move = moves[event.key];
    if (move === undefined) return;
    event.preventDefault();
    commit(value + move);
  }

  const rotation = -sweep / 2 + fraction * sweep;
  const valueText = format(value);

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      data-slot="dial"
      data-disabled={disabled || undefined}
      data-dragging={dragging || undefined}
      className={cn(dialVariants({ size }), className)}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (disabled || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        fromPointer(event);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (dragging) fromPointer(event);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        setDragging(false);
      }}
      onPointerCancel={() => {
        setDragging(false);
      }}
      {...props}
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        data-slot="dial-scale"
        className="absolute inset-0 size-full overflow-visible"
      >
        {Array.from({ length: ticks }, (_, index) => {
          const at = index / (ticks - 1);
          const angle = -sweep / 2 + at * sweep;
          return (
            <line
              key={index}
              data-slot="dial-detent"
              data-on={at <= fraction + 1e-9 || undefined}
              x1={point(angle, 47).split(" ")[0]}
              y1={point(angle, 47).split(" ")[1]}
              x2={point(angle, 50).split(" ")[0]}
              y2={point(angle, 50).split(" ")[1]}
              strokeWidth="1.2"
              strokeLinecap="round"
              className="stroke-muted-foreground/45 transition-[stroke] duration-[var(--duration-fast)] data-[on]:stroke-foreground"
            />
          );
        })}
        <path
          d={arc(sweep, 42)}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-foreground/12"
        />
        <path
          d={arc(sweep, 42)}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${(fraction * 100).toFixed(3)} 100`}
          data-slot="dial-arc"
          className={cn(
            "stroke-primary transition-[stroke-dasharray] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
            "group-data-[dragging]/dial:transition-none",
          )}
        />
      </svg>
      <div
        aria-hidden="true"
        data-slot="dial-knob"
        className={cn(
          "absolute inset-[18%] rounded-full bg-card shadow-[inset_0_0_0_1px_var(--color-border),0_1px_3px_color-mix(in_oklab,var(--color-foreground)_14%,transparent)]",
          "transition-[rotate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
          "group-data-[dragging]/dial:transition-none",
        )}
        style={{ rotate: `${rotation.toFixed(3)}deg` }}
      >
        <span className="absolute top-[7%] left-1/2 h-[16%] w-[5%] -translate-x-1/2 rounded-full bg-foreground" />
      </div>
      <div
        aria-hidden="true"
        data-slot="dial-readout"
        className="pointer-events-none relative flex flex-col items-center leading-none font-medium tabular-nums"
      >
        {valueText}
        {caption ? (
          <span className="mt-1 text-[0.45em] font-normal text-muted-foreground">
            {caption}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export { dialVariants };
