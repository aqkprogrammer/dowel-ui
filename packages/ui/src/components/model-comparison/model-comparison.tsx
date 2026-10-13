"use client";

// Original design.
import type { ComponentPropsWithRef, ReactNode } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Models side by side: price, speed, context, scores — the table people read
 * before picking one.
 *
 * A real <table>, with a caption, column headers for models and row headers
 * for metrics, so a screen reader names every cell by its model and metric.
 * The metric column stays put while the models scroll sideways on a narrow
 * screen. In each row the best value — highest or lowest, per the metric — is
 * marked with the word "Best", not colour alone; ties are all marked. With
 * `onSelect`, each model's header gets a toggle to choose it, and the chosen
 * column is tinted.
 */

export type ModelValue = number | string | boolean | null | undefined;

export interface ModelComparisonModel {
  id: string;
  name: string;
  /** A second line under the name: the provider, a version. */
  provider?: string;
  /** Something before the name — a logo or an icon. Decorative. */
  icon?: ReactNode;
  /** Each metric's value, by metric id. */
  values: Record<string, ModelValue>;
}

export interface ModelComparisonMetric {
  id: string;
  label: string;
  /** A line under the label: what it measures, its unit. */
  description?: string;
  /** Which way is better, for marking the best. Default "none". */
  better?: "higher" | "lower" | "none";
  /** How to show a value. Defaults to a locale-formatted number. */
  format?: (value: number) => string;
}

/** The ids of the models with the best value for a metric. Ties are all best; no winner when fewer than two compare. */
export function bestModels(
  models: readonly ModelComparisonModel[],
  metric: Pick<ModelComparisonMetric, "id" | "better">,
): Set<string> {
  const better = metric.better ?? "none";
  if (better === "none") return new Set();
  const scored = models.flatMap((model) => {
    const value = model.values[metric.id];
    return typeof value === "number" && Number.isFinite(value) ? [{ id: model.id, value }] : [];
  });
  if (scored.length < 2) return new Set();
  const target =
    better === "higher"
      ? Math.max(...scored.map((s) => s.value))
      : Math.min(...scored.map((s) => s.value));
  if (scored.every((s) => s.value === target)) return new Set();
  return new Set(scored.filter((s) => s.value === target).map((s) => s.id));
}

export interface ModelComparisonLabels {
  metric: string;
  best: string;
  yes: string;
  no: string;
  missing: string;
  choose: string;
  chosen: string;
}

const defaultLabels: ModelComparisonLabels = {
  metric: "Metric",
  best: "Best",
  yes: "Yes",
  no: "No",
  missing: "Not available",
  choose: "Choose",
  chosen: "Chosen",
};

export interface ModelComparisonProps extends Omit<ComponentPropsWithRef<"div">, "onSelect"> {
  models: readonly ModelComparisonModel[];
  metrics: readonly ModelComparisonMetric[];
  /** The table's caption. */
  label: string;
  hideLabel?: boolean;
  /** Mark the best value in each row. Default true. */
  highlightBest?: boolean;
  /** Give each model a toggle to choose it. */
  onSelect?: (id: string) => void;
  /** The chosen model. */
  selected?: string;
  /** Words, for other languages. */
  labels?: Partial<ModelComparisonLabels>;
  /** Locale for number formatting. */
  locale?: string;
}

/** Models compared metric by metric in a table, with the best of each row marked. */
export function ModelComparison({
  models,
  metrics,
  label,
  hideLabel = false,
  highlightBest = true,
  onSelect,
  selected,
  labels,
  locale,
  className,
  ...props
}: ModelComparisonProps) {
  const words = { ...defaultLabels, ...labels };
  const numbers = new Intl.NumberFormat(locale);
  const tint = (id: string) => selected === id && "bg-primary/5";

  const show = (metric: ModelComparisonMetric, value: ModelValue): ReactNode => {
    if (value === null || value === undefined || value === "") {
      return (
        <>
          <span aria-hidden="true" className="text-muted-foreground">
            —
          </span>
          <span className="sr-only">{words.missing}</span>
        </>
      );
    }
    if (typeof value === "boolean") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5",
            value ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn("size-3.5", value && "text-success")}
          >
            {value ? <path d="m5 12 5 5 9-10" /> : <path d="M6 12h12" />}
          </svg>
          {value ? words.yes : words.no}
        </span>
      );
    }
    if (typeof value === "number")
      return metric.format ? metric.format(value) : numbers.format(value);
    return value;
  };

  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      data-slot="model-comparison"
      className={cn(
        "max-w-full overflow-x-auto rounded-xl border border-border bg-card text-card-foreground",
        focusRing,
        className,
      )}
      {...props}
    >
      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption
          className={cn(
            "px-4 pt-4 pb-2 text-start font-medium text-foreground",
            hideLabel && "sr-only",
          )}
        >
          {/* Sticky, so the caption stays in view while the models scroll sideways. */}
          <span className="sticky start-4">{label}</span>
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky start-0 z-10 border-e border-b border-border bg-card px-4 py-3 text-start text-xs font-medium text-muted-foreground"
            >
              {words.metric}
            </th>
            {models.map((model) => (
              <th
                key={model.id}
                scope="col"
                data-selected={selected === model.id || undefined}
                className={cn(
                  "min-w-36 border-b border-border px-4 py-3 text-start align-bottom font-medium",
                  tint(model.id),
                )}
              >
                <span className="flex items-center gap-2">
                  {model.icon ? (
                    <span aria-hidden="true" className="shrink-0 [&_svg]:size-4">
                      {model.icon}
                    </span>
                  ) : null}
                  <span className="flex flex-col">
                    <span className="text-foreground">{model.name}</span>
                    {model.provider ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {model.provider}
                      </span>
                    ) : null}
                  </span>
                </span>
                {onSelect ? (
                  <button
                    type="button"
                    aria-pressed={selected === model.id}
                    aria-label={`${selected === model.id ? words.chosen : words.choose}: ${model.name}`}
                    className={cn(
                      "mt-2 inline-flex h-7 items-center rounded-md border border-input px-2.5 text-xs font-medium transition-colors hover:bg-accent",
                      "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground",
                      focusRing,
                    )}
                    onClick={() => {
                      onSelect(model.id);
                    }}
                  >
                    {selected === model.id ? words.chosen : words.choose}
                  </button>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, row) => {
            const best = highlightBest ? bestModels(models, metric) : new Set<string>();
            const last = row === metrics.length - 1;
            return (
              <tr key={metric.id} data-slot="model-comparison-row">
                <th
                  scope="row"
                  className={cn(
                    "sticky start-0 z-10 border-e border-border bg-card px-4 py-3 text-start font-normal",
                    !last && "border-b border-border",
                  )}
                >
                  <span className="block text-foreground">{metric.label}</span>
                  {metric.description ? (
                    <span className="block text-xs text-muted-foreground">
                      {metric.description}
                    </span>
                  ) : null}
                </th>
                {models.map((model) => {
                  const isBest = best.has(model.id);
                  return (
                    <td
                      key={model.id}
                      data-best={isBest || undefined}
                      className={cn(
                        "px-4 py-3 tabular-nums",
                        !last && "border-b border-border",
                        tint(model.id),
                        isBest && "font-semibold",
                      )}
                    >
                      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                        {show(metric, model.values[metric.id])}
                        {isBest ? (
                          <span
                            data-slot="model-comparison-best"
                            className="rounded-full bg-success/15 px-1.5 py-0.5 text-[0.6875rem] leading-none font-medium text-success"
                          >
                            {words.best}
                          </span>
                        ) : null}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
