import type { Meta, StoryObj } from "@storybook/react-vite";
import { Minus, Plus, TrendingUp } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/button";

import { NumberFlow, PriceFlow, type NumberFlowProps } from "./number-flow";

const meta = {
  title: "Display/Number Flow",
  component: NumberFlow,
  args: {
    value: 1234.56,
    format: { style: "currency", currency: "USD" },
    trend: "auto",
    stagger: 0,
    variant: "plain",
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["plain", "tiles"] },
    trend: { control: "inline-radio", options: ["auto", "up", "down"] },
    as: { control: "select", options: ["span", "div", "p", "h1", "h2", "h3"] },
  },
} satisfies Meta<typeof NumberFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

function randomValue(current: number): number {
  const next = Math.round((current + (Math.random() - 0.4) * 400) * 100) / 100;
  return Math.max(0, next);
}

/** Press to change the value; the digits roll in the direction it moved. */
export const Default: Story = {
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <div className="flex flex-col items-start gap-4">
        <NumberFlow {...args} value={value} className="text-5xl font-semibold" />
        <Button variant="secondary" onClick={() => setValue((current) => randomValue(current))}>
          Change value
        </Button>
      </div>
    );
  },
};

function Caption({ source, children }: { source: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-4 rounded-lg border border-border p-6">
      {children}
      <figcaption className="text-xs text-muted-foreground">SmoothUI {source}</figcaption>
    </figure>
  );
}

/** SmoothUI Number Flow: a 0–999 counter in three tiles, stepped by + and −. */
function NumberFlowDemo() {
  const [value, setValue] = useState(0);
  const min = 0;
  const max = 999;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-4">
      <NumberFlow
        value={value}
        variant="tiles"
        format={{ minimumIntegerDigits: 3, useGrouping: false }}
        className="text-2xl"
      />
      <div className="flex flex-col gap-1">
        <Button
          size="icon"
          variant="outline"
          aria-label="Increase number"
          disabled={value >= max}
          onClick={() => setValue((current) => Math.min(max, current + 1))}
        >
          <Plus />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Decrease number"
          disabled={value <= min}
          onClick={() => setValue((current) => Math.max(min, current - 1))}
        >
          <Minus />
        </Button>
      </div>
    </div>
  );
}

/** SmoothUI Price Flow: 25 € ↔ 16 €, the ones digit following the tens by 50ms. */
function PriceFlowDemo() {
  const [value, setValue] = useState(25);
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-6xl font-bold text-foreground">
        <PriceFlow value={value} />€
      </div>
      <Button onClick={() => setValue((current) => (current === 25 ? 16 : 25))}>
        Change price
      </Button>
    </div>
  );
}

/** Both SmoothUI items, reproduced. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <Caption source="Number Flow">
        <NumberFlowDemo />
      </Caption>
      <Caption source="Price Flow">
        <PriceFlowDemo />
      </Caption>
    </div>
  ),
};

type Example = { label: string } & Omit<NumberFlowProps, "value">;

const FORMATS: Example[] = [
  { label: "Currency", format: { style: "currency", currency: "USD" } },
  { label: "Euro, de-DE", locales: "de-DE", format: { style: "currency", currency: "EUR" } },
  { label: "Percent", format: { style: "percent", maximumFractionDigits: 1 } },
  { label: "Compact", format: { notation: "compact", maximumFractionDigits: 1 } },
  { label: "Signed", format: { signDisplay: "always", maximumFractionDigits: 2 } },
  { label: "Arabic digits", locales: "ar-EG" },
];

/** Formatting is Intl.NumberFormat: separators, symbols and signs fade in and out. */
export const Formats: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState(0.4213);
    const scaled = (example: Example) =>
      example.format?.style === "percent" ? value : value * 12_345;
    return (
      <div className="flex flex-col items-start gap-4">
        <dl className="grid grid-cols-[auto_auto] items-baseline gap-x-6 gap-y-2">
          {FORMATS.map(({ label, ...example }) => (
            <div key={label} className="contents">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-2xl font-medium">
                <NumberFlow value={scaled({ label, ...example })} {...example} />
              </dd>
            </div>
          ))}
        </dl>
        <Button
          variant="secondary"
          onClick={() => setValue((current) => Math.round((current * 7.3 - 1.1) * 1e4) / 1e4)}
        >
          Change value
        </Button>
      </div>
    );
  },
};

