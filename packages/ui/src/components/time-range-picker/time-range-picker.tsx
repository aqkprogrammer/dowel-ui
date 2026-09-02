"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { Input } from "@/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  DEFAULT_PRESETS,
  TimeExpressionError,
  absoluteExpression,
  describeTimeRange,
  formatResolvedRange,
  resolveTimeRange,
  type ResolvedRange,
  type TimeRangePreset,
} from "./time-expression";

/**
 * The control every observability product builds for itself.
 *
 * Grafana, Datadog, Sentry, PostHog, Vercel, Honeycomb, Cloudflare and
 * Amplitude each maintain a bespoke one, and no React package ships it, because
 * it looks like a date picker and is not one — see `time-expression.ts` for the
 * value model that makes the difference.
 *
 * Composed rather than reimplemented: Popover supplies the dialog semantics,
 * Calendar the absolute path, Input the expression entry.
 *
 * Two omissions are deliberate. No timezone picker — that is a 400-entry
 * combobox and a decision an app makes once, so `timeZone` is a prop. And no
 * comparison range; a second window belongs to whatever renders the chart.
 */

interface TimeRangeContextValue {
  value: string;
  setValue: (expression: string) => void;
  now: Date;
  timeZone?: string;
  locale?: string;
  presets: TimeRangePreset[];
  resolved: ResolvedRange | null;
  error: string | null;
  /** False until the clock is known, which on a server render is never. */
  clockReady: boolean;
  close: () => void;
  labelId: string;
}

/** Stands in until the clock is known. Never shown; see `clockReady`. */
const EPOCH = new Date(0);

/**
 * The clock, for callers who did not supply one.
 *
 * `useSyncExternalStore` rather than an effect, because this is the case it
 * exists for: a value the server cannot know. The server snapshot is null, so a
 * server render and the hydration render both commit to nothing clock-dependent
 * and cannot disagree; the real instant arrives in the re-render after.
 *
 * `getSnapshot` has to be referentially stable, so the instant is created once
 * for the page. That means every picker without a `now` prop shares it and none
 * of them advance — which is the whole reason the prop is there.
 */
const subscribeToNothing = () => () => undefined;
let sharedClock: Date | null = null;
const readSharedClock = () => (sharedClock ??= new Date());
const readNoClock = () => null;

const TimeRangeContext = createContext<TimeRangeContextValue | null>(null);

function useTimeRange(component: string): TimeRangeContextValue {
  const context = useContext(TimeRangeContext);
  if (!context) {
    throw new Error(`${component} must be used inside <TimeRange>.`);
  }
  return context;
}

