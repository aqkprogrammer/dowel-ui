import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { HeroLightBeamsBlock } from "./hero-light-beams";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[72rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof HeroLightBeamsBlock> = {
  title: "Blocks/Hero light beams",
  component: HeroLightBeamsBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Lit in another colour, without the announcement. */
export const Info: Story = { args: { beamColor: "info", announcement: null } };
