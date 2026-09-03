/**
 * The five-field cron expression, as a value: parsed, described in words, and
 * projected onto a calendar in a named time zone.
 *
 * The dialect is the POSIX one — minute, hour, day of month, month, day of
 * week — which is what crontab, GitHub Actions, Vercel, Kubernetes and Airflow
 * all read. Not the Quartz one: no seconds field and no `L`, `W` or `#`,
 * because the products people schedule from a form do not accept them, and an
 * expression this editor produces has to run where it is pasted. The `@daily`
 * family of shortcuts is accepted, since crontab accepts it.
 *
 * Everything here is pure and takes its clock as an argument, so the
 * description, the run times and the two things every reimplementation gets
 * wrong — day-of-month OR day-of-week, and a wall-clock time that does not
 * exist on the day the clocks go forward — are tested without rendering
 * anything, and an application can compute the next run on the server from
 * the same expression the editor produced.
 */

export type CronField = "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";

export class CronExpressionError extends Error {
  constructor(
    message: string,
    /** Which of the five fields is wrong, when one is. */
    public readonly field?: CronField,
  ) {
    super(message);
    this.name = "CronExpressionError";
  }
}

export interface CronSchedule {
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  /** 0 to 6, Sunday first. `7` in the source is folded into 0. */
  daysOfWeek: number[];
  /**
   * Whether each day field was written as something other than `*`. Cron's
   * rule, which every reimplementation gets wrong at least once: when both are
   * restricted a day matches if EITHER does, not both.
   */
  dayOfMonthRestricted: boolean;
  dayOfWeekRestricted: boolean;
  /** The expression with any shortcut expanded. */
  expression: string;
}

const FIELDS: readonly CronField[] = ["minute", "hour", "dayOfMonth", "month", "dayOfWeek"];

const RANGES: Record<CronField, { min: number; max: number; label: string }> = {
  minute: { min: 0, max: 59, label: "Minute" },
  hour: { min: 0, max: 23, label: "Hour" },
  dayOfMonth: { min: 1, max: 31, label: "Day of month" },
  month: { min: 1, max: 12, label: "Month" },
  dayOfWeek: { min: 0, max: 7, label: "Day of week" },
};

const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export const CRON_SHORTCUTS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

function nameToNumber(token: string, field: CronField): number | null {
  const upper = token.toUpperCase();
  if (field === "month") {
    const index = MONTH_NAMES.indexOf(upper);
    return index === -1 ? null : index + 1;
  }
  if (field === "dayOfWeek") {
    const index = DAY_NAMES.indexOf(upper);
    return index === -1 ? null : index;
  }
  return null;
}

function parseNumber(token: string, field: CronField): number {
  const { min, max, label } = RANGES[field];
  const named = nameToNumber(token, field);
  const value = named ?? (/^\d+$/.test(token) ? Number(token) : Number.NaN);
  if (Number.isNaN(value)) {
    throw new CronExpressionError(
      `${label}: "${token}" is not a number${field === "month" || field === "dayOfWeek" ? " or a name" : ""}.`,
      field,
    );
  }
  if (value < min || value > max) {
    throw new CronExpressionError(
      `${label} must be ${String(min)}–${String(max)}, not ${String(value)}.`,
      field,
    );
  }
  return value;
}

