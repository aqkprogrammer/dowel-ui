"use client";

// Ported from SmoothUI Contribution Graph (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva } from "class-variance-authority";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
} from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A GitHub-style year heatmap, as an ARIA grid: weekdays are rows, weeks are
 * columns, and every day is a gridcell whose screen-reader text is the whole
 * fact ("3 contributions on Monday, 6 January 2025"). One cell is in the tab
 * order (roving tabindex); arrow keys move a day or a week — mirrored in RTL,
 * where weeks run the other way — Home/End go to the ends of the weekday's
 * row, Ctrl+Home/End to the ends of the year, PageUp/PageDown by four weeks.
 *
 * There is one Dowel Tooltip, not 371. It is controlled, and its trigger is an
 * invisible anchor moved over whichever day is hovered or focused, so pointer
 * and keyboard users see the same tooltip. Escape dismisses it.
 *
 * Dates are calendar days in UTC throughout: "2025-03-09" is that day wherever
 * the reader is, which the source's local-time arithmetic did not guarantee.
 * Levels are the primary token mixed into muted at 25/50/75/100%.
 */

const DAY = 86_400_000;

export interface ContributionDay {
  /** Calendar date, `YYYY-MM-DD`. */
  date: string;
  count: number;
  /** 0–4. Derived from `count` when omitted. */
  level?: number;
}

const contributionGraphCellVariants = cva("block size-2.5 rounded-[2px]", {
  variants: {
    level: {
      0: "bg-muted",
      1: "bg-[color-mix(in_oklab,var(--color-primary)_25%,var(--color-muted))]",
      2: "bg-[color-mix(in_oklab,var(--color-primary)_50%,var(--color-muted))]",
      3: "bg-[color-mix(in_oklab,var(--color-primary)_75%,var(--color-muted))]",
      4: "bg-primary",
    },
  },
  defaultVariants: { level: 0 },
});

type Level = 0 | 1 | 2 | 3 | 4;
const LEVELS: Level[] = [0, 1, 2, 3, 4];

export interface ContributionGraphProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** One entry per day with activity. Missing days count as zero. */
  data?: ContributionDay[];
  /** The calendar year shown. Defaults to the current year. */
  year?: number;
  /** Locale for month, weekday and date names. */
  locales?: Intl.LocalesArgument;
  /** Show the Less → More legend. */
  showLegend?: boolean;
  /** Show a tooltip for the hovered or focused day. */
  showTooltips?: boolean;
  /** The grid's accessible name. Defaults to "N contributions in YEAR". */
  label?: string;
  /** Maps a count to a level 0–4. Defaults to quarters of the year's busiest day. */
  getLevel?: (count: number, max: number) => number;
  /** The text for one day, used as its accessible name and in the tooltip. */
  formatCount?: (count: number) => string;
  lessLabel?: string;
  moreLabel?: string;
}

function defaultLevel(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.ceil((count / max) * 4));
}

function defaultCount(count: number): string {
  if (count === 0) return "No contributions";
  return `${String(count)} ${count === 1 ? "contribution" : "contributions"}`;
}

const keyOf = (time: number) => new Date(time).toISOString().slice(0, 10);
const weekday = (time: number) => new Date(time).getUTCDay();

function isRtl(element: Element) {
  return element.closest("[dir]")?.getAttribute("dir") === "rtl";
}

