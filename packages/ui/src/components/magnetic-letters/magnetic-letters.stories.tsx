import type { Meta, StoryObj } from "@storybook/react-vite";

import { MagneticLetters } from "./magnetic-letters";

const meta = {
  title: "Effects/Magnetic Letters",
  component: MagneticLetters,
  args: {
    children: "Come closer",
    as: "h2",
    mode: "attract",
    strength: 14,
    radius: 140,
    className: "text-5xl font-bold tracking-tight",
  },
  argTypes: {
    mode: { control: "inline-radio", options: ["attract", "repel"] },
    strength: { control: { type: "range", min: 0, max: 40, step: 1 } },
    radius: { control: { type: "range", min: 30, max: 400, step: 10 } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof MagneticLetters>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Move the pointer near the heading: the letters lean toward it. */
export const Default: Story = {};

/** The letters scatter away from the pointer instead. */
export const Repel: Story = {
  args: { children: "Keep away", mode: "repel", strength: 22 },
};

/** A strong, wide pull across a whole wordmark. */
export const Wordmark: Story = {
  args: { children: "magnetic", strength: 30, radius: 260, className: "text-7xl font-black" },
};