/** One field's set of values, in order and without duplicates. */
function parseField(text: string, field: CronField): { values: number[]; restricted: boolean } {
  const { min, max, label } = RANGES[field];
  // Day of week runs 0–7 in the source and 0–6 in the result.
  const top = field === "dayOfWeek" ? 6 : max;
  const values = new Set<number>();
  let restricted = false;

  for (const part of text.split(",")) {
    if (part === "") throw new CronExpressionError(`${label}: empty item in "${text}".`, field);

    const [rangeText, stepText, ...extra] = part.split("/");
    if (extra.length > 0 || stepText === "") {
      throw new CronExpressionError(`${label}: "${part}" has a malformed step.`, field);
    }
    const step = stepText === undefined ? 1 : Number(stepText);
    if (stepText !== undefined && (!/^\d+$/.test(stepText) || step < 1)) {
      throw new CronExpressionError(
        `${label}: step must be a whole number of 1 or more, not "${stepText}".`,
        field,
      );
    }

    let start: number;
    let end: number;
    if (rangeText === "*") {
      start = min;
      end = top;
      if (stepText !== undefined) restricted = true;
    } else if (rangeText === undefined) {
      throw new CronExpressionError(`${label}: "${part}" is empty.`, field);
    } else {
      restricted = true;
      const [startText, endText, ...more] = rangeText.split("-");
      if (more.length > 0 || startText === undefined || startText === "") {
        throw new CronExpressionError(`${label}: "${rangeText}" is not a range.`, field);
      }
      start = parseNumber(startText, field);
      if (endText === undefined) {
        // A bare number with a step, `5/10`, means "from 5 onwards" in Vixie cron.
        end = stepText === undefined ? start : top;
      } else {
        if (endText === "")
          throw new CronExpressionError(`${label}: "${rangeText}" is missing its end.`, field);
        end = parseNumber(endText, field);
        if (end < start) {
          throw new CronExpressionError(
            `${label}: ${String(start)}-${String(end)} runs backwards.`,
            field,
          );
        }
      }
    }

    for (let value = start; value <= end; value += step) {
      values.add(field === "dayOfWeek" && value === 7 ? 0 : value);
    }
  }

  return { values: [...values].sort((a, b) => a - b), restricted };
}

export function parseCron(expression: string): CronSchedule {
  const trimmed = expression.trim();
  if (trimmed === "") throw new CronExpressionError("Enter a schedule.");

  const expanded = trimmed.startsWith("@") ? CRON_SHORTCUTS[trimmed.toLowerCase()] : trimmed;
  if (expanded === undefined) {
    throw new CronExpressionError(
      `"${trimmed}" is not a shortcut. Try @hourly, @daily, @weekly, @monthly or @yearly.`,
    );
  }

  const parts = expanded.split(/\s+/);
  if (parts.length !== 5) {
    throw new CronExpressionError(
      `Expected 5 fields — minute, hour, day of month, month, day of week — not ${String(parts.length)}.`,
    );
  }

  const fields = FIELDS.map((field, index) => parseField(parts[index] ?? "", field));
  const at = (index: number) => fields[index] ?? { values: [], restricted: false };
  const [minute, hour, dayOfMonth, month, dayOfWeek] = [at(0), at(1), at(2), at(3), at(4)];

  return {
    minutes: minute.values,
    hours: hour.values,
    daysOfMonth: dayOfMonth.values,
    months: month.values,
    daysOfWeek: dayOfWeek.values,
    dayOfMonthRestricted: dayOfMonth.restricted,
    dayOfWeekRestricted: dayOfWeek.restricted,
    expression: parts.join(" "),
  };
}

export function isValidCron(expression: string): boolean {
  try {
    parseCron(expression);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Describing                                                         */
/* ------------------------------------------------------------------ */

export interface DescribeOptions {
  locale?: string;
}

/** "1, 2 and 3", or "1 to 5" when the values are consecutive. */
function listOf(items: string[], consecutive: boolean): string {
  if (items.length === 1) return items[0] ?? "";
  if (consecutive && items.length > 2)
    return `${items[0] ?? ""} to ${items[items.length - 1] ?? ""}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1] ?? ""}`;
}

function isConsecutive(values: number[]): boolean {
  return values.every((value, index) => index === 0 || value === (values[index - 1] ?? 0) + 1);
}

/** The step a field was written with, when it was written as a star over a number. */
function stepOf(text: string): number | null {
  const match = /^\*\/(\d+)$/.exec(text);
  return match ? Number(match[1]) : null;
}

function ordinal(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  const suffix =
    rem10 === 1 && rem100 !== 11
      ? "st"
      : rem10 === 2 && rem100 !== 12
        ? "nd"
        : rem10 === 3 && rem100 !== 13
          ? "rd"
          : "th";
  return `${String(n)}${suffix}`;
}

function formatTime(hour: number, minute: number, locale?: string): string {
  // Formatted in UTC from a UTC instant, so the runtime zone cannot shift it.
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(Date.UTC(2026, 0, 1, hour, minute));
}

function dayName(index: number, locale?: string): string {
  // 4 January 2026 is a Sunday.
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
    new Date(2026, 0, 4 + index),
  );
}

function monthName(index: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long" }).format(
    new Date(2026, index - 1, 1),
  );
}

