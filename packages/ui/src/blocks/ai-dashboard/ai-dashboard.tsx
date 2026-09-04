"use client";

import type { ReactNode } from "react";

import { AgentStatus, type AgentState } from "@/components/ai-agent-status";
import { TokenCount } from "@/components/ai-token-usage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from "@/components/empty-state";
import { MetricDelta, type MetricPolarity } from "@/components/metric-delta";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { cn } from "@/lib/utils";

/**
 * What the AI features cost and whether they worked.
 *
 * The counterpart to a single agent console: this is the fleet, and the
 * questions are different — which model is eating the budget, what proportion
 * of runs failed, and which runs are still going.
 *
 * Cost and failure rate are `lower-is-better`, which sounds obvious and is the
 * thing most dashboards get wrong: a spend chart that turns green when it rises
 * is congratulating you on a bill.
 */

export interface AiModelUsage {
  id: string;
  /** The model, as billed. */
  model: string;
  runs: number;
  tokens: number;
  /** Formatted cost, because the currency is a presentation choice. */
  cost: string;
  /** Raw cost, used only to total the column. */
  costValue?: number;
}

export interface AiRunSummary {
  id: string;
  title: string;
  state: AgentState;
  model?: string;
  tokens?: number;
  /** Machine-readable start time. */
  at?: string;
  /** Human label, e.g. "4 minutes ago". */
  label?: string;
  /** Where the run's own console lives. */
  href?: string;
}

export interface AiDashboardBlockProps {
  title?: string;
  description?: string;
  /** Tokens consumed in the period. */
  tokens: number;
  previousTokens?: number;
  /** Formatted spend for the period. */
  spend: string;
  /** Raw spend, so the change can be computed. */
  spendValue?: number;
  previousSpendValue?: number;
  runs: number;
  previousRuns?: number;
  /** Share of runs that failed, 0–1. */
  failureRate?: number;
  previousFailureRate?: number;
  comparisonLabel?: string;
  models?: AiModelUsage[];
  recentRuns?: AiRunSummary[];
  actions?: ReactNode;
  className?: string;
}

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

const compact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

function count(value: number): string {
  return new Intl.NumberFormat().format(value);
}

/**
 * Cost and failure rate get `lower-is-better`.
 *
 * Stated once, here, rather than at four call sites: the polarity is a fact
 * about the metric, and a dashboard that paints a rising bill green is the
 * failure this exists to avoid.
 */
const POLARITY: Record<string, MetricPolarity> = {
  spend: "lower-is-better",
  failures: "lower-is-better",
  tokens: "neutral",
  runs: "neutral",
};

export function AiDashboardBlock({
  title = "AI usage",
  description = "What the model calls cost, and whether they worked.",
  tokens,
  previousTokens,
  spend,
  spendValue,
  previousSpendValue,
  runs,
  previousRuns,
  failureRate,
  previousFailureRate,
  comparisonLabel = "vs last period",
  models = [],
  recentRuns = [],
  actions,
  className,
}: AiDashboardBlockProps) {
  const totalRuns = models.reduce((total, model) => total + model.runs, 0);
  const totalTokens = models.reduce((total, model) => total + model.tokens, 0);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions}
      </div>

      <section aria-label="Usage and cost" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <MetricDelta
              label="Tokens"
              value={tokens}
              previous={previousTokens}
              polarity={POLARITY.tokens}
              comparisonLabel={comparisonLabel}
              format={(value) => compact.format(value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {spendValue === undefined ? (
              <div>
                <p className="text-sm text-muted-foreground">Spend</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {spend}
                </p>
              </div>
            ) : (
              <MetricDelta
                label="Spend"
                value={spendValue}
                previous={previousSpendValue}
                polarity={POLARITY.spend}
                comparisonLabel={comparisonLabel}
                format={() => spend}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <MetricDelta
              label="Runs"
              value={runs}
              previous={previousRuns}
              polarity={POLARITY.runs}
              comparisonLabel={comparisonLabel}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {failureRate === undefined ? (
              <div>
                <p className="text-sm text-muted-foreground">Failure rate</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">—</p>
              </div>
            ) : (
              <MetricDelta
                label="Failure rate"
                value={failureRate}
                previous={previousFailureRate}
                polarity={POLARITY.failures}
                comparisonLabel={comparisonLabel}
                format={(value) => percentFormatter.format(value)}
              />
            )}
          </CardContent>
        </Card>
      </section>

      {models.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>By model</h2>
            </CardTitle>
            <CardDescription>Where the tokens and the money went.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Model</TableHead>
                  <TableHead scope="col" className="text-right">
                    Runs
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Tokens
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Cost
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableHead scope="row" className="font-normal text-foreground">
                      {model.model}
                    </TableHead>
                    <TableCell className="text-right tabular-nums">
                      {count(model.runs)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {count(model.tokens)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{model.cost}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {/*
                A real tfoot, not a last row that looks like one. A totals row
                inside the body is announced as another model, and there is no
                model called "Total".
              */}
              <TableFooter>
                <TableRow>
                  <TableHead scope="row">Total</TableHead>
                  <TableCell className="text-right tabular-nums">{count(totalRuns)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {count(totalTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{spend}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>Recent runs</h2>
          </CardTitle>
          <CardDescription>The last few, and where each one got to.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <EmptyState>
              <EmptyStateTitle>No runs yet</EmptyStateTitle>
              <EmptyStateDescription>
                Runs will appear here as soon as something calls a model.
              </EmptyStateDescription>
            </EmptyState>
          ) : (
            <ul className="grid gap-2">
              {recentRuns.map((run) => (
                <li
                  key={run.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {run.href ? (
                        <a
                          href={run.href}
                          className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/55"
                        >
                          {run.title}
                        </a>
                      ) : (
                        run.title
                      )}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {run.model ? <span>{run.model}</span> : null}
                      {run.label ? <time dateTime={run.at}>{run.label}</time> : null}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {run.tokens === undefined ? null : <TokenCount value={run.tokens} />}
                    {/*
                      Not live. Several runs each announcing their own
                      transitions turns a list into a stream of interruptions;
                      the one run being watched is the console's job.
                    */}
                    <AgentStatus state={run.state} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
