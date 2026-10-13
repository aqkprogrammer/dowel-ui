"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/*
 * Two versions of the same thing, one over the other, with a divider you drag
 * to reveal more of either: a photo before and after an edit, a design before
 * and after a change, light mode against dark.
 *
 * - Both versions are in the page all the time; the top one is clipped with
 *   `clip-path`, so nothing reflows while dragging and both stay readable to a
 *   screen reader.
 * - The divider is a real slider (`role="slider"`, 0–100): arrows step 1, with
 *   Shift or Page Up/Down 10, Home and End to either side. In a right-to-left
 *   document "before" sits on the right and the arrows follow.
 * - Pressing anywhere on the frame moves the divider there and drags it;
 *   `interaction="hover"` follows the pointer without a press, for a mouse,
 *   while touch still drags.
 */

const comparisonSliderVariants = cva(
  "group/comparison relative isolate [touch-action:pan-y] overflow-hidden rounded-xl select-none",
  {
    variants: {
      orientation: {
        horizontal: "cursor-ew-resize",
        vertical: "cursor-ns-resize [touch-action:pan-x]",
      },
    },
    defaultVariants: { orientation: "horizontal" },
  },
);

/** Keeps a position inside 0–100 and to a tenth of a percent. */
export function clampComparisonValue(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

/**
 * The position, as a percentage from the "before" edge, of a pointer at
 * (`x`, `y`) over `box`. "Before" is the inline start: the left in a
 * left-to-right document, the right in a right-to-left one; the top when
 * vertical.
 */
export function comparisonValueAt(
  box: Pick<DOMRect, "left" | "top" | "width" | "height">,
  x: number,
  y: number,
  orientation: "horizontal" | "vertical",
  rtl: boolean,
): number {
  if (orientation === "vertical") {
    return box.height > 0 ? clampComparisonValue(((y - box.top) / box.height) * 100) : 50;
  }
  if (box.width <= 0) return 50;
  const fromLeft = ((x - box.left) / box.width) * 100;
  return clampComparisonValue(rtl ? 100 - fromLeft : fromLeft);
}

export interface ComparisonSliderProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange">,
    VariantProps<typeof comparisonSliderVariants> {
  /** The version shown on the "before" side (start, or top). */
  before: ReactNode;
  /** The version shown on the "after" side (end, or bottom). */
  after: ReactNode;
  /** Short names for the two sides, shown as tags and spoken with the position. */
  beforeLabel?: string;
  afterLabel?: string;
  /** Hide the side tags; the names are still spoken. Default false. */
  hideLabels?: boolean;
  /** Divider position, 0–100, controlled. */
  value?: number;
  /** Divider position it starts at, uncontrolled. Default 50. */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** `drag` moves on press; `hover` follows a mouse pointer without one. Default "drag". */
  interaction?: "drag" | "hover";
  /** Accessible name for the divider. Default "Comparison position". */
  label?: string;
}

/** Two versions of one thing stacked, with a draggable, keyboard-operable divider between them. */
export function ComparisonSlider({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  hideLabels = false,
  value: valueProp,
  defaultValue = 50,
  onValueChange,
  interaction = "drag",
  label = "Comparison position",
  orientation,
  className,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}: ComparisonSliderProps) {
  const axis = orientation ?? "horizontal";
  const [uncontrolled, setUncontrolled] = useState(() => clampComparisonValue(defaultValue));
  const value = valueProp === undefined ? uncontrolled : clampComparisonValue(valueProp);
  const dragging = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  const set = useCallback(
    (next: number) => {
      const clamped = clampComparisonValue(next);
      if (clamped === value) return;
      if (valueProp === undefined) setUncontrolled(clamped);
      onValueChange?.(clamped);
    },
    [value, valueProp, onValueChange],
  );

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const rtl = getComputedStyle(node).direction === "rtl";
    set(
      comparisonValueAt(node.getBoundingClientRect(), event.clientX, event.clientY, axis, rtl),
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const big = event.shiftKey ? 10 : 1;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const towardAfter =
      axis === "vertical"
        ? ["ArrowDown"]
        : rtl
          ? ["ArrowLeft", "ArrowDown"]
          : ["ArrowRight", "ArrowUp"];
    const towardBefore =
      axis === "vertical"
        ? ["ArrowUp"]
        : rtl
          ? ["ArrowRight", "ArrowUp"]
          : ["ArrowLeft", "ArrowDown"];
    let next: number | undefined;
    if (towardAfter.includes(event.key)) next = value + big;
    else if (towardBefore.includes(event.key)) next = value - big;
    else if (event.key === "PageUp") next = value + 10;
    else if (event.key === "PageDown") next = value - 10;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 100;
    if (next === undefined) return;
    event.preventDefault();
    set(next);
  };

  const vertical = axis === "vertical";

  return (
    <div
      data-slot="comparison-slider"
      data-orientation={axis}
      data-dragging={active || undefined}
      className={cn(comparisonSliderVariants({ orientation: axis }), className)}
      style={{ "--comparison-position": `${String(value)}%`, ...style } as CSSProperties}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented || event.button !== 0) return;
        dragging.current = event.pointerId;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setActive(true);
        fromPointer(event);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (dragging.current === event.pointerId) fromPointer(event);
        else if (interaction === "hover" && event.pointerType === "mouse") fromPointer(event);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        if (dragging.current === event.pointerId) {
          dragging.current = null;
          setActive(false);
        }
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        dragging.current = null;
        setActive(false);
      }}
      {...props}
    >
      <div data-slot="comparison-slider-after" className="relative">
        {after}
      </div>
      <div
        data-slot="comparison-slider-before"
        className={cn(
          "absolute inset-0",
          // Shows the "before" side up to the divider. Physical insets, mirrored
          // for right-to-left, because clip-path has no logical form.
          vertical
            ? "[clip-path:inset(0_0_calc(100%-var(--comparison-position))_0)]"
            : "[clip-path:inset(0_calc(100%-var(--comparison-position))_0_0)] rtl:[clip-path:inset(0_0_0_calc(100%-var(--comparison-position)))]",
        )}
      >
        {before}
      </div>

      {hideLabels ? null : (
        <>
          <span
            aria-hidden="true"
            data-slot="comparison-slider-label"
            className={cn(
              "pointer-events-none absolute z-10 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur",
              vertical ? "start-3 top-3" : "start-3 bottom-3",
            )}
          >
            {beforeLabel}
          </span>
          <span
            aria-hidden="true"
            data-slot="comparison-slider-label"
            className={cn(
              "pointer-events-none absolute z-10 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur",
              vertical ? "start-3 bottom-3" : "end-3 bottom-3",
            )}
          >
            {afterLabel}
          </span>
        </>
      )}

      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation={axis}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${String(Math.round(value))}% ${beforeLabel}, ${String(Math.round(100 - value))}% ${afterLabel}`}
        data-slot="comparison-slider-handle"
        onKeyDown={handleKeyDown}
        className={cn(
          "group/handle absolute z-20 flex items-center justify-center",
          vertical
            ? "inset-x-0 top-(--comparison-position) h-0"
            : "inset-y-0 start-(--comparison-position) w-0",
          "outline-none",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute bg-background shadow-[0_0_0_1px_var(--color-border)]",
            vertical ? "inset-x-0 h-0.5" : "inset-y-0 w-0.5",
          )}
        />
        <span
          aria-hidden="true"
          data-slot="comparison-slider-grip"
          className={cn(
            "relative grid size-9 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground shadow-md",
            "transition-transform duration-(--duration-fast) ease-(--ease-out-quint) group-data-dragging/comparison:scale-110",
            // The focus ring is drawn on the grip, the part a keyboard user sees;
            // the slider element itself is a zero-width line.
            "group-focus-visible/handle:ring-2 group-focus-visible/handle:ring-ring/55 group-focus-visible/handle:ring-offset-2 group-focus-visible/handle:ring-offset-background",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("size-4", vertical && "rotate-90")}
          >
            <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export { comparisonSliderVariants };