/**
 * The schedule in a sentence.
 *
 * Every product that has this control renders "Every Monday at 09:00" beside
 * the expression, because `0 9 * * 1` is not something most people can read.
 * Throws for an invalid expression; the editor turns that into the field's
 * error text.
 */
export function describeCron(expression: string, options: DescribeOptions = {}): string {
  const { locale } = options;
  const schedule = parseCron(expression);
  const [minuteText = "", hourText = "", dayText = "", monthText = ""] =
    schedule.expression.split(" ");

  const every = (label: string, n: number) =>
    n === 1 ? `every ${label}` : `every ${ordinal(n)} ${label}`;

  // Time of day.
  let time: string;
  const minuteStep = stepOf(minuteText);
  const hourStep = stepOf(hourText);
  const allMinutes = minuteText === "*";
  const allHours = hourText === "*";

  if (allMinutes && allHours) {
    time = "Every minute";
  } else if (minuteStep !== null && allHours) {
    time = `Every ${minuteStep === 1 ? "minute" : `${String(minuteStep)} minutes`}`;
  } else if (allMinutes) {
    time = `Every minute of ${listOf(
      schedule.hours.map((h) => formatTime(h, 0, locale)),
      isConsecutive(schedule.hours),
    )}`;
  } else if (allHours || hourStep !== null) {
    const hours = hourStep !== null && hourStep > 1 ? every("hour", hourStep) : "every hour";
    if (minuteStep !== null) {
      time = `Every ${String(minuteStep)} minutes of ${hours}`;
    } else {
      time = `At minute ${listOf(schedule.minutes.map(String), isConsecutive(schedule.minutes))} past ${hours}`;
    }
  } else if (minuteStep !== null) {
    time = `Every ${String(minuteStep)} minutes during ${listOf(
      schedule.hours.map((h) => formatTime(h, 0, locale)),
      isConsecutive(schedule.hours),
    )}`;
  } else if (schedule.minutes.length === 1) {
    const minute = schedule.minutes[0] ?? 0;
    time = `At ${listOf(
      schedule.hours.map((h) => formatTime(h, minute, locale)),
      false,
    )}`;
  } else {
    time = `At minute ${listOf(schedule.minutes.map(String), isConsecutive(schedule.minutes))} past ${listOf(
      schedule.hours.map((h) => formatTime(h, 0, locale)),
      isConsecutive(schedule.hours),
    )}`;
  }

  // Days. When both day fields are restricted a day matches if either does —
  // said with "or", because "and" is what readers assume and it is wrong.
  const dayPhrases: string[] = [];
  if (schedule.dayOfMonthRestricted) {
    const step = stepOf(dayText);
    dayPhrases.push(
      step !== null
        ? `${every("day", step)} of the month`
        : `on day ${listOf(schedule.daysOfMonth.map(String), isConsecutive(schedule.daysOfMonth))} of the month`,
    );
  }
  if (schedule.dayOfWeekRestricted) {
    dayPhrases.push(
      `on ${listOf(
        schedule.daysOfWeek.map((d) => dayName(d, locale)),
        isConsecutive(schedule.daysOfWeek),
      )}`,
    );
  }
  let days = dayPhrases.join(", or ");

  // A fixed time of day with no day named is every day. "Every 15 minutes"
  // already says how often, and "every day" after it would be noise.
  const fixedTime = !allMinutes && !allHours && minuteStep === null && hourStep === null;
  if (!days && fixedTime) days = "every day";

  if (schedule.months.length < 12) {
    const step = stepOf(monthText);
    const months =
      step !== null
        ? every("month", step)
        : listOf(
            schedule.months.map((m) => monthName(m, locale)),
            isConsecutive(schedule.months),
          );
    days = `${days ? `${days} ` : ""}in ${months}`;
  }

  return days ? `${time} ${days}` : time;
}

/* ------------------------------------------------------------------ */
/*  Next runs                                                          */
/* ------------------------------------------------------------------ */

