/**
 * Time ranges as expressions, not as two frozen timestamps.
 *
 * `now-6h` is still the last six hours tomorrow; a resolved pair is six hours
 * of last Tuesday forever. Storing the expression is what lets a dashboard URL
 * survive being bookmarked and reloaded.
 *
 * The grammar is a deliberate subset of the one Grafana, Datadog and Kibana
 * converged on, so the strings are already familiar:
 *
 *   range  := expr ".." expr
 *   expr   := "now" offset* snap? | ISO-8601
 *   offset := ("-" | "+") digits unit
 *   snap   := "/" unit
 *   unit   := s | m | h | d | w | M | y
 *
 *   now-6h..now          the last six hours
 *   now-6h/h..now        the last six hours, starting on the hour
 *   now/d..now/d         today, all of it
 *   now-1d/d..now-1d/d   yesterday
 *   2026-01-01..now      since a fixed instant
 *
 * Everything here is pure and takes `now` as an argument: reading the clock
 * during render would disagree between the server and the browser.
 */

export type TimeUnit = "s" | "m" | "h" | "d" | "w" | "M" | "y";

export interface ResolveOptions {
  /** The instant `now` refers to. Required, so nothing here reads the clock. */
  now: Date;
  /**
   * IANA zone the snapping happens in — "start of day" is a different instant
   * in Auckland than in Denver. Defaults to the runtime zone.
   */
  timeZone?: string;
}

export interface ResolvedRange {
  from: Date;
  to: Date;
}

/** Why an expression could not be resolved. Shown to the user verbatim. */
export class TimeExpressionError extends Error {
  constructor(
    message: string,
    /** The part of the input at fault, for pointing at it. */
    readonly input: string,
  ) {
    super(message);
    this.name = "TimeExpressionError";
  }
}

const UNIT_NAMES: Record<TimeUnit, string> = {
  s: "second",
  m: "minute",
  h: "hour",
  d: "day",
  w: "week",
  M: "month",
  y: "year",
};

const UNITS = new Set(Object.keys(UNIT_NAMES) as TimeUnit[]);

/* ------------------------------------------------------------------ */
/*  Zone arithmetic                                                    */
/* ------------------------------------------------------------------ */

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
}

const PART_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = PART_FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    PART_FORMATTERS.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock fields of an instant, as read in `timeZone`. */
function toParts(instant: Date, timeZone?: string): Parts {
  if (!timeZone) {
    return {
      year: instant.getFullYear(),
      month: instant.getMonth() + 1,
      day: instant.getDate(),
      hour: instant.getHours(),
      minute: instant.getMinutes(),
      second: instant.getSeconds(),
      ms: instant.getMilliseconds(),
    };
  }

  const found: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(instant)) {
    if (part.type !== "literal") found[part.type] = Number(part.value);
  }
  return {
    year: found.year ?? 0,
    month: found.month ?? 1,
    day: found.day ?? 1,
    // Midnight formats as hour 24 rather than 0 in some engines.
    hour: (found.hour ?? 0) % 24,
    minute: found.minute ?? 0,
    second: found.second ?? 0,
    ms: instant.getMilliseconds(),
  };
}

function asUtc(parts: Parts): number {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.ms,
  );
}

/**
 * The instant at which `timeZone` reads these wall-clock fields.
 *
 * Two passes: guess the fields as UTC, measure the offset there, correct, and
 * measure again in case the correction crossed a transition. A wall-clock time
 * at a DST boundary can be ambiguous or absent; this picks one rather than
 * throwing — an hour's difference once a year is a fair trade for not shipping
 * a timezone database.
 */
function fromParts(parts: Parts, timeZone?: string): Date {
  if (!timeZone) {
    return new Date(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      parts.ms,
    );
  }

  const wall = asUtc(parts);
  let instant = new Date(wall);
  for (let pass = 0; pass < 2; pass += 1) {
    const offset = asUtc(toParts(instant, timeZone)) - instant.getTime();
    const next = new Date(wall - offset);
    if (next.getTime() === instant.getTime()) break;
    instant = next;
  }
  return instant;
}

/* ------------------------------------------------------------------ */
/*  Offsets and snapping                                               */
/* ------------------------------------------------------------------ */

/** `month` is 1-based, matching `Parts`. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const FIXED_MS: Partial<Record<TimeUnit, number>> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
};

/**
 * Applies `±N unit` to an instant.
 *
 * Seconds, minutes and hours are fixed durations. Days, weeks, months and years
 * are calendar arithmetic: `now-1d` means the same wall-clock time yesterday,
 * which on the day a zone changes offset is 23 or 25 hours, not 24. And
 * `now-1M` from the 31st lands on the last day of a shorter month rather than
 * overflowing into the next one.
 */
