"use client";

import {
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useMemo, useState, type ReactNode } from "react";

import {
  ActivityContent,
  ActivityDescription,
  ActivityFeed,
  ActivityIndicator,
  ActivityItem,
  ActivityTime,
  ActivityTitle,
} from "@/components/activity-feed";
import { Avatar, AvatarFallback } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { DataTable, DataTableColumnHeader, DataTablePagination } from "@/components/data-table";
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from "@/components/empty-state";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Meter, MeterLegend, type MeterSegment, type MeterTone } from "@/components/meter";
import { MetricDelta, type MetricPolarity } from "@/components/metric-delta";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { cn } from "@/lib/utils";

/**
 * A sales pipeline: what is in it, what is moving, and what happened last.
 *
 * The pipeline is drawn as one bar split by stage rather than as a funnel,
 * because a funnel is a picture of a metaphor and this is a picture of money.
 * The same figures are in a list beside it, per stage, so nobody has to read a
 * proportion off a coloured segment — the meter announces the total, and its
 * legend names every stage with its value, which is what a screen reader gets
 * instead of a bar.
 *
 * Cycle length is `lower-is-better`. A deal that took longer to close is not
 * an improvement, and a CRM that paints a slowing pipeline green is the
 * mistake this block exists to not make.
 */

export interface CrmStage {
  id: string;
  label: string;
  /** Deals currently in this stage. */
  count: number;
  /** Their combined value, as a number so the bar can be proportioned. */
  value: number;
}

export interface CrmDeal {
  id: string;
  company: string;
  contact?: string;
  /** A `CrmStage` id. */
  stage: string;
  value: number;
  owner: string;
  /** Machine-readable expected close date. */
  closeAt?: string;
  /** Human label, e.g. "14 Mar". */
  closeLabel?: string;
  /** Where the deal's own page lives. */
  href?: string;
}

export interface CrmActivity {
  id: string;
  title: string;
  detail?: string;
  /** Machine-readable timestamp. */
  at: string;
  /** Human label, e.g. "2 hours ago". */
  label: string;
  kind?: "call" | "email" | "meeting" | "note";
}

export interface CrmBlockProps {
  title?: string;
  description?: string;
  /** Open pipeline, as a number. Formatted by `formatMoney`. */
  pipelineValue: number;
  previousPipelineValue?: number;
  /** Closed-won in the period. */
  wonValue: number;
  previousWonValue?: number;
  /** Share of closed deals that were won, 0–1. */
  winRate?: number;
  previousWinRate?: number;
  /** Average days from open to close. Lower is better. */
  cycleDays?: number;
  previousCycleDays?: number;
  comparisonLabel?: string;
  /** Formats every amount. The currency is a presentation choice, so it is yours. */
  formatMoney?: (value: number) => string;
  stages: CrmStage[];
  deals: CrmDeal[];
  activity?: CrmActivity[];
  onNewDeal?: () => void;
  /** Opens a deal. When omitted, a deal with an `href` renders as a link instead. */
  onOpenDeal?: (deal: CrmDeal) => void;
  actions?: ReactNode;
  className?: string;
}

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

