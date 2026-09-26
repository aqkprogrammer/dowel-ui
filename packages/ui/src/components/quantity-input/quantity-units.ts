import type { QuantityUnit } from "./quantity";

/*
 * Unit presets.
 *
 * Each list shares one base unit, so any two of its units convert. Names are
 * English, with British spellings spoken and American ones accepted as
 * aliases. For another language, spread a preset and replace `label`,
 * `spoken`, `spokenOne` and `aliases`; the factors stay as they are.
 *
 * `decimals` is the most fraction digits kept, chosen so a conversion keeps
 * roughly the precision of the unit it came from: 1 g is 0.001 kg.
 */

/** Mass, in grams. */
export const MASS_UNITS: readonly QuantityUnit[] = [
  {
    value: "g",
    label: "g",
    spoken: "grams",
    spokenOne: "gram",
    factor: 1,
    step: 1,
    decimals: 1,
  },
  {
    value: "kg",
    label: "kg",
    spoken: "kilograms",
    spokenOne: "kilogram",
    aliases: ["kilos", "kilo"],
    factor: 1000,
    step: 0.1,
    decimals: 3,
  },
  {
    value: "lb",
    label: "lb",
    spoken: "pounds",
    spokenOne: "pound",
    aliases: ["lbs"],
    factor: 453.59237,
    step: 0.1,
    decimals: 2,
  },
  {
    value: "oz",
    label: "oz",
    spoken: "ounces",
    spokenOne: "ounce",
    factor: 28.349523125,
    step: 1,
    decimals: 2,
  },
];

/** Length, in metres. */
export const LENGTH_UNITS: readonly QuantityUnit[] = [
  {
    value: "mm",
    label: "mm",
    spoken: "millimetres",
    spokenOne: "millimetre",
    aliases: ["millimeters", "millimeter"],
    factor: 0.001,
    step: 1,
    decimals: 1,
  },
  {
    value: "cm",
    label: "cm",
    spoken: "centimetres",
    spokenOne: "centimetre",
    aliases: ["centimeters", "centimeter"],
    factor: 0.01,
    step: 1,
    decimals: 2,
  },
  {
    value: "m",
    label: "m",
    spoken: "metres",
    spokenOne: "metre",
    aliases: ["meters", "meter"],
    factor: 1,
    step: 0.1,
    decimals: 3,
  },
  {
    value: "km",
    label: "km",
    spoken: "kilometres",
    spokenOne: "kilometre",
    aliases: ["kilometers", "kilometer"],
    factor: 1000,
    step: 0.1,
    decimals: 3,
  },
  {
    value: "in",
    label: "in",
    spoken: "inches",
    spokenOne: "inch",
    factor: 0.0254,
    step: 1,
    decimals: 2,
  },
  {
    value: "ft",
    label: "ft",
    spoken: "feet",
    spokenOne: "foot",
    factor: 0.3048,
    step: 1,
    decimals: 2,
  },
  {
    value: "mi",
    label: "mi",
    spoken: "miles",
    spokenOne: "mile",
    factor: 1609.344,
    step: 0.1,
    decimals: 3,
  },
];

/** Data size in bytes, 1000-based: 1 kB is 1000 B, as disks and networks count. */
export const DATA_UNITS: readonly QuantityUnit[] = [
  {
    value: "B",
    label: "B",
    spoken: "bytes",
    spokenOne: "byte",
    factor: 1,
    step: 1,
    decimals: 0,
  },
  {
    value: "kB",
    label: "kB",
    spoken: "kilobytes",
    spokenOne: "kilobyte",
    factor: 1e3,
    step: 1,
    decimals: 2,
  },
  {
    value: "MB",
    label: "MB",
    spoken: "megabytes",
    spokenOne: "megabyte",
    factor: 1e6,
    step: 1,
    decimals: 2,
  },
  {
    value: "GB",
    label: "GB",
    spoken: "gigabytes",
    spokenOne: "gigabyte",
    factor: 1e9,
    step: 1,
    decimals: 2,
  },
  {
    value: "TB",
    label: "TB",
    spoken: "terabytes",
    spokenOne: "terabyte",
    factor: 1e12,
    step: 0.1,
    decimals: 3,
  },
];

