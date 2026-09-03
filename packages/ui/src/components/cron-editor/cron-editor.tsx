"use client";

import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { Input } from "@/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  CronExpressionError,
  describeCron,
  nextRuns,
  parseCron,
  type CronSchedule,
} from "./cron-expression";

/**
 * The "run this nightly" control.
 *
 * GitHub Actions, Vercel, Airflow, Sentry and every admin panel with a
 * schedule draws one by hand: a few frequency controls that write a cron
 * expression, the expression itself for anyone who can read it, the sentence
 * beside it for everyone else, and the next few runs so a mistake is visible
 * before it is saved. The packages that exist are bound to Ant Design or ship
 * their own stylesheet — see `cron-expression.ts` for the value model, which
 * is where the two mistakes every reimplementation makes actually live.
 *
 * Composed from the library's own Select and Input, and split into parts so
 * an app can show the expression and its reading without the builder, or the
 * next runs beside a saved schedule.
 */

interface CronContextValue {
  value: string;
  setValue: (expression: string) => void;
  schedule: CronSchedule | null;
  timeZone?: string;
  locale?: string;
  /** Null until the clock is known, which on a server render is never. */
  now: Date | null;
}

const CronContext = createContext<CronContextValue | null>(null);

function useCron(component: string): CronContextValue {
  const context = useContext(CronContext);
  if (!context) throw new Error(`${component} must be used inside <Cron>.`);
  return context;
}

/* The clock, for callers who did not supply one — the same arrangement as
   time-range-picker: a null server snapshot, so nothing clock-dependent is
   rendered until the real instant arrives after hydration. */
const subscribeToNothing = () => () => undefined;
let sharedClock: Date | null = null;
const readSharedClock = () => (sharedClock ??= new Date());
const readNoClock = () => null;

export interface CronProps extends Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onChange" | "children"
> {
  /** The expression. Controlled. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (expression: string) => void;
  /** IANA zone the expression's times are in. Defaults to the runtime zone. */
  timeZone?: string;
  locale?: string;
  /** The instant next runs are counted from. Pass one that changes when you refresh. */
  now?: Date;
  children: ReactNode;
}

export function Cron({
  className,
  value: valueProp,
  defaultValue = "0 9 * * 1",
  onValueChange,
  timeZone,
  locale,
  now,
  children,
  ...props
}: CronProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = valueProp ?? uncontrolled;

  const fallbackClock = useSyncExternalStore(subscribeToNothing, readSharedClock, readNoClock);
  const clock = now ?? fallbackClock;

  const schedule = useMemo(() => {
    try {
      return parseCron(value);
    } catch {
      return null;
    }
  }, [value]);

  const context = useMemo<CronContextValue>(
    () => ({
      value,
      setValue: (expression) => {
        setUncontrolled(expression);
        onValueChange?.(expression);
      },
      schedule,
      timeZone,
      locale,
      now: clock,
    }),
    [value, schedule, timeZone, locale, clock, onValueChange],
  );

  return (
    <CronContext.Provider value={context}>
      <div data-slot="cron-editor" className={cn("flex flex-col gap-4", className)} {...props}>
        {children}
      </div>
    </CronContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

type Frequency = "minute" | "hour" | "day" | "week" | "month" | "year" | "custom";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "minute", label: "Every minute" },
  { value: "hour", label: "Every hour" },
  { value: "day", label: "Every day" },
  { value: "week", label: "Every week" },
  { value: "month", label: "Every month" },
  { value: "year", label: "Every year" },
  { value: "custom", label: "Custom" },
];

interface BuilderState {
  frequency: Frequency;
  minuteStep: number;
  hourStep: number;
  minute: number;
  hour: number;
  /** 0 = Sunday. */
  days: number[];
  dayOfMonth: number;
  month: number;
}

const isNumber = (token: string) => /^\d+$/.test(token);
const isStar = (token: string) => token === "*";
const stepOf = (token: string) => (/^\*\/\d+$/.test(token) ? Number(token.slice(2)) : null);

/**
 * Which builder shape an expression fits, if any. Anything the controls
 * cannot express — every 15 minutes during office hours, say — is "custom",
 * and the expression field becomes the editor rather than the builder quietly
 * showing something else.
 */
