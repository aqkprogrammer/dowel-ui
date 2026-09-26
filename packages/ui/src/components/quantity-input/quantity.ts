/*
 * Quantities: an amount and the unit it is measured in.
 *
 * Plain functions with no React in them, so the same conversion, parsing and
 * formatting can run on the server, in a form action or in a test, and agree
 * with what the field showed.
 */

/** An amount in one of a list's units. `unit` is that unit's `value`. */
export interface Quantity {
  amount: number;
  unit: string;
}

/**
 * One unit of a dimension.
 *
 * Every unit in a list shares one base unit (grams, metres, bytes, seconds,
 * kelvins), which is what lets any two of them convert.
 */
export interface QuantityUnit {
  /** Stable id, submitted with forms: "kg". */
  value: string;
  /** Shown on screen: "kg", "°C". */
  label: string;
  /** Read by screen readers after the amount: "kilograms". Defaults to the label. */
  spoken?: string;
  /** Singular, used where the locale's plural rules say "one": "kilogram". */
  spokenOne?: string;
  /** Other spellings accepted when typed or pasted: ["lbs"]. */
  aliases?: readonly string[];
  /** How many base units one of this unit is. */
  factor: number;
  /** Added after scaling, for scales whose zero is not the base unit's zero (°C, °F). */
  offset?: number;
  /** Arrow-key and button step. Defaults to 1. */
  step?: number;
  /** Most fraction digits shown and kept. Defaults to 2, or more if the step needs them. */
  decimals?: number;
}

const DEFAULT_DECIMALS = 2;

/** The unit whose `value` this is. */
export function findUnit(
  units: readonly QuantityUnit[],
  value: string | undefined,
): QuantityUnit | undefined {
  return value === undefined ? undefined : units.find((unit) => unit.value === value);
}

/**
 * Twelve significant digits.
 *
 * Drops floating-point residue — 20 °C comes back as 68 °F rather than
 * 68.00000000000001 — and nothing a person could measure.
 */
function clean(value: number): number {
  return value === 0 ? 0 : Number(value.toPrecision(12));
}

/** Converts an amount between two units of the same dimension. */
export function convertQuantity(amount: number, from: QuantityUnit, to: QuantityUnit): number {
  if (from.value === to.value) return amount;
  const base = amount * from.factor + (from.offset ?? 0);
  return clean((base - (to.offset ?? 0)) / to.factor);
}

/** Digits after the point in a step: 0.25 → 2, 1e-7 → 7. */
export function precisionOf(step: number): number {
  const text = String(step);
  const exponent = /e-(\d+)$/.exec(text);
  if (exponent) return Number(exponent[1]);
  return text.split(".")[1]?.length ?? 0;
}

/** Fraction digits for a unit: its own, but never fewer than its step needs. */
export function decimalsFor(unit: QuantityUnit, step = unit.step ?? 1): number {
  return Math.max(unit.decimals ?? DEFAULT_DECIMALS, precisionOf(step));
}

/**
 * Rounds to a number of fraction digits.
 *
 * Scaled through `toPrecision` first, because 1.005 × 100 is 100.49999999999999
 * in binary and would otherwise round down. Halves round away from zero, and
 * the result is never -0, which Intl would print as "-0".
 */
export function roundTo(
  value: number,
  decimals: number,
  mode: "round" | "floor" | "ceil" = "round",
): number {
  const factor = 10 ** decimals;
  const scaled = Number((value * factor).toPrecision(15));
  const whole =
    mode === "round" ? Math.sign(scaled) * Math.round(Math.abs(scaled)) : Math[mode](scaled);
  const result = whole / factor;
  return result === 0 ? 0 : result;
}

/** A bound expressed in another unit of the list, converted into `unit`. */
export function boundIn(
  bound: Quantity | undefined,
  units: readonly QuantityUnit[],
  unit: QuantityUnit,
): number | undefined {
  if (!bound) return undefined;
  const from = findUnit(units, bound.unit);
  return from ? convertQuantity(bound.amount, from, unit) : undefined;
}

export interface QuantityBounds {
  min?: Quantity;
  max?: Quantity;
}

