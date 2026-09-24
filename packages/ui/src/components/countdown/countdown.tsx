"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ComponentPropsWithRef,
} from "react";

import { NumberFlow } from "@/components/number-flow";
import { cn } from "@/lib/utils";

/*
 * A countdown to a moment: days, hours, minutes and seconds, each rolling to
 * its next digit through NumberFlow — always downward, so 00 → 59 keeps
 * falling instead of reversing.
 *
 * The clock is an external store (useSyncExternalStore) whose snapshot is the
 * whole seconds left, so it only re-renders when the display would change.
 * Each tick is scheduled for the instant the next second begins on the
 * target's own grid, not on a free-running one-second interval that drifts
 * against it. While the tab is hidden nothing is scheduled; on return it reads
 * the clock once and re-aligns, so a timer left in a background tab is right
 * the moment it is seen again.
 *
 * SSR. The server cannot know what time the reader's browser will render at,
 * so its snapshot is "pending": the same units with dashes where the digits
 * go. Hydration agrees with that, and the real value arrives in the render
 * after. Pass `now` to render a definite value on the server — or to drive the
 * clock yourself, in tests or from one shared app-wide clock; with `now` set
 * the component never ticks on its own.
 *
 * Accessibility. role="timer", which is a live region that is off by
 * default — a timer that announced every second would drown out everything
 * else. The digits are aria-hidden; what assistive technology gets is one
 * sentence, "2 days, 3 hours, and 4 minutes remaining", which changes at most
 * once a minute. It is text content rather than an aria-label, because a
 * label on a non-interactive element is not read in every screen reader's
 * browse mode. With `live`, that sentence alone becomes a polite live region
 * and is announced as it changes; the digits sit outside it. Unit names come
 * from Intl, so they are localised and pluralised with `locales`; the
 * sentence around them is in `labels`.
 */

export type CountdownUnit = "days" | "hours" | "minutes" | "seconds";

const UNITS: readonly CountdownUnit[] = ["days", "hours", "minutes", "seconds"];

const SECONDS: Record<CountdownUnit, number> = {
  days: 86_400,
  hours: 3_600,
  minutes: 60,
  seconds: 1,
};

const INTL_UNIT = {
  days: "day",
  hours: "hour",
  minutes: "minute",
  seconds: "second",
} as const;

/** Lands each tick just past the boundary, never a hair before it. */
const EPSILON = 8;

/** Whole seconds from `now` until `target`, rounded up, never negative. */
export function secondsUntil(target: number, now: number): number {
  return Math.max(0, Math.ceil((target - now) / 1000));
}

/**
 * Splits whole seconds across the units shown. The largest shown unit absorbs
 * any larger ones (50 hours, not 2 days 2 hours, when days are hidden) and the
 * smallest drops what is below it.
 */
export function countdownParts(
  seconds: number,
  units: readonly CountdownUnit[],
): Partial<Record<CountdownUnit, number>> {
  let rest = Math.max(0, Math.floor(seconds));
  const parts: Partial<Record<CountdownUnit, number>> = {};
  for (const unit of UNITS) {
    if (!units.includes(unit)) continue;
    const value = Math.floor(rest / SECONDS[unit]);
    parts[unit] = value;
    rest -= value * SECONDS[unit];
  }
  return parts;
}

/** The units `auto` shows: leading units that are zero drop away, down to minutes and seconds. */
export function autoUnits(seconds: number): CountdownUnit[] {
  if (seconds >= SECONDS.days) return ["days", "hours", "minutes", "seconds"];
  if (seconds >= SECONDS.hours) return ["hours", "minutes", "seconds"];
  return ["minutes", "seconds"];
}

const unitFormats = new Map<string, Intl.NumberFormat>();

function unitFormat(
  locales: Intl.LocalesArgument,
  unit: CountdownUnit,
  display: "long" | "narrow",
): Intl.NumberFormat {
  const id = JSON.stringify([locales, unit, display]);
  let format = unitFormats.get(id);
  if (!format) {
    format = new Intl.NumberFormat(locales, {
      style: "unit",
      unit: INTL_UNIT[unit],
      unitDisplay: display,
    });
    unitFormats.set(id, format);
  }
  return format;
}

