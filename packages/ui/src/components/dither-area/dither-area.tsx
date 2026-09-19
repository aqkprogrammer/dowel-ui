"use client";

// Ported from amicro "Dither Area Growth" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, type ComponentPropsWithRef } from "react";

import {
  createSprings,
  DitherCanvas,
  DitherCursor,
  ditherFill,
  DitherTable,
  formatDitherValue,
  hash2,
  makePath,
  smoothstep,
  tracePolyline,
  useDitherScrubber,
  valueAt,
  type DitherDraw,
} from "@/components/dither-canvas";
import { cn } from "@/lib/utils";

/*
 * An area chart filled with dithered cells over a faint cell grid, with a date
 * scrubber. The cursor follows the pointer as in amicro, cells swell around it,
 * and it is also an APG slider: Tab to the plot, then arrows step a point, Page
 * keys jump a tenth, Home/End go to the ends, Escape hides it. The readout is
 * real text and the slider announces the same thing through aria-valuetext.
 * Values are springs in the engine, so switching range morphs the curve — a
 * different point count is resampled rather than dropped to zero.
 */

export const ditherAreaVariants = cva("flex flex-col gap-2", {
  variants: {
    size: {
      sm: "[--dither-area-height:7.5rem]",
      md: "[--dither-area-height:11.25rem]",
      lg: "[--dither-area-height:16rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface DitherAreaDatum {
  /** The point's name on the axis, e.g. a date. */
  label: string;
  value: number;
}

export interface DitherAreaProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof ditherAreaVariants> {
  data: readonly DitherAreaDatum[];
  /** What the chart shows. Names the image, the scrubber and the data table. */
  label: string;
  /** Replaces the generated summary in the image's accessible name. */
  description?: string;
  /** Axis maximum. Defaults to the largest value. */
  max?: number;
  formatValue?: (value: number) => string;
  /** Colour token or CSS colour expression for the fill. Default "primary". */
  color?: string;
  /** Show value ticks and point labels. */
  showAxis?: boolean;
  /** Show the data table. It is always present for assistive technology. */
  showTable?: boolean;
  animate?: boolean;
  cell?: number;
  /** Cursor point (controlled); null hides it. */
  index?: number | null;
  defaultIndex?: number | null;
  onIndexChange?: (index: number | null) => void;
  /** Data table headers. */
  categoryLabel?: string;
  valueLabel?: string;
}

/** Space kept above the tallest value, as a fraction of the plot height. */
export const AREA_HEADROOM = 0.16;

/** Distance from the top of the plot, 0..1, for a value against `max`. */
export function areaY(value: number, max: number): number {
  return 1 - (1 - AREA_HEADROOM) * (max > 0 ? Math.max(0, value) / max : 0);
}

/** Position across the plot, 0..1, of point `index` of `count`. */
export function pointX(index: number, count: number): number {
  return count <= 1 ? 0.5 : index / (count - 1);
}

export function DitherArea({
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
}: DitherAreaProps) {
  const count = data.length;
  const scrubber = useDitherScrubber({ count, index, defaultIndex, onIndexChange });
  const values = data.map((datum) =>
    Number.isFinite(datum.value) ? Math.max(0, datum.value) : 0,
  );
  const top = max ?? Math.max(1, ...values);
  const shape = useRef(createSprings(values.map(() => 0)));
  const cursor = scrubber.index;

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time, animated } = frame;
    const step = frame.cell;
    shape.current.set(values.map((value) => value / top));
    const moving = shape.current.step(frame.delta, frame.reducedMotion);
    const current = shape.current.values;
    const points = current.map((fraction, i) => ({
      x: pointX(i, current.length) * width,
      y: areaY(fraction, 1) * height,
    }));
    if (points.length === 1 && points[0]) points.unshift({ x: 0, y: points[0].y });
    if (points.length === 2 && current.length === 1 && points[1]) points[1].x = width;

    // The faint cell grid the area sits on.
    ditherFill(ctx, {
      bounds: { x: 0, y: 0, width, height },
      cell: step,
      color: frame.color("foreground"),
      alpha: 0.05,
      density: () => 0.78,
    });

    const focus =
      cursor !== null
        ? {
            x: pointX(cursor, current.length) * width,
            y: areaY(valueAt(current, cursor), 1) * height,
          }
        : null;
    const radius = height * 0.35;
    ditherFill(ctx, {
      clip: makePath((sink) => {
        tracePolyline(sink, points, height);
      }),
      bounds: { x: 0, y: 0, width, height },
      cell: step,
      color: frame.color(color),
      alpha: 0.8,
      density: (cx, cy) => {
        const glow = focus
          ? 1 - smoothstep(0, radius, Math.hypot(cx - focus.x, cy - focus.y))
          : 0;
        const wave = animated ? Math.sin(cy * 0.1 - time * 3.6) * 0.07 : 0;
        return 0.62 + wave + glow * 0.34 + (hash2(cx, cy) - 0.5) * 0.08;
      },
    });
    return moving;
  };

  const format = (i: number) => {
    const datum = data[i];
    return datum ? `${datum.label}: ${formatValue(datum.value)}` : "";
  };
  const peak = values.reduce(
    (best, value, i) => (value > (values[best] ?? -Infinity) ? i : best),
    0,
  );
  const summary =
    description ??
    (count === 0
      ? "No data."
      : `${String(count)} points from ${data[0]?.label ?? ""} to ${data[count - 1]?.label ?? ""}. ` +
        `Starts at ${formatValue(values[0] ?? 0)}, ends at ${formatValue(values[count - 1] ?? 0)}; ` +
        `peak ${formatValue(values[peak] ?? 0)} on ${data[peak]?.label ?? ""}.`);
  const ticks = [top, top * 0.66, top * 0.33, 0];
  const axisLabels =
    count > 0
      ? [0, 0.25, 0.5, 0.75, 1]
          .map((t) => Math.round(t * (count - 1)))
          .filter((i, n, all) => all.indexOf(i) === n)
      : [];
  const shown = scrubber.valueIndex;
  const datum = data[shown];

  return (
    <div
      data-slot="dither-area"
      {...props}
      className={cn(ditherAreaVariants({ size }), className)}
    >
      <div className="flex gap-3" style={{ direction: "ltr" }}>
        {showAxis && (
          <div
            aria-hidden
            data-slot="dither-area-ticks"
            className="relative h-[var(--dither-area-height)] w-8 shrink-0"
          >
            {ticks.map((tick, i) => (
              <span
                key={i}
                className="absolute end-0 -translate-y-1/2 font-mono text-2xs text-muted-foreground tabular-nums"
                style={{ top: `${String(areaY(tick, top) * 100)}%` }}
              >
                {formatValue(Math.round(tick))}
              </span>
            ))}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div data-slot="dither-area-plot" className="relative h-[var(--dither-area-height)]">
            <div role="img" aria-label={`${label}: ${summary}`} className="size-full">
              <DitherCanvas draw={draw} animate={animate} cell={cell} />
            </div>
            {count > 0 && (
              <DitherCursor
                scrubber={scrubber}
                label={label}
                valueText={format(shown)}
                x={pointX(shown, count)}
                y={areaY(values[shown] ?? 0, top)}
                readout={
                  datum && (
                    <>
                      <span className="block text-2xs text-muted-foreground uppercase">
                        {datum.label}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatValue(datum.value)}
                      </span>
                    </>
                  )
                }
              />
            )}
          </div>
          {showAxis && (
            <div
              aria-hidden
              data-slot="dither-area-labels"
              className="relative h-4 font-mono text-2xs text-muted-foreground"
            >
              {axisLabels.map((i) => {
                const x = pointX(i, count);
                return (
                  <span
                    key={i}
                    className="absolute top-0 whitespace-nowrap"
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
        </div>
      </div>
      <DitherTable
        caption={label}
        columns={[categoryLabel, valueLabel]}
        rows={data.map((entry) => [entry.label, formatValue(entry.value)])}
        visible={showTable}
      />
    </div>
  );
}
