"use client";

import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * How much of the context window a conversation has used.
 *
 * Worth showing because running out of context is a cliff, not a slope: the
 * conversation stops behaving the way it did, and without a gauge that looks
 * like the model getting worse rather than a limit being reached.
 *
 * The numbers are the message; the bar is a summary of them. Both are present,
 * and the numbers are what a screen reader gets.
 */

export interface TokenUsageProps extends ComponentPropsWithRef<"div"> {
  /** Tokens used so far. */
  used: number;
  /** The context window. */
  limit: number;
  label?: string;
  /** Fraction of the limit past which the gauge warns. */
  warnAt?: number;
  /** Formats the numbers. Defaults to the runtime locale's grouping. */
  format?: (value: number) => string;
}

function defaultFormat(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function TokenUsage({
  className,
  used,
  limit,
  label = "Context used",
  warnAt = 0.85,
  format = defaultFormat,
  ...props
}: TokenUsageProps) {
  const fraction = limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0;
  const percent = Math.round(fraction * 100);
  const warning = fraction >= warnAt;
  const over = used > limit;

  return (
    <div
      data-slot="token-usage"
      data-warning={warning || undefined}
      data-over={over || undefined}
      className={cn("flex w-full flex-col gap-1", className)}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            "tabular-nums",
            over ? "text-destructive" : warning ? "text-warning" : "text-muted-foreground",
          )}
        >
          {format(used)} / {format(limit)}
        </span>
      </div>
      {/* The bar summarises what the numbers above already say, so it is
          decorative rather than a second progressbar to read through. */}
      <div aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
            over ? "bg-destructive" : warning ? "bg-warning" : "bg-primary",
          )}
          style={{ width: `${String(percent)}%` }}
        />
      </div>
    </div>
  );
}

export interface TokenCountProps extends ComponentPropsWithRef<"span"> {
  value: number;
  label?: string;
  format?: (value: number) => string;
}

/** A bare token count, for a message footer or a toolbar. */
export function TokenCount({
  className,
  value,
  label = "tokens",
  format = defaultFormat,
  ...props
}: TokenCountProps) {
  return (
    <span
      data-slot="token-count"
      className={cn("text-2xs text-muted-foreground tabular-nums", className)}
      {...props}
    >
      {format(value)} {label}
    </span>
  );
}