function classify(schedule: CronSchedule | null): BuilderState {
  const state: BuilderState = {
    frequency: "custom",
    minuteStep: 1,
    hourStep: 1,
    minute: 0,
    hour: 9,
    days: [1],
    dayOfMonth: 1,
    month: 1,
  };
  if (!schedule) return state;

  const [m = "", h = "", dom = "", mon = "", dow = ""] = schedule.expression.split(" ");
  if (isNumber(m)) state.minute = schedule.minutes[0] ?? 0;
  if (isNumber(h)) state.hour = schedule.hours[0] ?? 0;

  const restStar = isStar(dom) && isStar(mon) && isStar(dow);
  const timeFixed = isNumber(m) && isNumber(h);

  if ((isStar(m) || stepOf(m) !== null) && isStar(h) && restStar) {
    state.frequency = "minute";
    state.minuteStep = stepOf(m) ?? 1;
  } else if (isNumber(m) && (isStar(h) || stepOf(h) !== null) && restStar) {
    state.frequency = "hour";
    state.hourStep = stepOf(h) ?? 1;
  } else if (timeFixed && restStar) {
    state.frequency = "day";
  } else if (timeFixed && isStar(dom) && isStar(mon) && !dow.includes("/")) {
    state.frequency = "week";
    state.days = schedule.daysOfWeek;
  } else if (timeFixed && isNumber(dom) && isStar(mon) && isStar(dow)) {
    state.frequency = "month";
    state.dayOfMonth = schedule.daysOfMonth[0] ?? 1;
  } else if (
    timeFixed &&
    isNumber(dom) &&
    schedule.months.length === 1 &&
    !/[-,/]/.test(mon) &&
    isStar(dow)
  ) {
    state.frequency = "year";
    state.dayOfMonth = schedule.daysOfMonth[0] ?? 1;
    state.month = schedule.months[0] ?? 1;
  }
  return state;
}

/** `1,2,3,4,5` written the way people write it: `1-5`. Runs of two stay a list. */
function compressDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === (sorted[j] ?? 0) + 1) j += 1;
    const first = String(sorted[i] ?? 0);
    const last = String(sorted[j] ?? 0);
    parts.push(j - i >= 2 ? `${first}-${last}` : j > i ? `${first},${last}` : first);
    i = j + 1;
  }
  return parts.join(",");
}

function build(state: BuilderState, current: string): string {
  const { minute, hour, dayOfMonth, month } = state;
  switch (state.frequency) {
    case "minute":
      return `${state.minuteStep > 1 ? `*/${String(state.minuteStep)}` : "*"} * * * *`;
    case "hour":
      return `${String(minute)} ${state.hourStep > 1 ? `*/${String(state.hourStep)}` : "*"} * * *`;
    case "day":
      return `${String(minute)} ${String(hour)} * * *`;
    case "week":
      return `${String(minute)} ${String(hour)} * * ${compressDays(state.days)}`;
    case "month":
      return `${String(minute)} ${String(hour)} ${String(dayOfMonth)} * *`;
    case "year":
      return `${String(minute)} ${String(hour)} ${String(dayOfMonth)} ${String(month)} *`;
    case "custom":
      return current;
  }
}

