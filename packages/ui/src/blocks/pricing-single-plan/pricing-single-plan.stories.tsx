import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { PricingSinglePlanBlock } from "./pricing-single-plan";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof PricingSinglePlanBlock> = {
  title: "Blocks/Pricing single plan",
  component: PricingSinglePlanBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof PricingSinglePlanBlock>;

/** SmoothUI "Pricing 1": one plan; flip the period and the price rolls. */
export const Default: Story = {};

/** Every source item: SmoothUI "Pricing 1" (Pricing Simple), with its default plan. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <PricingSinglePlanBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Pricing 1 — Pricing Simple
      </figcaption>
    </figure>
  ),
};

/** Monthly first, in US dollars. */
export const Dollars: Story = {
  args: { currency: "USD", locale: "en-US", defaultPeriod: "monthly" },
};
