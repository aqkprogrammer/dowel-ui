import type { Meta, StoryObj } from "@storybook/react-vite";

import { ContributionGraph, type ContributionDay } from "./contribution-graph";

/** Deterministic sample data: about 30% of days active, like the source demo. */
function sample(year: number, seed = 7): ContributionDay[] {
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  const days: ContributionDay[] = [];
  for (let time = Date.UTC(year, 0, 1); time <= Date.UTC(year, 11, 31); time += 86_400_000) {
    const count = random() < 0.3 ? Math.floor(random() * 20) : 0;
    if (count > 0) days.push({ date: new Date(time).toISOString().slice(0, 10), count });
  }
  return days;
}

const DATA = sample(2025);

const meta: Meta<typeof ContributionGraph> = {
  title: "Data/Contribution Graph",
  component: ContributionGraph,
  args: {
    data: DATA,
    year: 2025,
    showLegend: true,
    showTooltips: true,
  },
  argTypes: {
    data: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * SmoothUI Contribution Graph, as its demo: a year of random sample data
 * (≈30% of days active, counts 0–19) in a bordered panel, with legend and
 * tooltips. Tab into the grid and use the arrow keys.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-3">
      <div className="max-w-full rounded-lg border border-border bg-background p-2">
        <ContributionGraph data={DATA} year={2025} />
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Contribution Graph — demo
      </figcaption>
    </figure>
  ),
};

/** Explicit levels from the data, and a custom count phrase. */
export const CustomLevels: Story = {
  args: {
    data: DATA.map((day) => ({ ...day, level: day.count > 10 ? 4 : 1 })),
    formatCount: (count: number) => `${String(count)} deploys`,
    label: "Deploys in 2025",
  },
};

export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <ContributionGraph {...args} />
    </div>
  ),
};
