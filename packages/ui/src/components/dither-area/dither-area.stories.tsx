import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DitherArea, type DitherAreaDatum } from "./dither-area";

function members(days: number): DitherAreaDatum[] {
  const end = new Date(2026, 6, 14);
  return Array.from({ length: days }, (_, i) => {
    const t = days > 1 ? i / (days - 1) : 1;
    const date = new Date(end);
    date.setDate(end.getDate() - (days - 1 - i));
    return {
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: Math.max(
        3,
        Math.round(9 + t * 23 + 6 * Math.sin(i * 0.7 + 1) + 3 * Math.sin(i * 1.9)),
      ),
    };
  });
}

const meta = {
  title: "Data/Dither Area",
  component: DitherArea,
  args: { data: members(30), label: "New members per day", size: "md" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    data: { control: false },
  },
} satisfies Meta<typeof DitherArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const RANGES = [
  { name: "7D", days: 7 },
  { name: "14D", days: 14 },
  { name: "30D", days: 30 },
  { name: "90D", days: 90 },
];

/** amicro's Dither Area Growth: member growth by range, with the date scrubber. */
function MemberGrowth() {
  const [range, setRange] = useState(2);
  const data = members(RANGES[range]?.days ?? 30);
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  return (
    <div className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums">
            +{new Intl.NumberFormat().format(total)}
          </p>
          <p className="text-xs text-muted-foreground">
            Member growth over the selected interval
          </p>
        </div>
        <div
          role="group"
          aria-label="Range"
          className="inline-flex rounded-full border border-border bg-muted p-0.5 text-xs"
        >
          {RANGES.map((r, index) => (
            <button
              key={r.name}
              type="button"
              aria-pressed={range === index}
              onClick={() => {
                setRange(index);
              }}
              className="rounded-full px-2.5 py-1 font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:outline-none aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
      <DitherArea
        data={data}
        label="New members per day"
        formatValue={(value) => `+${String(value)}`}
      />
    </div>
  );
}

export const DitherAreaGrowth: Story = {
  parameters: { controls: { disable: true } },
  render: () => <MemberGrowth />,
};

/** Every amicro source item this component covers. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-2">
      <MemberGrowth />
      <figcaption className="text-xs text-muted-foreground">
        Dither Area Growth — Tab to the plot, then use the arrow keys
      </figcaption>
    </figure>
  ),
};

export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const data = members(14);
    const [index, setIndex] = useState<number | null>(6);
    return (
      <div className="flex max-w-2xl flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Cursor:{" "}
          {index === null
            ? "hidden"
            : `${data[index]?.label ?? ""} (${String(data[index]?.value ?? 0)})`}
        </p>
        <DitherArea
          data={data}
          label="New members per day"
          index={index}
          onIndexChange={setIndex}
        />
      </div>
    );
  },
};

export const InfoColour: Story = {
  args: { color: "info" },
};

export const WithVisibleTable: Story = {
  args: { data: members(7), showTable: true },
};

export const Static: Story = {
  args: { animate: false },
};
