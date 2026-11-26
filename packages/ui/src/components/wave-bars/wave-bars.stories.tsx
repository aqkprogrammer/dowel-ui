import type { Meta, StoryObj } from "@storybook/react-vite";

import { WaveBars } from "./wave-bars";

const meta = {
  title: "Feedback/Wave Bars",
  component: WaveBars,
  args: { bars: 5, active: true, size: "md", label: "Listening" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] },
    bars: { control: { type: "range", min: 3, max: 9, step: 1 } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof WaveBars>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Five bars, rippling. Toggle `active` to settle them. */
export const Default: Story = {};

/** On the dark tile, as in the reference. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex size-56 items-center justify-center rounded-3xl bg-[#161618] p-10 text-white">
      <WaveBars label="Listening" />
    </div>
  ),
};

/** It takes the colour of its text. */
export const Colours: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <WaveBars className="text-primary" />
      <WaveBars className="text-success" bars={7} />
      <WaveBars className="text-muted-foreground" active={false} />
    </div>
  ),
};