/**
 * Data size in bytes, 1024-based: 1 KiB is 1024 B, as memory and most
 * operating systems count. Shares a base with DATA_UNITS, so the two lists can
 * be combined and converted between.
 */
export const DATA_UNITS_IEC: readonly QuantityUnit[] = [
  {
    value: "KiB",
    label: "KiB",
    spoken: "kibibytes",
    spokenOne: "kibibyte",
    factor: 1024,
    step: 1,
    decimals: 2,
  },
  {
    value: "MiB",
    label: "MiB",
    spoken: "mebibytes",
    spokenOne: "mebibyte",
    factor: 1024 ** 2,
    step: 1,
    decimals: 2,
  },
  {
    value: "GiB",
    label: "GiB",
    spoken: "gibibytes",
    spokenOne: "gibibyte",
    factor: 1024 ** 3,
    step: 1,
    decimals: 2,
  },
  {
    value: "TiB",
    label: "TiB",
    spoken: "tebibytes",
    spokenOne: "tebibyte",
    factor: 1024 ** 4,
    step: 0.1,
    decimals: 3,
  },
];

/** Duration, in seconds. */
export const DURATION_UNITS: readonly QuantityUnit[] = [
  {
    value: "ms",
    label: "ms",
    spoken: "milliseconds",
    spokenOne: "millisecond",
    factor: 0.001,
    step: 10,
    decimals: 0,
  },
  {
    value: "s",
    label: "s",
    spoken: "seconds",
    spokenOne: "second",
    aliases: ["sec", "secs"],
    factor: 1,
    step: 1,
    decimals: 3,
  },
  {
    value: "min",
    label: "min",
    spoken: "minutes",
    spokenOne: "minute",
    aliases: ["mins"],
    factor: 60,
    step: 1,
    decimals: 2,
  },
  {
    value: "h",
    label: "h",
    spoken: "hours",
    spokenOne: "hour",
    aliases: ["hr", "hrs"],
    factor: 3600,
    step: 1,
    decimals: 2,
  },
  {
    value: "d",
    label: "d",
    spoken: "days",
    spokenOne: "day",
    factor: 86400,
    step: 1,
    decimals: 2,
  },
];

/**
 * Temperature, in kelvins. Celsius and Fahrenheit do not start at absolute
 * zero, so they carry an offset as well as a factor.
 */
export const TEMPERATURE_UNITS: readonly QuantityUnit[] = [
  {
    value: "C",
    label: "°C",
    spoken: "degrees Celsius",
    spokenOne: "degree Celsius",
    aliases: ["celsius", "centigrade"],
    factor: 1,
    offset: 273.15,
    step: 0.5,
    decimals: 1,
  },
  {
    value: "F",
    label: "°F",
    spoken: "degrees Fahrenheit",
    spokenOne: "degree Fahrenheit",
    aliases: ["fahrenheit"],
    factor: 5 / 9,
    offset: (459.67 * 5) / 9,
    step: 1,
    decimals: 1,
  },
  {
    value: "K",
    label: "K",
    spoken: "kelvins",
    spokenOne: "kelvin",
    factor: 1,
    step: 1,
    decimals: 2,
  },
];

/**
 * Named units from a list, in the order given:
 * `pickUnits(MASS_UNITS, ["kg", "lb"])`. The first becomes the field's default.
 */
export function pickUnits(
  units: readonly QuantityUnit[],
  values: readonly string[],
): QuantityUnit[] {
  return values.map((value) => {
    const unit = units.find((candidate) => candidate.value === value);
    if (!unit) throw new Error(`pickUnits: there is no "${value}" in this list of units.`);
    return unit;
  });
}
