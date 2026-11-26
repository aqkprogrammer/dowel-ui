import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sun, SunDim, Volume1, Volume2 } from "lucide-react";
import { useState } from "react";

import { ElasticSlider } from "./elastic-slider";

const meta: Meta<typeof ElasticSlider> = {
  title: "Form/Elastic Slider",
  component: ElasticSlider,
  args: {
    "aria-label": "Volume",
    defaultValue: 60,
    maxStretch: 16,
    size: "md",
    showValue: true,
    disabled: false,
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md"] },
    maxStretch: { control: { type: "range", min: 0, max: 40, step: 2 } },
  },
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-72 pt-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Drag the thumb past either end and let go. */
export const Default: Story = {
  args: { startIcon: <Volume1 />, endIcon: <Volume2 /> },
};

function Brightness() {
  const [value, setValue] = useState(70);
  return (
    <div className="flex flex-col gap-3">
      <ElasticSlider
        aria-label="Brightness"
        value={value}
        onValueChange={setValue}
        startIcon={<SunDim />}
        endIcon={<Sun />}
        formatValue={(v) => `${String(v)}%`}
      />
      <p className="text-center text-sm text-muted-foreground tabular-nums">{value}%</p>
    </div>
  );
}

/** Controlled, with a percentage in the floating label and the spoken value. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Brightness />,
};

/** Small and stiff: less stretch, no floating value. */
export const Small: Story = {
  args: { size: "sm", maxStretch: 8, showValue: false },
};
