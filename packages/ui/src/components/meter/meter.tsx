"use client";

import { createContext, useContext, useMemo, type ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A measurement against a known capacity: storage against a quota, seats
 * against a plan, spend against a budget.
 *
 * Not a Progress. Progress reports how far along a task is and is expected to
 * reach the end; a meter reports a level that has no reason to move at all, and
 * where being near the top is the thing worth noticing. They carry different
 * ARIA roles for exactly that reason, and screen readers phrase them
 * differently.
 *
 * The bar is a single `role="meter"` and the segments inside it are decoration.
 * Making each segment its own widget would put five unlabelled meters in the
 * tab order to describe one quantity; the legend carries the per-segment detail
 * as text instead, where it can actually be read.
 */

const TONES = {
  primary: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-border-strong",
} as const;

export type MeterTone = keyof typeof TONES;

export interface MeterSegment {
  /** Stable identity, so a re-order does not re-animate every segment. */
  id: string;
  /** Named in the legend and in the accessible summary. */
  label: string;
  value: number;
  tone?: MeterTone;
}

interface MeterContextValue {
  segments: MeterSegment[];
  total: number;
  max: number;
  format: (value: number) => string;
  over: boolean;
}

const MeterContext = createContext<MeterContextValue | null>(null);

function useMeterContext(component: string): MeterContextValue {
  const context = useContext(MeterContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <Meter>.`);
  }
  return context;
}

function defaultFormat(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export interface MeterProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** Parts making up the measurement. One segment is the ordinary case. */
  segments: MeterSegment[];
  /** The capacity being measured against. */
  max: number;
  /** Names the meter. Required — an unnamed measurement is unreadable. */
  label: string;
  /**
   * Fraction of `max` past which the meter reports strain, between 0 and 1.
   * Presentation only: it never changes the reported value.
   */
  warnAt?: number;
  /** Optional marker on the track, for a soft limit or an alert threshold. */
  threshold?: { value: number; label: string };
  /** Formats every number that reaches the reader. */
  format?: (value: number) => string;
  /** Shown after the bar. Compose `MeterLegend` here, or your own summary. */
  children?: React.ReactNode;
}

export function Meter({
  className,
  segments,
  max,
  label,
  warnAt = 0.9,
  threshold,
  format = defaultFormat,
  children,
  ...props
}: MeterProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const over = total > max;
  const strained = max > 0 && total / max >= warnAt;

  // Widths are a share of capacity, not of the total, so a half-full meter
  // renders half full. Dividing by the total instead would make every meter
  // look completely full, which is the usual bug in hand-rolled versions.
  const denominator = over ? total : max;

  const context = useMemo<MeterContextValue>(
    () => ({ segments, total, max, format, over }),
    [segments, total, max, format, over],
  );

  return (
    <MeterContext.Provider value={context}>
      <div
        data-slot="meter"
        data-over={over || undefined}
        data-strained={strained || undefined}
        className={cn("flex w-full flex-col gap-1.5", className)}
        {...props}
      >
        <div
          role="meter"
          aria-label={label}
          aria-valuenow={total}
          aria-valuemin={0}
          aria-valuemax={max}
          // Without this a screen reader announces a bare number with no unit
          // and no capacity — "4" tells the reader nothing about 4 of what.
          aria-valuetext={`${format(total)} of ${format(max)}${over ? ", over capacity" : ""}`}
          data-slot="meter-track"
          className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div className="flex h-full w-full">
            {segments.map((segment) => {
              const value = Math.max(0, segment.value);
              // A zero segment renders nothing at all. A one-pixel sliver reads
              // as a small amount rather than as none.
              if (value === 0 || denominator === 0) return null;

              return (
                <div
                  key={segment.id}
                  data-slot="meter-segment"
                  data-tone={segment.tone ?? "primary"}
                  className={cn(
                    "h-full first:rounded-s-full last:rounded-e-full",
                    "transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
                    TONES[segment.tone ?? "primary"],
                  )}
                  style={{ width: `${String((value / denominator) * 100)}%` }}
                />
              );
            })}
          </div>

          {threshold && max > 0 && threshold.value > 0 && threshold.value < max ? (
            <div
              data-slot="meter-threshold"
              // The marker repeats what the legend states in words, so it is
              // decoration. Announcing it would interrupt the value.
              aria-hidden="true"
              className="absolute inset-y-0 w-px bg-foreground/45"
              style={{ left: `${String((threshold.value / denominator) * 100)}%` }}
            />
          ) : null}
        </div>

        {children}
      </div>
    </MeterContext.Provider>
  );
}

/**
 * The per-segment breakdown, as text.
 *
 * This is where the detail lives. The bar communicates one number; anyone who
 * needs to know that images account for most of it reads it here.
 */
export function MeterLegend({ className, ...props }: ComponentPropsWithRef<"ul">) {
  const { segments, format } = useMeterContext("MeterLegend");

  return (
    <ul
      data-slot="meter-legend"
      className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs", className)}
      {...props}
    >
      {segments.map((segment) => (
        <li key={segment.id} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-2 shrink-0 rounded-full", TONES[segment.tone ?? "primary"])}
          />
          <span className="text-muted-foreground">{segment.label}</span>
          <span className="tabular-nums">{format(segment.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** The headline "4.2 GB of 10 GB" line, with an over-capacity state. */
export function MeterValue({ className, ...props }: ComponentPropsWithRef<"p">) {
  const { total, max, format, over } = useMeterContext("MeterValue");

  return (
    <p
      data-slot="meter-value"
      className={cn(
        "text-xs tabular-nums",
        over ? "text-destructive" : "text-muted-foreground",
        className,
      )}
      {...props}
    >
      {format(total)} of {format(max)}
      {over ? " — over capacity" : null}
    </p>
  );
}
