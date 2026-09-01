import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Input } from "@/components/input";
import { Label } from "@/components/label";

import { DatePicker, DateRangePicker } from "./date-picker";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-64">
    <Story />
  </div>
);

const meta = {
  title: "Forms/Date Picker",
  component: DatePicker,
  args: { placeholder: "Pick a date" },
  decorators: [withFixedWidth],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="grid gap-2">
      <Label>Start date</Label>
      <DatePicker {...args} />
    </div>
  ),
};

export const WithValue: Story = {
  args: { defaultValue: new Date(2026, 0, 15) },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: new Date(2026, 0, 15) },
};

/** The trigger label follows the locale, and so does its accessible name. */
export const Locales: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-3">
      {["en-US", "en-GB", "de-DE", "ja-JP"].map((locale) => (
        <div key={locale} className="grid gap-1">
          <span className="text-xs text-muted-foreground">{locale}</span>
          <DatePicker defaultValue={new Date(2026, 0, 15)} locale={locale} />
        </div>
      ))}
    </div>
  ),
};

export const Range: Story = {
  parameters: { controls: { disable: true } },
  render: function Range() {
    const [range, setRange] = useState<DateRange | undefined>({
      from: new Date(2026, 0, 10),
      to: new Date(2026, 0, 16),
    });
    return (
      <div className="grid w-80 gap-2">
        <Label>Reporting period</Label>
        <DateRangePicker value={range} onValueChange={setRange} />
      </div>
    );
  },
};

/**
 * A calendar is for browsing. For a date the user already knows, typing is
 * faster — offer both rather than forcing the picker.
 */
export const PairedWithTypedInput: Story = {
  parameters: { controls: { disable: true } },
  render: function Paired() {
    const [date, setDate] = useState<Date | undefined>(new Date(2026, 0, 15));
    const isoValue = date ? date.toISOString().slice(0, 10) : "";

    return (
      <div className="grid gap-2">
        <Label htmlFor="dob">Date of birth</Label>
        <div className="flex gap-2">
          <Input
            id="dob"
            type="date"
            value={isoValue}
            onChange={(event) => {
              const next = event.target.valueAsDate;
              setDate(next ?? undefined);
            }}
          />
          <DatePicker value={date} onValueChange={setDate} className="w-auto" />
        </div>
      </div>
    );
  },
};
