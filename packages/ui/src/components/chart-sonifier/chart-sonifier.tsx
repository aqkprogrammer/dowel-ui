"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  clamp,
  describePoint,
  describeSeries,
  extent,
  planTones,
  pointCount,
  scrubIndexFromKey,
  sonifierDuration,
  type SonifierFormat,
  type SonifierSpeed,
  type SonifierUnit,
} from "./sonify";
import { useSonifier } from "./use-sonifier";

export {
  describePoint,
  describeSeries,
  formatSonifierValue,
  planTones,
  SONIFIER_HIGH_HZ,
  SONIFIER_LOW_HZ,
  SONIFIER_SPEEDS,
  sonifierDuration,
  valueToFrequency,
  type PlanTonesOptions,
  type SonifierFormat,
  type SonifierPitchRange,
  type SonifierSpeed,
  type SonifierTone,
  type SonifierUnit,
} from "./sonify";
export {
  canSonify,
  useSonifier,
  type Sonifier,
  type SonifierPlayCallbacks,
  type UseSonifierOptions,
} from "./use-sonifier";

/*
 * A chart you can hear. The chosen series plays as pitch over time — higher
 * value, higher note — and a slider steps through it point by point, playing
 * each point's note and saying its value.
 *
 * Nothing sounds until someone presses Play or moves the slider: the audio
 * context does not exist before that. Pause, Escape and Mute all silence it at
 * once. Everything the sound says is also text: a one-sentence summary of the
 * series, and the slider's value, so it works where audio does not.
 *
 * While it plays, the slider's thumb follows the playhead but its announced
 * value holds still. Otherwise a screen reader would talk over the notes at
 * every step. It catches up, and is announced once, when playback pauses.
 *
 * The track runs left to right in every writing direction, like the Dither
 * charts it is meant to sit beside, so the thumb stays under the point it
 * names.
 */

export const chartSonifierVariants = cva("flex min-w-0 flex-col", {
  variants: {
    variant: {
      outline: "rounded-lg border border-border bg-card text-card-foreground",
      plain: "",
    },
    size: {
      sm: "gap-2 text-xs",
      md: "gap-3 text-sm",
    },
  },
  compoundVariants: [
    { variant: "outline", size: "sm", className: "p-2.5" },
    { variant: "outline", size: "md", className: "p-3.5" },
  ],
  defaultVariants: { variant: "outline", size: "md" },
});

export interface ChartSonifierSeries {
  key: string;
  label: string;
  /** One value per category. null or NaN is a missing value, heard as a click. */
  values: readonly (number | null)[];
}

export interface ChartSonifierProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof chartSonifierVariants> {
  series: readonly ChartSonifierSeries[];
  /** What each point is, in order: dates, names. Without them points are numbered. */
  categories?: readonly string[];
  /** What the chart shows. Names the group of controls. */
  label: string;
  formatValue?: (value: number) => string;
  formatCategory?: (category: string, index: number) => string;
  /** Said after each value: "deployments", or `{ one, other }`. */
  unit?: string | SonifierUnit;
  /** The slider's point (controlled). Follows the playhead while playing. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Key of the series to start on. Defaults to the first. */
  defaultSeries?: string;
  onSeriesChange?: (key: string) => void;
  defaultSpeed?: SonifierSpeed;
  defaultMuted?: boolean;
}

const SPEEDS: { value: SonifierSpeed; label: string }[] = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" },
];

/** Long enough to hear a scrubbed point's pitch, short enough to keep up with a held key. */
const PREVIEW_MS = 160;

/** Up to this many points the track marks each one; beyond it the marks would merge. */
const MAX_TICKS = 40;

const BUTTON_SIZE = {
  sm: "h-7 gap-1.5 px-2.5 text-xs",
  md: "h-8 gap-1.5 px-3 text-sm",
} as const;

const SELECT_SIZE = { sm: "h-7 px-2 text-xs", md: "h-8 px-2.5 text-sm" } as const;

const OPTION_SIZE = { sm: "h-6 px-2 text-xs", md: "h-7 px-2.5 text-sm" } as const;

const buttonBase = cn(
  "inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap",
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  focusRing,
  disabledStyles,
);

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M7 4.5v15l12.5-7.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M3 9.5h3.5L11 5.5v13l-4.5-4H3z" fill="currentColor" />
      {muted ? (
        <path d="M15 9.5l5 5M20 9.5l-5 5" />
      ) : (
        <path d="M14.5 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" />
      )}
    </svg>
  );
}

