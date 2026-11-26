"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * An ECG trace with a live pulse, and a heart that beats in time.
 *
 * The trace is drawn twice. Underneath, the whole line sits faint and still.
 * On top, three copies of the same path are each dashed down to a single dash
 * — a long dim one, a medium one and a short bright one — whose heads share a
 * position. Sliding all three dash offsets together carries one bright point
 * across the line with a tail that fades behind it, the way a monitor's beam
 * leaves a decaying afterglow. The path uses `pathLength="100"`, so the dash
 * arithmetic is in percent of the line whatever its real length. One sweep
 * takes one beat (60 / `bpm` seconds), and the heart's double thump is timed
 * to land as the beam crosses the spike.
 *
 * The SVG is not mirrored in RTL — SVG content never is, and a trace is a time
 * axis that runs left to right in every language.
 *
 * Accessibility: the trace and the heart glyph are aria-hidden. The reading is
 * plain text, prefixed with a visually hidden `label`, so it reads "Heart
 * rate 72 bpm". It is not a live region: a rate that updates every second
 * would never stop talking. The sweep and beat are decorative loops on
 * `--motion-scale`; under reduced motion they stop and the full trace is
 * shown bright and still.
 */

const PREFIX = "dowel-heartbeat";

const STYLES = `
@keyframes ${PREFIX}-sweep{from{stroke-dashoffset:var(--from)}to{stroke-dashoffset:var(--to)}}
@keyframes ${PREFIX}-beat{0%,28%{scale:1}38%{scale:1.28}48%{scale:.96}56%{scale:1.14}70%,100%{scale:1}}
[data-slot=heartbeat-pulse] path{animation:${PREFIX}-sweep var(--beat) linear infinite}
[data-slot=heartbeat-heart]{animation:${PREFIX}-beat var(--beat) var(--ease-out-quint) infinite}
@media (prefers-reduced-motion:reduce){[data-slot=heartbeat-pulse]{display:none}[data-slot=heartbeat-base]{opacity:.85}}
`;

/** Baseline, P wave, the QRS spike, T wave, baseline. In a 120 × 40 box. */
const TRACE = "M0 22H40l2.5-3 2.5 3H52l3 4 5-24 5 34 4-14H80q4-5 8 0H120";

/** The beam: dash length (percent of the line) and opacity, dimmest first. */
const SEGMENTS = [
  { length: 36, opacity: 0.22 },
  { length: 20, opacity: 0.5 },
  { length: 8, opacity: 1 },
] as const;

/** How far the head travels: past the end by the longest tail, so it fully leaves. */
const TRAVEL = 100 + 36;

const heartbeatVariants = cva("inline-flex flex-col items-center text-foreground", {
  variants: {
    size: {
      sm: "gap-1.5 text-xs [&_[data-slot=heartbeat-trace]]:w-24",
      md: "gap-2 text-sm [&_[data-slot=heartbeat-trace]]:w-36",
      lg: "gap-3 text-base [&_[data-slot=heartbeat-trace]]:w-52",
    },
  },
  defaultVariants: { size: "md" },
});

export interface HeartbeatProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof heartbeatVariants> {
  /** Beats per minute. Sets both the reading and the tempo of the sweep and the heart. */
  bpm?: number;
  /** Read before the number by assistive technology. */
  label?: string;
  /** The unit shown after the number. */
  unit?: string;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-[1.1em]">
      <path d="M12 21s-8.5-5.1-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.9 12 21 12 21Z" />
    </svg>
  );
}

/** An ECG line with a bright pulse sweeping across it, and a heart beating at `bpm`. */
export function Heartbeat({
  className,
  size,
  bpm = 72,
  label = "Heart rate",
  unit = "bpm",
  style,
  ...props
}: HeartbeatProps) {
  const rate = Math.max(1, bpm);
  const beat = `calc(${String(Math.round(60000 / rate))}ms * var(--motion-scale, 1))`;

  return (
    <div
      data-slot="heartbeat"
      className={cn(heartbeatVariants({ size }), className)}
      style={{ "--beat": beat, ...style } as CSSProperties}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <svg
        data-slot="heartbeat-trace"
        viewBox="0 0 120 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-auto overflow-visible"
      >
        <path data-slot="heartbeat-base" d={TRACE} pathLength={100} opacity={0.22} />
        <g data-slot="heartbeat-pulse" className="drop-shadow-[0_0_3px_currentColor]">
          {SEGMENTS.map((segment) => (
            <path
              key={segment.length}
              d={TRACE}
              pathLength={100}
              opacity={segment.opacity}
              strokeWidth={segment.opacity === 1 ? 2 : 1.5}
              strokeDasharray={`${String(segment.length)} 300`}
              style={
                {
                  "--from": String(segment.length),
                  "--to": String(segment.length - TRAVEL),
                } as CSSProperties
              }
            />
          ))}
        </g>
      </svg>
      <p className="m-0 inline-flex items-center gap-[0.4em] font-semibold tabular-nums">
        <span data-slot="heartbeat-heart" className="inline-grid">
          <HeartIcon />
        </span>
        <span>
          <span className="sr-only">{label} </span>
          {rate} {unit}
        </span>
      </p>
    </div>
  );
}

export { heartbeatVariants };
