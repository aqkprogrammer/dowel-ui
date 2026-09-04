"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { MetricDelta, type MetricPolarity } from "@/components/metric-delta";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { cn } from "@/lib/utils";

/**
 * An analytics page: headline metrics, a series over time, and what made it up.
 *
 * The series is the part everyone gets wrong. A chart is a picture, and a
 * picture of numbers is unreadable to anyone using a screen reader, unusable to
 * anyone who needs the exact figure, and worthless to anyone who cannot make
 * out a five-pixel bar. So the bars here are explicitly a picture — hidden from
 * the accessibility tree, summarised in one sentence for anyone who only wants
 * the shape — and the same numbers are available as a real table, to everyone,
 * from a control that is part of the page rather than an accessibility
 * afterthought.
 */

export interface AnalyticsPoint {
  /** Machine-readable date or timestamp. */
  at: string;
  /** Human label for the axis, e.g. "Mon", "3 Mar". */
  label: string;
  value: number;
}

export interface AnalyticsMetric {
  id: string;
  label: string;
  value: number;
  /** The figure being compared against. Omit when there is nothing to compare. */
  previous?: number;
  polarity?: MetricPolarity;
  comparisonLabel?: string;
  format?: (value: number) => string;
}

export interface AnalyticsBreakdownRow {
  id: string;
  label: string;
  value: number;
  /** Share of the total, 0–1. Computed from the rows when omitted. */
  share?: number;
}

export interface AnalyticsRange {
  id: string;
  label: string;
}

export interface AnalyticsBlockProps {
  title?: string;
  description?: string;
  metrics: AnalyticsMetric[];
  /** The series shown as bars. */
  series?: AnalyticsPoint[];
  seriesLabel?: string;
  seriesFormat?: (value: number) => string;
  breakdown?: AnalyticsBreakdownRow[];
  breakdownTitle?: string;
  breakdownColumn?: string;
  ranges?: AnalyticsRange[];
  range?: string;
  onRangeChange?: (range: string) => void;
  actions?: ReactNode;
  className?: string;
}

function defaultFormat(value: number): string {
  return new Intl.NumberFormat().format(value);
}

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

/**
 * One sentence describing the shape of a series.
 *
 * What someone glancing at a chart actually takes from it: where it started,
 * where it ended, and where the extremes were. Reading forty bars aloud is not
 * a summary, and it is what a naive `aria-label` per bar produces.
 */
export function describeSeries(
  points: AnalyticsPoint[],
  label: string,
  format: (value: number) => string = defaultFormat,
): string {
  if (points.length === 0) return `${label}: no data.`;

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const peak = points.reduce((best, point) => (point.value > best.value ? point : best), first);
  const trough = points.reduce(
    (worst, point) => (point.value < worst.value ? point : worst),
    first,
  );

  const span =
    points.length === 1
      ? `a single point at ${first.label}`
      : `${String(points.length)} points from ${first.label} to ${last.label}`;

  const direction =
    last.value === first.value
      ? "ending where it started"
      : `${last.value > first.value ? "rising" : "falling"} from ${format(first.value)} to ${format(last.value)}`;

  const extremes =
    peak.label === trough.label
      ? ""
      : ` Highest ${format(peak.value)} at ${peak.label}, lowest ${format(trough.value)} at ${trough.label}.`;

  return `${label}: ${span}, ${direction}.${extremes}`;
}