function applyOffset(instant: Date, amount: number, unit: TimeUnit, timeZone?: string): Date {
  const fixed = FIXED_MS[unit];
  if (fixed !== undefined) return new Date(instant.getTime() + amount * fixed);

  const parts = { ...toParts(instant, timeZone) };

  if (unit === "d") {
    parts.day += amount;
  } else if (unit === "w") {
    parts.day += amount * 7;
  } else {
    if (unit === "y") {
      parts.year += amount;
    } else {
      const target = parts.month - 1 + amount;
      parts.year += Math.floor(target / 12);
      parts.month = (((target % 12) + 12) % 12) + 1;
    }
    // Clamp instead of overflowing: 31 January minus one month is the end of
    // February, not the third of March, and a year back from 29 February is
    // the 28th rather than 1 March.
    parts.day = Math.min(parts.day, daysInMonth(parts.year, parts.month));
  }

  return fromParts(parts, timeZone);
}

/**
 * Rounds an instant to a unit boundary, `edge` deciding which one.
 *
 * The detail that catches every reimplementation: `now/d..now/d` means *all of
 * today*, so the start floors to midnight and the end climbs to that day's last
 * millisecond. Flooring both yields a zero-length range and an empty chart.
 */
function applySnap(
  instant: Date,
  unit: TimeUnit,
  edge: "start" | "end",
  timeZone?: string,
): Date {
  const parts = { ...toParts(instant, timeZone) };

  parts.ms = 0;
  if (unit !== "s") parts.second = 0;
  if (unit !== "s" && unit !== "m") parts.minute = 0;
  if (unit === "d" || unit === "w" || unit === "M" || unit === "y") parts.hour = 0;
  if (unit === "M" || unit === "y") parts.day = 1;
  if (unit === "y") parts.month = 1;

  if (unit === "w") {
    // ISO weeks: Monday starts the week. Locale-varying week starts are a
    // separate decision, and one an app should make once rather than per range.
    //
    // The weekday is read off the calendar date itself, not off the instant —
    // asking a `Date` built from local fields for `getDay()` would answer for
    // the runtime's zone rather than the one being snapped in.
    const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
    parts.day -= (weekday + 6) % 7;
  }

  const start = fromParts(parts, timeZone);
  if (edge === "start") return start;

  // The end of the unit is one millisecond before the next one begins, which
  // keeps `to` inclusive without an off-by-one at every boundary.
  const nextStart = applyOffset(start, 1, unit, timeZone);
  return new Date(nextStart.getTime() - 1);
}

/* ------------------------------------------------------------------ */
/*  Parsing                                                            */
/* ------------------------------------------------------------------ */

const ISO =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const OFFSET = /^([+-])(\d+)([smhdwMy])/;

/** Resolves a single side of a range. Exported for the input's live feedback. */
export function resolveExpression(
  expression: string,
  edge: "start" | "end",
  options: ResolveOptions,
): Date {
  const input = expression.trim();
  if (input === "") throw new TimeExpressionError("Enter a time.", input);

  if (ISO.test(input)) {
    // `new Date` rolls an impossible day forward rather than refusing it —
    // 30 February parses happily as 2 March — so the calendar date is checked
    // against the month before the string is trusted.
    const calendar = CALENDAR_DATE.exec(input);
    if (
      calendar &&
      (Number(calendar[2]) < 1 ||
        Number(calendar[2]) > 12 ||
        Number(calendar[3]) < 1 ||
        Number(calendar[3]) > daysInMonth(Number(calendar[1]), Number(calendar[2])))
    ) {
      throw new TimeExpressionError(`${input} is not a real date.`, input);
    }

    const dateOnly = DATE_ONLY.exec(input);
    if (dateOnly) {
      // A bare date means a day in the reader's zone, not midnight UTC, and on
      // the closing side it means the whole of that day. `2026-01-01..2026-01-31`
      // that stops at the 31st's first millisecond silently drops a day of data.
      const parts: Parts = {
        year: Number(dateOnly[1]),
        month: Number(dateOnly[2]),
        day: Number(dateOnly[3]),
        hour: 0,
        minute: 0,
        second: 0,
        ms: 0,
      };
      const start = fromParts(parts, options.timeZone);
      if (Number.isNaN(start.getTime())) {
        throw new TimeExpressionError(`${input} is not a real date.`, input);
      }
      return edge === "start" ? start : applySnap(start, "d", "end", options.timeZone);
    }

    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      throw new TimeExpressionError(`${input} is not a real date.`, input);
    }
    return parsed;
  }

  if (!input.startsWith("now")) {
    throw new TimeExpressionError(
      `Expected "now" or a date like 2026-01-31, not "${input}".`,
      input,
    );
  }

  let rest = input.slice(3);
  let instant = options.now;

  while (rest.length > 0 && rest[0] !== "/") {
    const match = OFFSET.exec(rest);
    if (!match) {
      throw new TimeExpressionError(`Expected an offset like -6h, not "${rest}".`, rest);
    }
    const [whole, sign, digits, unit] = match;
    const amount = Number(digits) * (sign === "-" ? -1 : 1);
    instant = applyOffset(instant, amount, unit as TimeUnit, options.timeZone);
    rest = rest.slice(whole.length);
  }

  if (rest.startsWith("/")) {
    const unit = rest.slice(1);
    if (!UNITS.has(unit as TimeUnit)) {
      throw new TimeExpressionError(
        `"${unit || "/"}" is not a unit. Use s, m, h, d, w, M or y.`,
        rest,
      );
    }
    instant = applySnap(instant, unit as TimeUnit, edge, options.timeZone);
  }

  return instant;
}

