"use client";

// Ported from amicro "Server CPU Gauge" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, useState, type ComponentPropsWithRef } from "react";

import {
  createSprings,
  DitherCanvas,
  ditherFill,
  DitherTable,
  drift,
  hash2,
  makePath,
  seriesColor,
  tokenToCss,
  traceWedge,
  type DitherDraw,
} from "@/components/dither-canvas";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A half-circle gauge drawn in dithered cells, one ring per metric — amicro's
 * server gauge with its CPU / memory / network switch. The outer ring is the
 * first metric. Each fill is a spring in the engine (amicro's 120 / 20), so a
 * new reading sweeps rather than jumps.
 *
 * The reading in the centre is a real role="meter" with aria-valuenow, min and
 * max. With several metrics, legend buttons preview a ring on hover or focus
 * (the rest dim) and pick the one the centre reads when pressed. amicro wobbled
 * the drawn value a few percent with a timer; a gauge that shows a reading it
 * was not given is lying, so here only the cells shimmer.
 */

export const ditherGaugeVariants = cva("flex flex-col items-center gap-3", {
  variants: {
    size: {
      sm: "[--dither-gauge-height:6rem]",
      md: "[--dither-gauge-height:8.5rem]",
      lg: "[--dither-gauge-height:11rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface DitherGaugeMetric {
  key: string;
  label: string;
  value: number;
  /** Full-scale value. Default 100. */
  max?: number;
  /** Colour token or CSS colour expression. Defaults to the palette. */
  color?: string;
}

export interface DitherGaugeProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof ditherGaugeVariants> {
  metrics: readonly DitherGaugeMetric[];
  /** What the gauge shows. Names the image and the data table. */
  label: string;
  /** Replaces the generated summary in the image's accessible name. */
  description?: string;
  /** Formats a reading. Defaults to the share of `max` as a whole percentage. */
  formatValue?: (value: number, metric: DitherGaugeMetric) => string;
  /** Show the metric buttons (only drawn with more than one metric). */
  showLegend?: boolean;
  /** Show the data table. It is always present for assistive technology. */
  showTable?: boolean;
  animate?: boolean;
  cell?: number;
  /** The metric the centre reads (controlled). Defaults to the first. */
  activeMetric?: string;
  defaultActiveMetric?: string;
  onActiveMetricChange?: (key: string) => void;
  /** Data table headers. */
  categoryLabel?: string;
  valueLabel?: string;
}

/** A reading's share of its scale, clamped to 0..1. */
export function gaugeFraction(metric: DitherGaugeMetric): number {
  const max = metric.max ?? 100;
  if (!(max > 0) || !Number.isFinite(metric.value)) return 0;
  return Math.min(1, Math.max(0, metric.value / max));
}

/** Ring radii for `count` concentric rings inside `outer`. */
export function gaugeRings(outer: number, count: number): { inner: number; outer: number }[] {
  const band = Math.max(5, outer * (count > 1 ? 0.11 : 0.14));
  const gap = Math.max(2, band * 0.4);
  return Array.from({ length: count }, (_, i) => {
    const ringOuter = outer - i * (band + gap);
    return { outer: ringOuter, inner: Math.max(0, ringOuter - band) };
  });
}

const percent = (value: number, metric: DitherGaugeMetric) =>
  `${String(Math.round(gaugeFraction({ ...metric, value }) * 100))}%`;

export function DitherGauge({
  metrics,
  label,
  description,
  size,
  formatValue = percent,
  showLegend = true,
  showTable = false,
  animate = true,
  cell = 3,
  activeMetric,
  defaultActiveMetric,
  onActiveMetricChange,
  categoryLabel = "Metric",
  valueLabel = "Reading",
  className,
  ...props
}: DitherGaugeProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultActiveMetric ?? metrics[0]?.key);
  const [preview, setPreview] = useState<number | null>(null);
  const chosenKey = activeMetric ?? uncontrolled;
  const chosen = Math.max(
    0,
    metrics.findIndex((metric) => metric.key === chosenKey),
  );
  const shown = preview ?? chosen;
  const fractions = metrics.map(gaugeFraction);
  const fills = useRef(
    createSprings(
      fractions.map(() => 0),
      { stiffness: 120, damping: 20, mass: 1 },
    ),
  );

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time } = frame;
    fills.current.set(fractions);
    const moving = fills.current.step(frame.delta, frame.reducedMotion);
    const current = fills.current.values;
    const center = { x: width / 2, y: height * 0.94 };
    const outer = Math.min(width * 0.47, height * 0.88);
    const rings = gaugeRings(outer, metrics.length);
    rings.forEach((ring, i) => {
      if (ring.inner <= 0) return;
      // The track: a solid, faint half ring.
      ctx.save();
      ctx.beginPath();
      traceWedge(ctx, center, ring.inner, ring.outer, Math.PI, Math.PI * 2);
      ctx.fillStyle = frame.color("foreground");
      ctx.globalAlpha = 0.1;
      ctx.fill();
      ctx.restore();

      const fraction = Math.min(1, Math.max(0, current[i] ?? 0));
      if (fraction <= 0.001) return;
      const end = Math.PI + fraction * Math.PI;
      const dim = preview !== null && preview !== i;
      ditherFill(ctx, {
        clip: makePath((sink) => {
          traceWedge(sink, center, ring.inner, ring.outer, Math.PI, end);
        }),
        bounds: {
          x: center.x - ring.outer,
          y: center.y - ring.outer,
          width: ring.outer * 2,
          height: ring.outer,
        },
        cell: frame.cell,
        color: frame.color(seriesColor(i, metrics[i]?.color)),
        alpha: dim ? 0.3 : 0.9,
        density: (cx, cy) =>
          (0.4 + 0.4 * drift(cx, cy, time * 3)) * (0.8 + 0.4 * hash2(cx, cy)) +
          (preview === i ? 0.15 : 0),
      });
    });
    return moving;
  };

  const choose = (index: number) => {
    const key = metrics[index]?.key;
    if (key === undefined) return;
    if (activeMetric === undefined) setUncontrolled(key);
    onActiveMetricChange?.(key);
  };

  const reading = (metric: DitherGaugeMetric) => formatValue(metric.value, metric);
  const summary =
    description ??
    (metrics.length === 0
      ? "No data."
      : `${metrics.map((metric) => `${metric.label} ${reading(metric)}`).join(", ")}.`);
  const metric = metrics[shown];

  return (
    <div
      data-slot="dither-gauge"
      {...props}
      className={cn(ditherGaugeVariants({ size }), className)}
    >
      <div
        data-slot="dither-gauge-plot"
        className="relative h-[var(--dither-gauge-height)] w-full"
        style={{ direction: "ltr" }}
      >
        <div role="img" aria-label={`${label}: ${summary}`} className="size-full">
          <DitherCanvas draw={draw} animate={animate} cell={cell} />
        </div>
        {metric && (
          <div
            role="meter"
            data-slot="dither-gauge-reading"
            aria-label={metric.label}
            aria-valuemin={0}
            aria-valuemax={metric.max ?? 100}
            aria-valuenow={Math.min(metric.max ?? 100, Math.max(0, metric.value))}
            aria-valuetext={reading(metric)}
            className="absolute inset-x-0 bottom-0 flex flex-col items-center"
          >
            <span className="text-2xl leading-none font-semibold tabular-nums">
              {reading(metric)}
            </span>
            <span className="mt-1 text-2xs text-muted-foreground">{metric.label}</span>
          </div>
        )}
      </div>
      {showLegend && metrics.length > 1 && (
        <ul
          data-slot="dither-gauge-legend"
          aria-label={`${label} metrics`}
          className="flex flex-wrap justify-center gap-1"
        >
          {metrics.map((entry, index) => (
            <li key={entry.key}>
              <button
                type="button"
                aria-pressed={chosen === index}
                data-active={preview === index || undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] hover:text-foreground aria-pressed:bg-accent aria-pressed:text-accent-foreground data-active:text-foreground",
                  focusRing,
                )}
                onPointerEnter={() => {
                  setPreview(index);
                }}
                onPointerLeave={() => {
                  setPreview(null);
                }}
                onFocus={() => {
                  setPreview(index);
                }}
                onBlur={() => {
                  setPreview(null);
                }}
                onClick={() => {
                  choose(index);
                }}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: tokenToCss(seriesColor(index, entry.color)) }}
                />
                {entry.label} <span className="tabular-nums">{reading(entry)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <DitherTable
        caption={label}
        columns={[categoryLabel, valueLabel]}
        rows={metrics.map((entry) => [entry.label, reading(entry)])}
        visible={showTable}
      />
    </div>
  );
}
