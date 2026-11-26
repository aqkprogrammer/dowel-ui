import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { WheelPicker, type WheelPickerOption } from "./wheel-picker";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label) => ({ value: label.slice(0, 3).toLowerCase(), label }));

const range = (from: number, to: number, pad = 2): WheelPickerOption[] =>
  Array.from({ length: to - from + 1 }, (_, i) => {
    const label = String(from + i).padStart(pad, "0");
    return { value: label, label };
  });

const meta: Meta<typeof WheelPicker> = {
  title: "Form/Wheel Picker",
  component: WheelPicker,
  args: {
    "aria-label": "Month",
    options: MONTHS,
    defaultValue: "jun",
    visibleCount: 5,
    size: "md",
    disabled: false,
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md"] },
    visibleCount: { control: { type: "range", min: 3, max: 9, step: 2 } },
  },
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Scroll, drag or use the arrow keys; it settles on the band. */
export const Default: Story = {};

function TimePicker() {
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("30");
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1">
        <WheelPicker
          aria-label="Hour"
          className="w-20"
          options={range(0, 23)}
          value={hour}
          onValueChange={setHour}
        />
        <span aria-hidden="true" className="text-xl font-medium">
          :
        </span>
        <WheelPicker
          aria-label="Minute"
          className="w-20"
          options={range(0, 59)}
          value={minute}
          onValueChange={setMinute}
        />
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        Alarm at {hour}:{minute}
      </p>
    </div>
  );
}

/** Two drums side by side make a time picker. */
export const Time: Story = {
  parameters: { controls: { disable: true } },
  render: () => <TimePicker />,
};

/** Compact, three rows, with a sold-out option skipped. */
export const Small: Story = {
  args: {
    "aria-label": "Size",
    size: "sm",
    visibleCount: 3,
    defaultValue: "m",
    options: [
      { value: "xs", label: "XS" },
      { value: "s", label: "S" },
      { value: "m", label: "M" },
      { value: "l", label: "L", disabled: true },
      { value: "xl", label: "XL" },
    ],
  },
};