export interface NextRunsOptions {
  /** Runs strictly after this instant. */
  from: Date;
  count?: number;
  /** IANA zone the expression's wall-clock times are in. Defaults to the runtime zone. */
  timeZone?: string;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday. */
  weekday: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? "";
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

function wallClockOf(instant: number, timeZone: string | undefined): WallClock {
  const parts: Record<string, string> = {};
  for (const part of formatterFor(timeZone).formatToParts(new Date(instant))) {
    parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: DAY_NAMES.indexOf((parts.weekday ?? "").slice(0, 3).toUpperCase()),
  };
}

function offsetAt(instant: number, timeZone: string | undefined): number {
  const wall = wallClockOf(instant, timeZone);
  return (
    Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute) -
    Math.floor(instant / 60_000) * 60_000
  );
}

/**
 * The instant a wall-clock time names in a zone, or null when it names none —
 * the hour the clocks skip in spring. An ambiguous time, in the hour that
 * repeats in autumn, resolves to its first occurrence.
 */
export function zonedTimeToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string | undefined,
): number | null {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // Each pass corrects the guess by the offset in force at the previous
  // answer; across a DST change the two answers are the two candidates.
  const candidates = new Set<number>();
  // Seeded from a day either side as well, so the offset that stopped
  // applying an hour ago — the one that makes an autumn time ambiguous — is
  // still tried.
  const oneDay = 24 * 60 * 60_000;
  for (const seed of [guess, guess - oneDay, guess + oneDay]) {
    let instant = seed;
    for (let pass = 0; pass < 2; pass += 1) {
      instant = guess - offsetAt(instant, timeZone);
      candidates.add(instant);
    }
  }
  for (const candidate of [...candidates].sort((a, b) => a - b)) {
    const wall = wallClockOf(candidate, timeZone);
    if (
      wall.year === year &&
      wall.month === month &&
      wall.day === day &&
      wall.hour === hour &&
      wall.minute === minute
    ) {
      return candidate;
    }
  }
  return null;
}

/** Roughly five years of days: enough to find the 29th of February, and to give up on the 30th. */
const MAX_DAYS = 366 * 5;

/**
 * The next `count` instants the schedule fires, in order.
 *
 * Fewer than `count` are returned when the schedule cannot produce them —
 * `0 0 30 2 *` never runs, and saying so beats a spinner.
 */
export function nextRuns(expression: string, options: NextRunsOptions): Date[] {
  const { from, count = 5, timeZone } = options;
  const schedule = parseCron(expression);
  const runs: Date[] = [];

  const start = Math.floor(from.getTime() / 60_000) * 60_000 + 60_000;
  const months = new Set(schedule.months);
  const daysOfMonth = new Set(schedule.daysOfMonth);
  const daysOfWeek = new Set(schedule.daysOfWeek);

  const dayMatches = (wall: WallClock): boolean => {
    if (!months.has(wall.month)) return false;
    const domMatch = daysOfMonth.has(wall.day);
    const dowMatch = daysOfWeek.has(wall.weekday);
    if (schedule.dayOfMonthRestricted && schedule.dayOfWeekRestricted)
      return domMatch || dowMatch;
    if (schedule.dayOfMonthRestricted) return domMatch;
    if (schedule.dayOfWeekRestricted) return dowMatch;
    return true;
  };

  // Walk day by day from noon, which no DST change touches, so that stepping
  // 24 hours always lands in the next calendar day.
  const first = wallClockOf(start, timeZone);
  let noon = zonedTimeToInstant(first.year, first.month, first.day, 12, 0, timeZone);
  if (noon === null) return runs;

  for (let i = 0; i < MAX_DAYS && runs.length < count; i += 1, noon += 24 * 60 * 60_000) {
    const wall = wallClockOf(noon, timeZone);
    if (!dayMatches(wall)) continue;

    for (const hour of schedule.hours) {
      for (const minute of schedule.minutes) {
        const instant = zonedTimeToInstant(
          wall.year,
          wall.month,
          wall.day,
          hour,
          minute,
          timeZone,
        );
        if (instant === null || instant < start) continue;
        runs.push(new Date(instant));
        if (runs.length >= count) return runs;
      }
    }
  }

  return runs;
}