/**
 * Turns a range expression into the two instants a query needs.
 *
 * Throws `TimeExpressionError` rather than returning a fallback range: a chart
 * silently showing the wrong window is worse than one that says it cannot.
 */
export function resolveTimeRange(expression: string, options: ResolveOptions): ResolvedRange {
  const separator = expression.indexOf("..");
  if (separator === -1) {
    throw new TimeExpressionError(
      `Expected two times separated by "..", as in now-6h..now.`,
      expression,
    );
  }

  const from = resolveExpression(expression.slice(0, separator), "start", options);
  const to = resolveExpression(expression.slice(separator + 2), "end", options);

  if (from.getTime() > to.getTime()) {
    throw new TimeExpressionError("The range ends before it starts.", expression);
  }

  return { from, to };
}

/** Whether an expression resolves, without the caller writing a try/catch. */
export function isValidTimeRange(expression: string, options: ResolveOptions): boolean {
  try {
    resolveTimeRange(expression, options);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Presets and labelling                                              */
/* ------------------------------------------------------------------ */

export interface TimeRangePreset {
  expression: string;
  label: string;
  /** Groups presets under a heading in the picker. */
  group: string;
}

/** Relative windows first, for debugging; calendar periods after, for reporting. */
export const DEFAULT_PRESETS: TimeRangePreset[] = [
  { expression: "now-5m..now", label: "Last 5 minutes", group: "Relative" },
  { expression: "now-15m..now", label: "Last 15 minutes", group: "Relative" },
  { expression: "now-1h..now", label: "Last hour", group: "Relative" },
  { expression: "now-6h..now", label: "Last 6 hours", group: "Relative" },
  { expression: "now-24h..now", label: "Last 24 hours", group: "Relative" },
  { expression: "now-7d..now", label: "Last 7 days", group: "Relative" },
  { expression: "now-30d..now", label: "Last 30 days", group: "Relative" },
  { expression: "now/d..now/d", label: "Today", group: "Calendar" },
  { expression: "now-1d/d..now-1d/d", label: "Yesterday", group: "Calendar" },
  { expression: "now/w..now/w", label: "This week", group: "Calendar" },
  { expression: "now-1w/w..now-1w/w", label: "Last week", group: "Calendar" },
  { expression: "now/M..now/M", label: "This month", group: "Calendar" },
  { expression: "now-1M/M..now-1M/M", label: "Last month", group: "Calendar" },
];

const RELATIVE = /^now-(\d+)([smhdwMy])(?:\/[smhdwMy])?\.\.now$/;

/**
 * A sentence for the trigger.
 *
 * An unnamed relative range is described in its own terms — "Last 90 minutes" —
 * because showing it as two timestamps throws away what the user chose. Only an
 * absolute range, which has no relative meaning left, is shown as dates.
 */
export function describeTimeRange(
  expression: string,
  options: ResolveOptions & { locale?: string; presets?: TimeRangePreset[] },
): string {
  const presets = options.presets ?? DEFAULT_PRESETS;
  const preset = presets.find((candidate) => candidate.expression === expression);
  if (preset) return preset.label;

  const relative = RELATIVE.exec(expression.trim());
  if (relative) {
    const amount = Number(relative[1]);
    const unit = UNIT_NAMES[relative[2] as TimeUnit];
    return `Last ${String(amount)} ${unit}${amount === 1 ? "" : "s"}`;
  }

  try {
    const { from, to } = resolveTimeRange(expression, options);
    const format = new Intl.DateTimeFormat(options.locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: options.timeZone,
    });
    return `${format.format(from)} – ${format.format(to)}`;
  } catch {
    return expression;
  }
}

/** The resolved window, spelled out. Pairs with the relative label, not replaces it. */
export function formatResolvedRange(
  range: ResolvedRange,
  options: { locale?: string; timeZone?: string } = {},
): string {
  const format = new Intl.DateTimeFormat(options.locale, {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: options.timeZone,
  });
  return `${format.format(range.from)} – ${format.format(range.to)}`;
}

/** Builds the expression for an absolute range chosen on a calendar. */
export function absoluteExpression(from: Date, to: Date): string {
  return `${toLocalIso(from)}..${toLocalIso(to)}`;
}

function toLocalIso(date: Date): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  return (
    `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}
