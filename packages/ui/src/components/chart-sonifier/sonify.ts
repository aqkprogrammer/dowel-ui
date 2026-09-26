/*
 * The sonifier's pure parts: how a value becomes a pitch, how a series becomes
 * a schedule of tones, and how a series reads as a sentence. Nothing here
 * touches audio or the DOM, so every rule about what the listener hears can be
 * tested as a plain function.
 */

/**
 * Two octaves, A3 to A5. Low enough to stay pleasant, high enough that laptop
 * and phone speakers reproduce the bottom note, and well inside the range that
 * age-related hearing loss leaves intact.
 */
export const SONIFIER_LOW_HZ = 220;
export const SONIFIER_HIGH_HZ = 880;

/**
 * Notes fill this much of their slot. The gap is what lets a run of equal
 * values be heard as separate points rather than one long held tone.
 */
const NOTE_FILL = 0.85;

/** A missing value is a click this long at most, not a note. */
const CLICK_MS = 40;

export interface SonifierPitchRange {
  /** Pitch of the smallest value, in hertz. */
  low?: number;
  /** Pitch of the largest value, in hertz. */
  high?: number;
}

/**
 * The pitch for a value, in hertz.
 *
 * Exponential, because pitch is heard in ratios: 220 → 440 Hz sounds like the
 * same step as 440 → 880 Hz. A linear map would squeeze the lower half of the
 * data into what sounds like most of the range, and flatten the top. When
 * every value is the same there is no range to place it in, so it sits in the
 * middle. A value that is not a finite number has no pitch: NaN.
 */
export function valueToFrequency(
  value: number,
  min: number,
  max: number,
  { low = SONIFIER_LOW_HZ, high = SONIFIER_HIGH_HZ }: SonifierPitchRange = {},
): number {
  if (!Number.isFinite(value)) return Number.NaN;
  const span = max - min;
  const t = span > 0 && Number.isFinite(span) ? clamp((value - min) / span, 0, 1) : 0.5;
  return low * (high / low) ** t;
}

export interface SonifierTone {
  /** The point this tone stands for: an index into the values. */
  index: number;
  /** Milliseconds from the start of the schedule. */
  start: number;
  /** Milliseconds. */
  duration: number;
  /** Hertz. */
  frequency: number;
  /** A missing value: played as a short low click so the gap is heard, not skipped. */
  missing: boolean;
}

export interface PlanTonesOptions extends SonifierPitchRange {
  /** How long the whole schedule lasts, in milliseconds. */
  durationMs: number;
  /**
   * The value that gets the lowest pitch. Defaults to the smallest value here;
   * pass a shared one so several series are heard on the same scale.
   */
  min?: number;
  /** The value that gets the highest pitch. */
  max?: number;
}

/**
 * A tone per point, evenly spaced across `durationMs`.
 *
 * Every point keeps its slot, missing or not, so time in the sound matches
 * position on the chart's axis. A missing value (null, NaN, ±Infinity) is a
 * short click an octave below the range instead of a pitch.
 */
export function planTones(
  values: readonly (number | null)[],
  { durationMs, low = SONIFIER_LOW_HZ, high = SONIFIER_HIGH_HZ, min, max }: PlanTonesOptions,
): SonifierTone[] {
  if (values.length === 0 || !(durationMs > 0)) return [];
  const range = extent(values);
  const bottom = min ?? range?.min ?? 0;
  const top = max ?? range?.max ?? 0;
  const slot = durationMs / values.length;

  return values.map((value, index) => {
    const start = index * slot;
    if (value === null || !Number.isFinite(value)) {
      return {
        index,
        start,
        duration: Math.min(CLICK_MS, slot * 0.5),
        frequency: low / 2,
        missing: true,
      };
    }
    return {
      index,
      start,
      duration: slot * NOTE_FILL,
      frequency: valueToFrequency(value, bottom, top, { low, high }),
      missing: false,
    };
  });
}

export type SonifierSpeed = "slow" | "normal" | "fast";

/**
 * Milliseconds per point, and the longest a whole series may take.
 *
 * Per point, so a week is seven distinct notes at any speed. Capped, so a
 * year of daily values becomes a glide you can follow rather than two
 * minutes of beeps.
 */
export const SONIFIER_SPEEDS: Readonly<
  Record<SonifierSpeed, { point: number; longest: number }>
> = {
  slow: { point: 500, longest: 24_000 },
  normal: { point: 300, longest: 12_000 },
  fast: { point: 150, longest: 6_000 },
};

/** How long `count` points take to play at `speed`, in milliseconds. */
export function sonifierDuration(count: number, speed: SonifierSpeed = "normal"): number {
  const { point, longest } = SONIFIER_SPEEDS[speed];
  return Math.min(Math.max(0, count) * point, longest);
}

export interface SonifierUnit {
  one: string;
  other: string;
}

export interface SonifierFormat {
  formatValue?: (value: number) => string;
  /** Turns a category into the words that are read and shown: "2026-10-14" → "Tue 14 Oct". */
  formatCategory?: (category: string, index: number) => string;
  /** Said after a value: "deployments", or `{ one, other }` so 1 is not plural. */
  unit?: string | SonifierUnit;
}

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function defaultFormatValue(value: number): string {
  return numberFormat.format(value);
}

