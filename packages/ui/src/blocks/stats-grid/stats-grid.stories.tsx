import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { StatsGridBlock } from "./stats-grid";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[76rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof StatsGridBlock> = {
  title: "Blocks/Stats grid",
  component: StatsGridBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof StatsGridBlock>;

/** SmoothUI "Stats 1": four figures that rise in and roll up from zero. */
export const Default: Story = {};

/** Every source item: SmoothUI "Stats 1" (Stats Grid), with its default content. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <StatsGridBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Stats 1 — Stats Grid
      </figcaption>
    </figure>
  ),
};

/** Scroll down: a row that starts below the fold waits, then rises in and rolls up. */
export const BelowTheFold: Story = {
  render: () => (
    <div>
      <div className="flex h-[150vh] items-center justify-center text-muted-foreground">
        Scroll down
      </div>
      <StatsGridBlock />
    </div>
  ),
};

/** Formatted by Intl for any locale: currency, compact notation, fractions. */
export const Formatting: Story = {
  args: {
    heading: "Quarter in review",
    locales: "de-DE",
    stats: [
      {
        label: "Umsatz",
        value: 2_500_000,
        format: { style: "currency", currency: "EUR", notation: "compact" },
      },
      { label: "Kunden", value: 45_000, format: { notation: "compact" } },
      { label: "Zufriedenheit", value: 98, suffix: " %" },
      { label: "Downloads", value: 1_200_000, format: { notation: "compact" } },
    ],
  },
};
