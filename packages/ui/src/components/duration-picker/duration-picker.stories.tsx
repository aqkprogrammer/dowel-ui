import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DurationPicker, type DurationValue } from "./duration-picker";

const meta = {
  title: "Form/Duration Picker",
  component: DurationPicker,
  args: {
    defaultValue: { hours: 2, minutes: 30 },
    maxHours: 24,
    maxMinutes: 59,
    hoursLabel: "hr",
    minutesLabel: "min",
    size: "md",
    disabled: false,
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    value: { control: false },
    editing: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof DurationPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Press the pen: the pill springs apart and the hours are focused. Type past
 * 24 hours or 59 minutes and the field clamps and shakes. The tick (or Enter)
 * confirms and the pieces melt back into one; Escape puts the old value back.
 */
export const Default: Story = {};

/** Starts open, as if the user had just pressed the pen. */
export const Editing: Story = {
  args: { defaultEditing: true },
};

/** A week-long ceiling and terse units. */
export const CustomCeiling: Story = {
  args: {
    defaultValue: { hours: 72, minutes: 0 },
    maxHours: 168,
    maxMinutes: 45,
    hoursLabel: "h",
    minutesLabel: "m",
  },
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid justify-items-center gap-4">
      <DurationPicker size="sm" defaultValue={{ hours: 0, minutes: 45 }} aria-label="Small" />
      <DurationPicker size="md" defaultValue={{ hours: 1, minutes: 15 }} aria-label="Medium" />
      <DurationPicker size="lg" defaultValue={{ hours: 8, minutes: 0 }} aria-label="Large" />
    </div>
  ),
};

/** Controlled value and edit mode, with a log of what the picker reports. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState<DurationValue>({ hours: 1, minutes: 30 });
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState<DurationValue | null>(null);
    return (
      <div className="grid justify-items-center gap-3">
        <span id="focus-block" className="text-sm font-medium">
          Focus block
        </span>
        <DurationPicker
          aria-labelledby="focus-block"
          value={value}
          onValueChange={setValue}
          editing={editing}
          onEditingChange={setEditing}
          onConfirm={setSaved}
        />
        <p className="text-xs text-muted-foreground">
          {editing ? "Editing…" : "Saved"}: {value.hours} h {value.minutes} min
          {saved
            ? ` · last confirmed ${String(saved.hours)}:${String(saved.minutes).padStart(2, "0")}`
            : ""}
        </p>
      </div>
    );
  },
};

/** Translated names and announcement through `labels`. */
export const Localised: Story = {
  args: {
    hoursLabel: "Std.",
    minutesLabel: "Min.",
    "aria-label": "Dauer",
    labels: {
      hours: "Stunden",
      minutes: "Minuten",
      edit: "Dauer bearbeiten",
      confirm: "Dauer bestätigen",
      maximum: "Höchstens",
    },
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