/** Keeps a quantity inside bounds that may be written in any unit of the list. */
export function clampQuantity(
  quantity: Quantity,
  units: readonly QuantityUnit[],
  { min, max }: QuantityBounds,
): Quantity {
  const unit = findUnit(units, quantity.unit);
  if (!unit) return quantity;
  const lo = boundIn(min, units, unit);
  const hi = boundIn(max, units, unit);
  let amount = quantity.amount;
  if (lo !== undefined && amount < lo) amount = lo;
  if (hi !== undefined && amount > hi) amount = hi;
  return amount === quantity.amount ? quantity : { amount, unit: quantity.unit };
}

/* Locale symbols ---------------------------------------------------------- */

interface Symbols {
  decimal: string;
  group: string;
  /** Native digit → ASCII digit, for numbering systems other than Latin. */
  digits: Map<string, string>;
}

const symbolCache = new Map<string, Symbols>();
const formatCache = new Map<string, Intl.NumberFormat>();

/**
 * Brings typed text to one spelling.
 *
 * NFKC folds full-width digits, no-break spaces and the ℃ sign into their
 * plain forms. Bidi marks come out because Arabic locales put one before a
 * minus sign, and every kind of apostrophe becomes one, because Swiss grouping
 * is typed with whichever the keyboard offers.
 */
function normalise(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u061c\u200e\u200f]/g, "")
    .replace(/\u2212/g, "-")
    .replace(/[\u2019\u02bc\u2032]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function symbolsFor(locale: string | undefined): Symbols {
  const key = locale ?? "";
  const cached = symbolCache.get(key);
  if (cached) return cached;
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const plain = new Intl.NumberFormat(locale, { useGrouping: false });
  const digits = new Map<string, string>();
  for (let digit = 0; digit < 10; digit += 1) {
    const glyph = plain.format(digit);
    if (glyph !== String(digit)) digits.set(glyph, String(digit));
  }
  const symbols = {
    decimal: normalise(parts.find((part) => part.type === "decimal")?.value ?? ".") || ".",
    // A space-like group separator (French, Swedish) trims to nothing: it is a space.
    group: normalise(parts.find((part) => part.type === "group")?.value ?? ",") || " ",
    digits,
  };
  symbolCache.set(key, symbols);
  return symbols;
}

function numberFormat(locale: string | undefined, decimals: number): Intl.NumberFormat {
  const key = `${locale ?? ""}|${String(decimals)}`;
  let format = formatCache.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, { maximumFractionDigits: decimals });
    formatCache.set(key, format);
  }
  return format;
}

/* Parsing ------------------------------------------------------------------ */

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");

/**
 * A number written the locale's way.
 *
 * Strict on purpose: "1,5" in English is neither one and a half nor fifteen,
 * so it is refused rather than guessed at. Guessing is how 1.5 kg becomes
 * 1,500 kg. Spaces group digits in every locale, as SI writes them.
 */
function toNumber(text: string, { decimal, group }: Symbols): number | null {
  const at = text.indexOf(decimal);
  const integer = at === -1 ? text : text.slice(0, at);
  const fraction = at === -1 ? "" : text.slice(at + decimal.length);
  if (!/^\d*$/.test(fraction)) return null;

  const pieces = integer.split(new RegExp(`[${escapeRegExp(group)} ]`));
  if (pieces.length > 1) {
    // Indian grouping puts pairs in the middle (1,00,000), so middles may be two.
    const [head = "", ...rest] = pieces;
    const tail = rest.pop() ?? "";
    if (!/^\d{1,3}$/.test(head) || !/^\d{3}$/.test(tail)) return null;
    if (rest.some((piece) => !/^\d{2,3}$/.test(piece))) return null;
  } else if (!/^\d*$/.test(integer)) {
    return null;
  }
  const digits = pieces.join("");
  if (digits === "" && fraction === "") return null;
  return Number(`${digits || "0"}.${fraction || "0"}`);
}

/**
 * The unit a piece of text names.
 *
 * An exact match on value or label wins before anything case-insensitive, so
 * a list holding both "Mb" (megabits) and "MB" (megabytes) still tells them
 * apart. After that, value, label, spoken names and aliases all match in any
 * case: "KG", "lbs", "20 c", "3 hours".
 */
export function matchUnit(
  text: string,
  units: readonly QuantityUnit[],
): QuantityUnit | undefined {
  const exact = units.find((unit) => unit.value === text || unit.label === text);
  if (exact) return exact;
  const key = text.toLowerCase();
  return units.find((unit) =>
    [unit.value, unit.label, unit.spoken, unit.spokenOne, ...(unit.aliases ?? [])].some(
      (name) => name !== undefined && normalise(name).toLowerCase() === key,
    ),
  );
}

