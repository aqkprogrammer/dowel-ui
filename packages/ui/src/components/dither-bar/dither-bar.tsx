"use client";

// Ported from amicro "Dither Stacked Bar" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, useState, type ComponentPropsWithRef, type PointerEvent } from "react";

import {
  createSprings,
  DitherCanvas,
  ditherFill,
  DitherTable,
  formatDitherValue,
  hash2,
  makePath,
  niceMax,
  seriesColor,
  tokenToCss,
  traceRoundedRect,
  type DitherDraw,
} from "@/components/dither-canvas";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Stacked bars drawn in dithered cells. Each category is a column; each series
 * a band. Hover by series: pointing at a band, or at a legend entry, lights
 * that series and dims the rest. Every column is a button over the plot, named
 * with its whole breakdown, so the readout a pointer reveals is reachable by
 * Tab too; pressing one pins its readout. Heights are springs in the engine,
 * so a data change grows the bars rather than cutting to them.
 *
 * The plot is laid out left to right in every direction: a canvas does not
 * mirror, and the column buttons have to stay over the bars they describe.
 */

export const ditherBarVariants = cva("flex flex-col gap-3", {
  variants: {
    size: {
      sm: "[--dither-bar-height:8rem]",
      md: "[--dither-bar-height:12.5rem]",
      lg: "[--dither-bar-height:17rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface DitherBarSeries {
  key: string;
  label: string;
  /** Colour token (`"primary"`) or CSS colour expression. Defaults to the palette. */
  color?: string;
}

export interface DitherBarDatum {
  label: string;
  /** Value per series key. Missing keys count as zero. */
  values: Readonly<Record<string, number>>;
}

export interface DitherBarProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof ditherBarVariants> {
  series: readonly DitherBarSeries[];
  data: readonly DitherBarDatum[];
  /** What the chart shows. Names the image, the columns and the data table. */
  label: string;
  /** Replaces the generated summary in the image's accessible name. */
  description?: string;
  /** Axis maximum. Defaults to a round number above the tallest stack. */
  max?: number;
  formatValue?: (value: number) => string;
  showLegend?: boolean;
  /** Show the data table. It is always present for assistive technology. */
  showTable?: boolean;
  animate?: boolean;
  cell?: number;
  /** The pinned series key (controlled). */
  activeSeries?: string | null;
  defaultActiveSeries?: string | null;
  onActiveSeriesChange?: (key: string | null) => void;
  /** Label for the totals row and column. */
  totalLabel?: string;
  /** Header of the data table's category column. */
  categoryLabel?: string;
}

/** The series whose band contains `y` (px from the top of the plot), or null. */
export function segmentAt(
  fractions: readonly number[],
  height: number,
  y: number,
): number | null {
  let bottom = height;
  for (let index = 0; index < fractions.length; index++) {
    const top = bottom - (fractions[index] ?? 0) * height;
    if (y >= top && y <= bottom && bottom > top) return index;
    bottom = top;
  }
  return null;
}

export function DitherBar({
  series,
  data,
  label,
  description,
  max,
  size,
  formatValue = formatDitherValue,
  showLegend = true,
  showTable = false,
  animate = true,
  cell,
  activeSeries,
  defaultActiveSeries = null,
  onActiveSeriesChange,
  totalLabel = "Total",
  categoryLabel = "Category",
  className,
  ...props
}: DitherBarProps) {
  const [uncontrolledSeries, setUncontrolledSeries] = useState<string | null>(
    defaultActiveSeries,
  );
  const [seriesPreview, setSeriesPreview] = useState<number | null>(null);
  const [columnPreview, setColumnPreview] = useState<number | null>(null);
  const [columnPinned, setColumnPinned] = useState<number | null>(null);
  const [bandPreview, setBandPreview] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  const pinnedKey = activeSeries !== undefined ? activeSeries : uncontrolledSeries;
  const pinnedSeries =
    pinnedKey === null ? -1 : series.findIndex((entry) => entry.key === pinnedKey);
  const litSeries = seriesPreview ?? (pinnedSeries >= 0 ? pinnedSeries : null);
  const litColumn = columnPreview ?? columnPinned;

  const valueOf = (datum: DitherBarDatum, key: string) => {
    const value = datum.values[key] ?? 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  };
  const totals = data.map((datum) =>
    series.reduce((sum, entry) => sum + valueOf(datum, entry.key), 0),
  );
  const axisMax = max ?? niceMax(Math.max(0, ...totals));
  const fractions = data.map((datum) =>
    series.map((entry) => valueOf(datum, entry.key) / axisMax),
  );

  const heights = useRef(createSprings(fractions.flat().map(() => 0)));

  const pinSeries = (index: number) => {
    const key = series[index]?.key ?? null;
    const next = pinnedKey === key ? null : key;
    if (activeSeries === undefined) setUncontrolledSeries(next);
    onActiveSeriesChange?.(next);
  };

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time, animated } = frame;
    const step = frame.cell;
    const count = data.length;
    const bands = series.length;
    heights.current.set(fractions.flat());
    const moving = heights.current.step(frame.delta, frame.reducedMotion);
    const current = heights.current.values;
    const column = count > 0 ? width / count : width;
    const barWidth = Math.min(column * 0.62, 54);

    for (let i = 0; i < count; i++) {
      const x = column * (i + 0.5) - barWidth / 2;
      let bottom = height;
      const lastBand = (fractions[i] ?? []).reduce(
        (found, fraction, band) => (fraction > 0 ? band : found),
        -1,
      );
      for (let j = 0; j < bands; j++) {
        const segment = Math.max(0, (current[i * bands + j] ?? 0) * height);
        const top = bottom - segment;
        if (segment >= 1) {
          const hot = litSeries === j || (litColumn === i && bandPreview === j);
          const alpha =
            litSeries !== null
              ? litSeries === j
                ? 1
                : 0.3
              : litColumn !== null
                ? litColumn !== i
                  ? 0.3
                  : bandPreview !== null && bandPreview !== j
                    ? 0.48
                    : 1
                : 0.85;
          // A 2px surface gap between bands: each is inset a pixel each side.
          const y0 = top + (j === lastBand ? 0 : 1);
          const y1 = bottom - (j === 0 ? 0 : 1);
          const mid = { x: x + barWidth / 2, y: (y0 + y1) / 2 };
          ditherFill(ctx, {
            clip: makePath((sink) => {
              traceRoundedRect(sink, x, y0, barWidth, y1 - y0, j === lastBand ? 6 : 2, 2);
            }),
            bounds: { x, y: y0, width: barWidth, height: y1 - y0 },
            cell: step,
            color: frame.color(seriesColor(j, series[j]?.color)),
            alpha,
            density: (cx, cy) => {
              const wave = animated
                ? Math.sin(Math.hypot(cx - mid.x, cy - mid.y) * 0.1 - time * 2.4) * 0.15
                : 0;
              return 0.68 + wave + hash2(cx, cy) * 0.2 + (hot ? 0.12 : 0);
            },
          });
        }
        bottom = top;
      }
    }
    return moving;
  };

  const onColumnPointerMove = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    const plot = plotRef.current;
    if (columnPreview !== index) setColumnPreview(index);
    if (!plot) return;
    const rect = plot.getBoundingClientRect();
    const band = segmentAt(fractions[index] ?? [], rect.height, event.clientY - rect.top);
    if (band !== bandPreview) setBandPreview(band);
  };

  const breakdown = (index: number) => {
    const datum = data[index];
    if (!datum) return "";
    const parts = series.map(
      (entry) => `${entry.label} ${formatValue(valueOf(datum, entry.key))}`,
    );
    return `${parts.join(", ")}; ${totalLabel.toLowerCase()} ${formatValue(totals[index] ?? 0)}`;
  };
  const summary =
    description ??
    `${String(data.length)} stacks of ${series.map((entry) => entry.label).join(", ")}. ${data
      .map((datum, index) => `${datum.label}: ${breakdown(index)}`)
      .join(". ")}.`;
  const readoutIndex = litColumn;
  const readoutDatum = readoutIndex !== null ? data[readoutIndex] : undefined;
  const columns = {
    gridTemplateColumns: `repeat(${String(Math.max(1, data.length))}, minmax(0, 1fr))`,
  };

  return (
    <div
      data-slot="dither-bar"
      {...props}
      className={cn(ditherBarVariants({ size }), className)}
    >
      {showLegend && (
        <ul
          data-slot="dither-bar-legend"
          aria-label={`${label} series`}
          className="flex flex-wrap gap-1"
        >
          {series.map((entry, index) => (
            <li key={entry.key}>
              <button
                type="button"
                aria-pressed={pinnedSeries === index}
                data-active={litSeries === index || undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] hover:text-foreground aria-pressed:bg-accent aria-pressed:text-accent-foreground data-active:text-foreground",
                  focusRing,
                )}
                onPointerEnter={() => {
                  setSeriesPreview(index);
                }}
                onPointerLeave={() => {
                  setSeriesPreview(null);
                }}
                onFocus={() => {
                  setSeriesPreview(index);
                }}
                onBlur={() => {
                  setSeriesPreview(null);
                }}
                onClick={() => {
                  pinSeries(index);
                }}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: tokenToCss(seriesColor(index, entry.color)) }}
                />
                {entry.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div data-slot="dither-bar-plot" className="relative pb-8" style={{ direction: "ltr" }}>
        <div
          ref={plotRef}
          role="img"
          aria-label={`${label}: ${summary}`}
          className="h-[var(--dither-bar-height)]"
        >
          <DitherCanvas draw={draw} animate={animate} cell={cell} />
        </div>
        <ul aria-label={label} className="absolute inset-0 grid" style={columns}>
          {data.map((datum, index) => (
            <li key={`${datum.label}-${String(index)}`} className="flex">
              <button
                type="button"
                aria-pressed={columnPinned === index}
                aria-label={`${datum.label}: ${breakdown(index)}`}
                data-active={litColumn === index || undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-end rounded-md pb-1.5 text-xs font-medium text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] data-active:text-foreground",
                  focusRing,
                )}
                onPointerMove={(event) => {
                  onColumnPointerMove(index, event);
                }}
                onPointerLeave={() => {
                  setColumnPreview(null);
                  setBandPreview(null);
                }}
                onFocus={() => {
                  setColumnPreview(index);
                }}
                onBlur={() => {
                  setColumnPreview(null);
                }}
                onClick={() => {
                  setColumnPinned(columnPinned === index ? null : index);
                }}
              >
                <span className="truncate">{datum.label}</span>
              </button>
            </li>
          ))}
        </ul>
        {readoutDatum && readoutIndex !== null && (
          <div
            data-slot="dither-bar-readout"
            className="pointer-events-none absolute top-0 z-10 min-w-32 -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md"
            style={{ left: `${String(((readoutIndex + 0.5) / data.length) * 100)}%` }}
          >
            <p className="mb-1 font-medium">{readoutDatum.label}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              {series.map((entry, index) => (
                <div
                  key={entry.key}
                  data-active={bandPreview === index || litSeries === index || undefined}
                  className="contents text-muted-foreground data-active:text-foreground"
                >
                  <dt className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-2 rounded-full"
                      style={{ background: tokenToCss(seriesColor(index, entry.color)) }}
                    />
                    {entry.label}
                  </dt>
                  <dd className="text-end tabular-nums">
                    {formatValue(valueOf(readoutDatum, entry.key))}
                  </dd>
                </div>
              ))}
              <div className="contents font-medium">
                <dt>{totalLabel}</dt>
                <dd className="text-end tabular-nums">
                  {formatValue(totals[readoutIndex] ?? 0)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
      <DitherTable
        caption={label}
        columns={[categoryLabel, ...series.map((entry) => entry.label), totalLabel]}
        rows={data.map((datum, index) => [
          datum.label,
          ...series.map((entry) => formatValue(valueOf(datum, entry.key))),
          formatValue(totals[index] ?? 0),
        ])}
        visible={showTable}
      />
    </div>
  );
}