/** Monday first, Sunday last. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];
// 4 January 2026 is a Sunday; 1 January 2026 is in month 1.
const weekdayName = (day: number, locale: string | undefined, style: "long" | "short") =>
  new Intl.DateTimeFormat(locale, { weekday: style }).format(new Date(2026, 0, 4 + day));
const monthName = (month: number, locale: string | undefined) =>
  new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2026, month - 1, 1));

export type CronBuilderProps = Omit<ComponentPropsWithRef<"div">, "children">;

export function CronBuilder({ className, ...props }: CronBuilderProps) {
  const { value, setValue, schedule, locale } = useCron("CronBuilder");
  const uid = useId();
  const state = useMemo(() => classify(schedule), [schedule]);

  const update = (patch: Partial<BuilderState>) => {
    setValue(build({ ...state, ...patch }, value));
  };

  const numberField = (
    key: "minuteStep" | "hourStep" | "minute" | "dayOfMonth",
    label: string,
    min: number,
    max: number,
    describedBy?: string,
  ) => (
    <NumberField
      id={`${uid}-${key}`}
      label={label}
      min={min}
      max={max}
      value={state[key]}
      describedBy={describedBy}
      onCommit={(next) => {
        update({ [key]: next });
      }}
    />
  );

  const hasTime = ["day", "week", "month", "year"].includes(state.frequency);
  const hasDayOfMonth = state.frequency === "month" || state.frequency === "year";
  const dayHintId = `${uid}-day-hint`;
  const daysHintId = `${uid}-days-hint`;

  return (
    <div
      data-slot="cron-builder"
      data-frequency={state.frequency}
      className={cn("flex flex-wrap items-end gap-3", className)}
      {...props}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-frequency`} className="text-xs font-medium">
          Frequency
        </label>
        <Select
          value={state.frequency}
          onValueChange={(frequency) => {
            update({ frequency: frequency as Frequency });
          }}
        >
          <SelectTrigger id={`${uid}-frequency`} className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.frequency === "minute"
        ? numberField("minuteStep", "Every how many minutes", 1, 59)
        : null}

      {state.frequency === "hour" ? (
        <>
          {numberField("hourStep", "Every how many hours", 1, 23)}
          {numberField("minute", "At minute", 0, 59)}
        </>
      ) : null}

      {hasTime ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-time`} className="text-xs font-medium">
            At
          </label>
          <Input
            id={`${uid}-time`}
            type="time"
            inputSize="sm"
            className="w-32"
            value={`${String(state.hour).padStart(2, "0")}:${String(state.minute).padStart(2, "0")}`}
            onChange={(event) => {
              const [hour, minute] = event.target.value.split(":").map(Number);
              if (
                hour === undefined ||
                minute === undefined ||
                Number.isNaN(hour) ||
                Number.isNaN(minute)
              ) {
                return;
              }
              update({ hour, minute });
            }}
          />
        </div>
      ) : null}

      {state.frequency === "week" ? (
        <div className="flex flex-col gap-1.5">
          <span id={`${uid}-days-label`} className="text-xs font-medium">
            On
          </span>
          <div
            role="group"
            aria-labelledby={`${uid}-days-label`}
            aria-describedby={daysHintId}
            className="flex gap-1"
          >
            {WEEK.map((day) => {
              const pressed = state.days.includes(day);
              const last = pressed && state.days.length === 1;
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={pressed}
                  aria-label={weekdayName(day, locale, "long")}
                  className={cn(
                    "h-8 min-w-9 rounded-md border px-2 text-xs font-medium transition-colors",
                    pressed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
                    focusRing,
                  )}
                  onClick={() => {
                    // The last day stays: a week schedule with no day is not a
                    // schedule. The group's description says so, so the refusal
                    // is not silent.
                    if (last) return;
                    update({
                      days: pressed
                        ? state.days.filter((d) => d !== day)
                        : [...state.days, day],
                    });
                  }}
                >
                  {weekdayName(day, locale, "short")}
                </button>
              );
            })}
          </div>
          <p id={daysHintId} className="text-xs text-muted-foreground">
            Pick at least one day.
          </p>
        </div>
      ) : null}

      {hasDayOfMonth ? (
        <div className="flex flex-col gap-1.5">
          {numberField(
            "dayOfMonth",
            "On day",
            1,
            31,
            state.dayOfMonth > 28 ? dayHintId : undefined,
          )}
          {state.dayOfMonth > 28 ? (
            <p id={dayHintId} data-slot="cron-day-hint" className="text-xs text-warning">
              Months with fewer days skip this run.
            </p>
          ) : null}
        </div>
      ) : null}

      {state.frequency === "year" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-month`} className="text-xs font-medium">
            In
          </label>
          <Select
            value={String(state.month)}
            onValueChange={(month) => {
              update({ month: Number(month) });
            }}
          >
            <SelectTrigger id={`${uid}-month`} className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <SelectItem key={month} value={String(month)}>
                  {monthName(month, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {state.frequency === "custom" ? (
        <p className="text-xs text-muted-foreground">
          This schedule needs the expression. Edit it below.
        </p>
      ) : null}
    </div>
  );
}

/**
 * A number the builder owns, with the text the reader is typing kept apart
 * from the value — so clearing the field to type a new number does not snap
 * it back to the old one after the first keystroke.
 */