/** Why a piece of text did or did not read as a quantity. */
export type QuantityReading =
  | { status: "ok"; amount: number; unit: QuantityUnit | undefined }
  | { status: "empty" }
  | { status: "number" }
  | { status: "unit"; text: string };

/** Reads text as an amount and an optional unit, and says what was wrong if it cannot. */
export function readQuantity(
  text: string,
  units: readonly QuantityUnit[],
  locale?: string,
): QuantityReading {
  const symbols = symbolsFor(locale);
  let normalised = normalise(text);
  for (const [glyph, digit] of symbols.digits) normalised = normalised.replaceAll(glyph, digit);
  if (normalised === "") return { status: "empty" };

  // Both separators and the apostrophe are always taken as part of the number,
  // so "1,5" in the wrong locale is reported as a bad number, not a bad unit.
  const chars = `0-9.,' ${escapeRegExp(symbols.decimal)}${escapeRegExp(symbols.group)}`;
  const match = new RegExp(`^([+-]?) ?([${chars}]*)(.*)$`).exec(normalised);
  const numberText = match?.[2]?.trim() ?? "";
  const unitText = match?.[3]?.trim() ?? "";
  const amount = numberText === "" ? null : toNumber(numberText, symbols);
  if (amount === null) return { status: "number" };

  const signed = match?.[1] === "-" && amount !== 0 ? -amount : amount;
  if (unitText === "") return { status: "ok", amount: signed, unit: undefined };
  const unit = matchUnit(unitText, units);
  return unit ? { status: "ok", amount: signed, unit } : { status: "unit", text: unitText };
}

export interface ParseQuantityOptions {
  /** Locale whose decimal and group separators the text uses. Defaults to the runtime's. */
  locale?: string;
  /** Unit assumed when the text names none. Without it, a bare number is not a quantity. */
  unit?: string;
}

/**
 * Reads "5 kg", "5kg", "1,5 kg" (de-DE), "1.200,5 kg" (de-DE) or "3 hours".
 *
 * Returns null for text that is not a number in the locale, or that names a
 * unit the list does not have. Pass a locale string, or options to also say
 * which unit a bare number is in.
 */
export function parseQuantity(
  text: string,
  units: readonly QuantityUnit[],
  options?: string | ParseQuantityOptions,
): Quantity | null {
  const { locale, unit: fallback } =
    typeof options === "string" ? { locale: options, unit: undefined } : (options ?? {});
  const reading = readQuantity(text, units, locale);
  if (reading.status !== "ok") return null;
  const unit = reading.unit ?? findUnit(units, fallback);
  return unit ? { amount: reading.amount, unit: unit.value } : null;
}

/* Formatting --------------------------------------------------------------- */

export interface FormatQuantityOptions {
  /** Defaults to the runtime's locale. */
  locale?: string;
  /** Most fraction digits. Defaults to the unit's `decimals`. */
  decimals?: number;
  /**
   * "label" gives "5.5 kg" with a no-break space; "spoken" gives
   * "5.5 kilograms"; "none" gives the number alone.
   */
  unitDisplay?: "label" | "spoken" | "none";
}

/** The unit's spoken name, singular where the locale's plural rules call for it. */
function spokenName(unit: QuantityUnit, amount: number, locale: string | undefined): string {
  const one = new Intl.PluralRules(locale).select(amount) === "one";
  return (one ? unit.spokenOne : undefined) ?? unit.spoken ?? unit.label;
}

/** Writes a quantity for a locale: "1,200.5 kg", "1.200,5 kg", "5 kilograms". */
export function formatQuantity(
  quantity: Quantity,
  units: readonly QuantityUnit[],
  { locale, decimals, unitDisplay = "label" }: FormatQuantityOptions = {},
): string {
  const unit = findUnit(units, quantity.unit);
  const places = decimals ?? (unit ? decimalsFor(unit) : DEFAULT_DECIMALS);
  const amount = roundTo(quantity.amount, places);
  const number = numberFormat(locale, places).format(amount);
  if (unitDisplay === "none") return number;
  if (unitDisplay === "spoken") {
    return `${number} ${unit ? spokenName(unit, amount, locale) : quantity.unit}`;
  }
  return `${number}\u00a0${unit?.label ?? quantity.unit}`;
}
