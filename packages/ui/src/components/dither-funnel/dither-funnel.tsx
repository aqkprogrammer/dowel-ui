"use client";

// Ported from amicro "Conversion Funnel" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, useState, type ComponentPropsWithRef } from "react";

import {
  createSprings,
  DitherCanvas,
  ditherFill,
  DitherTable,
  drift,
  formatDitherValue,
  hash2,
  makePath,
  seriesColor,
  traceRoundedRect,
  type DitherDraw,
} from "@/components/dither-canvas";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A conversion funnel drawn in dithered cells: one bar per stage, its length
 * the stage's value against the first (or `max`), stepping down amicro's
 * monochrome ramp. Lengths are springs in the engine, so a new period morphs.
 *
 * Every stage is a button laid over its bar, showing the stage name and its
 * conversion, named with the full breakdown — value, share of the first stage,
 * step conversion from the previous and how many dropped. Hover or focus
 * lights the stage and fills the readout; pressing pins it. Bars grow from the
 * start edge in LTR in every direction: the canvas does not mirror.
 */

export const ditherFunnelVariants = cva("flex flex-col gap-2", {
  variants: {
    size: {
      sm: "[--dither-funnel-height:7rem]",
      md: "[--dither-funnel-height:10rem]",
      lg: "[--dither-funnel-height:14rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface DitherFunnelStage {
  label: string;
  value: number;
  /** Colour token or CSS colour expression. Defaults to the palette. */
  color?: string;
}

export interface DitherFunnelProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof ditherFunnelVariants> {
  stages: readonly DitherFunnelStage[];
  /** What the funnel shows. Names the image, the stages and the data table. */
  label: string;
  /** Replaces the generated summary in the image's accessible name. */
  description?: string;
  /** Value of a full-length bar. Defaults to the largest stage. */
  max?: number;
  formatValue?: (value: number) => string;
  /** Formats a 0..1 share. Defaults to a whole percentage. */
  formatPercent?: (share: number) => string;
  /** Show the data table. It is always present for assistive technology. */
  showTable?: boolean;
  animate?: boolean;
  cell?: number;
  /** The pinned stage (controlled); null pins none. */
  activeStage?: number | null;
  defaultActiveStage?: number | null;
  onActiveStageChange?: (index: number | null) => void;
  /** Data table headers. */
  categoryLabel?: string;
  valueLabel?: string;
  conversionLabel?: string;
  stepLabel?: string;
}

/** Gap between stage bars in CSS pixels, shared by the canvas and the buttons. */
export const FUNNEL_GAP = 6;

export interface FunnelConversion {
  /** Share of the first stage, 0..1. */
  overall: number;
  /** Share of the previous stage, 0..1 (1 for the first). */
  step: number;
  /** How many the previous stage lost on the way here (0 for the first). */
  dropped: number;
}

const clean = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

/** Overall and step conversion for each stage. */
export function funnelConversions(stages: readonly DitherFunnelStage[]): FunnelConversion[] {
  const first = clean(stages[0]?.value ?? 0);
  return stages.map((stage, i) => {
    const value = clean(stage.value);
    const previous = i === 0 ? value : clean(stages[i - 1]?.value ?? 0);
    return {
      overall: first > 0 ? value / first : 0,
      step: previous > 0 ? value / previous : 0,
      dropped: i === 0 ? 0 : Math.max(0, previous - value),
    };
  });
}

const wholePercent = (share: number) => `${String(Math.round(share * 100))}%`;

export function DitherFunnel({
  stages,
  label,
  description,
  max,
  size,
  formatValue = formatDitherValue,
  formatPercent = wholePercent,
  showTable = false,
  animate = true,
  cell = 3,
  activeStage,
  defaultActiveStage = null,
  onActiveStageChange,
  categoryLabel = "Stage",
  valueLabel = "Value",
  conversionLabel = "Conversion",
  stepLabel = "Step conversion",
  className,
  ...props
}: DitherFunnelProps) {
  const [uncontrolled, setUncontrolled] = useState<number | null>(defaultActiveStage);
  const [preview, setPreview] = useState<number | null>(null);
  const pinned = activeStage !== undefined ? activeStage : uncontrolled;
  const lit = preview ?? pinned;
  const values = stages.map((stage) => clean(stage.value));
  const top = max ?? Math.max(0, ...values);
  const fractions = values.map((value) => (top > 0 ? Math.min(1, value / top) : 0));
  const conversions = funnelConversions(stages);
  const bars = useRef(createSprings(fractions.map(() => 0)));

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time } = frame;
    bars.current.set(fractions);
    const moving = bars.current.step(frame.delta, frame.reducedMotion);
    const current = bars.current.values;
    const count = current.length;
    if (count === 0) return moving;
    const rowHeight = (height - FUNNEL_GAP * (count - 1)) / count;
    if (rowHeight <= 0) return moving;
    current.forEach((fraction, i) => {
      const barWidth = Math.max(0, Math.min(1, fraction)) * width;
      if (barWidth < 1) return;
      const y = i * (rowHeight + FUNNEL_GAP);
      ditherFill(ctx, {
        clip: makePath((sink) => {
          traceRoundedRect(sink, 0, y, barWidth, rowHeight, 4);
        }),
        bounds: { x: 0, y, width: barWidth, height: rowHeight },
        cell: frame.cell,
        color: frame.color(seriesColor(i, stages[i]?.color)),
        alpha: lit !== null && lit !== i ? 0.3 : 0.85,
        density: (cx, cy) =>
          (0.35 + 0.35 * drift(cx, cy, time * 1.2)) * (0.8 + 0.4 * hash2(cx, cy)) +
          (lit === i ? 0.15 : 0),
      });
    });
    return moving;
  };

  const pin = (index: number) => {
    const next = pinned === index ? null : index;
    if (activeStage === undefined) setUncontrolled(next);
    onActiveStageChange?.(next);
  };

  const first = stages[0];
  const breakdown = (i: number) => {
    const stage = stages[i];
    const conversion = conversions[i];
    if (!stage || !conversion) return "";
    const head = `${stage.label}: ${formatValue(values[i] ?? 0)}`;
    if (i === 0) return head;
    const previous = stages[i - 1]?.label ?? "";
    return (
      `${head}, ${formatPercent(conversion.overall)} of ${first?.label ?? ""}, ` +
      `${formatPercent(conversion.step)} from ${previous}, ${formatValue(conversion.dropped)} dropped`
    );
  };
  const summary =
    description ??
    (stages.length === 0
      ? "No data."
      : `${String(stages.length)} stages. ${stages.map((_, i) => breakdown(i)).join("; ")}.`);

  return (
    <div
      data-slot="dither-funnel"
      {...props}
      className={cn(ditherFunnelVariants({ size }), className)}
    >
      <div
        data-slot="dither-funnel-plot"
        className="relative h-[var(--dither-funnel-height)]"
        style={{ direction: "ltr" }}
      >
        <div role="img" aria-label={`${label}: ${summary}`} className="size-full">
          <DitherCanvas draw={draw} animate={animate} cell={cell} />
        </div>
        <ul
          aria-label={label}
          className="absolute inset-0 flex flex-col"
          style={{ gap: `${String(FUNNEL_GAP)}px` }}
        >
          {stages.map((stage, i) => (
            <li key={`${stage.label}-${String(i)}`} className="flex min-h-0 flex-1">
              <button
                type="button"
                aria-pressed={pinned === i}
                aria-label={breakdown(i)}
                data-active={lit === i || undefined}
                className={cn(
                  "flex flex-1 items-center justify-between gap-2 rounded-md px-1.5 text-xs font-medium",
                  focusRing,
                )}
                onPointerEnter={() => {
                  setPreview(i);
                }}
                onPointerLeave={() => {
                  setPreview(null);
                }}
                onFocus={() => {
                  setPreview(i);
                }}
                onBlur={() => {
                  setPreview(null);
                }}
                onClick={() => {
                  pin(i);
                }}
              >
                <span className="truncate rounded-sm bg-background/80 px-1 text-foreground">
                  {stage.label}
                </span>
                <span className="rounded-sm bg-background/80 px-1 text-muted-foreground tabular-nums">
                  {formatPercent(conversions[i]?.overall ?? 0)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p
        data-slot="dither-funnel-readout"
        className="min-h-4 text-xs text-muted-foreground tabular-nums"
      >
        {lit !== null && stages[lit] ? breakdown(lit) : null}
      </p>
      <DitherTable
        caption={label}
        columns={[categoryLabel, valueLabel, conversionLabel, stepLabel]}
        rows={stages.map((stage, i) => [
          stage.label,
          formatValue(values[i] ?? 0),
          formatPercent(conversions[i]?.overall ?? 0),
          formatPercent(conversions[i]?.step ?? 0),
        ])}
        visible={showTable}
      />
    </div>
  );
}
