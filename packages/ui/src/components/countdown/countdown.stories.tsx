import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";

import { Countdown } from "./countdown";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Fixed when the story file loads, so every re-render counts to the same moment. */
const LAUNCH = Date.now() + 2 * DAY + 5 * HOUR + 42 * MINUTE + 9 * SECOND;

const meta = {
  title: "Display/Countdown",
  component: Countdown,
  args: {
    date: LAUNCH,
    format: "compact",
    units: "auto",
    live: false,
  },
  argTypes: {
    date: { control: "date" },
    format: { control: "inline-radio", options: ["compact", "labelled"] },
    units: { control: false },
    now: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Countdown>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Compact: "2d 05:42:09", each digit rolling down as it ticks. */
export const Default: Story = {
  args: { className: "text-3xl" },
};

/** Each value over its unit, in a tile. Captions are Intl's unit names, pluralised. */
export const Labelled: Story = {
  args: { format: "labelled", className: "text-2xl" },
};

function RestartableDemo() {
  const [target, setTarget] = useState(() => Date.now() + 12 * SECOND);
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4">
      <Countdown
        date={target}
        format="labelled"
        className="text-2xl"
        onComplete={() => {
          setDone(true);
        }}
      />
      <p className="h-5 text-sm text-muted-foreground">{done ? "Liftoff." : null}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setDone(false);
          setTarget(Date.now() + 12 * SECOND);
        }}
      >
        Restart
      </Button>
    </div>
  );
}

/**
 * Under a minute, days and hours drop away (`units="auto"`). `onComplete` fires
 * once when it reaches zero.
 */
export const Completing: Story = {
  parameters: { controls: { disable: true } },
  render: () => <RestartableDemo />,
};

/** A fixed set of units: hours absorb the days, and seconds are left off. */
export const FixedUnits: Story = {
  args: { units: ["hours", "minutes"], className: "text-3xl" },
};

/** Unit names and digits follow `locales`; the sentences come from `labels`. */
export const Localised: Story = {
  args: {
    format: "labelled",
    locales: "de",
    className: "text-2xl",
    labels: {
      remaining: (duration) => `Noch ${duration}`,
      underAMinute: "Weniger als eine Minute",
      complete: "Abgelaufen",
    },
  },
};

/**
 * An injected clock: with `now` set the component renders that instant and
 * never ticks on its own — for server rendering, tests, or a shared clock.
 */
export const InjectedClock: Story = {
  args: {
    date: Date.UTC(2026, 11, 31, 23, 59, 59),
    now: Date.UTC(2026, 11, 30, 20, 15, 0),
    format: "labelled",
    className: "text-2xl",
  },
};
