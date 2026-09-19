"use client";

// Motion from SmoothUI AI Context Meter (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { focusRing } from "@/lib/styles";
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

export interface TokenUsageBreakdownItem {
  label: string;
  tokens: number;
}

/** How numbers are written when no `format` is given. */
export type TokenNotation = "standard" | "compact";

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
  /**
   * `bar` is a labelled bar. `ring` is a compact inline gauge for toolbars: it
   * changes hue as it fills, never size, since growth would read as health.
   */
  variant?: "bar" | "ring";
  /**
   * Number style when `format` is not given. `compact` writes 48000 as "48K".
   * Defaults to `standard`, or to `compact` in the ring variant.
   */
  notation?: TokenNotation;
  /** Fraction past which the gauge reads as critical, before the limit itself. */
  dangerAt?: number;
  /**
   * What is filling the window. Listed under the bar; in the ring variant, in
   * a popover from the gauge.
   */
  breakdown?: TokenUsageBreakdownItem[];
}

function defaultFormat(value: number): string {
  return new Intl.NumberFormat().format(value);
}

const compactFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Compact token counts, locale-aware: 1800 → "1.8K", 48000 → "48K",
 * 1500000 → "1.5M". Below two integer digits it keeps one decimal, so 1,800
 * is never rounded to a misleading "2K".
 */
export function formatTokensCompact(value: number, locales?: Intl.LocalesArgument): string {
  const key = JSON.stringify(locales ?? null);
  let formatter = compactFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locales, { notation: "compact" });
    compactFormatters.set(key, formatter);
  }
  return formatter.format(value);
}

function formatterFor(
  format: ((value: number) => string) | undefined,
  notation: TokenNotation,
): (value: number) => string {
  if (format) return format;
  return notation === "compact" ? (value) => formatTokensCompact(value) : defaultFormat;
}

export function TokenUsage({
  className,
  used,
  limit,
  label = "Context used",
  warnAt = 0.85,
  format,
  variant = "bar",
  notation,
  dangerAt,
  breakdown,
  ...props
}: TokenUsageProps) {
  const fraction = limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0;
  const percent = Math.round(fraction * 100);
  const warning = fraction >= warnAt;
  const over = used > limit;
  const danger = !over && dangerAt !== undefined && fraction >= dangerAt;
  const critical = over || danger;
  const show = formatterFor(format, notation ?? (variant === "ring" ? "compact" : "standard"));
  const tone = critical
    ? "text-destructive"
    : warning
      ? "text-warning"
      : "text-muted-foreground";

  const state = {
    "data-warning": warning || undefined,
    "data-over": over || undefined,
    "data-danger": danger || undefined,
  };

  if (variant === "ring") {
    return (
      <div
        data-slot="token-usage"
        data-variant="ring"
        {...state}
        className={cn("inline-flex items-center gap-1.5 text-xs", className)}
        {...props}
      >
        <TokenRing
          fraction={fraction}
          tone={tone}
          stroke={
            critical ? "stroke-destructive" : warning ? "stroke-warning" : "stroke-primary"
          }
          text={`${show(used)}/${show(limit)}`}
          // Full figures for assistive technology: never abbreviated.
          sentence={
            `${label}: ${defaultFormat(used)} of ${defaultFormat(limit)} tokens, ${String(percent)}%` +
            (over ? ", over the limit" : danger ? ", nearly full" : "")
          }
          breakdown={breakdown}
          format={format ?? defaultFormat}
        />
      </div>
    );
  }

  return (
    <div
      data-slot="token-usage"
      {...state}
      className={cn("flex w-full flex-col gap-1", className)}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("tabular-nums", tone)}>
          {show(used)} / {show(limit)}
        </span>
      </div>
      {/* The bar summarises what the numbers above already say, so it is
          decorative rather than a second progressbar to read through. */}
      <div aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
            critical ? "bg-destructive" : warning ? "bg-warning" : "bg-primary",
          )}
          style={{ width: `${String(percent)}%` }}
        />
      </div>
      {breakdown && breakdown.length > 0 ? (
        <TokenUsageBreakdown
          items={breakdown}
          format={format ?? defaultFormat}
          className="mt-1"
        />
      ) : null}
    </div>
  );
}

