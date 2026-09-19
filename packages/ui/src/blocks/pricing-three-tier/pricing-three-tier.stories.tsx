import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { PricingThreeTierBlock } from "./pricing-three-tier";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[80rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof PricingThreeTierBlock> = {
  title: "Blocks/Pricing three tier",
  component: PricingThreeTierBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof PricingThreeTierBlock>;

/** SmoothUI "Pricing 2": flip the period — the pill slides, every price rolls, and the change is announced. */
export const Default: Story = {};

/** Every source item: SmoothUI "Pricing 2" (Pricing Modern), with its default plans. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <PricingThreeTierBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Pricing 2 — Pricing Modern
      </figcaption>
    </figure>
  ),
};

/** US dollars, starting on monthly billing. */
export const Dollars: Story = {
  args: { currency: "USD", locale: "en-US", defaultPeriod: "monthly" },
};

/** Without the period control. */
export const WithoutPeriodToggle: Story = {
  args: { showPeriodToggle: false, defaultPeriod: "monthly" },
};