const defaultMoney = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function count(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Stage colours cycle through the tones, and never carry the meaning alone. */
const STAGE_TONES: MeterTone[] = ["primary", "info", "success", "warning", "neutral"];

/**
 * Stated once: cycle length is the metric whose rise is bad news, and the
 * other three are plain growth figures.
 */
const POLARITY: Record<string, MetricPolarity> = {
  pipeline: "higher-is-better",
  won: "higher-is-better",
  winRate: "higher-is-better",
  cycle: "lower-is-better",
};

const ALL_STAGES = "all";

export function CrmBlock({
  title = "Pipeline",
  description = "What is open, what closed, and what moved.",
  pipelineValue,
  previousPipelineValue,
  wonValue,
  previousWonValue,
  winRate,
  previousWinRate,
  cycleDays,
  previousCycleDays,
  comparisonLabel = "vs last period",
  formatMoney = (value) => defaultMoney.format(value),
  stages,
  deals,
  activity = [],
  onNewDeal,
  onOpenDeal,
  actions,
  className,
}: CrmBlockProps) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState(ALL_STAGES);

  const stageLabel = useMemo(
    () => new Map(stages.map((entry) => [entry.id, entry.label])),
    [stages],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return deals.filter((deal) => {
      if (stage !== ALL_STAGES && deal.stage !== stage) return false;
      if (!needle) return true;
      return (
        deal.company.toLowerCase().includes(needle) ||
        (deal.contact?.toLowerCase().includes(needle) ?? false) ||
        deal.owner.toLowerCase().includes(needle)
      );
    });
  }, [deals, query, stage]);

  const table = useTable({
    features,
    data: filtered,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [{ id: "value", desc: true }],
    },
    columns: [
      {
        accessorKey: "company",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Deal" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.original.company}</p>
            {row.original.contact ? (
              <p className="truncate text-xs text-muted-foreground">{row.original.contact}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "stage",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Stage" />,
        cell: ({ row }) => (
          <Badge size="sm" variant="secondary">
            {stageLabel.get(row.original.stage) ?? row.original.stage}
          </Badge>
        ),
      },
      {
        accessorKey: "value",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Value" />,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{formatMoney(row.original.value)}</span>
        ),
      },
      {
        accessorKey: "owner",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar size="xs">
              <AvatarFallback>{initials(row.original.owner)}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{row.original.owner}</span>
          </div>
        ),
      },
      {
        accessorKey: "closeAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Close" />,
        cell: ({ row }) =>
          row.original.closeLabel ? (
            <time dateTime={row.original.closeAt} className="text-sm text-muted-foreground">
              {row.original.closeLabel}
            </time>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        id: "open",
        // Named, though hidden: a header cell with no text is a column a screen
        // reader cannot name.
        header: () => <span className="sr-only">Open</span>,
        enableSorting: false,
        cell: ({ row }) =>
          onOpenDeal ? (
            <Button
              variant="ghost"
              size="sm"
              // Per row, so five "Open" buttons are five different buttons.
              aria-label={`Open ${row.original.company}`}
              onClick={() => {
                onOpenDeal(row.original);
              }}
            >
              Open
            </Button>
          ) : row.original.href ? (
            <Button asChild variant="ghost" size="sm">
              <a href={row.original.href} aria-label={`Open ${row.original.company}`}>
                Open
              </a>
            </Button>
          ) : null,
      },
    ],
  });

  const segments: MeterSegment[] = stages.map((entry, index) => ({
    id: entry.id,
    label: entry.label,
    value: entry.value,
    tone: STAGE_TONES[index % STAGE_TONES.length],
  }));
  const stageTotal = stages.reduce((total, entry) => total + entry.value, 0);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {onNewDeal ? <Button onClick={onNewDeal}>New deal</Button> : null}
        </div>
      </div>

      <section
        aria-label="Pipeline metrics"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Card>
          <CardContent className="pt-6">
            <MetricDelta
              label="Open pipeline"
              value={pipelineValue}
              previous={previousPipelineValue}
              polarity={POLARITY.pipeline}
              comparisonLabel={comparisonLabel}
              format={formatMoney}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <MetricDelta
              label="Closed won"
              value={wonValue}
              previous={previousWonValue}
              polarity={POLARITY.won}
              comparisonLabel={comparisonLabel}
              format={formatMoney}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {winRate === undefined ? (
              <div>
                <p className="text-sm text-muted-foreground">Win rate</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">—</p>
              </div>
            ) : (
              <MetricDelta
                label="Win rate"
                value={winRate}
                previous={previousWinRate}
                polarity={POLARITY.winRate}
                comparisonLabel={comparisonLabel}
                format={(value) => percentFormatter.format(value)}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {cycleDays === undefined ? (
              <div>
                <p className="text-sm text-muted-foreground">Sales cycle</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">—</p>
              </div>
            ) : (
              <MetricDelta
                label="Sales cycle"
                value={cycleDays}
                previous={previousCycleDays}
                polarity={POLARITY.cycle}
                comparisonLabel={comparisonLabel}
                format={(value) => `${count(Math.round(value))} days`}
              />
            )}
          </CardContent>
        </Card>
      </section>

      {stages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>By stage</h2>
            </CardTitle>
            <CardDescription>Where the open value sits.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Meter
              label="Open pipeline by stage"
              segments={segments}
              max={stageTotal || 1}
              format={formatMoney}
            >
              <MeterLegend />
            </Meter>

            {/*
              The figures, per stage, as a list anyone can read. The bar is a
              proportion; this is the number, and the number is what a rep
              actually asks for.
            */}
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {stages.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">{entry.label}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {count(entry.count)} {entry.count === 1 ? "deal" : "deals"} ·{" "}
                    <span className="text-foreground">{formatMoney(entry.value)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>Deals</h2>
            </CardTitle>
            <CardDescription>
              {count(deals.length)} open {deals.length === 1 ? "deal" : "deals"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="grid flex-1 gap-1.5 sm:max-w-xs">
                {/* A real label: a placeholder vanishes the moment anyone types. */}
                <Label htmlFor="crm-deal-filter" className="sr-only">
                  Filter by company, contact or owner
                </Label>
                <Input
                  id="crm-deal-filter"
                  inputSize="sm"
                  type="search"
                  placeholder="Filter deals…"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                  }}
                />
              </div>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger triggerSize="sm" aria-label="Stage" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STAGES}>All stages</SelectItem>
                  {stages.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtering changes the rows without the user asking, so the count
                is announced. Polite, so it waits for a pause in typing. */}
            <p aria-live="polite" className="sr-only">
              {count(filtered.length)} {filtered.length === 1 ? "deal matches" : "deals match"}{" "}
              the filter.
            </p>

            <DataTable
              table={table}
              aria-label="Open deals"
              empty={
                <EmptyState size="sm">
                  <EmptyStateTitle>No deals match</EmptyStateTitle>
                  <EmptyStateDescription>
                    Try another name, or clear the stage filter.
                  </EmptyStateDescription>
                </EmptyState>
              }
            />

            <DataTablePagination table={table} pageSizes={[10, 25, 50]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>Recent activity</h2>
            </CardTitle>
            <CardDescription>The last few touches, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState size="sm">
                <EmptyStateTitle>Nothing logged yet</EmptyStateTitle>
                <EmptyStateDescription>
                  Calls, emails and meetings will appear here as they are logged.
                </EmptyStateDescription>
              </EmptyState>
            ) : (
              <ActivityFeed>
                {activity.map((entry, index) => (
                  <ActivityItem key={entry.id} last={index === activity.length - 1}>
                    <ActivityIndicator />
                    <ActivityContent>
                      <ActivityTitle className="flex flex-wrap items-center gap-2">
                        {entry.title}
                        {entry.kind ? (
                          <Badge size="sm" variant="outline">
                            {entry.kind}
                          </Badge>
                        ) : null}
                      </ActivityTitle>
                      {entry.detail ? (
                        <ActivityDescription>{entry.detail}</ActivityDescription>
                      ) : null}
                      <ActivityTime dateTime={entry.at}>{entry.label}</ActivityTime>
                    </ActivityContent>
                  </ActivityItem>
                ))}
              </ActivityFeed>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
