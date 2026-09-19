"use client";

// Ported from amicro "Traffic Scatter Bubbles" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
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
  niceMax,
  seriesColor,
  smoothstep,
  type DitherDraw,
} from "@/components/dither-canvas";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A bubble scatter drawn in dithered cells: each point a circle at (x, y)
 * whose area is its size, denser toward the centre, drifting a few pixels as
 * amicro's traffic bubbles float. Positions and radii are springs in the
 * engine, so switching data sets glides each bubble to its new place.
 *
 * Every bubble is a real button over the plot, named with its values, so the
 * readout a pointer reveals is reachable by Tab; pressing one pins it. The
 * short label amicro painted into the canvas is the button's own text here.
 * The plot is laid out left to right in every direction, as a chart's x axis is.
 */

export const ditherScatterVariants = cva("flex flex-col gap-2", {
  variants: {
    size: {
      sm: "[--dither-scatter-height:8rem]",
      md: "[--dither-scatter-height:11rem]",
      lg: "[--dither-scatter-height:15rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface DitherScatterDatum {
  /** Short name drawn on the bubble, e.g. "US". */
  label: string;
  x: number;
  y: number;
  /** Bubble area is proportional to this. */
  size: number;
  /** Colour token or CSS colour expression. Defaults to the palette. */
  color?: string;
}

export interface DitherScatterProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof ditherScatterVariants> {
  data: readonly DitherScatterDatum[];
  /** What the chart shows. Names the image, the points and the data table. */
  label: string;
  /** Replaces the generated summary in the image's accessible name. */
  description?: string;
  /** Axis ranges. Default from 0 to a round number above the largest value. */
  xDomain?: readonly [number, number];
  yDomain?: readonly [number, number];
  /** Largest bubble radius as a fraction of the plot height. Default 0.26. */
  maxRadius?: number;
  /** Smallest bubble radius as a fraction of the plot height. Default 0.07. */
  minRadius?: number;
  /** Names of the three values, for the readout, the points and the table. */
  xLabel?: string;
  yLabel?: string;
  sizeLabel?: string;
  formatValue?: (value: number) => string;
  /** Show the data table. It is always present for assistive technology. */
  showTable?: boolean;
  animate?: boolean;
  cell?: number;
  /** The pinned point (controlled); null pins none. */
  activeIndex?: number | null;
  defaultActiveIndex?: number | null;
  onActiveIndexChange?: (index: number | null) => void;
  /** Header of the data table's point column. */
  categoryLabel?: string;
}

/** Where `value` falls in `domain`, clamped to 0..1. */
export function domainFraction(value: number, domain: readonly [number, number]): number {
  const [min, max] = domain;
  if (!(max > min) || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/** Bubble radius as a fraction of plot height: area proportional to `size`. */
export function bubbleRadius(
  size: number,
  largest: number,
  minRadius: number,
  maxRadius: number,
): number {
  const share = largest > 0 && size > 0 ? Math.sqrt(Math.min(1, size / largest)) : 0;
  return minRadius + (maxRadius - minRadius) * share;
}

const defaultDomain = (values: number[]): [number, number] => [
  Math.min(0, ...values),
  niceMax(Math.max(0, ...values)),
];

export function DitherScatter({
  data,
  label,
  description,
  xDomain,
  yDomain,
  maxRadius = 0.26,
  minRadius = 0.07,
  xLabel = "X",
  yLabel = "Y",
  sizeLabel = "Size",
  size,
  formatValue = formatDitherValue,
  showTable = false,
  animate = true,
  cell = 3,
  activeIndex,
  defaultActiveIndex = null,
  onActiveIndexChange,
  categoryLabel = "Point",
  className,
  ...props
}: DitherScatterProps) {
  const [uncontrolled, setUncontrolled] = useState<number | null>(defaultActiveIndex);
  const [preview, setPreview] = useState<number | null>(null);
  const pinned = activeIndex !== undefined ? activeIndex : uncontrolled;
  const lit = preview ?? pinned;

  const xRange = xDomain ?? defaultDomain(data.map((d) => d.x));
  const yRange = yDomain ?? defaultDomain(data.map((d) => d.y));
  const largest = Math.max(0, ...data.map((d) => (Number.isFinite(d.size) ? d.size : 0)));
  const fx = data.map((d) => domainFraction(d.x, xRange));
  const fy = data.map((d) => domainFraction(d.y, yRange));
  const fr = data.map((d) => bubbleRadius(d.size, largest, minRadius, maxRadius));

  const springs = useRef({
    x: createSprings(fx),
    y: createSprings(fy),
    r: createSprings(fr.map(() => 0)),
  });

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time, animated } = frame;
    const { x: xs, y: ys, r: rs } = springs.current;
    xs.set(fx);
    ys.set(fy);
    rs.set(fr);
    let moving = xs.step(frame.delta, frame.reducedMotion);
    moving = ys.step(frame.delta, frame.reducedMotion) || moving;
    moving = rs.step(frame.delta, frame.reducedMotion) || moving;
    const pad = maxRadius * height;
    const spanX = Math.max(0, width - pad * 2);
    const spanY = Math.max(0, height - pad * 2);
    const cx = xs.values;
    const cy = ys.values;
    rs.values.forEach((fraction, i) => {
      const r = fraction * height;
      if (r < 1) return;
      // amicro's float: a slow few-pixel orbit per bubble.
      const floatX = animated ? Math.sin(time * 0.6 + i * 2) * 4 : 0;
      const floatY = animated ? Math.cos(time * 0.6 + i * 3) * 4 : 0;
      const x = pad + (cx[i] ?? 0) * spanX + floatX;
      const y = height - pad - (cy[i] ?? 0) * spanY + floatY;
      const hot = lit === i;
      ditherFill(ctx, {
        clip: makePath((sink) => {
          sink.moveTo(x + r, y);
          sink.arc(x, y, r, 0, Math.PI * 2);
          sink.closePath();
        }),
        bounds: { x: x - r, y: y - r, width: r * 2, height: r * 2 },
        cell: frame.cell,
        color: frame.color(seriesColor(i, data[i]?.color)),
        alpha: lit !== null && !hot ? 0.3 : 0.85,
        density: (px, py) => {
          const fullness = smoothstep(0, 1, 1 - Math.hypot(px - x, py - y) / r);
          return (
            (0.3 + 0.4 * fullness + 0.3 * drift(px, py, time * 0.6)) *
              (0.8 + 0.4 * hash2(px, py)) +
            (hot ? 0.15 : 0)
          );
        },
      });
    });
    return moving;
  };

  const pin = (index: number) => {
    const next = pinned === index ? null : index;
    if (activeIndex === undefined) setUncontrolled(next);
    onActiveIndexChange?.(next);
  };

  const values = (d: DitherScatterDatum) =>
    `${xLabel} ${formatValue(d.x)}, ${yLabel} ${formatValue(d.y)}, ${sizeLabel} ${formatValue(d.size)}`;
  const summary =
    description ??
    (data.length === 0
      ? "No data."
      : `${String(data.length)} points. ${data.map((d) => `${d.label}: ${values(d)}`).join("; ")}.`);

  // CSS twins of the canvas layout: the pad is maxRadius × the plot height.
  const pad = `(var(--dither-scatter-height) * ${String(maxRadius)})`;
  const place = (i: number) => ({
    left: `calc(${pad} + ${String(fx[i] ?? 0)} * (100% - 2 * ${pad}))`,
    top: `calc(100% - ${pad} - ${String(fy[i] ?? 0)} * (100% - 2 * ${pad}))`,
  });
  const litDatum = lit !== null ? data[lit] : undefined;

  return (
    <div
      data-slot="dither-scatter"
      {...props}
      className={cn(ditherScatterVariants({ size }), className)}
    >
      <div
        data-slot="dither-scatter-plot"
        className="relative h-[var(--dither-scatter-height)]"
        style={{ direction: "ltr" }}
      >
        <div role="img" aria-label={`${label}: ${summary}`} className="size-full">
          <DitherCanvas draw={draw} animate={animate} cell={cell} />
        </div>
        <ul aria-label={label} className="absolute inset-0">
          {data.map((d, i) => (
            <li key={`${d.label}-${String(i)}`}>
              <button
                type="button"
                aria-pressed={pinned === i}
                aria-label={`${d.label}: ${values(d)}`}
                data-active={lit === i || undefined}
                className={cn(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-[left,top,width,height] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                  focusRing,
                )}
                style={{
                  ...place(i),
                  width: `calc(var(--dither-scatter-height) * ${String(2 * (fr[i] ?? 0))})`,
                  height: `calc(var(--dither-scatter-height) * ${String(2 * (fr[i] ?? 0))})`,
                }}
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
                <span className="rounded-sm bg-background/80 px-1 text-2xs font-semibold text-foreground">
                  {d.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {litDatum && lit !== null && (
          <div
            data-slot="dither-scatter-readout"
            className="pointer-events-none absolute z-10 min-w-28 rounded-md border border-border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md"
            style={{
              ...place(lit),
              transform: `translate(${(fx[lit] ?? 0) < 0.2 ? "0%" : (fx[lit] ?? 0) > 0.8 ? "-100%" : "-50%"}, calc(-100% - var(--dither-scatter-height) * ${String(fr[lit] ?? 0)} - 0.375rem))`,
            }}
          >
            <p className="mb-1 font-medium">{litDatum.label}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-muted-foreground">
              <dt>{xLabel}</dt>
              <dd className="text-end text-foreground tabular-nums">
                {formatValue(litDatum.x)}
              </dd>
              <dt>{yLabel}</dt>
              <dd className="text-end text-foreground tabular-nums">
                {formatValue(litDatum.y)}
              </dd>
              <dt>{sizeLabel}</dt>
              <dd className="text-end text-foreground tabular-nums">
                {formatValue(litDatum.size)}
              </dd>
            </dl>
          </div>
        )}
      </div>
      <DitherTable
        caption={label}
        columns={[categoryLabel, xLabel, yLabel, sizeLabel]}
        rows={data.map((d) => [
          d.label,
          formatValue(d.x),
          formatValue(d.y),
          formatValue(d.size),
        ])}
        visible={showTable}
      />
    </div>
  );
}
