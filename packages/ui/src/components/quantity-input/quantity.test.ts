import { describe, expect, it } from "vitest";

import {
  clampQuantity,
  convertQuantity,
  decimalsFor,
  formatQuantity,
  parseQuantity,
  precisionOf,
  readQuantity,
  roundTo,
  type QuantityUnit,
} from "./quantity";
import {
  DATA_UNITS,
  DATA_UNITS_IEC,
  DURATION_UNITS,
  LENGTH_UNITS,
  MASS_UNITS,
  TEMPERATURE_UNITS,
  pickUnits,
} from "./quantity-units";

// Written as char codes so the test source shows no invisible characters.
const NBSP = String.fromCharCode(0xa0);
const NNBSP = String.fromCharCode(0x202f);
const MINUS = String.fromCharCode(0x2212);

const ALL = [
  ...MASS_UNITS,
  ...LENGTH_UNITS,
  ...DATA_UNITS,
  ...DATA_UNITS_IEC,
  ...DURATION_UNITS,
  ...TEMPERATURE_UNITS,
];
const unit = (value: string) => ALL.find((candidate) => candidate.value === value)!;
const convert = (amount: number, from: string, to: string) =>
  convertQuantity(amount, unit(from), unit(to));

describe("convertQuantity", () => {
  it("converts mass, length, data and duration by factor", () => {
    expect(convert(1, "kg", "lb")).toBe(2.20462262185);
    expect(convert(1, "lb", "kg")).toBe(0.45359237);
    expect(convert(16, "oz", "lb")).toBe(1);
    expect(convert(1, "mi", "km")).toBe(1.609344);
    expect(convert(1, "ft", "in")).toBe(12);
    expect(convert(1, "GB", "MB")).toBe(1000);
    expect(convert(1, "GiB", "MiB")).toBe(1024);
    expect(convert(1, "GB", "GiB")).toBe(0.931322574615);
    expect(convert(90, "min", "h")).toBe(1.5);
    expect(convert(1, "d", "h")).toBe(24);
    expect(convert(250, "ms", "s")).toBe(0.25);
  });

  it("converts temperature with offsets, and cleans floating-point residue", () => {
    expect(convert(100, "C", "F")).toBe(212);
    expect(convert(20, "C", "F")).toBe(68);
    expect(convert(-40, "C", "F")).toBe(-40);
    expect(convert(32, "F", "K")).toBe(273.15);
    expect(convert(0, "K", "C")).toBe(-273.15);
    expect(convert(0, "K", "F")).toBe(-459.67);
  });

  it("returns the amount untouched within one unit", () => {
    expect(convert(0.1 + 0.2, "kg", "kg")).toBe(0.1 + 0.2);
  });
});

