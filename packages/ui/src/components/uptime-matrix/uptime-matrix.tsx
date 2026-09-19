"use client";

// Ported from amicro "System Uptime Matrix" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import {
  DitherCanvas,
  ditherFill,
  DitherTable,
  drift,
  hash2,
  makePath,
  tokenToCss,
  traceRoundedRect,
  type DitherDraw,
} from "@/components/dither-canvas";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A status history drawn in dithered tiles — amicro's 90-day uptime matrix.
 * Each day is a tall tile coloured by state: success, warning and destructive
 * are the right tokens here, because the colour *is* the state. Colour is not
 * the only cue: degraded tiles are striped, outages drawn solid, and every
 * state is named in the legend, the readout and the table.
 *
 * Over the canvas sits an APG grid with one roving tab stop. Arrows move a day
 * (Up/Down a row when the tiles wrap into `columns`), Home/End go to the row's
 * ends, Ctrl+Home/End to the first and last day, Escape hides the readout. Each
 * cell's text is its readout. Days run left to right in every direction, as
 * the canvas draws them.
 */

export const uptimeMatrixVariants = cva("flex flex-col gap-2", {
  variants: {
    size: {
      sm: "[--uptime-matrix-height:1.25rem]",
      md: "[--uptime-matrix-height:1.75rem]",
      lg: "[--uptime-matrix-height:2.5rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export type UptimeStatus = "operational" | "degraded" | "outage" | "unknown";

export interface UptimeDay {
  /** The day's name, e.g. a date. */
  label: string;
  status: UptimeStatus;
  /** Uptime that day, in percent. */
  uptime?: number;
  /** A note for the readout, e.g. the incident. */
  note?: string;
}

export interface UptimeMatrixProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof uptimeMatrixVariants> {
  days: readonly UptimeDay[];
  /** What the matrix shows. Names the image, the grid and the data table. */
  label: string;
  /** Replaces the generated summary in the image's accessible name. */
  description?: string;
  /** Tiles per row. Default: every day in one row. */
  columns?: number;
  /** Names for each state (translate here). */
  statusLabels?: Partial<Record<UptimeStatus, string>>;
  formatUptime?: (percent: number) => string;
  /** Show the state legend with counts. */
  showLegend?: boolean;
  /** Show the first and last day under the tiles. */
  showAxis?: boolean;
  /** Replace the axis labels, e.g. "90 days ago" and "Today". */
  startLabel?: string;
  endLabel?: string;
  /** Show the data table. It is always present for assistive technology. */
  showTable?: boolean;
  animate?: boolean;
  /** Cell pitch in CSS pixels. Default 2: tiles are thin. */
  cell?: number;
  /** The day whose readout shows (controlled); null hides it. */
  activeIndex?: number | null;
  defaultActiveIndex?: number | null;
  onActiveIndexChange?: (index: number | null) => void;
  /** Data table headers. */
  dayLabel?: string;
  statusLabel?: string;
  uptimeLabel?: string;
  noteLabel?: string;
}

/** Gap between tiles in CSS pixels. */
export const UPTIME_GAP = 2;

export const UPTIME_STATUSES: readonly UptimeStatus[] = [
  "operational",
  "degraded",
  "outage",
  "unknown",
];

/** The state token for each status. */
export const UPTIME_COLORS: Readonly<Record<UptimeStatus, string>> = {
  operational: "success",
  degraded: "warning",
  outage: "destructive",
  unknown: "muted-foreground",
};

const DEFAULT_LABELS: Record<UptimeStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Outage",
  unknown: "No data",
};

/** The day a grid key moves to, or null when the key is not a grid key. */
export function dayFromKey(
  key: string,
  ctrl: boolean,
  index: number,
  count: number,
  columns: number,
): number | null {
  const last = count - 1;
  const clampTo = (value: number) => Math.min(last, Math.max(0, value));
  const rowStart = index - (index % columns);
  switch (key) {
    case "ArrowRight":
      return clampTo(index + 1);
    case "ArrowLeft":
      return clampTo(index - 1);
    case "ArrowDown":
      return index + columns <= last ? index + columns : index;
    case "ArrowUp":
      return index - columns >= 0 ? index - columns : index;
    case "Home":
      return ctrl ? 0 : rowStart;
    case "End":
      return ctrl ? last : clampTo(rowStart + columns - 1);
    default:
      return null;
  }
}

export function UptimeMatrix({
  days,
  label,
  description,
  columns,
  statusLabels,
  formatUptime = (percent) => `${String(Math.round(percent * 100) / 100)}%`,
  showLegend = true,
  showAxis = true,
  startLabel,
  endLabel,
  size,
  showTable = false,
  animate = true,
  cell = 2,
  activeIndex,
  defaultActiveIndex = null,
  onActiveIndexChange,
  dayLabel = "Day",
  statusLabel = "Status",
  uptimeLabel = "Uptime",
  noteLabel = "Note",
  className,
  ...props
}: UptimeMatrixProps) {
  const [uncontrolled, setUncontrolled] = useState<number | null>(defaultActiveIndex);
  const [focusIndex, setFocusIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const active = activeIndex !== undefined ? activeIndex : uncontrolled;
  const count = days.length;
  const perRow = Math.max(1, Math.min(count, columns ?? count));
  const rowCount = Math.ceil(count / perRow);
  const names = { ...DEFAULT_LABELS, ...statusLabels };

  const setActive = (next: number | null) => {
    if (next === active) return;
    if (activeIndex === undefined) setUncontrolled(next);
    onActiveIndexChange?.(next);
  };

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time } = frame;
    if (count === 0) return;
    const tileWidth = (width - UPTIME_GAP * (perRow - 1)) / perRow;
    const tileHeight = (height - UPTIME_GAP * (rowCount - 1)) / rowCount;
    if (tileWidth <= 0 || tileHeight <= 0) return;
    const step = frame.cell;
    days.forEach((day, i) => {
      const x = (i % perRow) * (tileWidth + UPTIME_GAP);
      const y = Math.floor(i / perRow) * (tileHeight + UPTIME_GAP);
      const hot = active === i;
      const dim = active !== null && !hot;
      const status = day.status;
      ditherFill(ctx, {
        clip: makePath((sink) => {
          traceRoundedRect(sink, x, y, tileWidth, tileHeight, Math.min(2, tileWidth / 2));
        }),
        bounds: { x, y, width: tileWidth, height: tileHeight },
        cell: step,
        color: frame.color(UPTIME_COLORS[status]),
        alpha: (status === "unknown" ? 0.35 : 0.85) * (dim ? 0.55 : 1),
        density: (cx, cy) => {
          const base = (0.3 + 0.4 * drift(cx, cy, time * 1.2)) * (0.8 + 0.4 * hash2(cx, cy));
          if (status === "outage") return base + 0.3;
          // Degraded: diagonal stripes, so the state reads without its colour.
          if (status === "degraded" && Math.floor((cx + cy) / (step * 2)) % 2 === 0)
            return base * 0.35;
          return base + (hot ? 0.2 : 0);
        },
      });
    });
  };

  const describe = (i: number) => {
    const day = days[i];
    if (!day) return "";
    const uptime =
      day.uptime !== undefined
        ? `, ${formatUptime(day.uptime)} ${uptimeLabel.toLowerCase()}`
        : "";
    const note = day.note ? `. ${day.note}` : "";
    return `${day.label}: ${names[day.status]}${uptime}${note}`;
  };

  const counts = UPTIME_STATUSES.map(
    (status) => [status, days.filter((day) => day.status === status).length] as const,
  );
  const measured = days.filter((day) => day.uptime !== undefined);
  const average =
    measured.length > 0
      ? measured.reduce((sum, day) => sum + (day.uptime ?? 0), 0) / measured.length
      : null;
  const summary =
    description ??
    (count === 0
      ? "No data."
      : `${String(count)} days: ${counts
          .filter(([, n]) => n > 0)
          .map(([status, n]) => `${String(n)} ${names[status].toLowerCase()}`)
          .join(", ")}.` +
        (average !== null
          ? ` Average ${uptimeLabel.toLowerCase()} ${formatUptime(average)}.`
          : ""));

  const roving = Math.min(focusIndex, Math.max(0, count - 1));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (active !== null) {
        event.preventDefault();
        setActive(null);
      }
      return;
    }
    const next = dayFromKey(event.key, event.ctrlKey || event.metaKey, roving, count, perRow);
    if (next === null) return;
    event.preventDefault();
    gridRef.current?.querySelector<HTMLElement>(`[data-index="${String(next)}"]`)?.focus();
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setActive(null);
  };

  const gap = `${String(UPTIME_GAP)}px`;
  const rowsOf = Array.from({ length: rowCount }, (_, r) =>
    days.slice(r * perRow, (r + 1) * perRow).map((day, c) => ({ day, index: r * perRow + c })),
  );
  const activeX = active !== null ? ((active % perRow) + 0.5) / perRow : 0;
  const shift =
    active !== null && (active % perRow === 0 || activeX < 0.15)
      ? "0%"
      : active !== null && (active % perRow === perRow - 1 || activeX > 0.85)
        ? "-100%"
        : "-50%";
  const withUptime = measured.length > 0;
  const withNote = days.some((day) => day.note);

  return (
    <div
      data-slot="uptime-matrix"
      {...props}
      className={cn(uptimeMatrixVariants({ size }), className)}
    >
      <div className="flex flex-col gap-1.5" style={{ direction: "ltr" }}>
        <div
          data-slot="uptime-matrix-plot"
          className="relative"
          style={{
            height: `calc(var(--uptime-matrix-height) * ${String(Math.max(1, rowCount))} + ${String(
              UPTIME_GAP * Math.max(0, rowCount - 1),
            )}px)`,
          }}
        >
          <div role="img" aria-label={`${label}: ${summary}`} className="size-full">
            <DitherCanvas draw={draw} animate={animate} cell={cell} />
          </div>
          {count > 0 && (
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
              {rowsOf.map((row, r) => (
                <div
                  key={r}
                  role="row"
                  className="grid flex-1"
                  style={{
                    gap,
                    gridTemplateColumns: `repeat(${String(perRow)}, minmax(0, 1fr))`,
                  }}
                >
                  {row.map(({ day, index }) => (
                    <div
                      key={`${day.label}-${String(index)}`}
                      role="gridcell"
                      data-index={index}
                      data-status={day.status}
                      data-active={active === index || undefined}
                      tabIndex={roving === index ? 0 : -1}
                      className={cn("rounded-xs", focusRing)}
                      onPointerEnter={() => {
                        setActive(index);
                      }}
                      onFocus={() => {
                        setFocusIndex(index);
                        setActive(index);
                      }}
                    >
                      <span className="sr-only">{describe(index)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {active !== null && days[active] && (
            <div
              aria-hidden
              data-slot="uptime-matrix-readout"
              className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-md"
              style={{
                left: `${String(activeX * 100)}%`,
                top: `${String((Math.floor(active / perRow) / rowCount) * 100)}%`,
                transform: `translate(${shift}, calc(-100% - 0.375rem))`,
              }}
            >
              <p className="font-medium">{days[active].label}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ background: tokenToCss(UPTIME_COLORS[days[active].status]) }}
                />
                {names[days[active].status]}
                {days[active].uptime !== undefined && (
                  <span className="tabular-nums">· {formatUptime(days[active].uptime)}</span>
                )}
              </p>
              {days[active].note && (
                <p className="text-muted-foreground">{days[active].note}</p>
              )}
            </div>
          )}
        </div>
        {showAxis && count > 0 && (
          <div
            aria-hidden
            data-slot="uptime-matrix-axis"
            className="flex justify-between gap-3 font-mono text-2xs text-muted-foreground"
          >
            <span>{startLabel ?? days[0]?.label}</span>
            {average !== null && (
              <span className="tabular-nums">
                {formatUptime(average)} {uptimeLabel.toLowerCase()}
              </span>
            )}
            <span>{endLabel ?? days[count - 1]?.label}</span>
          </div>
        )}
      </div>
      {showLegend && (
        <ul
          data-slot="uptime-matrix-legend"
          aria-label={`${label} legend`}
          className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
        >
          {counts
            .filter(([status, n]) => status !== "unknown" || n > 0)
            .map(([status, n]) => (
              <li key={status} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2.5 rounded-xs"
                  style={{ background: tokenToCss(UPTIME_COLORS[status]) }}
                />
                {names[status]} <span className="tabular-nums">{n}</span>
              </li>
            ))}
        </ul>
      )}
      <DitherTable
        caption={label}
        columns={[
          dayLabel,
          statusLabel,
          ...(withUptime ? [uptimeLabel] : []),
          ...(withNote ? [noteLabel] : []),
        ]}
        rows={days.map((day) => [
          day.label,
          names[day.status],
          ...(withUptime ? [day.uptime !== undefined ? formatUptime(day.uptime) : ""] : []),
          ...(withNote ? [day.note ?? ""] : []),
        ])}
        visible={showTable}
      />
    </div>
  );
}
