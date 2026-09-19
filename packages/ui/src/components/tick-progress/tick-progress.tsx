"use client";

// Ported from bencho Progress ticks (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A percentage drawn as a row of waveform ticks, with a big figure above.
 *
 * Two modes, because the source's semantics were missing and "is this an
 * input?" has two honest answers:
 *
 * - Display (default): a `progressbar`. Nothing is focusable or interactive.
 * - `interactive`: a `slider`. Hovering previews a value — the ticks fill to the
 *   pointer, the tick under it turns green, and the signed difference appears
 *   beside the figure — and a click commits it. The source never committed;
 *   the spec recommends it, and a preview that can never be kept is a tease.
 *   Arrow keys step one tick, PageUp/PageDown five, Home/End jump to the ends.
 *   Keys commit at once, as the APG slider pattern requires: a slider whose
 *   aria-valuenow moved without committing would report a value it does not have.
 */

const tickProgressVariants = cva(
  "flex w-[21.25rem] max-w-full flex-col rounded-[1.25rem] bg-card p-3 text-card-foreground",
  {
    variants: {
      /** A hairline ring — the source's Stroke switch. */
      stroke: {
        true: "shadow-[inset_0_0_0_1px_var(--color-border)]",
        false: "",
      },
    },
    defaultVariants: { stroke: false },
  },
);

/** The default waveform: a smooth, deterministic swell between ~35% and ~92%. */
function waveform(count: number): number[] {
  return Array.from({ length: count }, (_, index) => {
    const t = index / Math.max(1, count - 1);
    const height = 64 + 26 * Math.sin(t * 5.2 + 0.55) + 6 * Math.sin(t * 13);
    return Math.round(Math.min(92, Math.max(34, height)));
  });
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

export interface TickProgressProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange">,
    VariantProps<typeof tickProgressVariants> {
  /** Controlled value, 0–100. */
  value?: number;
  /** Initial value when uncontrolled. */
  defaultValue?: number;
  /** Called when a value is committed (click or key). */
  onValueChange?: (value: number) => void;
  /** Number of ticks. The value snaps to them. */
  ticks?: number;
  /** Tick heights in percent, one per tick. Defaults to a gentle waveform. */
  heights?: number[];
  /** A slider you can hover, click and key through, rather than a progress bar. */
  interactive?: boolean;
  /** Hide the big figure. */
  hideValue?: boolean;
  disabled?: boolean;
}

/** A percentage as a row of waveform ticks, with hover-preview and commit when interactive. */
export function TickProgress({
  className,
  stroke,
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  ticks = 34,
  heights,
  interactive = false,
  hideValue = false,
  disabled = false,
  onKeyDown,
  onPointerMove,
  onPointerLeave,
  onClick,
  ...props
}: TickProgressProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const committed = clamp(valueProp ?? uncontrolled);
  const [preview, setPreview] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const active = interactive && !disabled;

  const count = Math.max(1, Math.round(ticks));
  const pattern = heights ?? waveform(count);
  const toValue = (on: number) => Math.round((on / count) * 100);
  const toTicks = (value: number) => Math.round((value / 100) * count);

  const shown = preview ?? committed;
  const onCount = toTicks(shown);
  const delta = preview === null ? 0 : preview - committed;

  function commit(next: number) {
    const value = clamp(next);
    if (valueProp === undefined) setUncontrolled(value);
    if (value !== committed) onValueChange?.(value);
  }

  /** The tick under the pointer, counted from the inline start. */
  function tickAt(clientX: number): number | null {
    const row = rowRef.current;
    if (!row) return null;
    const rect = row.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const rtl = getComputedStyle(row).direction === "rtl";
    const fraction = (rtl ? rect.right - clientX : clientX - rect.left) / rect.width;
    return Math.min(count - 1, Math.max(0, Math.floor(fraction * count)));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    if (!active) return;
    const index = tickAt(event.clientX);
    if (index !== null) setPreview(toValue(index + 1));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (!active || event.defaultPrevented) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const on = toTicks(committed);
    const steps: Record<string, number> = {
      ArrowUp: 1,
      ArrowDown: -1,
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      PageUp: 5,
      PageDown: -5,
    };
    let next: number | null = null;
    if (event.key in steps)
      next = toValue(Math.min(count, Math.max(0, on + (steps[event.key] ?? 0))));
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 100;
    if (next === null) return;
    event.preventDefault();
    setPreview(null);
    commit(next);
  }

  return (
    <div
      data-slot="tick-progress"
      data-interactive={interactive || undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={committed}
      aria-valuetext={`${String(committed)}%`}
      role={interactive ? "slider" : "progressbar"}
      tabIndex={interactive ? (disabled ? -1 : 0) : undefined}
      aria-orientation={interactive ? "horizontal" : undefined}
      aria-disabled={(interactive && disabled) || undefined}
      className={cn(
        tickProgressVariants({ stroke }),
        interactive && focusRing,
        disabled && "opacity-55",
        className,
      )}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        setPreview(null);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (!active) return;
        const index = tickAt(event.clientX);
        if (index === null) return;
        setPreview(null);
        commit(toValue(index + 1));
      }}
      {...props}
    >
      {hideValue ? null : (
        <div
          aria-hidden="true"
          data-slot="tick-progress-head"
          className="mb-5 flex items-baseline gap-2.5"
        >
          <span
            data-slot="tick-progress-value"
            className="text-[2.5rem] leading-none font-normal tracking-[-0.035em] tabular-nums"
          >
            {shown}
            <i className="ms-0.5 text-[1.1875rem] not-italic opacity-35">%</i>
          </span>
          <span
            data-slot="tick-progress-delta"
            data-show={delta !== 0 || undefined}
            data-up={delta > 0 || undefined}
            className={cn(
              "text-xs text-muted-foreground tabular-nums opacity-0 data-[show]:opacity-100 data-[up]:text-success",
              "transition-opacity duration-[var(--duration-fast)]",
            )}
          >
            {delta > 0 ? `+${String(delta)}` : delta < 0 ? `−${String(-delta)}` : ""}
          </span>
        </div>
      )}
      <div
        ref={rowRef}
        aria-hidden="true"
        data-slot="tick-progress-ticks"
        className={cn(
          "flex h-[5.75rem] touch-pan-y items-end gap-[3px] overflow-hidden rounded-md",
          active && "cursor-pointer",
        )}
      >
        {Array.from({ length: count }, (_, index) => {
          const on = index < onCount;
          const cursor = preview !== null && index === onCount - 1;
          return (
            <span
              key={index}
              data-slot="tick-progress-tick"
              data-on={on || undefined}
              data-cursor={cursor || undefined}
              className={cn(
                "min-w-0 flex-1 rounded-[2px] bg-foreground/16",
                "transition-[background-color,height] duration-[var(--duration-fast),var(--duration-slow)] ease-[var(--ease-out-quint)]",
                "data-[cursor]:bg-success data-[on]:bg-foreground",
              )}
              style={{ height: `${String(pattern[index] ?? 60)}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export { tickProgressVariants };