describe("parseQuantity", () => {
  it("reads an amount and a unit, with or without a space, in any case", () => {
    expect(parseQuantity("5 kg", MASS_UNITS)).toEqual({ amount: 5, unit: "kg" });
    expect(parseQuantity("5kg", MASS_UNITS)).toEqual({ amount: 5, unit: "kg" });
    expect(parseQuantity("  5   KG ", MASS_UNITS)).toEqual({ amount: 5, unit: "kg" });
    expect(parseQuantity(".5 kg", MASS_UNITS)).toEqual({ amount: 0.5, unit: "kg" });
    expect(parseQuantity("+5 kg", MASS_UNITS)).toEqual({ amount: 5, unit: "kg" });
  });

  it("matches spoken names, singulars and aliases", () => {
    expect(parseQuantity("5 kilograms", MASS_UNITS)).toEqual({ amount: 5, unit: "kg" });
    expect(parseQuantity("1 Kilogram", MASS_UNITS)).toEqual({ amount: 1, unit: "kg" });
    expect(parseQuantity("5 lbs", MASS_UNITS)).toEqual({ amount: 5, unit: "lb" });
    expect(parseQuantity("3 hours", DURATION_UNITS)).toEqual({ amount: 3, unit: "h" });
    expect(parseQuantity("2 meters", LENGTH_UNITS)).toEqual({ amount: 2, unit: "m" });
  });

  it("reads temperatures, including the minus sign and the ℃ character", () => {
    expect(parseQuantity("-40 °F", TEMPERATURE_UNITS)).toEqual({ amount: -40, unit: "F" });
    expect(parseQuantity(`${MINUS}40 °C`, TEMPERATURE_UNITS)).toEqual({
      amount: -40,
      unit: "C",
    });
    expect(parseQuantity("20 c", TEMPERATURE_UNITS)).toEqual({ amount: 20, unit: "C" });
    expect(parseQuantity("20℃", TEMPERATURE_UNITS)).toEqual({ amount: 20, unit: "C" });
    expect(parseQuantity("-0 K", TEMPERATURE_UNITS)).toEqual({ amount: 0, unit: "K" });
  });

  it("uses the locale's decimal and group separators", () => {
    expect(parseQuantity("1,5 kg", MASS_UNITS, "de-DE")).toEqual({ amount: 1.5, unit: "kg" });
    expect(parseQuantity("1.200,5 kg", MASS_UNITS, "de-DE")).toEqual({
      amount: 1200.5,
      unit: "kg",
    });
    expect(parseQuantity("1,200.5 lb", MASS_UNITS, "en-US")).toEqual({
      amount: 1200.5,
      unit: "lb",
    });
    expect(parseQuantity("1 200,5 g", MASS_UNITS, "fr-FR")).toEqual({
      amount: 1200.5,
      unit: "g",
    });
    expect(parseQuantity(`1${NNBSP}200,5 g`, MASS_UNITS, "fr-FR")).toEqual({
      amount: 1200.5,
      unit: "g",
    });
    expect(parseQuantity("1'200.5 g", MASS_UNITS, "de-CH")).toEqual({
      amount: 1200.5,
      unit: "g",
    });
    expect(parseQuantity("1’200.5 g", MASS_UNITS, "de-CH")).toEqual({
      amount: 1200.5,
      unit: "g",
    });
    expect(parseQuantity("1,00,000 g", MASS_UNITS, "en-IN")).toEqual({
      amount: 100000,
      unit: "g",
    });
    expect(parseQuantity("١٢٫٥ kg", MASS_UNITS, "ar-EG")).toEqual({ amount: 12.5, unit: "kg" });
    expect(parseQuantity("12 000 g", MASS_UNITS, "en-US")).toEqual({
      amount: 12000,
      unit: "g",
    });
  });

  it("refuses separators the locale would not write, rather than guessing", () => {
    expect(parseQuantity("1,5 kg", MASS_UNITS, "en-US")).toBeNull();
    expect(parseQuantity("1.5 kg", MASS_UNITS, "de-DE")).toBeNull();
    expect(parseQuantity("1.200,5 kg", MASS_UNITS, "en-US")).toBeNull();
    expect(parseQuantity("1,2,3 kg", MASS_UNITS, "en-US")).toBeNull();
    expect(parseQuantity("1'000 g", MASS_UNITS, "en-US")).toBeNull();
    expect(parseQuantity("5 5 kg", MASS_UNITS)).toBeNull();
  });

  it("refuses text that is not a quantity", () => {
    expect(parseQuantity("", MASS_UNITS)).toBeNull();
    expect(parseQuantity("kg", MASS_UNITS)).toBeNull();
    expect(parseQuantity("abc", MASS_UNITS)).toBeNull();
    expect(parseQuantity("-", MASS_UNITS)).toBeNull();
    expect(parseQuantity("5 stone", MASS_UNITS)).toBeNull();
    expect(parseQuantity("5 kg kg", MASS_UNITS)).toBeNull();
  });

  it("needs a unit for a bare number, from the text or the options", () => {
    expect(parseQuantity("5", MASS_UNITS)).toBeNull();
    expect(parseQuantity("5", MASS_UNITS, "de-DE")).toBeNull();
    expect(parseQuantity("1,5", MASS_UNITS, { locale: "de-DE", unit: "kg" })).toEqual({
      amount: 1.5,
      unit: "kg",
    });
    expect(parseQuantity("5 lb", MASS_UNITS, { unit: "kg" })).toEqual({
      amount: 5,
      unit: "lb",
    });
    expect(parseQuantity("5", MASS_UNITS, { unit: "stone" })).toBeNull();
  });

  it("prefers an exact match, so units that differ only in case stay apart", () => {
    const bits: QuantityUnit[] = [
      { value: "Mb", label: "Mb", factor: 125_000 },
      { value: "MB", label: "MB", factor: 1_000_000 },
    ];
    expect(parseQuantity("5 MB", bits)?.unit).toBe("MB");
    expect(parseQuantity("5 Mb", bits)?.unit).toBe("Mb");
  });
});

describe("readQuantity", () => {
  it("says why text did not read", () => {
    expect(readQuantity("  ", MASS_UNITS)).toEqual({ status: "empty" });
    expect(readQuantity("abc", MASS_UNITS)).toEqual({ status: "number" });
    expect(readQuantity("5 st", MASS_UNITS)).toEqual({ status: "unit", text: "st" });
    expect(readQuantity("5", MASS_UNITS)).toEqual({ status: "ok", amount: 5, unit: undefined });
  });
});