export function AnalyticsBlock({
  title = "Analytics",
  description = "How the last period went.",
  metrics,
  series = [],
  seriesLabel = "Visitors",
  seriesFormat = defaultFormat,
  breakdown = [],
  breakdownTitle = "Top sources",
  breakdownColumn = "Source",
  ranges = [],
  range,
  onRangeChange,
  actions,
  className,
}: AnalyticsBlockProps) {
  const [showData, setShowData] = useState(false);
  const tableId = useId();

  const peak = series.reduce((highest, point) => Math.max(highest, point.value), 0);
  const summary = describeSeries(series, seriesLabel, seriesFormat);

  const breakdownTotal = breakdown.reduce((total, row) => total + row.value, 0);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ranges.length > 0 ? (
            /*
              A select, not a tab set.

              Tabs promise panels: every tab carries `aria-controls` pointing at
              a `tabpanel`, and a range selector has none — it changes the data
              behind the whole page. Styling tabs as a segmented control here
              produced exactly that, a tab referring to a panel that does not
              exist, which axe fails as a critical violation. Choosing one of
              several values is what a select is.
            */
            <Select value={range} onValueChange={onRangeChange}>
              <SelectTrigger aria-label="Date range" className="w-40">
                <SelectValue placeholder="Select a range" />
              </SelectTrigger>
              <SelectContent>
                {ranges.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {actions}
        </div>
      </div>

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.id}>
            <CardContent className="pt-6">
              <MetricDelta
                label={metric.label}
                value={metric.value}
                previous={metric.previous}
                polarity={metric.polarity}
                comparisonLabel={metric.comparisonLabel}
                format={metric.format}
              />
            </CardContent>
          </Card>
        ))}
      </section>

      {series.length > 0 ? (
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle asChild>
                <h2>{seriesLabel} over time</h2>
              </CardTitle>
              <CardDescription>{summary}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-expanded={showData}
              aria-controls={tableId}
              onClick={() => {
                setShowData((previous) => !previous);
              }}
            >
              {showData ? "Hide data" : "Show data"}
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/*
              A picture, and labelled as one. `role="img"` with a single
              summarising name stops a screen reader walking forty individual
              bars, which is noise rather than information — the exact numbers
              are in the table below, which is the right shape for them.
            */}
            <div role="img" aria-label={summary} className="flex h-40 items-end gap-1">
              {series.map((point) => (
                <div
                  key={point.at}
                  className="flex min-w-0 flex-1 flex-col justify-end"
                  title={`${point.label}: ${seriesFormat(point.value)}`}
                >
                  <div
                    className={cn(
                      "rounded-t-sm bg-primary/80",
                      "transition-[height] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
                    )}
                    // A zero-height bar is indistinguishable from a missing
                    // one, so every bar keeps a floor of a couple of pixels.
                    style={{
                      height:
                        peak === 0
                          ? "2px"
                          : `${String(Math.max(2, (point.value / peak) * 100))}%`,
                    }}
                  />
                </div>
              ))}
            </div>

            <div aria-hidden className="flex gap-1 text-xs text-muted-foreground">
              {series.map((point) => (
                <span key={point.at} className="min-w-0 flex-1 truncate text-center">
                  {point.label}
                </span>
              ))}
            </div>

            {/*
              Not `hidden` from assistive technology when collapsed — it is
              collapsed for everyone, and revealed for everyone. An
              "accessible" copy that only screen readers can reach is a second
              class of content, and it is the copy that goes stale.
            */}
            <div id={tableId} hidden={!showData}>
              <Table>
                <TableCaption>{seriesLabel} for each point in the selected range</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Period</TableHead>
                    <TableHead scope="col" className="text-end">
                      {seriesLabel}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {series.map((point) => (
                    <TableRow key={point.at}>
                      <TableHead scope="row" className="font-normal text-foreground">
                        <time dateTime={point.at}>{point.label}</time>
                      </TableHead>
                      <TableCell className="text-end tabular-nums">
                        {seriesFormat(point.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {breakdown.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>{breakdownTitle}</h2>
            </CardTitle>
            <CardDescription>What made up the total.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{breakdownColumn}</TableHead>
                  <TableHead scope="col" className="text-end">
                    Visits
                  </TableHead>
                  <TableHead scope="col" className="text-end">
                    Share
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((row) => {
                  const share =
                    row.share ?? (breakdownTotal === 0 ? 0 : row.value / breakdownTotal);

                  return (
                    <TableRow key={row.id}>
                      <TableHead scope="row" className="font-normal text-foreground">
                        {row.label}
                      </TableHead>
                      <TableCell className="text-end tabular-nums">
                        {defaultFormat(row.value)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {percentFormatter.format(share)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
