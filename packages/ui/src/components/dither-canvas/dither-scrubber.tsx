"use client";

// Original design (pattern inspired by amicro "Dither Area Growth").
import {
  useCallback,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A scrubber over a series: the cursor amicro's growth chart drags with the
 * pointer, made operable without one. The plot overlay is an APG slider whose
 * value is a point index — arrow keys step, Page keys jump a tenth, Home/End go
 * to the ends — so the readout a pointer reveals is also reachable by keyboard
 * and announced through aria-valuetext.
 */

/** The index under a pointer: `clientX` across `rect`, rounded to a point. */
export function indexFromPointer(
  clientX: number,
  rect: { left: number; width: number },
  count: number,
): number {
  if (count <= 1 || rect.width <= 0) return 0;
  const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.round(t * (count - 1));
}

/** The index a key moves to, or null when the key is not a slider key. */
export function indexFromKey(key: string, current: number, count: number): number | null {
  const lastIndex = Math.max(0, count - 1);
  const page = Math.max(1, Math.round(count / 10));
  const clampTo = (value: number) => Math.min(lastIndex, Math.max(0, value));
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clampTo(current + 1);
    case "ArrowLeft":
    case "ArrowDown":
      return clampTo(current - 1);
    case "PageUp":
      return clampTo(current + page);
    case "PageDown":
      return clampTo(current - page);
    case "Home":
      return 0;
    case "End":
      return lastIndex;
    default:
      return null;
  }
}

export interface DitherScrubberOptions {
  /** Number of points. */
  count: number;
  /** Controlled cursor index; null hides the cursor. */
  index?: number | null;
  defaultIndex?: number | null;
  onIndexChange?: (index: number | null) => void;
}

export interface DitherScrubberProps {
  role: "slider";
  tabIndex: number;
  "aria-valuemin": number;
  "aria-valuemax": number;
  "aria-valuenow": number;
  "aria-orientation": "horizontal";
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
}

export interface DitherScrubber {
  /** The cursor's point, or null when neither pointer nor focus is on the plot. */
  index: number | null;
  /** The point the slider reports: the cursor, or the latest point at rest. */
  valueIndex: number;
  setIndex: (index: number | null) => void;
  /** Spread onto the plot overlay. Add aria-label and aria-valuetext yourself. */
  sliderProps: DitherScrubberProps;
}

/** State and slider props for a keyboard-operable chart cursor. */
export function useDitherScrubber({
  count,
  index: controlled,
  defaultIndex = null,
  onIndexChange,
}: DitherScrubberOptions): DitherScrubber {
  const [uncontrolled, setUncontrolled] = useState<number | null>(defaultIndex);
  const isControlled = controlled !== undefined;
  const raw = isControlled ? controlled : uncontrolled;
  const lastIndex = Math.max(0, count - 1);
  const index = raw === null ? null : Math.min(lastIndex, Math.max(0, raw));

  const setIndex = useCallback(
    (next: number | null) => {
      if (!isControlled) setUncontrolled(next);
      onIndexChange?.(next);
    },
    [isControlled, onIndexChange],
  );

  const valueIndex = index ?? lastIndex;

  return {
    index,
    valueIndex,
    setIndex,
    sliderProps: {
      role: "slider",
      tabIndex: 0,
      "aria-valuemin": 0,
      "aria-valuemax": lastIndex,
      "aria-valuenow": valueIndex,
      "aria-orientation": "horizontal",
      onKeyDown: (event) => {
        if (event.key === "Escape" && index !== null) {
          event.preventDefault();
          setIndex(null);
          return;
        }
        const next = indexFromKey(event.key, valueIndex, count);
        if (next === null) return;
        event.preventDefault();
        if (next !== index) setIndex(next);
      },
      onPointerMove: (event) => {
        const next = indexFromPointer(
          event.clientX,
          event.currentTarget.getBoundingClientRect(),
          count,
        );
        if (next !== index) setIndex(next);
      },
      onPointerLeave: (event) => {
        if (event.currentTarget.ownerDocument.activeElement !== event.currentTarget)
          setIndex(null);
      },
      onFocus: () => {
        if (index === null) setIndex(lastIndex);
      },
      onBlur: () => {
        setIndex(null);
      },
    },
  };
}

export interface DitherCursorProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  scrubber: DitherScrubber;
  /** Names the slider, e.g. "Members by day". */
  label: string;
  /** What the slider announces for the current point, e.g. "Jul 3: 24". */
  valueText: string;
  /** Cursor position across the plot, 0..1. */
  x: number;
  /** Point position down the plot, 0..1 from the top; null draws no dot. */
  y?: number | null;
  /** Readout content, shown beside the cursor. */
  readout?: ReactNode;
}

/**
 * The scrubber's overlay: an invisible slider covering its positioned parent,
 * plus the cursor line, point and readout while a point is active. All real
 * DOM — the readout is text, not pixels. Place it after the chart's role="img"
 * element, not inside it: a slider inside an image would be hidden.
 */
export function DitherCursor({
  scrubber,
  label,
  valueText,
  x,
  y = null,
  readout,
  className,
  ...props
}: DitherCursorProps) {
  const active = scrubber.index !== null;
  const left = `${String(Math.min(1, Math.max(0, x)) * 100)}%`;
  // Keep the readout inside the plot near either edge.
  const shift = x < 0.15 ? "0%" : x > 0.85 ? "-100%" : "-50%";
  const move =
    "transition-[left,top,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]";
  return (
    <>
      <div
        data-slot="dither-cursor"
        aria-label={label}
        aria-valuetext={valueText}
        {...scrubber.sliderProps}
        {...props}
        className={cn(
          "absolute inset-0 cursor-crosshair touch-pan-y rounded-md",
          focusRing,
          className,
        )}
      />
      {active && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            data-slot="dither-cursor-line"
            className={cn("absolute inset-y-0 w-px bg-primary/70", move)}
            style={{ left }}
          />
          {y !== null && (
            <div
              data-slot="dither-cursor-point"
              className={cn(
                "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-sm",
                move,
              )}
              style={{ left, top: `${String(y * 100)}%` }}
            />
          )}
          {readout !== undefined && (
            <div
              data-slot="dither-cursor-readout"
              className={cn(
                "absolute top-0 z-10 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-md",
                move,
              )}
              style={{ left, transform: `translate(${shift}, calc(-100% - 0.375rem))` }}
            >
              {readout}
            </div>
          )}
        </div>
      )}
    </>
  );
}
