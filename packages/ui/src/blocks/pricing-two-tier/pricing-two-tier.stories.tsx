import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { PricingTwoTierBlock } from "./pricing-two-tier";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[72rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof PricingTwoTierBlock> = {
  title: "Blocks/Pricing two tier",
  component: PricingTwoTierBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof PricingTwoTierBlock>;

/** SmoothUI "Pricing 3": a free tier beside a featured paid one; flip the period and Pro's price rolls. */
export const Default: Story = {};

/** Every source item: SmoothUI "Pricing 3" (Pricing Creative), with its default plans. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <PricingTwoTierBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Pricing 3 — Pricing Creative
      </figcaption>
    </figure>
  ),
};

/** US dollars, starting on monthly billing. */
export const Dollars: Story = {
  args: { currency: "USD", locale: "en-US", defaultPeriod: "monthly" },
};
