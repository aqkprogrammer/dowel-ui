import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import {
  DATA_UNITS,
  DURATION_UNITS,
  MASS_UNITS,
  QuantityInput,
  TEMPERATURE_UNITS,
  pickUnits,
  type QuantityInputLabels,
  type QuantityUnit,
} from "./quantity-input";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-72">
    <Story />
  </div>
);

const meta = {
  title: "Form/Quantity Input",
  component: QuantityInput,
  args: {
    label: "Parcel weight",
    units: pickUnits(MASS_UNITS, ["kg", "lb"]),
    defaultValue: { amount: 2.5, unit: "kg" },
    min: { amount: 0.1, unit: "kg" },
    max: { amount: 30, unit: "kg" },
    name: "weight",
    inputSize: "md",
    convertOnUnitChange: true,
    disabled: false,
    readOnly: false,
  },
  argTypes: {
    inputSize: { control: "inline-radio", options: ["sm", "md", "lg"] },
    units: { control: false },
    labels: { control: false },
  },
  decorators: [withFixedWidth],
} satisfies Meta<typeof QuantityInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A parcel's weight, up to 30 kg. Switch to pounds and the amount and the
 * limit convert with it; switch back and it returns to exactly 2.5 kg. Type
 * "6 lb" to change both at once, or use the arrow keys (Shift for ten steps).
 */
export const Default: Story = {};

/**
 * Disk size in 1000-based units, as providers bill it. The limit is written
 * as 16 TB and still applies in gigabytes.
 */
export const StorageSize: Story = {
  args: {
    label: "Disk size",
    units: pickUnits(DATA_UNITS, ["GB", "TB"]),
    defaultValue: { amount: 100, unit: "GB" },
    min: { amount: 10, unit: "GB" },
    max: { amount: 16, unit: "TB" },
    name: "disk",
  },
};

/**
 * Celsius and Fahrenheit convert with an offset as well as a factor. The
 * field can go below zero, so phones get a keyboard with a minus key.
 */
export const Temperature: Story = {
  args: {
    label: "Thermostat",
    units: TEMPERATURE_UNITS,
    defaultValue: { amount: 21, unit: "C" },
    min: { amount: 5, unit: "C" },
    max: { amount: 30, unit: "C" },
    name: "target",
  },
};

/**
 * A timeout between 100 ms and 10 minutes. Try typing "2 min" or "1.5 hours"
 * to see a unit that is not offered explained.
 */
export const Duration: Story = {
  args: {
    label: "Request timeout",
    units: pickUnits(DURATION_UNITS, ["ms", "s", "min"]),
    defaultValue: { amount: 30, unit: "s" },
    min: { amount: 100, unit: "ms" },
    max: { amount: 10, unit: "min" },
    name: "timeout",
  },
};

const [KILOGRAM, GRAM] = pickUnits(MASS_UNITS, ["kg", "g"]) as [QuantityUnit, QuantityUnit];

/** The presets with German names, which screen readers use for the spoken value. */
const GERMAN_MASS: QuantityUnit[] = [
  { ...GRAM, spoken: "Gramm", spokenOne: "Gramm" },
  { ...KILOGRAM, spoken: "Kilogramm", spokenOne: "Kilogramm", aliases: ["Kilo"] },
];

const GERMAN_LABELS: QuantityInputLabels = {
  decrease: (step) => `Um ${step} verringern`,
  increase: (step) => `Um ${step} erhöhen`,
  unit: "Einheit",
  empty: "Bitte eine Menge eingeben.",
  notANumber: (example) => `Bitte eine Zahl eingeben, etwa ${example}.`,
  unknownUnit: (typed, offered) =>
    `„${typed}“ ist hier keine Einheit. Möglich sind ${offered.join(" und ")}.`,
  tooLow: (min) => `Mindestens ${min}.`,
  tooHigh: (max) => `Höchstens ${max}.`,
};

/**
 * German numbers, names and copy. The field shows "1.250" and reads
 * "1,5 kg" as one and a half kilograms; "1.5 kg" is refused rather than
 * guessed at, because in German it would mean fifteen hundred.
 */
export const GermanLocale: Story = {
  args: {
    label: "Mehl",
    units: GERMAN_MASS,
    defaultValue: { amount: 1250, unit: "g" },
    min: { amount: 0, unit: "g" },
    max: { amount: 25, unit: "kg" },
    locale: "de-DE",
    labels: GERMAN_LABELS,
    name: "mehl",
  },
};
