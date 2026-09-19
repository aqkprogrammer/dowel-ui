"use client";

// Ported from bencho Range dial (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import {
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A 24-hour dial with two thumbs: the window is the clockwise arc from the
 * start thumb to the end thumb, and it may wrap past midnight. A ring of ticks
 * shows the window (long and dark inside, short and faint outside), and the
 * duration sits in the middle.
 *
 * The source was pointer-only. Here each thumb is a focusable role="slider"
 * (arrows step by `snap`, Page Up/Down by an hour, Home/End jump to midnight
 * and the last step of the day, all wrapping round the clock), and a polite
 * live region announces the new duration once something has changed.
 *
 * The dial is a clock, not reading order: it keeps `direction: ltr` and
 * clockwise stays clockwise in right-to-left layouts, and so do the arrow keys
 * (up/right always add time, as on any circular slider).
 *
 * There is no gesture velocity to carry, so no `motion`: the thumbs follow the
 * pointer directly and ticks draw in with a hoisted keyframe whose duration and
 * stagger run through --motion-scale.
 */

const PREFIX = "dowel-range-dial";
const DAY = 1440;

const STYLES = `
@keyframes ${PREFIX}-fill{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.${PREFIX} [data-slot=range-dial-tick][data-entering]{stroke-dasharray:1;animation:${PREFIX}-fill calc(260ms * var(--motion-scale, 1)) cubic-bezier(.22,1,.36,1) calc(var(--d, 0) * 16ms * var(--motion-scale, 1)) both}
`;

export type RangeDialValue = [start: number, end: number];

export interface RangeDialProps extends Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onChange" | "children"
> {
  /** `[start, end]` in minutes after midnight, 0–1439. The window runs clockwise. */
  value?: RangeDialValue;
  /** Uncontrolled start value. Defaults to 23:00 → 06:30 (7h30m). */
  defaultValue?: RangeDialValue;
  /** Called on every change: while dragging and per key press. */
  onValueChange?: (value: RangeDialValue) => void;
  /** Called when an interaction ends: pointer released or key press. */
  onValueCommit?: (value: RangeDialValue) => void;
  /** Step in minutes for the pointer and the arrow keys. */
  snap?: 5 | 15 | 30;
  /** Number of ticks round the dial, 24–96 (the source's slider stepped by 8). */
  density?: number;
  /** Tick ring radius in viewBox units, 44–68. Scales the whole dial geometry. */
  reach?: number;
  /** Accessible names of the two thumbs. */
  thumbLabels?: [start: string, end: string];
  /** Locale for the default time format. */
  locale?: string;
  /** Formats a time (minutes after midnight) for `aria-valuetext`. */
  formatTime?: (minutes: number) => string;
  /** Formats a duration in minutes for the live announcement. */
  formatDuration?: (minutes: number) => string;
  disabled?: boolean;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);
const wrap = (minutes: number) => ((Math.round(minutes) % DAY) + DAY) % DAY;
const gap = (a: number, b: number) => {
  const d = Math.abs(a - b) % DAY;
  return Math.min(d, DAY - d);
};

function spokenDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${String(hours)} ${hours === 1 ? "hour" : "hours"}`);
  if (rest > 0 || hours === 0)
    parts.push(`${String(rest)} ${rest === 1 ? "minute" : "minutes"}`);
  return parts.join(" ");
}

/** Position on the dial, as percentages of its box, for an angle in minutes. */
function polar(minutes: number, radius: number): { left: string; top: string } {
  const angle = (minutes / DAY) * 2 * Math.PI;
  const r = radius / 2; // viewBox units (of 200) to percent
  return {
    left: `${(50 + r * Math.sin(angle)).toFixed(3)}%`,
    top: `${(50 - r * Math.cos(angle)).toFixed(3)}%`,
  };
}

interface Trail {
  key: string;
  /** Ticks drawing in, with their stagger rank along the arc. */
  entering: Map<number, number>;
}

/** A 24-hour circular two-thumb range, such as a sleep window. */
export function RangeDial({
  className,
  style,
  value: valueProp,
  defaultValue = [23 * 60, 6 * 60 + 30],
  onValueChange,
  onValueCommit,
  snap = 15,
  density = 48,
  reach = 56,
  thumbLabels = ["Start time", "End time"],
  locale,
  formatTime,
  formatDuration = spokenDuration,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}: RangeDialProps) {
  const [uncontrolled, setUncontrolled] = useState<RangeDialValue>(() => [
    wrap(defaultValue[0]),
    wrap(defaultValue[1]),
  ]);
  const controlled = valueProp !== undefined;
  const value: RangeDialValue = controlled
    ? [wrap(valueProp[0]), wrap(valueProp[1])]
    : uncontrolled;
  const [start, end] = value;
  const duration = wrap(end - start);

  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState<0 | 1 | null>(null);
  const latest = useRef(value);
  const thumbs = useRef<(HTMLSpanElement | null)[]>([]);
  const filterId = `${PREFIX}-${useId().replace(/:/g, "")}`;

  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }),
    [locale],
  );
  const timeText = (minutes: number) =>
    formatTime ? formatTime(minutes) : timeFormat.format(new Date(minutes * 60_000));

  /* Ticks -------------------------------------------------------------- */
  const count = clamp(Math.round(density), 24, 96);
  const ring = clamp(reach, 44, 68);
  const onList = Array.from({ length: count }, (_, index) => index)
    .map((index) => ({ index, offset: wrap((index * DAY) / count - start) }))
    .filter((tick) => tick.offset <= duration)
    .sort((a, b) => a.offset - b.offset)
    .map((tick) => tick.index);
  const onKey = onList.join(",");

  // Ticks that have just joined the window draw in, one after another along
  // the arc. Derived from the previous render's set (React's "adjust state
  // while rendering" pattern), so a tick already on never replays.
  const [trail, setTrail] = useState<Trail>(() => ({
    key: onKey,
    entering: new Map(onList.map((index, rank) => [index, rank])),
  }));
  let entering = trail.entering;
  if (trail.key !== onKey) {
    const before = new Set(trail.key ? trail.key.split(",").map(Number) : []);
    const next = new Map<number, number>();
    let rank = 0;
    for (const index of onList) {
      if (!before.has(index)) next.set(index, rank++);
      else if (trail.entering.has(index)) next.set(index, trail.entering.get(index) ?? 0);
    }
    entering = next;
    setTrail({ key: onKey, entering: next });
  }
  const onSet = new Set(onList);

  /* Changes ------------------------------------------------------------ */
  function setThumb(thumb: 0 | 1, minutes: number): RangeDialValue {
    const current = latest.current;
    const next: RangeDialValue =
      thumb === 0 ? [wrap(minutes), current[1]] : [current[0], wrap(minutes)];
    latest.current = next;
    if (next[0] === current[0] && next[1] === current[1]) return next;
    if (!controlled) setUncontrolled(next);
    setAnnouncement(formatDuration(wrap(next[1] - next[0])));
    onValueChange?.(next);
    return next;
  }

  function fromPointer(event: PointerEvent<HTMLDivElement>): number | null {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const turn = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
    return wrap(Math.round((turn * DAY) / snap) * snap);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    onPointerDown?.(event);
    if (disabled || event.button !== 0 || event.defaultPrevented) return;
    const minutes = fromPointer(event);
    if (minutes === null) return;
    event.preventDefault();
    const thumb: 0 | 1 = gap(minutes, start) <= gap(minutes, end) ? 0 : 1;
    event.currentTarget.setPointerCapture(event.pointerId);
    latest.current = value;
    setDragging(thumb);
    setThumb(thumb, minutes);
    thumbs.current[thumb]?.focus({ preventScroll: true });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    if (dragging === null) return;
    const minutes = fromPointer(event);
    if (minutes !== null) setThumb(dragging, minutes);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (event.type === "pointerup") onPointerUp?.(event);
    else onPointerCancel?.(event);
    if (dragging === null) return;
    setDragging(null);
    onValueCommit?.(latest.current);
  }

  function handleKeyDown(thumb: 0 | 1, event: KeyboardEvent<HTMLSpanElement>) {
    if (disabled) return;
    const current = value[thumb];
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = Math.floor(current / snap) * snap + snap;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = Math.ceil(current / snap) * snap - snap;
        break;
      case "PageUp":
        next = current + 60;
        break;
      case "PageDown":
        next = current - 60;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = DAY - snap;
        break;
      default:
        return;
    }
    event.preventDefault();
    latest.current = value;
    const committed = setThumb(thumb, next);
    if (committed[thumb] !== current) onValueCommit?.(committed);
  }

  /* Render ------------------------------------------------------------- */
  const orbit = ring + 10.67; // the knobs ride just outside the short ticks
  const hours = Math.floor(duration / 60);
  const mins = String(duration % 60).padStart(2, "0");

  return (
    <div
      role="group"
      aria-label={ariaLabelledBy ? ariaLabel : (ariaLabel ?? "Time range")}
      aria-labelledby={ariaLabelledBy}
      aria-disabled={disabled || undefined}
      data-slot="range-dial"
      data-dragging={dragging === null ? undefined : ""}
      data-disabled={disabled ? "" : undefined}
      className={cn(
        PREFIX,
        "relative aspect-square w-72 touch-none text-foreground select-none",
        disabled
          ? "cursor-not-allowed opacity-55"
          : "cursor-grab data-dragging:cursor-grabbing",
        className,
      )}
      style={{ containerType: "inline-size", direction: "ltr", ...style }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        data-slot="range-dial-ticks"
        className="absolute inset-0 size-full"
      >
        {Array.from({ length: count }, (_, index) => {
          const angle = (index / count) * 2 * Math.PI;
          const on = onSet.has(index);
          const outer = on ? ring + 19 : ring + 9;
          const rank = entering.get(index);
          return (
            <line
              key={index}
              data-slot="range-dial-tick"
              data-on={on ? "" : undefined}
              data-entering={on && rank !== undefined ? "" : undefined}
              x1={100 + ring * Math.sin(angle)}
              y1={100 - ring * Math.cos(angle)}
              x2={100 + outer * Math.sin(angle)}
              y2={100 - outer * Math.cos(angle)}
              pathLength={1}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={on ? 0.9 : 0.24}
              style={{ "--d": rank ?? 0 } as CSSProperties}
            />
          );
        })}
      </svg>

      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -6.17"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="over" />
          </filter>
        </defs>
      </svg>
      <div
        aria-hidden="true"
        data-slot="range-dial-knobs"
        className="pointer-events-none absolute inset-0"
        style={{
          filter: `url(#${filterId}) drop-shadow(0 2px 8px var(--shadow-color)) drop-shadow(0 1px 3px var(--shadow-color))`,
        }}
      >
        {value.map((minutes, thumb) => (
          <span
            key={thumb}
            data-slot="range-dial-knob"
            className="absolute flex size-[6.94cqi] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card"
            style={polar(minutes, orbit)}
          >
            {thumb === 0 ? (
              <span
                data-slot="range-dial-pip"
                className="size-1/4 rounded-full bg-foreground/50"
              />
            ) : null}
          </span>
        ))}
      </div>

      {value.map((minutes, thumb) => (
        <span
          key={thumb}
          ref={(node) => {
            thumbs.current[thumb] = node;
          }}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={thumbLabels[thumb]}
          aria-valuemin={0}
          aria-valuemax={DAY - 1}
          aria-valuenow={minutes}
          aria-valuetext={timeText(minutes)}
          aria-disabled={disabled || undefined}
          data-slot="range-dial-thumb"
          data-thumb={thumb === 0 ? "start" : "end"}
          className={cn(
            "absolute size-[9cqi] -translate-x-1/2 -translate-y-1/2 rounded-full",
            focusRing,
          )}
          style={polar(minutes, orbit)}
          onKeyDown={(event) => {
            handleKeyDown(thumb as 0 | 1, event);
          }}
        />
      ))}

      <div
        data-slot="range-dial-readout"
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-medium tracking-[-0.045em] tabular-nums"
        style={{ fontSize: "11.8cqi" }}
      >
        <span aria-hidden="true">
          {hours}
          <span className="ms-[0.09em] me-[0.18em] text-[0.7em] opacity-42">h</span>
          {mins}
          <span className="ms-[0.09em] text-[0.7em] opacity-42">m</span>
        </span>
        <span className="sr-only">{formatDuration(duration)}</span>
      </div>
      <span
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-slot="range-dial-status"
      >
        {announcement}
      </span>
    </div>
  );
}
