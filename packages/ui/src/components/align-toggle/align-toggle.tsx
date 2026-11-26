"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRingInset, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Three alignment buttons on a segmented track, with a small paragraph above
 * them that re-aligns as you choose.
 *
 * The thumb is one absolutely placed pill whose two edges are set separately
 * (inset-inline-start and inset-inline-end, as percentages of the track). When
 * the choice moves, the leading edge leaves at once and the trailing edge
 * follows a beat later, so the pill stretches across the gap in transit and
 * settles to one cell when it arrives. The lines of the preview slide by
 * transitioning margin-inline-start, one after another, top to bottom.
 *
 * Built on Radix ToggleGroup in single mode: arrow keys move between the
 * buttons (roving focus), each has an accessible name, and the pressed one is
 * exposed. A choice cannot be cleared by pressing it again: one alignment is
 * always active. The preview is aria-hidden; the buttons already say it.
 *
 * Values are logical (`start`, `center`, `end`), so in a right-to-left layout
 * `start` aligns right, the thumb travels from the right and the icons mirror
 * to match. Every duration runs through --motion-scale, so under reduced motion
 * the thumb and the lines jump.
 */

export type Alignment = "start" | "center" | "end";

const ALIGNMENTS: readonly Alignment[] = ["start", "center", "end"];

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const EASE = "cubic-bezier(.3,.9,.3,1)";
const LEAD = 0.3;
const TRAIL = 0.42;
const LAG = 0.06;

const ICONS: Record<Alignment, string> = {
  start: "M4 7h16M4 12h10M4 17h13",
  center: "M4 7h16M7 12h10M5.5 17h13",
  end: "M4 7h16M10 12h10M7 17h13",
};

const DEFAULT_LABELS: Record<Alignment, string> = {
  start: "Align start",
  center: "Align center",
  end: "Align end",
};

/** Widths of the preview's lines, as fractions of the preview. */
const LINES = [0.62, 0.9, 0.48];

const OFFSET: Record<Alignment, number> = { start: 0, center: 0.5, end: 1 };

const alignToggleVariants = cva("inline-flex flex-col items-center", {
  variants: {
    size: {
      sm: "gap-3 [--align-cell:2rem] [--align-preview:2.75rem]",
      md: "gap-4 [--align-cell:2.5rem] [--align-preview:3.5rem]",
      lg: "gap-5 [--align-cell:3rem] [--align-preview:4.25rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface AlignToggleProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "dir" | "onChange">,
    VariantProps<typeof alignToggleVariants> {
  /** The chosen alignment (controlled). */
  value?: Alignment;
  /** The alignment chosen at first (uncontrolled). Defaults to `start`. */
  defaultValue?: Alignment;
  /** Called with the new alignment when the choice changes. */
  onValueChange?: (value: Alignment) => void;
  /** Shows the small paragraph preview above the buttons. Defaults to true. */
  preview?: boolean;
  /** Accessible names for the three buttons. */
  labels?: Partial<Record<Alignment, string>>;
  /** Disables every button. */
  disabled?: boolean;
}

/** A segmented start/center/end alignment control with a sliding thumb and a live preview. */
export function AlignToggle({
  className,
  size,
  value,
  defaultValue = "start",
  onValueChange,
  preview = true,
  labels,
  disabled,
  "aria-label": ariaLabel = "Text alignment",
  ...props
}: AlignToggleProps) {
  const [uncontrolled, setUncontrolled] = useState<Alignment>(defaultValue);
  const current = value ?? uncontrolled;
  const index = ALIGNMENTS.indexOf(current);

  // Which way the thumb last moved, derived during render so the edges get
  // their lead and lag on the same frame as the new position.
  const [shown, setShown] = useState(index);
  const [forward, setForward] = useState(true);
  if (shown !== index) {
    setForward(index > shown);
    setShown(index);
  }

  const cell = 100 / ALIGNMENTS.length;
  const edge = (lead: boolean) => `${s(lead ? LEAD : TRAIL)} ${EASE} ${lead ? "0s" : s(LAG)}`;
  const thumb: CSSProperties = {
    insetInlineStart: `${String(index * cell)}%`,
    insetInlineEnd: `${String((ALIGNMENTS.length - 1 - index) * cell)}%`,
    transition: `inset-inline-end ${edge(forward)}, inset-inline-start ${edge(!forward)}`,
  };

  const names = { ...DEFAULT_LABELS, ...labels };

  return (
    <ToggleGroupPrimitive.Root
      type="single"
      data-slot="align-toggle"
      aria-label={ariaLabel}
      value={current}
      disabled={disabled}
      onValueChange={(next) => {
        // Radix clears a single group when the pressed item is pressed again;
        // an alignment is never "none", so ignore it.
        if (!next) return;
        const chosen = next as Alignment;
        if (value === undefined) setUncontrolled(chosen);
        onValueChange?.(chosen);
      }}
      className={cn(alignToggleVariants({ size }), className)}
      {...props}
    >
      {preview ? (
        <div
          aria-hidden="true"
          data-slot="align-toggle-preview"
          className="flex w-(--align-preview) flex-col gap-[0.3em]"
          style={{ fontSize: "calc(var(--align-cell) / 4)" }}
        >
          {LINES.map((width, line) => (
            <span
              key={line}
              className="block h-[0.32em] rounded-full bg-foreground"
              style={{
                width: `${String(width * 100)}%`,
                opacity: line === 0 ? 1 : 0.85 - line * 0.1,
                marginInlineStart: `${String((1 - width) * OFFSET[current] * 100)}%`,
                transition: `margin-inline-start ${s(0.38)} ${EASE} ${s(line * 0.05)}`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative isolate grid grid-cols-3 rounded-2xl bg-muted p-1">
        <div className="pointer-events-none absolute inset-1 -z-10">
          <span
            aria-hidden="true"
            data-slot="align-toggle-thumb"
            className="absolute inset-y-0 rounded-xl bg-foreground shadow-sm"
            style={thumb}
          />
        </div>
        {ALIGNMENTS.map((alignment) => (
          <ToggleGroupPrimitive.Item
            key={alignment}
            value={alignment}
            aria-label={names[alignment]}
            className={cn(
              "inline-flex size-(--align-cell) cursor-pointer items-center justify-center rounded-xl text-muted-foreground",
              "hover:text-foreground data-[state=on]:text-background data-[state=on]:hover:text-background",
              "disabled:cursor-not-allowed disabled:opacity-55",
              focusRingInset,
            )}
            style={{ transition: `color ${s(0.25)} ease` }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className={cn("size-[45%]", mirrorForDirection)}
            >
              <path d={ICONS[alignment]} />
            </svg>
          </ToggleGroupPrimitive.Item>
        ))}
      </div>
    </ToggleGroupPrimitive.Root>
  );
}

export { alignToggleVariants };