/** The localised, pluralised name of a unit for a value: "days", "day", "Tage". */
function unitName(locales: Intl.LocalesArgument, unit: CountdownUnit, value: number): string {
  return unitFormat(locales, unit, "long")
    .formatToParts(value)
    .filter((part) => part.type === "unit")
    .map((part) => part.value)
    .join("");
}

export interface CountdownLabels {
  /** Tile captions for the labelled format. Default: the unit's localised name. */
  days?: string;
  hours?: string;
  minutes?: string;
  seconds?: string;
  /** The screen-reader sentence around the duration. Default: "{duration} remaining". */
  remaining?: (duration: string) => string;
  /** Screen-reader text in the final minute. */
  underAMinute?: string;
  /** Screen-reader text once the countdown reaches zero. */
  complete?: string;
}

/**
 * The screen-reader sentence: days, hours and minutes, never seconds, so it
 * changes at most once a minute. Pure, for tests and for the server.
 */
export function describeCountdownParts(
  seconds: number,
  locales?: Intl.LocalesArgument,
  labels: CountdownLabels = {},
): string {
  if (seconds <= 0) return labels.complete ?? "Countdown complete";
  if (seconds < 60) return labels.underAMinute ?? "Less than a minute remaining";
  const parts = countdownParts(seconds, ["days", "hours", "minutes"]);
  const spoken = (["days", "hours", "minutes"] as const)
    .filter((unit) => (parts[unit] ?? 0) > 0)
    .map((unit) => unitFormat(locales, unit, "long").format(parts[unit] ?? 0));
  const duration = new Intl.ListFormat(locales, { style: "long", type: "conjunction" }).format(
    spoken,
  );
  return labels.remaining ? labels.remaining(duration) : `${duration} remaining`;
}

function toTime(date: Date | number | string): number {
  if (date instanceof Date) return date.getTime();
  if (typeof date === "number") return date;
  return Date.parse(date);
}

const noClock = () => null;

/**
 * Whole seconds left, ticking on the target's second boundaries while the
 * document is visible. Null on the server and while disabled.
 */
function useSecondsLeft(target: number, enabled: boolean): number | null {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!enabled || Number.isNaN(target)) return () => {};
      let timer: ReturnType<typeof setTimeout> | undefined;
      const schedule = () => {
        clearTimeout(timer);
        const left = target - Date.now();
        if (left <= 0 || document.visibilityState === "hidden") return;
        timer = setTimeout(
          () => {
            notify();
            schedule();
          },
          (left % 1000 || 1000) + EPSILON,
        );
      };
      const resync = () => {
        notify();
        schedule();
      };
      document.addEventListener("visibilitychange", resync);
      schedule();
      return () => {
        clearTimeout(timer);
        document.removeEventListener("visibilitychange", resync);
      };
    },
    [target, enabled],
  );
  const read = useCallback(
    () => (enabled && !Number.isNaN(target) ? secondsUntil(target, Date.now()) : null),
    [target, enabled],
  );
  return useSyncExternalStore(subscribe, read, noClock);
}

const countdownVariants = cva("inline-flex tabular-nums", {
  variants: {
    /** `compact` is one line, "1d 02:03:04"; `labelled` stacks each value over its unit in a tile. */
    format: {
      compact: "items-baseline font-medium",
      labelled: "items-stretch",
    },
  },
  defaultVariants: { format: "compact" },
});

const tile = cn(
  "flex min-w-[3.25em] flex-col items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-card-foreground shadow-xs",
);

const PAD = { minimumIntegerDigits: 2 } satisfies Intl.NumberFormatOptions;
const DAYS_COMPACT = {
  style: "unit",
  unit: "day",
  unitDisplay: "narrow",
} satisfies Intl.NumberFormatOptions;

export interface CountdownProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof countdownVariants> {
  /** The moment to count down to. A string is parsed with Date.parse. */
  date: Date | number | string;
  /**
   * Which units to show, largest first. `auto` (default) drops leading units
   * that are zero, down to minutes and seconds. A fixed list always shows its
   * units, with the largest absorbing any hidden larger ones.
   */
  units?: "auto" | readonly CountdownUnit[];
  /** Called once when the countdown reaches zero — including when `date` has already passed. */
  onComplete?: () => void;
  /**
   * The current time. Set it to drive the countdown yourself, to render a
   * definite value on the server, or in tests; while it is set the component
   * does not tick on its own.
   */
  now?: Date | number;
  /** Captions and screen-reader sentences, for translation. */
  labels?: CountdownLabels;
  /** Locale for unit names and digits. Defaults to the user's. */
  locales?: Intl.LocalesArgument;
  /** Announce the remaining time politely as it changes — at most once a minute. Off by default. */
  live?: boolean;
}