/** A year of activity as a keyboard-navigable heatmap grid. */
export function ContributionGraph({
  className,
  data = [],
  year = new Date().getUTCFullYear(),
  locales,
  showLegend = true,
  showTooltips = true,
  label,
  getLevel = defaultLevel,
  formatCount = defaultCount,
  lessLabel = "Less",
  moreLabel = "More",
  ...props
}: ContributionGraphProps) {
  const captionId = useId();
  const table = useRef<HTMLTableElement>(null);
  const surface = useRef<HTMLDivElement>(null);

  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year, 11, 31);
  const gridStart = start - weekday(start) * DAY;
  const weeks = Math.round(((end + (6 - weekday(end)) * DAY - gridStart) / DAY + 1) / 7);

  const [active, setActive] = useState(start);
  const current = Math.min(Math.max(active, start), end);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [anchor, setAnchor] = useState({ left: 0, top: 0, width: 0, height: 0 });

  const { byDate, max, total } = useMemo(() => {
    const map = new Map<string, ContributionDay>();
    let busiest = 0;
    let sum = 0;
    for (const day of data) {
      if (!day.date.startsWith(String(year))) continue;
      map.set(day.date, day);
      busiest = Math.max(busiest, day.count);
      sum += day.count;
    }
    return { byDate: map, max: busiest, total: sum };
  }, [data, year]);

  const names = useMemo(() => {
    const month = new Intl.DateTimeFormat(locales, { month: "short", timeZone: "UTC" });
    const short = new Intl.DateTimeFormat(locales, { weekday: "short", timeZone: "UTC" });
    const long = new Intl.DateTimeFormat(locales, { weekday: "long", timeZone: "UTC" });
    const full = new Intl.DateTimeFormat(locales, { dateStyle: "full", timeZone: "UTC" });
    // 1 January 2023 was a Sunday.
    const sunday = Date.UTC(2023, 0, 1);
    return {
      month: (time: number) => month.format(time),
      days: Array.from({ length: 7 }, (_, index) => ({
        short: short.format(sunday + index * DAY),
        long: long.format(sunday + index * DAY),
      })),
      full: (time: number) => full.format(time),
    };
  }, [locales]);

  function dayAt(time: number) {
    const entry = byDate.get(keyOf(time));
    const count = entry?.count ?? 0;
    const level = Math.min(
      4,
      Math.max(0, Math.round(entry?.level ?? getLevel(count, max))),
    ) as Level;
    return { count, level, text: `${formatCount(count)}, ${names.full(time)}` };
  }

  // Month headers: consecutive weeks grouped by the month their first in-year day falls in.
  const months: { key: string; name: string; span: number }[] = [];
  for (let week = 0; week < weeks; week++) {
    const first = Math.max(gridStart + week * 7 * DAY, start);
    const month = new Date(first).getUTCMonth();
    const last = months[months.length - 1];
    if (last?.key === String(month)) last.span++;
    else months.push({ key: String(month), name: names.month(first), span: 1 });
  }

  function place(cell: HTMLElement) {
    const box = surface.current?.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    setAnchor({
      left: rect.left - (box?.left ?? 0),
      top: rect.top - (box?.top ?? 0),
      width: rect.width,
      height: rect.height,
    });
  }

  function focusDay(time: number) {
    const cell = table.current?.querySelector<HTMLElement>(`[data-date="${keyOf(time)}"]`);
    cell?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    if (event.key === "Escape") {
      setDismissed(true);
      return;
    }
    const forward = isRtl(event.currentTarget) ? -1 : 1;
    const day = weekday(current);
    const targets: Record<string, number> = {
      ArrowRight: current + 7 * DAY * forward,
      ArrowLeft: current - 7 * DAY * forward,
      ArrowDown: current + DAY,
      ArrowUp: current - DAY,
      PageDown: current + 28 * DAY,
      PageUp: current - 28 * DAY,
      Home: event.ctrlKey ? start : start + ((day - weekday(start) + 7) % 7) * DAY,
      End: event.ctrlKey ? end : end - ((weekday(end) - day + 7) % 7) * DAY,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = event.key.startsWith("Page") ? Math.min(Math.max(target, start), end) : target;
    if (next < start || next > end) return;
    focusDay(next);
  }

  const shown = hovered ?? (focused ? current : null);
  const open = showTooltips && shown !== null && !dismissed;
  const tooltipDay = shown === null ? null : dayAt(shown);

  return (
    <div
      data-slot="contribution-graph"
      className={cn("flex flex-col gap-3 text-xs", className)}
      {...props}
    >
      <div className="overflow-x-auto">
        <div ref={surface} className="relative w-fit">
          <table
            ref={table}
            role="grid"
            aria-labelledby={captionId}
            className="border-separate border-spacing-[3px]"
            onKeyDown={handleKeyDown}
            onPointerLeave={() => {
              setHovered(null);
            }}
            onFocus={() => {
              setFocused(true);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
            }}
          >
            <caption id={captionId} className="sr-only">
              {label ??
                `${String(total)} ${total === 1 ? "contribution" : "contributions"} in ${String(year)}`}
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Weekday</span>
                </th>
                {months.map((month, index) => (
                  <th
                    key={`${month.key}-${String(index)}`}
                    scope="colgroup"
                    colSpan={month.span}
                    className="h-4 p-0 text-start align-bottom font-normal whitespace-nowrap text-muted-foreground"
                  >
                    {month.span > 1 ? (
                      month.name
                    ) : (
                      <span className="sr-only">{month.name}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {names.days.map((name, row) => (
                <tr key={name.long}>
                  <th
                    scope="row"
                    className="h-2.5 p-0 pe-1 text-start text-2xs leading-none font-normal text-muted-foreground"
                  >
                    <span aria-hidden="true" className={row % 2 ? "invisible" : undefined}>
                      {name.short}
                    </span>
                    <span className="sr-only">{name.long}</span>
                  </th>
                  {Array.from({ length: weeks }, (_, week) => {
                    const time = gridStart + (week * 7 + row) * DAY;
                    if (time < start || time > end) {
                      return <td key={week} role="gridcell" className="p-0" />;
                    }
                    const day = dayAt(time);
                    const key = keyOf(time);
                    return (
                      <td
                        key={week}
                        role="gridcell"
                        data-date={key}
                        data-level={day.level}
                        tabIndex={time === current ? 0 : -1}
                        className={cn("rounded-[2px] p-0", focusRing)}
                        onFocus={(event) => {
                          setActive(time);
                          setDismissed(false);
                          place(event.currentTarget);
                        }}
                        onPointerEnter={(event) => {
                          setHovered(time);
                          setDismissed(false);
                          place(event.currentTarget);
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            contributionGraphCellVariants({ level: day.level }),
                            "transition-[scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] hover:scale-125",
                          )}
                        />
                        <span className="sr-only">{day.text}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {showTooltips ? (
            <Tooltip
              open={open}
              onOpenChange={(next) => {
                if (!next) setDismissed(true);
              }}
            >
              <TooltipTrigger asChild>
                <span
                  aria-hidden="true"
                  data-slot="contribution-graph-anchor"
                  className="pointer-events-none absolute"
                  style={anchor}
                />
              </TooltipTrigger>
              {tooltipDay && shown !== null ? (
                <TooltipContent>
                  <span className="block font-semibold">{formatCount(tooltipDay.count)}</span>
                  <span className="block opacity-80">{names.full(shown)}</span>
                </TooltipContent>
              ) : null}
            </Tooltip>
          ) : null}
        </div>
      </div>
      {showLegend ? (
        <div
          data-slot="contribution-graph-legend"
          className="flex items-center justify-end gap-1 text-muted-foreground"
        >
          <span className="me-1">{lessLabel}</span>
          {LEVELS.map((level) => (
            <span
              key={level}
              aria-hidden="true"
              className={contributionGraphCellVariants({ level })}
            />
          ))}
          <span className="ms-1">{moreLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

export { contributionGraphCellVariants };
