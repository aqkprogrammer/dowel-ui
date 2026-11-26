"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slider as SliderPrimitive } from "radix-ui";
import { useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * A vertical volume pill. The fill rises from the bottom, and its top edge is a
 * round blob, the width of the pill, that bulges: squashed flat and spilling
 * past the sides when the level is low, round and flush with the pill near the
 * top. Every change pushes the blob through a quick squash-and-stretch as it
 * travels, so the level reads as something liquid being pushed up and down.
 *
 * The fill sits in a clip shaped like the pill; the blob sits outside it, which
 * is what lets it bulge past the edges. Height, position and squash all ease
 * with the same overshoot curve, and every duration scales with
 * --motion-scale, so under reduced motion the level simply arrives.
 *
 * Semantics are Radix's vertical slider: a role="slider" thumb (invisible, laid
 * over the blob) with aria-orientation="vertical", Arrow Up/Right to raise,
 * Home/End, Page Up/Down and pointer drag. The focus ring is drawn around the
 * whole pill. The speaker glyph below is aria-hidden; it shows muted, low or
 * loud with the level.
 */

const P = "dowel-bulge-volume";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const EASE = "cubic-bezier(.34,1.45,.55,1)";

const STYLES = `
.${P} [data-part=fill]{transition:height ${s(0.42)} ${EASE}}
.${P} [data-part=cap]{transition:bottom ${s(0.42)} ${EASE},transform ${s(0.42)} ${EASE}}
.${P} [data-part=blob][data-animate]{animation:${P}-bulge ${s(0.5)} ease-out}
@keyframes ${P}-bulge{0%{transform:scale(1,1)}35%{transform:scale(1.14,.8)}65%{transform:scale(.96,1.06)}100%{transform:scale(1,1)}}
`;

const bulgeVolumeVariants = cva(
  cn(
    "relative flex shrink-0 touch-none flex-col items-center rounded-full select-none",
    "cursor-ns-resize data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55",
    "has-[[role=slider]:focus-visible]:ring-2 has-[[role=slider]:focus-visible]:ring-ring/55",
    "has-[[role=slider]:focus-visible]:ring-offset-2 has-[[role=slider]:focus-visible]:ring-offset-background",
  ),
  {
    variants: {
      size: {
        sm: "h-20 w-7 [--cap:1.75rem]",
        md: "h-24 w-9 [--cap:2.25rem]",
        lg: "h-32 w-11 [--cap:2.75rem]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type RootProps = ComponentPropsWithRef<typeof SliderPrimitive.Root>;

export interface BulgeVolumeProps
  extends
    Omit<
      RootProps,
      | "value"
      | "defaultValue"
      | "onValueChange"
      | "onValueCommit"
      | "orientation"
      | "inverted"
      | "minStepsBetweenThumbs"
      | "children"
    >,
    VariantProps<typeof bulgeVolumeVariants> {
  /** Controlled level. */
  value?: number;
  /** Initial level when uncontrolled. */
  defaultValue?: number;
  /** Called on every change while dragging or keying. */
  onValueChange?: (value: number) => void;
  /** Called when an interaction ends. */
  onValueCommit?: (value: number) => void;
  /** Shows the speaker glyph under the pill. */
  showIcon?: boolean;
  /** Spoken value (`aria-valuetext`). Defaults to a percentage of the range. */
  formatValue?: (value: number) => string;
  /** Class for the wrapper that holds the pill and the speaker glyph. */
  wrapperClassName?: string;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

/** A vertical volume slider whose fill bulges at its top edge as it moves. */
export function BulgeVolume({
  className,
  wrapperClassName,
  style,
  size,
  value: valueProp,
  defaultValue = 60,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  showIcon = true,
  formatValue,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-valuetext": ariaValueText,
  ...props
}: BulgeVolumeProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const controlled = valueProp !== undefined;
  const value = clamp(controlled ? valueProp : uncontrolled, min, max);
  const range = max - min;
  const p = range > 0 ? (value - min) / range : 0;

  // Each change restarts the squash on the blob, including controlled ones.
  const [pulse, setPulse] = useState({ value, count: 0 });
  if (pulse.value !== value) setPulse({ value, count: pulse.count + 1 });

  function update(next: number) {
    if (next === value) return;
    if (!controlled) setUncontrolled(next);
    onValueChange?.(next);
  }

  // Low, the blob is squashed flat and spills past the sides; high, it is round.
  const squash = 0.45 + 0.55 * p;
  const spread = 1 + 0.12 * (1 - p);
  const percent = Math.round(p * 100);
  const level = p === 0 ? "muted" : p < 0.5 ? "low" : "high";

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <span
        data-slot="bulge-volume-wrapper"
        className={cn("inline-flex flex-col items-center gap-2.5", wrapperClassName)}
      >
        <SliderPrimitive.Root
          data-slot="bulge-volume"
          orientation="vertical"
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([next]) => next !== undefined && update(next)}
          onValueCommit={([next]) => next !== undefined && onValueCommit?.(next)}
          className={cn(P, bulgeVolumeVariants({ size }), className)}
          style={{ ...({ "--p": p, "--sy": squash } as CSSProperties), ...style }}
          {...props}
        >
          <SliderPrimitive.Track className="absolute inset-0 rounded-full bg-foreground/15">
            <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-full">
              <span
                data-part="fill"
                data-slot="bulge-volume-fill"
                className="absolute inset-x-0 bottom-0 bg-foreground"
                style={{
                  height: "calc(var(--p) * (100% - var(--cap)) + var(--cap) * var(--sy) / 2)",
                }}
              />
            </span>
          </SliderPrimitive.Track>
          <span
            aria-hidden="true"
            data-part="cap"
            className="pointer-events-none absolute inset-x-0 mx-auto size-(--cap) origin-bottom"
            style={{
              bottom: "calc(var(--p) * (100% - var(--cap)))",
              transform: `scale(${spread.toFixed(3)}, ${squash.toFixed(3)})`,
            }}
          >
            <span
              key={pulse.count}
              data-part="blob"
              data-animate={pulse.count > 0 ? "" : undefined}
              className="block size-full rounded-full bg-foreground"
            />
          </span>
          <SliderPrimitive.Thumb
            data-slot="bulge-volume-thumb"
            aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : "Volume")}
            aria-labelledby={ariaLabelledBy}
            aria-valuetext={ariaValueText ?? formatValue?.(value) ?? `${String(percent)}%`}
            className="block h-3 w-(--cap) rounded-full opacity-0 outline-none"
          />
        </SliderPrimitive.Root>
        {showIcon ? <SpeakerIcon level={level} /> : null}
      </span>
    </>
  );
}

function SpeakerIcon({ level }: { level: "muted" | "low" | "high" }) {
  return (
    <svg
      aria-hidden="true"
      data-slot="bulge-volume-icon"
      data-level={level}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3 text-foreground/80"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" />
      {level === "muted" ? (
        <>
          <path d="m22 9-6 6" />
          <path d="m16 9 6 6" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          {level === "high" ? <path d="M19 5a10 10 0 0 1 0 14" /> : null}
        </>
      )}
    </svg>
  );
}

export { bulgeVolumeVariants };
