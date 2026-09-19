import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DitherScatter, type DitherScatterDatum } from "./dither-scatter";

/**
 * amicro's two traffic sources. amicro placed bubbles in % from the top-left
 * with radii in pixels; here y points up and size is an area, so y is flipped
 * and size is r² (sessions, in tens) to keep amicro's radius ratios.
 */
const SOURCES: { name: string; data: DitherScatterDatum[] }[] = [
  {
    name: "Direct",
    data: [
      { label: "US", x: 50, y: 50, size: 35 * 35 },
      { label: "UK", x: 30, y: 80, size: 20 * 20 },
      { label: "CA", x: 70, y: 20, size: 25 * 25 },
    ],
  },
  {
    name: "Social",
    data: [
      { label: "IG", x: 40, y: 40, size: 40 * 40 },
      { label: "TW", x: 70, y: 70, size: 25 * 25 },
      { label: "FB", x: 20, y: 60, size: 15 * 15 },
    ],
  },
];

const shared = {
  xDomain: [0, 100] as const,
  yDomain: [0, 100] as const,
  minRadius: 0,
  maxRadius: 0.3,
  xLabel: "Engagement",
  yLabel: "Retention",
  sizeLabel: "Sessions",
};

const meta: Meta<typeof DitherScatter> = {
  title: "Data/Dither Scatter",
  component: DitherScatter,
  args: { data: SOURCES[0]!.data, label: "Traffic by country", ...shared, size: "md" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    data: { control: false },
    xDomain: { control: false },
    yDomain: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** amicro's Traffic Scatter Bubbles, switched between sources. */
function TrafficBubbles() {
  const [source, setSource] = useState(0);
  const current = SOURCES[source] ?? SOURCES[0]!;
  return (
    <div className="flex max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <div
        role="group"
        aria-label="Source"
        className="inline-flex self-end rounded-full border border-border bg-muted p-0.5 text-xs"
      >
        {SOURCES.map((s, index) => (
          <button
            key={s.name}
            type="button"
            aria-pressed={source === index}
            onClick={() => {
              setSource(index);
            }}
            className="rounded-full px-2.5 py-1 font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:outline-none aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {s.name}
          </button>
        ))}
      </div>
      <DitherScatter data={current.data} label={`${current.name} traffic`} {...shared} />
    </div>
  );
}

export const TrafficScatterBubbles: Story = {
  parameters: { controls: { disable: true } },
  render: () => <TrafficBubbles />,
};

/** Every amicro source item this component covers. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-2">
      <TrafficBubbles />
      <figcaption className="text-xs text-muted-foreground">Traffic Scatter Bubbles</figcaption>
    </figure>
  ),
};

export const PinnedPoint: Story = {
  args: { defaultActiveIndex: 0 },
};

export const WithVisibleTable: Story = {
  args: { showTable: true },
};

export const Static: Story = {
  args: { animate: false },
};