function unitFor(value: number, unit: SonifierFormat["unit"]): string {
  if (!unit) return "";
  if (typeof unit === "string") return ` ${unit}`;
  return ` ${value === 1 ? unit.one : unit.other}`;
}

/** A value with its unit, or "no value" when it is missing. */
export function formatSonifierValue(
  value: number | null | undefined,
  format: SonifierFormat = {},
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "no value";
  const text = (format.formatValue ?? defaultFormatValue)(value);
  return `${text}${unitFor(value, format.unit)}`;
}

function categoryName(
  categories: readonly string[] | undefined,
  index: number,
  format: SonifierFormat,
  capital: boolean,
): string {
  const category = categories?.[index];
  if (category === undefined) return `${capital ? "Point" : "point"} ${String(index + 1)}`;
  return format.formatCategory ? format.formatCategory(category, index) : category;
}

/** The number of points: the longer of the values and the categories. */
export function pointCount(
  values: readonly (number | null)[],
  categories?: readonly string[],
): number {
  return Math.max(values.length, categories?.length ?? 0);
}

/** One point as it is read aloud: "Tue 14 Oct: 42 deployments". */
export function describePoint(
  values: readonly (number | null)[],
  categories: readonly string[] | undefined,
  index: number,
  format: SonifierFormat = {},
): string {
  const name = categoryName(categories, index, format, true);
  return `${name}: ${formatSonifierValue(values[index], format)}`;
}

/** The smallest and largest finite values, or null when there are none. */
export function extent(
  values: readonly (number | null)[],
): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return min <= max ? { min, max } : null;
}

/**
 * A fitted line has to climb or fall by at least this share of the range
 * before the series is called rising or falling. Comparing only the first and
 * last points would call a series "rising" because of one noisy end.
 */
const TREND_THRESHOLD = 0.15;

function trend(points: { index: number; value: number }[], range: number): string {
  const n = points.length;
  const meanX = points.reduce((sum, point) => sum + point.index, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.value, 0) / n;
  let covariance = 0;
  let variance = 0;
  for (const point of points) {
    covariance += (point.index - meanX) * (point.value - meanY);
    variance += (point.index - meanX) ** 2;
  }
  const first = points[0]?.index ?? 0;
  const last = points[n - 1]?.index ?? 0;
  const change = variance > 0 ? (covariance / variance) * (last - first) : 0;
  if (Math.abs(change) < TREND_THRESHOLD * range) return "no clear trend";
  return change > 0 ? "rising overall" : "falling overall";
}

/**
 * A series in one sentence: "Revenue: 12 points from Jan to Dec, ranging from
 * 3.1 to 9.8, rising overall, highest at Oct, lowest at Feb."
 *
 * What a listener needs before pressing Play, and what someone who cannot
 * hear it gets instead. Missing values are counted, not hidden.
 */
export function describeSeries(
  series: { label: string; values: readonly (number | null)[] },
  categories?: readonly string[],
  format: SonifierFormat = {},
): string {
  const count = pointCount(series.values, categories);
  if (count === 0) return `${series.label}: no data.`;

  const points: { index: number; value: number }[] = [];
  for (let index = 0; index < count; index++) {
    const value = series.values[index];
    if (value !== null && value !== undefined && Number.isFinite(value)) {
      points.push({ index, value });
    }
  }

  const name = (index: number) => categoryName(categories, index, format, false);
  const span =
    count === 1
      ? "1 point"
      : categories && categories.length > 0
        ? `${String(count)} points from ${name(0)} to ${name(count - 1)}`
        : `${String(count)} points`;
  const missing = count - points.length;

  if (points.length === 0) return `${series.label}: ${span}, all missing.`;

  const gaps = missing > 0 ? `, ${String(missing)} missing` : "";
  const lowest = points.reduce((best, point) => (point.value < best.value ? point : best));
  const highest = points.reduce((best, point) => (point.value > best.value ? point : best));

  if (points.length === 1) {
    return `${series.label}: ${span}${gaps}, ${formatSonifierValue(highest.value, format)} at ${name(highest.index)}.`;
  }
  if (lowest.value === highest.value) {
    return `${series.label}: ${span}${gaps}, all ${formatSonifierValue(highest.value, format)}.`;
  }

  // The unit once, after the range: "from 3 to 42 deployments".
  const from = (format.formatValue ?? defaultFormatValue)(lowest.value);
  const to = formatSonifierValue(highest.value, format);
  return (
    `${series.label}: ${span}${gaps}, ranging from ${from} to ${to}, ` +
    `${trend(points, highest.value - lowest.value)}, ` +
    `highest at ${name(highest.index)}, lowest at ${name(lowest.index)}.`
  );
}

/**
 * The point a slider key moves to, or null when the key is not a slider key.
 * Page keys jump a tenth of the series. Right and Up always move later in
 * time: the track is laid out left to right in every writing direction, like
 * the charts it sits beside.
 */
export function scrubIndexFromKey(key: string, current: number, count: number): number | null {
  const last = Math.max(0, count - 1);
  const page = Math.max(1, Math.round(count / 10));
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clamp(current + 1, 0, last);
    case "ArrowLeft":
    case "ArrowDown":
      return clamp(current - 1, 0, last);
    case "PageUp":
      return clamp(current + page, 0, last);
    case "PageDown":
      return clamp(current - page, 0, last);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