describe("formatQuantity", () => {
  it("writes the amount for the locale with a no-break space before the label", () => {
    expect(formatQuantity({ amount: 5.5, unit: "kg" }, MASS_UNITS, { locale: "en-US" })).toBe(
      `5.5${NBSP}kg`,
    );
    expect(formatQuantity({ amount: 5.5, unit: "kg" }, MASS_UNITS, { locale: "de-DE" })).toBe(
      `5,5${NBSP}kg`,
    );
    expect(formatQuantity({ amount: 1200.5, unit: "g" }, MASS_UNITS, { locale: "en-US" })).toBe(
      `1,200.5${NBSP}g`,
    );
    expect(formatQuantity({ amount: 1200.5, unit: "g" }, MASS_UNITS, { locale: "de-DE" })).toBe(
      `1.200,5${NBSP}g`,
    );
  });

  it("rounds to the unit's decimals unless told otherwise", () => {
    const pound = { amount: 2.20462262185, unit: "lb" };
    expect(formatQuantity(pound, MASS_UNITS, { locale: "en-US", unitDisplay: "none" })).toBe(
      "2.2",
    );
    expect(
      formatQuantity(pound, MASS_UNITS, { locale: "en-US", decimals: 4, unitDisplay: "none" }),
    ).toBe("2.2046");
    expect(
      formatQuantity({ amount: -0.0001, unit: "kg" }, MASS_UNITS, { locale: "en-US" }),
    ).toBe(`0${NBSP}kg`);
  });

  it("spells the unit out, singular where the locale says one", () => {
    const spoken = { locale: "en-US", unitDisplay: "spoken" } as const;
    expect(formatQuantity({ amount: 5.5, unit: "kg" }, MASS_UNITS, spoken)).toBe(
      "5.5 kilograms",
    );
    expect(formatQuantity({ amount: 1, unit: "kg" }, MASS_UNITS, spoken)).toBe("1 kilogram");
    expect(formatQuantity({ amount: 1, unit: "C" }, TEMPERATURE_UNITS, spoken)).toBe(
      "1 degree Celsius",
    );
    const bare: QuantityUnit[] = [{ value: "u", label: "u", factor: 1 }];
    expect(formatQuantity({ amount: 3, unit: "u" }, bare, spoken)).toBe("3 u");
  });

  it("falls back to the raw unit when it is not in the list", () => {
    expect(formatQuantity({ amount: 5, unit: "st" }, MASS_UNITS, { locale: "en-US" })).toBe(
      `5${NBSP}st`,
    );
    expect(
      formatQuantity({ amount: 5, unit: "st" }, MASS_UNITS, {
        locale: "en-US",
        unitDisplay: "spoken",
      }),
    ).toBe("5 st");
  });

  it("round-trips through parseQuantity in every locale", () => {
    for (const locale of ["en-US", "de-DE", "fr-FR", "de-CH", "en-IN", "ar-EG", "sv-SE"]) {
      for (const quantity of [
        { amount: 1234567.5, unit: "g" },
        { amount: -40.5, unit: "C" },
      ]) {
        const text = formatQuantity(quantity, ALL, { locale });
        expect(parseQuantity(text, ALL, locale), `${locale}: ${text}`).toEqual(quantity);
      }
    }
  });
});

describe("clampQuantity", () => {
  it("clamps against bounds written in other units", () => {
    expect(
      clampQuantity({ amount: 500, unit: "g" }, MASS_UNITS, {
        max: { amount: 0.25, unit: "kg" },
      }),
    ).toEqual({ amount: 250, unit: "g" });
    expect(
      clampQuantity({ amount: 1, unit: "lb" }, MASS_UNITS, { min: { amount: 1, unit: "kg" } }),
    ).toEqual({ amount: 2.20462262185, unit: "lb" });
  });

  it("returns the same quantity when it is in range or its unit is unknown", () => {
    const inRange = { amount: 1, unit: "kg" };
    expect(clampQuantity(inRange, MASS_UNITS, { min: { amount: 0, unit: "g" } })).toBe(inRange);
    const unknown = { amount: 99, unit: "st" };
    expect(clampQuantity(unknown, MASS_UNITS, { max: { amount: 1, unit: "kg" } })).toBe(
      unknown,
    );
  });
});

describe("rounding helpers", () => {
  it("rounds halves away from zero without binary surprises, and never to -0", () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(-2.5, 0)).toBe(-3);
    expect(roundTo(2.219, 2, "floor")).toBe(2.21);
    expect(roundTo(2.211, 2, "ceil")).toBe(2.22);
    expect(Object.is(roundTo(-0.0001, 2), 0)).toBe(true);
  });

  it("keeps as many decimals as the step needs", () => {
    expect(precisionOf(0.25)).toBe(2);
    expect(precisionOf(1e-7)).toBe(7);
    expect(precisionOf(10)).toBe(0);
    expect(decimalsFor(unit("B"))).toBe(0);
    expect(decimalsFor(unit("B"), 0.5)).toBe(1);
    expect(decimalsFor({ value: "u", label: "u", factor: 1 })).toBe(2);
  });
});

describe("presets", () => {
  it("picks units in the order asked, and refuses unknown ones", () => {
    expect(pickUnits(MASS_UNITS, ["lb", "kg"]).map((option) => option.value)).toEqual([
      "lb",
      "kg",
    ]);
    expect(() => pickUnits(MASS_UNITS, ["stone"])).toThrow(/no "stone"/);
  });

  it("gives every unit a distinct value, a spoken name and a positive factor", () => {
    for (const list of [
      MASS_UNITS,
      LENGTH_UNITS,
      DATA_UNITS,
      DATA_UNITS_IEC,
      DURATION_UNITS,
      TEMPERATURE_UNITS,
    ]) {
      const values = list.map((option) => option.value.toLowerCase());
      expect(new Set(values).size).toBe(values.length);
      for (const option of list) {
        expect(option.spoken).toBeTruthy();
        expect(option.spokenOne).toBeTruthy();
        expect(option.factor).toBeGreaterThan(0);
      }
    }
  });
});