function NumberField({
  id,
  label,
  min,
  max,
  value,
  describedBy,
  onCommit,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  describedBy?: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(String(value));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        inputSize="sm"
        min={min}
        max={max}
        value={draft}
        aria-describedby={describedBy}
        className="w-24"
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          const next = Number(text);
          if (text === "" || !Number.isInteger(next) || next < min || next > max) return;
          if (next !== value) onCommit(next);
        }}
        onBlur={() => {
          // Whatever was left half-typed goes back to the value in force.
          if (draft !== String(value)) setDraft(String(value));
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Expression                                                         */
/* ------------------------------------------------------------------ */

export type CronExpressionProps = Omit<ComponentPropsWithRef<"div">, "children">;

/**
 * The expression, editable, with its reading underneath — or the reason it is
 * invalid. An invalid entry is never applied: the last valid schedule stands
 * until the field says something that parses.
 */
export function CronExpression({ className, ...props }: CronExpressionProps) {
  const { value, setValue, locale } = useCron("CronExpression");
  const id = useId();

  const [draft, setDraft] = useState(value);
  // The value can change under the field — the builder, or the consumer.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  const feedback = useMemo(() => {
    try {
      return { text: describeCron(draft, { locale }), error: null as string | null };
    } catch (thrown) {
      return {
        text: null,
        error: thrown instanceof CronExpressionError ? thrown.message : "Invalid schedule.",
      };
    }
  }, [draft, locale]);

  return (
    <div
      data-slot="cron-expression"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      <label htmlFor={`${id}-input`} className="text-xs font-medium">
        Expression
      </label>
      <Input
        id={`${id}-input`}
        inputSize="sm"
        value={draft}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={feedback.error ? true : undefined}
        aria-describedby={`${id}-feedback`}
        className="font-mono"
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          try {
            parseCron(next);
            setValue(next.trim());
          } catch {
            // Said in the feedback; the last valid schedule stands.
          }
        }}
      />
      {/* One element for both, so a reader hears the error replace the
          reading rather than both at once. */}
      <p
        id={`${id}-feedback`}
        data-slot="cron-feedback"
        className={cn("text-xs", feedback.error ? "text-destructive" : "text-muted-foreground")}
      >
        {feedback.error ?? feedback.text}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Next runs                                                          */
/* ------------------------------------------------------------------ */

export interface CronNextRunsProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  count?: number;
}

/**
 * When it will fire, in the zone it is defined in. The zone is in the
 * heading because a time with no zone is the classic scheduling mistake, and
 * a schedule that never runs says so rather than showing an empty list.
 */
export function CronNextRuns({ className, count = 5, ...props }: CronNextRunsProps) {
  const { value, schedule, timeZone, locale, now } = useCron("CronNextRuns");
  const headingId = useId();

  const runs = useMemo(
    () => (now && schedule ? nextRuns(value, { from: now, count, timeZone }) : null),
    [value, schedule, now, count, timeZone],
  );

  // Nothing clock-dependent before the clock is known.
  if (!runs) return null;

  const format = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });

  return (
    <div
      data-slot="cron-next-runs"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      <p id={headingId} className="text-xs font-medium">
        Next {count === 1 ? "run" : `${String(count)} runs`}
        <span className="font-normal text-muted-foreground">
          {" · "}
          {timeZone ?? "local time"}
        </span>
      </p>
      {runs.length === 0 ? (
        <p data-slot="cron-never" className="text-xs text-destructive">
          Never runs: no day matches this schedule.
        </p>
      ) : (
        <ol
          aria-labelledby={headingId}
          className="m-0 flex list-none flex-col gap-0.5 p-0 text-sm"
        >
          {runs.map((run) => (
            <li key={run.toISOString()}>
              <time dateTime={run.toISOString()} className="tabular-nums">
                {format.format(run)}
              </time>
            </li>
          ))}
          {runs.length < count ? (
            <li className="text-xs text-muted-foreground">Then nothing within five years.</li>
          ) : null}
        </ol>
      )}
    </div>
  );
}