export function ChartSonifier({
  series,
  categories,
  label,
  formatValue,
  formatCategory,
  unit,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  defaultSeries,
  onSeriesChange,
  defaultSpeed = "normal",
  defaultMuted = false,
  variant,
  size,
  className,
  onKeyDown,
  ...props
}: ChartSonifierProps) {
  const id = useId();
  const summaryId = `${id}-summary`;
  const noteId = `${id}-note`;
  const speedId = `${id}-speed`;
  const sliderRef = useRef<HTMLDivElement>(null);
  const scale = size ?? "md";
  const format: SonifierFormat = { formatValue, formatCategory, unit };

  const [activeKey, setActiveKey] = useState(defaultSeries);
  const active = series.find((entry) => entry.key === activeKey) ?? series[0];
  const [speed, setSpeed] = useState<SonifierSpeed>(defaultSpeed);
  const [muted, setMuted] = useState(defaultMuted);
  const [announcement, setAnnouncement] = useState("");
  const sonifier = useSonifier({ muted });

  const values = active?.values ?? [];
  const count = active ? pointCount(values, categories) : 0;
  const last = Math.max(0, count - 1);

  const [ownIndex, setOwnIndex] = useState(defaultIndex);
  const position = clamp(indexProp ?? ownIndex, 0, last);
  // The value the slider announces while playing: where playback started.
  const [held, setHeld] = useState(position);
  const valueIndex = sonifier.playing ? clamp(held, 0, last) : position;

  // Every series on one scale, so a note means the same value whichever is chosen.
  const range = extent(series.flatMap((entry) => entry.values)) ?? { min: 0, max: 0 };

  const point = (index: number) => describePoint(values, categories, index, format);

  function move(next: number) {
    if (indexProp === undefined) setOwnIndex(next);
    onIndexChange?.(next);
  }

  // Playback outlives the render that started it; its callbacks read this.
  const latest = useRef<{ move: (index: number) => void; finish: () => void }>({
    move,
    finish: () => undefined,
  });
  useEffect(() => {
    latest.current = {
      move,
      finish: () => {
        setAnnouncement(`Finished at ${point(last)}.`);
      },
    };
  });

  function start(from: number, pace: SonifierSpeed) {
    if (count === 0) return;
    // From the end there is nothing left to hear, so start again.
    const begin = from >= last ? 0 : from;
    const rest = Array.from({ length: count - begin }, (_, i) => values[begin + i] ?? null);
    const tones = planTones(rest, {
      durationMs: sonifierDuration(rest.length, pace),
      min: range.min,
      max: range.max,
    }).map((tone) => ({ ...tone, index: tone.index + begin }));
    setHeld(begin);
    setAnnouncement("");
    if (begin !== position) move(begin);
    sonifier.play(tones, {
      onTone: (tone) => {
        latest.current.move(tone.index);
      },
      onEnd: () => {
        latest.current.finish();
      },
    });
  }

  function pause() {
    sonifier.stop();
    const slider = sliderRef.current;
    // A focused slider announces its own new value; saying it twice is noise.
    if (slider?.ownerDocument.activeElement !== slider) {
      setAnnouncement(`Paused at ${point(position)}.`);
    }
  }

  function scrubTo(next: number) {
    if (sonifier.playing) sonifier.stop();
    setAnnouncement("");
    if (next !== position) move(next);
    if (muted) return;
    const [tone] = planTones([values[next] ?? null], {
      durationMs: PREVIEW_MS,
      min: range.min,
      max: range.max,
    });
    if (tone) sonifier.preview(tone);
  }

  function indexAt(event: PointerEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    if (count <= 1 || rect.width <= 0) return 0;
    return Math.round(clamp((event.clientX - rect.left) / rect.width, 0, 1) * last);
  }

  function handleSeriesChange(key: string) {
    const next = series.find((entry) => entry.key === key);
    if (!next) return;
    if (sonifier.playing) sonifier.stop();
    setActiveKey(key);
    onSeriesChange?.(key);
    // The select says which series was chosen; this says what it holds.
    setAnnouncement(describeSeries(next, categories, format));
  }

  function handleSpeedChange(next: SonifierSpeed) {
    setSpeed(next);
    // Carry on from the playhead at the new pace, rather than making them press Play again.
    if (sonifier.playing) start(position, next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Escape") return;
    if (sonifier.playing) {
      event.preventDefault();
      pause();
    } else {
      // Cuts off a scrubbed note that is still sounding.
      sonifier.stop();
    }
  }

  const canPlay = sonifier.supported && count > 0;
  const fraction = count > 1 ? position / last : 0;
  const percent = `${String(fraction * 100)}%`;
  const summary = active ? describeSeries(active, categories, format) : `${label}: no data.`;

  return (
    // Escape stops the sound from wherever focus is among the controls. The
    // group is not itself interactive; it only hears the key bubble up.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="group"
      aria-label={label}
      aria-describedby={summaryId}
      data-slot="chart-sonifier"
      data-state={sonifier.playing ? "playing" : "paused"}
      data-muted={muted || undefined}
      {...props}
      className={cn(chartSonifierVariants({ variant, size }), className)}
      onKeyDown={handleKeyDown}
    >
      <p id={summaryId} data-slot="chart-sonifier-summary">
        {summary}
      </p>

      <div data-slot="chart-sonifier-controls" className="flex flex-wrap items-center gap-2">
        {/* Named for what it will do, like any media toggle whose icon changes. */}
        <button
          type="button"
          data-slot="chart-sonifier-play"
          disabled={!canPlay}
          aria-describedby={sonifier.supported ? undefined : noteId}
          onClick={() => {
            if (sonifier.playing) pause();
            else start(position, speed);
          }}
          className={cn(
            buttonBase,
            "bg-primary text-primary-foreground hover:bg-primary-hover",
            BUTTON_SIZE[scale],
          )}
        >
          {sonifier.playing ? <PauseIcon /> : <PlayIcon />}
          {sonifier.playing ? "Pause" : "Play"}
        </button>

        {series.length > 1 && (
          <label
            data-slot="chart-sonifier-series"
            className="inline-flex items-center gap-1.5 text-muted-foreground"
          >
            Series
            <select
              value={active?.key}
              onChange={(event) => {
                handleSeriesChange(event.target.value);
              }}
              className={cn(
                "rounded-md border border-input bg-background text-foreground",
                focusRing,
                SELECT_SIZE[scale],
              )}
            >
              {series.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="inline-flex items-center gap-1.5">
          <span id={speedId} className="text-muted-foreground">
            Speed
          </span>
          <div
            role="radiogroup"
            aria-labelledby={speedId}
            data-slot="chart-sonifier-speed"
            className="inline-flex rounded-md border border-input bg-background p-0.5"
          >
            {SPEEDS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "inline-flex cursor-pointer items-center rounded-sm font-medium text-muted-foreground hover:text-foreground",
                  "has-checked:bg-primary has-checked:text-primary-foreground",
                  "has-focus-visible:ring-2 has-focus-visible:ring-ring/55",
                  OPTION_SIZE[scale],
                )}
              >
                <input
                  type="radio"
                  name={speedId}
                  value={option.value}
                  checked={speed === option.value}
                  onChange={() => {
                    handleSpeedChange(option.value);
                  }}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          data-slot="chart-sonifier-mute"
          aria-pressed={muted}
          disabled={!sonifier.supported}
          onClick={() => {
            setMuted((current) => !current);
          }}
          className={cn(
            buttonBase,
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            "aria-pressed:bg-accent aria-pressed:text-accent-foreground",
            BUTTON_SIZE[scale],
          )}
        >
          <SpeakerIcon muted={muted} />
          Mute
        </button>
      </div>

      {active && count > 0 && (
        <div data-slot="chart-sonifier-scrubber" className="flex flex-col gap-1">
          <div
            ref={sliderRef}
            role="slider"
            tabIndex={0}
            aria-label={active.label}
            aria-valuemin={0}
            aria-valuemax={last}
            aria-valuenow={valueIndex}
            aria-valuetext={point(valueIndex)}
            aria-orientation="horizontal"
            data-slot="chart-sonifier-slider"
            onKeyDown={(event) => {
              const next = scrubIndexFromKey(event.key, position, count);
              if (next === null) return;
              event.preventDefault();
              scrubTo(next);
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              scrubTo(indexAt(event));
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const next = indexAt(event);
              if (next !== position) scrubTo(next);
            }}
            className={cn(
              "relative flex h-6 w-full cursor-pointer touch-none items-center rounded-sm",
              focusRing,
            )}
            style={{ direction: "ltr" }}
          >
            <div
              data-slot="chart-sonifier-track"
              className="relative h-1.5 w-full rounded-full bg-muted"
            >
              <div
                data-slot="chart-sonifier-range"
                className="absolute inset-y-0 start-0 rounded-full bg-primary/40"
                style={{ width: percent }}
              />
              {count > 1 &&
                count <= MAX_TICKS &&
                Array.from({ length: count }, (_, i) => (
                  <span
                    key={i}
                    data-slot="chart-sonifier-tick"
                    className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/50"
                    style={{ insetInlineStart: `${String((i / last) * 100)}%` }}
                  />
                ))}
              <span
                data-slot="chart-sonifier-thumb"
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-sm"
                style={{ insetInlineStart: percent }}
              />
            </div>
          </div>
          {/* The slider already says this; the readout is for the eye, and follows the playhead. */}
          <p
            aria-hidden="true"
            data-slot="chart-sonifier-readout"
            className="flex items-baseline justify-between gap-3 text-xs"
          >
            <span className="font-medium">{point(position)}</span>
            <span className="text-muted-foreground tabular-nums">
              {String(position + 1)} of {String(count)}
            </span>
          </p>
        </div>
      )}

      {!sonifier.supported && (
        <p
          id={noteId}
          data-slot="chart-sonifier-note"
          className="text-xs text-muted-foreground"
        >
          Sound is not available in this browser. The slider still reads out each value.
        </p>
      )}

      <p role="status" data-slot="chart-sonifier-status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