/** Close grace for a hover-opened breakdown, so the pointer can cross the gap. */
const HOVER_CLOSE_DELAY = 120;

function TokenRing({
  fraction,
  tone,
  stroke,
  text,
  sentence,
  breakdown,
  format,
}: {
  fraction: number;
  tone: string;
  stroke: string;
  text: string;
  sentence: string;
  breakdown?: TokenUsageBreakdownItem[];
  format: (value: number) => string;
}) {
  const [open, setOpen] = useState(false);
  // Opened by a mouse hovering, rather than by a click or a key.
  const [hovered, setHovered] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  function hoverIn(event: ReactPointerEvent) {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    if (!open) {
      setHovered(true);
      setOpen(true);
    }
  }

  function hoverOut(event: ReactPointerEvent) {
    if (event.pointerType !== "mouse" || !hovered) return;
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setHovered(false);
    }, HOVER_CLOSE_DELAY);
  }

  // Geometry never changes with state: only the arc's length and hue do.
  const gauge: ReactNode = (
    <>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="size-4 shrink-0 -rotate-90 text-muted-foreground"
      >
        <circle cx="16" cy="16" r="13" strokeWidth="3" className="stroke-current opacity-20" />
        <circle
          data-part="arc"
          cx="16"
          cy="16"
          r="13"
          strokeWidth="3"
          pathLength={1}
          strokeLinecap={fraction > 0 ? "round" : "butt"}
          className={cn(
            "transition-[stroke-dasharray,stroke] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
            stroke,
          )}
          style={{ strokeDasharray: `${String(fraction)} ${String(1 - fraction)}` }}
        />
      </svg>
      <span aria-hidden="true" className={cn("tabular-nums", tone)}>
        {text}
      </span>
      <span className="sr-only">{sentence}</span>
    </>
  );

  if (!breakdown || breakdown.length === 0) return gauge;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        cancelClose();
        setHovered(false);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="token-usage-trigger"
          onPointerEnter={hoverIn}
          onPointerLeave={hoverOut}
          onClick={(event) => {
            // A click on a hover-opened breakdown pins it rather than closing
            // it — otherwise the first click a mouse user makes does nothing.
            if (open && hovered) {
              event.preventDefault();
              cancelClose();
              setHovered(false);
            }
          }}
          className={cn("inline-flex items-center gap-1.5 rounded-md", focusRing)}
        >
          {gauge}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        aria-label="Context breakdown"
        className="w-56 p-2.5"
        onPointerEnter={hoverIn}
        onPointerLeave={hoverOut}
        onOpenAutoFocus={(event) => {
          // Hovering never moves focus.
          if (hovered) event.preventDefault();
        }}
      >
        <TokenUsageBreakdown items={breakdown} format={format} />
      </PopoverContent>
    </Popover>
  );
}

export interface TokenUsageBreakdownProps extends ComponentPropsWithRef<"dl"> {
  items: TokenUsageBreakdownItem[];
  format?: (value: number) => string;
}

/** What is filling the window, as a description list of label and count. */
export function TokenUsageBreakdown({
  className,
  items,
  format = defaultFormat,
  ...props
}: TokenUsageBreakdownProps) {
  return (
    <dl
      data-slot="token-usage-breakdown"
      className={cn("flex flex-col gap-1 text-xs", className)}
      {...props}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-foreground tabular-nums">{format(item.tokens)}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface TokenCountProps extends ComponentPropsWithRef<"span"> {
  value: number;
  label?: string;
  format?: (value: number) => string;
  /** Number style when `format` is not given. */
  notation?: TokenNotation;
}

/** A bare token count, for a message footer or a toolbar. */
export function TokenCount({
  className,
  value,
  label = "tokens",
  format,
  notation = "standard",
  ...props
}: TokenCountProps) {
  return (
    <span
      data-slot="token-count"
      className={cn("text-2xs text-muted-foreground tabular-nums", className)}
      {...props}
    >
      {formatterFor(format, notation)(value)} {label}
    </span>
  );
}
