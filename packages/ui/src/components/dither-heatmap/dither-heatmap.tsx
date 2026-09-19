"use client";

// Ported from amicro "Activity Dither Heatmap" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import {
  createSprings,
  DitherCanvas,
  ditherFill,
  DitherTable,
  drift,
  formatDitherValue,
  hash2,
  makePath,
  tokenToCss,
  traceRoundedRect,
  type DitherDraw,
} from "@/components/dither-canvas";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * An intensity grid drawn in dithered cells: rows × columns of tiles, each
 * tile's opacity its value against the maximum — amicro's activity heatmap
 * (weeks × weekdays, five contribution levels) and its day × hour grid with a
 * hover tooltip. Values are springs in the engine, so a new period morphs.
 *
 * Over the canvas sits an APG grid of real cells with one roving tab stop:
 * Tab into it, arrows move a cell, Home/End go to the row's ends, Ctrl+Home/End
 * to the grid's corners, Escape hides the readout. Each cell's text is its
 * readout, so what the pointer's tooltip shows is what a screen reader hears.
 * The plot is laid out left to right in every direction: a canvas does not
 * mirror, and the cells have to stay over the tiles they describe.
 */

export const ditherHeatmapVariants = cva("flex flex-col gap-2", {
  variants: {
    size: {
      sm: "[--dither-heatmap-height:6rem]",
      md: "[--dither-heatmap-height:9rem]",
      lg: "[--dither-heatmap-height:12rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface DitherHeatmapCell {
  row: number;
  column: number;
}

export interface DitherHeatmapCellInfo {
  row: string;
  column: string;
  value: number;
}

export interface DitherHeatmapProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof ditherHeatmapVariants> {
  /** Row names, top to bottom (e.g. weekdays). */
  rows: readonly string[];
  /** Column names, start to end (e.g. hours or weeks). */
  columns: readonly string[];
  /** `values[row][column]`. Missing, negative and non-finite values count as zero. */
  values: readonly (readonly number[])[];
  /** What the chart shows. Names the image, the grid and the data table. */
  label: string;
  /** Replaces the generated summary in the image's accessible name. */
  description?: string;
  /** Value of a full-intensity tile. Defaults to the largest value. */
  max?: number;
  /** Quantise intensity into this many steps (amicro's activity map uses 5). */
  levels?: number;
  /** Colour token or CSS colour expression. Default "primary". */
  color?: string;
  formatValue?: (value: number) => string;
  /** The readout for one cell. Defaults to "Row, Column: value". */
  formatCell?: (cell: DitherHeatmapCellInfo) => string;
  /** Show row and column labels. */
  showAxis?: boolean;
  /** Show a Less → More scale. */
  showLegend?: boolean;
  lessLabel?: string;
  moreLabel?: string;
  /** Show the data table. It is always present for assistive technology. */
  showTable?: boolean;
  animate?: boolean;
  /** Cell pitch in CSS pixels. Default 3: tiles are small. */
  cell?: number;
  /** The cell whose readout shows (controlled); null hides it. */
  activeCell?: DitherHeatmapCell | null;
  defaultActiveCell?: DitherHeatmapCell | null;
  onActiveCellChange?: (cell: DitherHeatmapCell | null) => void;
  /** Header of the data table's row-name column. */
  rowLabel?: string;
}

/** Gap between tiles in CSS pixels, shared by the canvas and the cell grid. */
export const HEATMAP_GAP = 2.5;

/** A value's intensity, 0..1, against `max`, optionally quantised to `levels` steps. */
export function heatmapIntensity(value: number, max: number, levels?: number): number {
  const clean = Number.isFinite(value) && value > 0 ? value : 0;
  const t = max > 0 ? Math.min(1, clean / max) : 0;
  if (levels === undefined || levels < 2) return t;
  return Math.round(t * (levels - 1)) / (levels - 1);
}

/** The cell a grid key moves to, or null when the key is not a grid key. */
export function cellFromKey(
  key: string,
  ctrl: boolean,
  cell: DitherHeatmapCell,
  rows: number,
  columns: number,
): DitherHeatmapCell | null {
  const clampRow = (row: number) => Math.min(rows - 1, Math.max(0, row));
  const clampColumn = (column: number) => Math.min(columns - 1, Math.max(0, column));
  switch (key) {
    case "ArrowRight":
      return { row: cell.row, column: clampColumn(cell.column + 1) };
    case "ArrowLeft":
      return { row: cell.row, column: clampColumn(cell.column - 1) };
    case "ArrowDown":
      return { row: clampRow(cell.row + 1), column: cell.column };
    case "ArrowUp":
      return { row: clampRow(cell.row - 1), column: cell.column };
    case "Home":
      return ctrl ? { row: 0, column: 0 } : { row: cell.row, column: 0 };
    case "End":
      return ctrl
        ? { row: rows - 1, column: columns - 1 }
        : { row: cell.row, column: columns - 1 };
    default:
      return null;
  }
}

const clean = (value: number | undefined) =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : 0;

export function DitherHeatmap({
  rows,
  columns,
  values,
  label,
  description,
  max,
  levels,
  color = "primary",
  size,
  formatValue = formatDitherValue,
  formatCell,
  showAxis = true,
  showLegend = false,
  lessLabel = "Less",
  moreLabel = "More",
  showTable = false,
  animate = true,
  cell = 3,
  activeCell,
  defaultActiveCell = null,
  onActiveCellChange,
  rowLabel = "Row",
  className,
  ...props
}: DitherHeatmapProps) {
  const [uncontrolled, setUncontrolled] = useState<DitherHeatmapCell | null>(defaultActiveCell);
  const [focusCell, setFocusCell] = useState<DitherHeatmapCell>({ row: 0, column: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const active = activeCell !== undefined ? activeCell : uncontrolled;
  const rowCount = rows.length;
  const columnCount = columns.length;

  const setActive = (next: DitherHeatmapCell | null) => {
    const same =
      next === active ||
      (next !== null &&
        active !== null &&
        next.row === active.row &&
        next.column === active.column);
    if (same) return;
    if (activeCell === undefined) setUncontrolled(next);
    onActiveCellChange?.(next);
  };

  const grid = rows.map((_, r) => columns.map((_, c) => clean(values[r]?.[c])));
  const flat = grid.flat();
  const top = max ?? Math.max(0, ...flat);
  const targets = flat.map((value) => heatmapIntensity(value, top, levels));
  const tiles = useRef(createSprings(targets.map(() => 0)));

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time } = frame;
    tiles.current.set(targets);
    const moving = tiles.current.step(frame.delta, frame.reducedMotion);
    const current = tiles.current.values;
    if (rowCount === 0 || columnCount === 0) return moving;
    const tileWidth = (width - HEATMAP_GAP * (columnCount - 1)) / columnCount;
    const tileHeight = (height - HEATMAP_GAP * (rowCount - 1)) / rowCount;
    if (tileWidth <= 0 || tileHeight <= 0) return moving;
    const fill = frame.color(color);
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < columnCount; c++) {
        const x = c * (tileWidth + HEATMAP_GAP);
        const y = r * (tileHeight + HEATMAP_GAP);
        const level = current[r * columnCount + c] ?? 0;
        const hot = active?.row === r && active.column === c;
        ditherFill(ctx, {
          clip: makePath((sink) => {
            traceRoundedRect(sink, x, y, tileWidth, tileHeight, 2);
          }),
          bounds: { x, y, width: tileWidth, height: tileHeight },
          cell: frame.cell,
          color: fill,
          // amicro's five steps run from 15% to full, drawn at 85%.
          alpha: hot ? 1 : 0.85 * (0.15 + 0.85 * level),
          density: (cx, cy) =>
            (0.4 + 0.4 * drift(cx, cy, time * 1.2)) * (0.8 + 0.4 * hash2(cx, cy)) +
            (hot ? 0.25 : 0),
        });
      }
    }
    return moving;
  };

  const describe = (r: number, c: number) => {
    const info = { row: rows[r] ?? "", column: columns[c] ?? "", value: grid[r]?.[c] ?? 0 };
    return formatCell
      ? formatCell(info)
      : `${info.row}, ${info.column}: ${formatValue(info.value)}`;
  };

  const total = flat.reduce((sum, value) => sum + value, 0);
  const peakIndex = flat.reduce(
    (best, value, i) => (value > (flat[best] ?? -Infinity) ? i : best),
    0,
  );
  const summary =
    description ??
    (flat.length === 0
      ? "No data."
      : `${String(rowCount)} rows by ${String(columnCount)} columns. Total ${formatValue(total)}; ` +
        `peak ${describe(Math.floor(peakIndex / columnCount), peakIndex % columnCount)}.`);

  const roving = {
    row: Math.min(focusCell.row, Math.max(0, rowCount - 1)),
    column: Math.min(focusCell.column, Math.max(0, columnCount - 1)),
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (active) {
        event.preventDefault();
        setActive(null);
      }
      return;
    }
    const next = cellFromKey(
      event.key,
      event.ctrlKey || event.metaKey,
      roving,
      rowCount,
      columnCount,
    );
    if (!next) return;
    event.preventDefault();
    // Focusing the cell moves the tab stop and the readout (its onFocus).
    gridRef.current
      ?.querySelector<HTMLElement>(
        `[data-row="${String(next.row)}"][data-column="${String(next.column)}"]`,
      )
      ?.focus();
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setActive(null);
  };

  const gap = `${String(HEATMAP_GAP)}px`;
  const shownColumns =
    columnCount > 0
      ? Array.from({ length: Math.min(columnCount, 8) }, (_, i) =>
          Math.round((i * (columnCount - 1)) / Math.max(1, Math.min(columnCount, 8) - 1)),
        ).filter((i, n, all) => all.indexOf(i) === n)
      : [];
  const readoutX = active ? (active.column + 0.5) / Math.max(1, columnCount) : 0;
  // Keep the readout inside the plot at either edge.
  const shift =
    active && (active.column === 0 || readoutX < 0.15)
      ? "0%"
      : active && (active.column === columnCount - 1 || readoutX > 0.85)
        ? "-100%"
        : "-50%";
  const scale = levels !== undefined && levels >= 2 ? levels : 5;

  return (
    <div
      data-slot="dither-heatmap"
      {...props}
      className={cn(ditherHeatmapVariants({ size }), className)}
    >
      <div className="flex gap-2" style={{ direction: "ltr" }}>
        {showAxis && (
          <div
            aria-hidden
            data-slot="dither-heatmap-rows"
            className="flex h-[var(--dither-heatmap-height)] shrink-0 flex-col font-mono text-2xs text-muted-foreground"
            style={{ gap }}
          >
            {rows.map((row, r) => (
              <span key={`${row}-${String(r)}`} className="flex flex-1 items-center">
                {row}
              </span>
            ))}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div
            data-slot="dither-heatmap-plot"
            className="relative h-[var(--dither-heatmap-height)]"
          >
            <div role="img" aria-label={`${label}: ${summary}`} className="size-full">
              <DitherCanvas draw={draw} animate={animate} cell={cell} />
            </div>
            {rowCount > 0 && columnCount > 0 && (
              <div
                ref={gridRef}
                role="grid"
                // Focusable only by script, so the one roving cell stays the tab stop.
                tabIndex={-1}
                aria-label={label}
                className="absolute inset-0 flex flex-col"
                style={{ gap }}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
                onPointerLeave={(event) => {
                  if (!event.currentTarget.contains(document.activeElement)) setActive(null);
                }}
              >
                {rows.map((row, r) => (
                  <div
                    key={`${row}-${String(r)}`}
                    role="row"
                    className="grid flex-1"
                    style={{
                      gap,
                      gridTemplateColumns: `repeat(${String(columnCount)}, minmax(0, 1fr))`,
                    }}
                  >
                    {columns.map((column, c) => (
                      <div
                        key={`${column}-${String(c)}`}
                        role="gridcell"
                        data-row={r}
                        data-column={c}
                        data-active={(active?.row === r && active.column === c) || undefined}
                        tabIndex={roving.row === r && roving.column === c ? 0 : -1}
                        className={cn("rounded-sm", focusRing)}
                        onPointerEnter={() => {
                          setActive({ row: r, column: c });
                        }}
                        onFocus={() => {
                          setFocusCell({ row: r, column: c });
                          setActive({ row: r, column: c });
                        }}
                      >
                        <span className="sr-only">{describe(r, c)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {active && active.row < rowCount && active.column < columnCount && (
              <div
                aria-hidden
                data-slot="dither-heatmap-readout"
                className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2.5 py-1 text-xs font-medium whitespace-nowrap text-popover-foreground shadow-md transition-[left,top] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]"
                style={{
                  left: `${String(readoutX * 100)}%`,
                  top: `${String((active.row / rowCount) * 100)}%`,
                  transform: `translate(${shift}, calc(-100% - 0.375rem))`,
                }}
              >
                {describe(active.row, active.column)}
              </div>
            )}
          </div>
          {showAxis && (
            <div
              aria-hidden
              data-slot="dither-heatmap-columns"
              className="relative h-4 font-mono text-2xs text-muted-foreground"
            >
              {shownColumns.map((c) => {
                const x = (c + 0.5) / columnCount;
                return (
                  <span
                    key={c}
                    className="absolute top-0 whitespace-nowrap"
                    style={{ left: `${String(x * 100)}%`, transform: "translateX(-50%)" }}
                  >
                    {columns[c]}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showLegend && (
        <div
          aria-hidden
          data-slot="dither-heatmap-legend"
          className="flex items-center justify-end gap-1 text-2xs text-muted-foreground"
        >
          <span className="pe-1">{lessLabel}</span>
          {Array.from({ length: scale }, (_, i) => (
            <span
              key={i}
              className="size-2.5 rounded-xs"
              style={{
                background: `color-mix(in oklab, ${tokenToCss(color)} ${String(
                  Math.round((0.15 + (0.85 * i) / (scale - 1)) * 100),
                )}%, transparent)`,
              }}
            />
          ))}
          <span className="ps-1">{moreLabel}</span>
        </div>
      )}
      <DitherTable
        caption={label}
        columns={[rowLabel, ...columns]}
        rows={rows.map((row, r) => [
          row,
          ...columns.map((_, c) => formatValue(grid[r]?.[c] ?? 0)),
        ])}
        visible={showTable}
      />
    </div>
  );
}