/**
 * 99 → 100 opens a column for the hundreds reel, which slides in from below
 * while the existing reels roll; 100 → 99 fades it out as its column closes.
 * The number's width follows, and the suffix glides along with it.
 */
export const GrowingDigits: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState(98);
    return (
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          aria-label="Decrease"
          onClick={() => setValue((v) => v - 1)}
        >
          <Minus />
        </Button>
        <NumberFlow
          value={value}
          suffix={<span className="text-muted-foreground"> pts</span>}
          className="text-5xl font-semibold"
        />
        <Button
          variant="outline"
          size="icon"
          aria-label="Increase"
          onClick={() => setValue((v) => v + 1)}
        >
          <Plus />
        </Button>
      </div>
    );
  },
};

/** A countdown rolls down even through 0 → 9, with `trend="down"`. */
export const Countdown: Story = {
  args: { value: 60, trend: "down", format: undefined, stagger: 40, variant: "tiles" },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <div className="flex items-center gap-4">
        <NumberFlow {...args} value={value} className="text-2xl" />
        <Button variant="secondary" onClick={() => setValue((v) => (v <= 0 ? 60 : v - 1))}>
          Tick
        </Button>
      </div>
    );
  },
};

/**
 * A value that changes faster than a roll can finish spins rather than
 * stutters: each change retargets the reel from where it is on screen, always
 * in the direction of travel. A shorter `duration` keeps the reels close to a
 * value that never stops moving.
 */
export const RapidUpdates: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState(0);
    const [running, setRunning] = useState(false);
    useEffect(() => {
      if (!running) return;
      const timer = setInterval(() => {
        setValue((current) => current + 7);
      }, 60);
      return () => {
        clearInterval(timer);
      };
    }, [running]);
    return (
      <div className="flex flex-col items-start gap-4">
        <NumberFlow
          value={value}
          duration={180}
          locales="en-US"
          className="text-5xl font-semibold"
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setRunning((current) => !current)}>
            {running ? "Stop" : "Start counting"}
          </Button>
          <Button variant="outline" onClick={() => setValue(0)}>
            Reset
          </Button>
        </div>
      </div>
    );
  },
};

/** `prefix` and `suffix` sit outside the reels and never animate; they are read with the number. */
export const PrefixAndSuffix: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState(1280);
    return (
      <div className="flex flex-col items-start gap-4">
        <NumberFlow
          value={value}
          locales="en-US"
          prefix={<TrendingUp aria-hidden="true" className="me-2 inline size-8 text-success" />}
          suffix={<span className="ms-1 text-2xl text-muted-foreground">/mo</span>}
          className="text-5xl font-semibold"
        />
        <Button variant="secondary" onClick={() => setValue((current) => randomValue(current))}>
          Change value
        </Button>
      </div>
    );
  },
};

/**
 * Padding, grouping and decimals are Intl.NumberFormat's job, so there are no
 * bespoke props for them: `minimumIntegerDigits` holds the width steady across
 * a power of ten, `en-IN` groups the last three digits then pairs, and
 * `minimumFractionDigits` / `maximumFractionDigits` fix the decimals.
 */
export const PaddingAndGrouping: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState(98_765.4);
    const examples: Example[] = [
      { label: "Padded to 6", format: { minimumIntegerDigits: 6, useGrouping: false } },
      { label: "Indian grouping", locales: "en-IN" },
      {
        label: "Two decimals",
        locales: "en-US",
        format: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      },
      { label: "No grouping", format: { useGrouping: false, maximumFractionDigits: 0 } },
    ];
    return (
      <div className="flex flex-col items-start gap-4">
        <dl className="grid grid-cols-[auto_auto] items-baseline gap-x-6 gap-y-2">
          {examples.map(({ label, ...example }) => (
            <div key={label} className="contents">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-2xl font-medium">
                <NumberFlow value={value} {...example} />
              </dd>
            </div>
          ))}
        </dl>
        <Button
          variant="secondary"
          onClick={() =>
            setValue((current) =>
              current > 1_000_000 ? 42.5 : Math.round(current * 13.7 * 10) / 10,
            )
          }
        >
          Change value
        </Button>
      </div>
    );
  },
};
