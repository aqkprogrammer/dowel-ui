"use client";

// Ported from amicro "Revenue Spline Line" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, type ComponentPropsWithRef } from "react";

import {
  createSprings,
  DitherCanvas,
  DitherCursor,
  ditherFill,
  DitherTable,
  drift,
  formatDitherValue,
  hash2,
  makePath,
  traceSpline,
  useDitherScrubber,
  type DitherDraw,
} from "@/components/dither-canvas";
import { cn } from "@/lib/utils";

/*
 * A smooth line over a dithered gradient fill: cells are largest just under
 * the top of the plot and thin out toward the baseline, drifting on a two-sine
 * wave. amicro drew straight segments; this one is the spline its name
 * promised — monotone, so it never overshoots between two points and invents a
 * dip the data does not have. The same keyboard scrubber as DitherArea reads
 * out each point.
 */

export const ditherLineVariants = cva("flex flex-col gap-2", {
  variants: {
    size: {
      sm: "[--dither-line-height:7.5rem]",
      md: "[--dither-line-height:11.25rem]",
      lg: "[--dither-line-height:16rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface DitherLineDatum {
  label: string;
  value: number;
}

export interface DitherLineProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof ditherLineVariants> {
  data: readonly DitherLineDatum[];
  /** What the chart shows. Names the image, the scrubber and the data table. */
  label: string;
  /** Replaces the generated summary in the image's accessible name. */
  description?: string;
  /** Axis maximum. Defaults to the largest value plus 20% headroom. */
  max?: number;
  formatValue?: (value: number) => string;
  /** Colour token or CSS colour expression for the line and fill. Default "primary". */
  color?: string;
  /** Show point labels under the plot. */
  showAxis?: boolean;
  /** Show the data table. It is always present for assistive technology. */
  showTable?: boolean;
  animate?: boolean;
  cell?: number;
  index?: number | null;
  defaultIndex?: number | null;
  onIndexChange?: (index: number | null) => void;
  categoryLabel?: string;
  valueLabel?: string;
}

/** Distance from the top, 0..1, keeping half a stroke clear of each edge. */
export function lineY(value: number, max: number, height: number, stroke = 2): number {
  const inset = height > 0 ? stroke / height : 0;
  const fraction = max > 0 ? Math.min(1, Math.max(0, value) / max) : 0;
  return inset + (1 - 2 * inset) * (1 - fraction);
}

function lineX(index: number, count: number): number {
  return count <= 1 ? 0.5 : index / (count - 1);
}

/** Which points get an axis label: every one up to 8, else about 5 spread evenly. */
export function axisIndices(count: number): number[] {
  if (count <= 8) return Array.from({ length: count }, (_, i) => i);
  return [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * (count - 1)));
}

export function DitherLine({
  data,
  label,
  description,
  max,
  size,
  formatValue = formatDitherValue,
  color = "primary",
  showAxis = true,
  showTable = false,
  animate = true,
  cell,
  index,
  defaultIndex,
  onIndexChange,
  categoryLabel = "Point",
  valueLabel = "Value",
  className,
  ...props
}: DitherLineProps) {
  const count = data.length;
  const scrubber = useDitherScrubber({ count, index, defaultIndex, onIndexChange });
  const values = data.map((datum) =>
    Number.isFinite(datum.value) ? Math.max(0, datum.value) : 0,
  );
  const top = max ?? Math.max(1, ...values) * 1.2;
  const shape = useRef(createSprings(values.map(() => 0)));

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time, animated } = frame;
    const step = frame.cell;
    shape.current.set(values.map((value) => value / top));
    const moving = shape.current.step(frame.delta, frame.reducedMotion);
    const current = shape.current.values;
    const points = current.map((fraction, i) => ({
      x: lineX(i, current.length) * width,
      y: lineY(fraction, 1, height) * height,
    }));
    if (points.length === 1 && points[0])
      points.splice(0, 1, { x: 0, y: points[0].y }, { x: width, y: points[0].y });
    if (points.length === 0) return moving;
    const resolved = frame.color(color);

    ditherFill(ctx, {
      clip: makePath((sink) => {
        traceSpline(sink, points, height);
      }),
      bounds: { x: 0, y: 0, width, height },
      cell: step,
      color: resolved,
      density: (cx, cy) => {
        const falloff = Math.max(0, 1 - cy / height);
        const mod = animated ? drift(cx, cy, time * 1.2) : 0.5;
        return (0.55 * falloff + 0.35 * mod) * (0.8 + 0.4 * hash2(cx, cy));
      },
    });

    ctx.beginPath();
    traceSpline(ctx, points);
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = resolved;
    ctx.stroke();
    return moving;
  };

  const shown = scrubber.valueIndex;
  const datum = data[shown];
  const low = values.reduce(
    (best, value, i) => (value < (values[best] ?? Infinity) ? i : best),
    0,
  );
  const high = values.reduce(
    (best, value, i) => (value > (values[best] ?? -Infinity) ? i : best),
    0,
  );
  const summary =
    description ??
    (count === 0
      ? "No data."
      : `${String(count)} points from ${data[0]?.label ?? ""} to ${data[count - 1]?.label ?? ""}. ` +
        `High ${formatValue(values[high] ?? 0)} on ${data[high]?.label ?? ""}, ` +
        `low ${formatValue(values[low] ?? 0)} on ${data[low]?.label ?? ""}.`);

  return (
    <div
      data-slot="dither-line"
      {...props}
      className={cn(ditherLineVariants({ size }), className)}
    >
      <div
        data-slot="dither-line-plot"
        className="relative h-[var(--dither-line-height)]"
        style={{ direction: "ltr" }}
      >
        <div role="img" aria-label={`${label}: ${summary}`} className="size-full">
          <DitherCanvas draw={draw} animate={animate} cell={cell} />
        </div>
        {count > 0 && (
          <DitherCursor
            scrubber={scrubber}
            label={label}
            valueText={datum ? `${datum.label}: ${formatValue(datum.value)}` : ""}
            x={lineX(shown, count)}
            y={lineY(values[shown] ?? 0, top, 0)}
            readout={
              datum && (
                <>
                  <span className="block text-2xs text-muted-foreground uppercase">
                    {datum.label}
                  </span>
                  <span className="font-medium tabular-nums">{formatValue(datum.value)}</span>
                </>
              )
            }
          />
        )}
      </div>
      {showAxis && count > 0 && (
        <div
          aria-hidden
          data-slot="dither-line-labels"
          className="relative h-4 font-mono text-2xs text-muted-foreground"
          style={{ direction: "ltr" }}
        >
          {axisIndices(count).map((i) => {
            const x = lineX(i, count);
            return (
              <span
                key={i}
                data-active={scrubber.index === i || undefined}
                className="absolute top-0 whitespace-nowrap data-active:text-foreground"
                style={{
                  left: `${String(x * 100)}%`,
                  transform: `translateX(${String(-x * 100)}%)`,
                }}
              >
                {data[i]?.label}
              </span>
            );
          })}
        </div>
      )}
      <DitherTable
        caption={label}
        columns={[categoryLabel, valueLabel]}
        rows={data.map((entry) => [entry.label, formatValue(entry.value)])}
        visible={showTable}
      />
    </div>
  );
}
