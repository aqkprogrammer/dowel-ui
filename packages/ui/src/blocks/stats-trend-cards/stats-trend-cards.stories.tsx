import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Clock, TrendingDown, Users } from "lucide-react";

import { StatsTrendCardsBlock } from "./stats-trend-cards";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[76rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof StatsTrendCardsBlock> = {
  title: "Blocks/Stats trend cards",
  component: StatsTrendCardsBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof StatsTrendCardsBlock>;

/** SmoothUI "Stats 2": four metric cards with icons, rolling figures and trends. */
export const Default: Story = {};

/** Every source item: SmoothUI "Stats 2" (Stats Cards), with its default content. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <StatsTrendCardsBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Stats 2 — Stats Cards
      </figcaption>
    </figure>
  ),
};

/** Polarity: churn and response time going down are the good news here. */
export const Polarity: Story = {
  args: {
    heading: "Support health",
    stats: [
      {
        label: "Churn",
        value: 2.1,
        suffix: "%",
        icon: <TrendingDown className="size-8" />,
        trend: { change: -0.18, polarity: "lower-is-better" },
      },
      {
        label: "First response",
        value: 42,
        suffix: " min",
        icon: <Clock className="size-8" />,
        trend: { change: 0.06, polarity: "lower-is-better" },
      },
      {
        label: "Seats",
        value: 1840,
        icon: <Users className="size-8" />,
        trend: { change: 0, polarity: "neutral" },
      },
    ],
  },
};