export interface TimeRangeProps {
  /** The expression, e.g. `now-6h..now`. Controlled. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (expression: string) => void;
  /**
   * The instant relative expressions are measured from. Supplied by the
   * consumer so nothing here reads the clock during render. Pass a value that
   * changes when you refresh; a stable one holds the window still between them.
   */
  now?: Date;
  /** IANA zone the snapping happens in. Defaults to the runtime zone. */
  timeZone?: string;
  locale?: string;
  presets?: TimeRangePreset[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function TimeRange({
  value: valueProp,
  defaultValue = "now-6h..now",
  onValueChange,
  now,
  timeZone,
  locale,
  presets = DEFAULT_PRESETS,
  open: openProp,
  onOpenChange,
  children,
}: TimeRangeProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = valueProp ?? uncontrolledValue;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;

  const labelId = useId();

  // Reading the clock during render is what the `now` prop exists to avoid: the
  // server would render one instant and hydration another, and React would
  // throw out the tree. Until the fallback arrives, nothing clock-dependent is
  // rendered — the relative label, "Last 6 hours", does not need one, which is
  // why the trigger still says something useful in the meantime.
  const fallbackClock = useSyncExternalStore(subscribeToNothing, readSharedClock, readNoClock);

  const clock = now ?? fallbackClock;
  // A placeholder only for expressions that never mention `now`; anything that
  // does is gated on `clock` below rather than resolved against a fake instant.
  const effectiveNow = clock ?? EPOCH;

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const setValue = useCallback(
    (expression: string) => {
      if (valueProp === undefined) setUncontrolledValue(expression);
      onValueChange?.(expression);
    },
    [valueProp, onValueChange],
  );

  const { resolved, error } = useMemo(() => {
    // Claiming neither a window nor an error before the clock is known: an
    // expression cannot be judged against an instant nobody has read yet.
    if (!clock) return { resolved: null, error: null };
    try {
      return { resolved: resolveTimeRange(value, { now: clock, timeZone }), error: null };
    } catch (thrown) {
      return {
        resolved: null,
        error: thrown instanceof TimeExpressionError ? thrown.message : "Invalid time range.",
      };
    }
  }, [value, clock, timeZone]);

  const context = useMemo<TimeRangeContextValue>(
    () => ({
      value,
      setValue,
      now: effectiveNow,
      timeZone,
      locale,
      presets,
      resolved,
      error,
      clockReady: clock !== null,
      close: () => {
        setOpen(false);
      },
      labelId,
    }),
    [
      value,
      setValue,
      effectiveNow,
      clock,
      timeZone,
      locale,
      presets,
      resolved,
      error,
      setOpen,
      labelId,
    ],
  );

  return (
    <TimeRangeContext.Provider value={context}>
      <Popover open={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </TimeRangeContext.Provider>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4 opacity-70">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export interface TimeRangeTriggerProps extends ComponentPropsWithRef<"button"> {
  /** Shows the resolved window under the label. Off by default; it is long. */
  showResolved?: boolean;
}

/**
 * The button, named by the range it holds: "Last 6 hours", not two timestamps.
 * The resolved window stays reachable as the title, and as `showResolved`.
 */
export function TimeRangeTrigger({
  className,
  showResolved = false,
  ...props
}: TimeRangeTriggerProps) {
  const { value, now, timeZone, locale, presets, resolved, error } =
    useTimeRange("TimeRangeTrigger");

  const label = describeTimeRange(value, { now, timeZone, locale, presets });
  const resolvedText = resolved ? formatResolvedRange(resolved, { locale, timeZone }) : null;

  return (
    <PopoverTrigger asChild>
      <Button
        data-slot="time-range-trigger"
        variant="outline"
        aria-invalid={error ? true : undefined}
        title={resolvedText ?? undefined}
        className={cn("justify-start gap-2 font-normal", className)}
        {...props}
      >
        <ClockIcon />
        <span className="flex flex-col items-start leading-tight">
          <span>{label}</span>
          {showResolved && resolvedText ? (
            <span className="text-2xs font-normal text-muted-foreground">{resolvedText}</span>
          ) : null}
        </span>
        {/* The window the label stands for, for anyone who cannot see the
            title attribute. Read after the label, not instead of it. */}
        {resolvedText && !showResolved ? (
          <span className="sr-only">{`, ${resolvedText}`}</span>
        ) : null}
      </Button>
    </PopoverTrigger>
  );
}

export interface TimeRangeContentProps extends ComponentPropsWithRef<typeof PopoverContent> {
  /** Names the dialog. */
  label?: string;
}

export function TimeRangeContent({
  className,
  label = "Choose a time range",
  children,
  ...props
}: TimeRangeContentProps) {
  const { labelId } = useTimeRange("TimeRangeContent");

  return (
    <PopoverContent
      data-slot="time-range-content"
      aria-labelledby={labelId}
      align="start"
      className={cn("w-auto max-w-[min(38rem,calc(100vw-2rem))] p-0", className)}
      {...props}
    >
      <h2 id={labelId} className="sr-only">
        {label}
      </h2>
      <div className="flex flex-col gap-0 sm:flex-row sm:items-stretch">{children}</div>
    </PopoverContent>
  );
}

/**
 * The named ranges, which is how most of these are actually used. Buttons
 * rather than a radiogroup: choosing one both selects and dismisses, which is a
 * command, and `aria-pressed` still carries which one matches.
 */
export function TimeRangePresets({
  className,
  ...props
}: Omit<ComponentPropsWithRef<"div">, "children">) {
  const { presets, value, setValue, close } = useTimeRange("TimeRangePresets");

  const groups = useMemo(() => {
    const collected = new Map<string, TimeRangePreset[]>();
    for (const preset of presets) {
      const existing = collected.get(preset.group);
      if (existing) existing.push(preset);
      else collected.set(preset.group, [preset]);
    }
    return [...collected];
  }, [presets]);

  return (
    <div
      data-slot="time-range-presets"
      className={cn(
        "max-h-80 min-w-52 overflow-y-auto border-border p-1.5 sm:border-r",
        className,
      )}
      {...props}
    >
      {groups.map(([group, items]) => (
        <div key={group} role="group" aria-label={group} className="pb-1 last:pb-0">
          <p className="px-2 py-1 text-2xs font-medium tracking-wide text-muted-foreground uppercase">
            {group}
          </p>
          {items.map((preset) => (
            <button
              key={preset.expression}
              type="button"
              aria-pressed={preset.expression === value}
              onClick={() => {
                setValue(preset.expression);
                close();
              }}
              className={cn(
                "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                preset.expression === value
                  ? "bg-accent font-medium text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
                focusRing,
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Raw expression entry, with the resolved window shown as you type — the escape
 * hatch that keeps the presets from being a ceiling.
 *
 * An expression that does not parse says why and is not applied: a chart
 * quietly re-scoping itself to a window nobody asked for is worse than one that
 * refuses.
 */
export function TimeRangeExpression({
  className,
  ...props
}: Omit<ComponentPropsWithRef<"div">, "children">) {
  const { value, setValue, now, timeZone, locale, clockReady, close } =
    useTimeRange("TimeRangeExpression");

  const [draft, setDraft] = useState(value);
  // The expression can change under the input — a preset click, or the
  // consumer setting it. Adjusting during render rather than in an effect keeps
  // the field from showing a stale value for a frame.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  const feedbackId = useId();
  const preview = useMemo(() => {
    // Before the clock is known there is nothing to preview and nothing to
    // reject — saying "invalid" here would be a verdict reached without a fact.
    if (!clockReady) return { text: null, error: null as string | null };
    try {
      return {
        text: formatResolvedRange(resolveTimeRange(draft, { now, timeZone }), {
          locale,
          timeZone,
        }),
        error: null as string | null,
      };
    } catch (thrown) {
      return {
        text: null,
        error: thrown instanceof TimeExpressionError ? thrown.message : "Invalid time range.",
      };
    }
  }, [draft, now, timeZone, locale, clockReady]);

  const apply = () => {
    if (preview.error || !clockReady) return;
    setValue(draft.trim());
    close();
  };

  return (
    <div
      data-slot="time-range-expression"
      className={cn(
        "flex flex-col gap-1.5 border-t border-border p-3 sm:border-t-0",
        className,
      )}
      {...props}
    >
      <label htmlFor={feedbackId + "-input"} className="text-xs font-medium">
        Expression
      </label>
      <div className="flex gap-2">
        <Input
          id={feedbackId + "-input"}
          inputSize="sm"
          value={draft}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={preview.error ? true : undefined}
          aria-describedby={feedbackId}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
          className="font-mono"
        />
        <Button size="sm" onClick={apply} disabled={Boolean(preview.error) || !clockReady}>
          Apply
        </Button>
      </div>
      {/* One element for both outcomes, so a screen reader hears the error
          replace the preview rather than accumulating two descriptions. */}
      <p
        id={feedbackId}
        className={cn(
          "min-h-4 text-2xs",
          preview.error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {preview.error ?? preview.text}
      </p>
    </div>
  );
}

/**
 * The absolute path, for a window with no relative meaning. Picking dates
 * writes a concrete expression: "1 to 7 March" does not become relative just
 * because it was chosen here.
 */
export function TimeRangeCalendar({
  className,
  numberOfMonths = 1,
  ...props
}: Omit<ComponentPropsWithRef<"div">, "children"> & { numberOfMonths?: number }) {
  const { setValue, resolved, close } = useTimeRange("TimeRangeCalendar");

  const [selection, setSelection] = useState<DateRange | undefined>(() =>
    resolved ? { from: resolved.from, to: resolved.to } : undefined,
  );

  return (
    <div
      data-slot="time-range-calendar"
      className={cn("border-t border-border p-1 sm:border-t-0 sm:border-l", className)}
      {...props}
    >
      <Calendar
        mode="range"
        selected={selection}
        defaultMonth={selection?.from}
        numberOfMonths={numberOfMonths}
        onSelect={(next) => {
          setSelection(next);
          // Only once both ends exist. One click is half an answer, and
          // applying it would show a zero-length range mid-gesture.
          if (next?.from && next.to) {
            setValue(absoluteExpression(startOfDay(next.from), endOfDay(next.to)));
            close();
          }
        }}
      />
    </div>
  );
}

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * A day picked as the end of a range means the whole of that day. Taking
 * midnight instead silently drops the last day's data, which is the same
 * off-by-one that `now/d..now/d` has to avoid.
 */
function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}
