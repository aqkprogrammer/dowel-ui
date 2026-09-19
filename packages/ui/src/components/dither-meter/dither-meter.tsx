"use client";

// Ported from amicro "Storage Capacity Bar" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, useState, type ComponentPropsWithRef } from "react";

import {
  createSprings,
  DitherCanvas,
  ditherFill,
  DitherTable,
  drift,
  formatDitherValue,
  hash2,
  makePath,
  seriesColor,
  tokenToCss,
  traceRoundedRect,
  type DitherDraw,
} from "@/components/dither-canvas";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A capacity bar drawn in dithered cells over a faint track — amicro's storage
 * bar — split into one segment per category. Segment lengths are springs in
 * the engine (amicro's 150 / 20), so a new reading fills rather than cuts.
 *
 * The bar is a role="meter" rather than an image: used over capacity is its
 * value (aria-valuenow / min / max) and aria-valuetext reads the breakdown. A
 * meter's children are presentational, so the canvas inside it is too. Legend
 * buttons preview a category on hover or focus and pin it when pressed. The
 * bar fills from the start edge in LTR in every direction, as a canvas draws.
 */

export const ditherMeterVariants = cva("flex flex-col gap-2", {
  variants: {
    size: {
      sm: "[--dither-meter-height:0.75rem]",
      md: "[--dither-meter-height:1.5rem]",
      lg: "[--dither-meter-height:2.25rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface DitherMeterSegment {
  key: string;
  label: string;
  value: number;
  /** Colour token or CSS colour expression. Defaults to the palette. */
  color?: string;
}

export interface DitherMeterProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof ditherMeterVariants> {
  segments: readonly DitherMeterSegment[];
  /** What the bar measures. Names the meter and the data table. */
  label: string;
  /** Replaces the generated breakdown in the meter's aria-valuetext. */
  description?: string;
  /** Capacity. Defaults to the sum of the segments (a full bar). */
  max?: number;
  formatValue?: (value: number) => string;
  /** Formats a 0..1 share. Defaults to a whole percentage. */
  formatPercent?: (share: number) => string;
  /** Show the category buttons. */
  showLegend?: boolean;
  /** Show the "used of capacity" line. */
  showValue?: boolean;
  /** Name of the unused remainder. */
  freeLabel?: string;
  /** Show the data table. It is always present for assistive technology. */
  showTable?: boolean;
  animate?: boolean;
  cell?: number;
  /** The pinned category key (controlled). */
  activeSegment?: string | null;
  defaultActiveSegment?: string | null;
  onActiveSegmentChange?: (key: string | null) => void;
  /** Data table headers. */
  categoryLabel?: string;
  valueLabel?: string;
  shareLabel?: string;
}

/** Gap between segments in CSS pixels. */
export const METER_GAP = 2;

const clean = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

/** Each segment's [start, end] along the bar, 0..1, stacked from the start. */
export function meterSpans(values: readonly number[], capacity: number): [number, number][] {
  let cursor = 0;
  return values.map((value) => {
    const share = capacity > 0 ? clean(value) / capacity : 0;
    const start = Math.min(1, cursor);
    cursor += share;
    return [start, Math.min(1, cursor)];
  });
}

const wholePercent = (share: number) => `${String(Math.round(share * 100))}%`;

export function DitherMeter({
  segments,
  label,
  description,
  max,
  size,
  formatValue = formatDitherValue,
  formatPercent = wholePercent,
  showLegend = true,
  showValue = true,
  freeLabel = "Free",
  showTable = false,
  animate = true,
  cell = 3,
  activeSegment,
  defaultActiveSegment = null,
  onActiveSegmentChange,
  categoryLabel = "Category",
  valueLabel = "Value",
  shareLabel = "Share",
  className,
  ...props
}: DitherMeterProps) {
  const [uncontrolled, setUncontrolled] = useState<string | null>(defaultActiveSegment);
  const [preview, setPreview] = useState<number | null>(null);
  const pinnedKey = activeSegment !== undefined ? activeSegment : uncontrolled;
  const pinned = pinnedKey === null ? -1 : segments.findIndex((s) => s.key === pinnedKey);
  const lit = preview ?? (pinned >= 0 ? pinned : null);

  const values = segments.map((segment) => clean(segment.value));
  const used = values.reduce((sum, value) => sum + value, 0);
  const capacity = max !== undefined && max > 0 ? max : used;
  const free = Math.max(0, capacity - used);
  const shares = values.map((value) => (capacity > 0 ? value / capacity : 0));
  const spans = meterSpans(values, capacity);
  const ends = useRef(
    createSprings(
      spans.map(() => 0),
      { stiffness: 150, damping: 20, mass: 1 },
    ),
  );

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time } = frame;
    ends.current.set(spans.map((span) => span[1]));
    const moving = ends.current.step(frame.delta, frame.reducedMotion);
    const current = ends.current.values;
    const radius = Math.min(height / 2, 6);
    const bar = makePath((sink) => {
      traceRoundedRect(sink, 0, 0, width, height, radius);
    });
    ctx.save();
    if (bar) ctx.clip(bar);
    // The track: amicro's faint full-width bar.
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = frame.color("foreground");
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    let start = 0;
    current.forEach((end, i) => {
      const x0 = start * width + (i > 0 ? METER_GAP / 2 : 0);
      const x1 = Math.min(1, end) * width - METER_GAP / 2;
      start = Math.max(start, Math.min(1, end));
      if (x1 - x0 < 1) return;
      ditherFill(ctx, {
        clip: makePath((sink) => {
          traceRoundedRect(sink, x0, 0, x1 - x0, height, 1);
        }),
        bounds: { x: x0, y: 0, width: x1 - x0, height },
        cell: frame.cell,
        color: frame.color(seriesColor(i, segments[i]?.color)),
        alpha: lit !== null && lit !== i ? 0.3 : 0.85,
        density: (cx, cy) =>
          (0.3 + 0.4 * drift(cx, cy, time * 1.2)) * (0.8 + 0.4 * hash2(cx, cy)) +
          (lit === i ? 0.2 : 0),
      });
    });
    ctx.restore();
    return moving;
  };

  const pin = (index: number) => {
    const key = segments[index]?.key ?? null;
    const next = pinnedKey === key ? null : key;
    if (activeSegment === undefined) setUncontrolled(next);
    onActiveSegmentChange?.(next);
  };

  const part = (i: number) =>
    `${segments[i]?.label ?? ""} ${formatValue(values[i] ?? 0)} (${formatPercent(shares[i] ?? 0)})`;
  const total = `${formatValue(used)} of ${formatValue(capacity)} used`;
  const breakdown =
    segments.length === 0
      ? "No data."
      : `${total} (${formatPercent(capacity > 0 ? used / capacity : 0)}). ` +
        `${segments.map((_, i) => part(i)).join(", ")}; ${freeLabel.toLowerCase()} ${formatValue(free)}.`;

  return (
    <div
      data-slot="dither-meter"
      {...props}
      className={cn(ditherMeterVariants({ size }), className)}
    >
      {showValue && (
        <p
          aria-hidden
          data-slot="dither-meter-value"
          className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground tabular-nums"
        >
          <span>
            <span className="text-sm font-semibold text-foreground">{formatValue(used)}</span>{" "}
            of {formatValue(capacity)}
          </span>
          <span>{formatPercent(capacity > 0 ? used / capacity : 0)}</span>
        </p>
      )}
      <div
        role="meter"
        data-slot="dither-meter-bar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={Math.min(used, capacity)}
        aria-valuetext={description ?? breakdown}
        className="h-[var(--dither-meter-height)]"
        style={{ direction: "ltr" }}
      >
        <DitherCanvas draw={draw} animate={animate} cell={cell} />
      </div>
      {showLegend && segments.length > 0 && (
        <ul
          data-slot="dither-meter-legend"
          aria-label={`${label} categories`}
          className="flex flex-wrap gap-1"
        >
          {segments.map((segment, i) => (
            <li key={segment.key}>
              <button
                type="button"
                aria-pressed={pinned === i}
                data-active={lit === i || undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] hover:text-foreground aria-pressed:bg-accent aria-pressed:text-accent-foreground data-active:text-foreground",
                  focusRing,
                )}
                onPointerEnter={() => {
                  setPreview(i);
                }}
                onPointerLeave={() => {
                  setPreview(null);
                }}
                onFocus={() => {
                  setPreview(i);
                }}
                onBlur={() => {
                  setPreview(null);
                }}
                onClick={() => {
                  pin(i);
                }}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: tokenToCss(seriesColor(i, segment.color)) }}
                />
                {segment.label}{" "}
                <span className="tabular-nums">{formatValue(values[i] ?? 0)}</span>
              </button>
            </li>
          ))}
          <li className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
            <span aria-hidden className="size-2.5 rounded-full bg-foreground/10" />
            {freeLabel} <span className="tabular-nums">{formatValue(free)}</span>
          </li>
        </ul>
      )}
      <DitherTable
        caption={label}
        columns={[categoryLabel, valueLabel, shareLabel]}
        rows={[
          ...segments.map((segment, i) => [
            segment.label,
            formatValue(values[i] ?? 0),
            formatPercent(shares[i] ?? 0),
          ]),
          [freeLabel, formatValue(free), formatPercent(capacity > 0 ? free / capacity : 0)],
        ]}
        visible={showTable}
      />
    </div>
  );
}
