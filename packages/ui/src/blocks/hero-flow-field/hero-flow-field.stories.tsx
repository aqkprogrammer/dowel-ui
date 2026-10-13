import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { HeroFlowFieldBlock } from "./hero-flow-field";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[72rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof HeroFlowFieldBlock> = {
  title: "Blocks/Hero flow field",
  component: HeroFlowFieldBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Without the figures or the command: just the message and the actions. */
export const Minimal: Story = { args: { stats: [], command: null } };
