import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Label } from "@/components/label";

import { Slider } from "./slider";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-72">
    <Story />
  </div>
);

const meta = {
  title: "Forms/Slider",
  component: Slider,
  args: { defaultValue: [40], min: 0, max: 100, step: 1, "aria-label": "Volume" },
  argTypes: {
    step: { control: { type: "number", min: 1, max: 25 } },
    disabled: { control: "boolean" },
  },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A slider is imprecise; showing the value makes it usable. */
export const WithValue: Story = {
  parameters: { controls: { disable: true } },
  render: function WithValue() {
    const [value, setValue] = useState([40]);
    return (
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="quality">Quality</Label>
          <span className="text-sm text-muted-foreground tabular-nums">{value[0]}%</span>
        </div>
        <Slider id="quality" aria-label="Quality" value={value} onValueChange={setValue} />
      </div>
    );
  },
};

/** Each thumb is its own slider control, so each one gets its own name. */
export const Range: Story = {
  parameters: { controls: { disable: true } },
  render: function Range() {
    const [range, setRange] = useState([20, 80]);
    return (
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <Label>Price range</Label>
          <span className="text-sm text-muted-foreground tabular-nums">
            ${range[0]} – ${range[1]}
          </span>
        </div>
        <Slider
          value={range}
          onValueChange={setRange}
          thumbLabels={["Minimum price", "Maximum price"]}
          thumbValueTexts={[`$${String(range[0])}`, `$${String(range[1])}`]}
        />
      </div>
    );
  },
};

export const Steps: Story = {
  args: { defaultValue: [50], step: 10 },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Vertical: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex h-44 justify-center">
      <Slider orientation="vertical" defaultValue={[60]} aria-label="Volume" />
    </div>
  ),
};