/** A countdown to a date, its digits rolling as they tick. */
export function Countdown({
  className,
  date,
  units = "auto",
  format = "compact",
  onComplete,
  now: nowProp,
  labels,
  locales,
  live = false,
  ...props
}: CountdownProps) {
  const target = toTime(date);
  const ticking = useSecondsLeft(target, nowProp === undefined);
  const now = nowProp instanceof Date ? nowProp.getTime() : nowProp;
  const seconds =
    now === undefined ? ticking : Number.isNaN(target) ? null : secondsUntil(target, now);

  const state = seconds === null ? "pending" : seconds === 0 ? "complete" : "running";
  const shown =
    units === "auto" ? autoUnits(seconds ?? 0) : UNITS.filter((u) => units.includes(u));
  const parts = seconds === null ? null : countdownParts(seconds, shown);

  // The one side effect: telling the application, once per target.
  const firedFor = useRef<number | null>(null);
  useEffect(() => {
    if (seconds !== 0 || firedFor.current === target) return;
    firedFor.current = target;
    onComplete?.();
  }, [seconds, target, onComplete]);

  const caption = (unit: CountdownUnit) =>
    labels?.[unit] ?? unitName(locales, unit, parts?.[unit] ?? 2);

  return (
    <div
      role="timer"
      aria-live="off"
      data-slot="countdown"
      data-state={state}
      data-format={format}
      className={cn(countdownVariants({ format }), className)}
      {...props}
    >
      {/* The only thing assistive technology reads, and the only live part:
          the rolling digits stay outside it, so they can never be announced. */}
      <span
        data-slot="countdown-description"
        aria-live={live ? "polite" : undefined}
        aria-atomic={live ? true : undefined}
        className="sr-only"
      >
        {seconds === null ? null : describeCountdownParts(seconds, locales, labels)}
      </span>
      {format === "labelled" ? (
        <span aria-hidden="true" data-slot="countdown-display" className="flex gap-2">
          {shown.map((unit) => (
            <span
              key={unit}
              data-slot="countdown-segment"
              data-unit={unit}
              data-value={parts?.[unit]}
              className={tile}
            >
              <span className="text-[1.75em] leading-none font-semibold">
                <Digits unit={unit} value={parts?.[unit]} locales={locales} />
              </span>
              <span
                data-slot="countdown-label"
                className="text-[0.625em] font-medium tracking-wide text-muted-foreground uppercase"
              >
                {caption(unit)}
              </span>
            </span>
          ))}
        </span>
      ) : (
        // Clock time reads left to right in every script.
        <span
          aria-hidden="true"
          dir="ltr"
          data-slot="countdown-display"
          className="inline-flex"
        >
          {shown.map((unit, index) => (
            <Fragment key={unit}>
              {index > 0 ? (
                <span
                  data-slot="countdown-separator"
                  className={cn(
                    "text-muted-foreground",
                    shown[index - 1] === "days" ? "w-[0.4em]" : "px-[0.08em]",
                  )}
                >
                  {shown[index - 1] === "days" ? " " : ":"}
                </span>
              ) : null}
              <span data-slot="countdown-segment" data-unit={unit} data-value={parts?.[unit]}>
                <Digits unit={unit} value={parts?.[unit]} locales={locales} compact />
              </span>
            </Fragment>
          ))}
        </span>
      )}
    </div>
  );
}

interface DigitsProps {
  unit: CountdownUnit;
  value: number | undefined;
  locales: Intl.LocalesArgument;
  compact?: boolean;
}

/** One unit's value: rolling digits, or dashes while the clock is pending. */
function Digits({ unit, value, locales, compact = false }: DigitsProps) {
  if (value === undefined) {
    return (
      <span data-slot="countdown-placeholder" className="text-muted-foreground">
        {unit === "days" && compact ? "–d" : "––"}
      </span>
    );
  }
  const options = unit === "days" ? (compact ? DAYS_COMPACT : undefined) : PAD;
  return <NumberFlow value={value} format={options} locales={locales} trend="down" />;
}

export { countdownVariants };
