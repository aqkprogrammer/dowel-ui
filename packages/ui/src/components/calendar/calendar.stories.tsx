import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "./calendar";

const JANUARY_2026 = new Date(2026, 0, 1);

const meta = {
  title: "Forms/Calendar",
  component: Calendar,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  render: function Default() {
    const [date, setDate] = useState<Date | undefined>(new Date(2026, 0, 15));
    return (
      <Calendar
        mode="single"
        defaultMonth={JANUARY_2026}
        selected={date}
        onSelect={setDate}
        className="rounded-lg border border-border"
      />
    );
  },
};

export const Range: Story = {
  render: function Range() {
    const [range, setRange] = useState<DateRange | undefined>({
      from: new Date(2026, 0, 10),
      to: new Date(2026, 0, 16),
    });
    return (
      <Calendar
        mode="range"
        defaultMonth={JANUARY_2026}
        selected={range}
        onSelect={setRange}
        numberOfMonths={2}
        className="rounded-lg border border-border"
      />
    );
  },
};

export const Multiple: Story = {
  render: function Multiple() {
    const [days, setDays] = useState<Date[] | undefined>([
      new Date(2026, 0, 6),
      new Date(2026, 0, 13),
      new Date(2026, 0, 20),
    ]);
    return (
      <Calendar
        mode="multiple"
        defaultMonth={JANUARY_2026}
        selected={days}
        onSelect={setDays}
        className="rounded-lg border border-border"
      />
    );
  },
};

/** Past dates are disabled — useful for scheduling. */
export const WithDisabledDates: Story = {
  render: () => (
    <Calendar
      mode="single"
      defaultMonth={JANUARY_2026}
      disabled={{ before: new Date(2026, 0, 12) }}
      className="rounded-lg border border-border"
    />
  ),
};

export const WithDropdownNavigation: Story = {
  render: () => (
    <Calendar
      mode="single"
      defaultMonth={JANUARY_2026}
      captionLayout="dropdown"
      startMonth={new Date(2020, 0)}
      endMonth={new Date(2030, 11)}
      className="rounded-lg border border-border"
    />
  ),
};

export const WithoutOutsideDays: Story = {
  render: () => (
    <Calendar
      mode="single"
      defaultMonth={JANUARY_2026}
      showOutsideDays={false}
      className="rounded-lg border border-border"
    />
  ),
};
