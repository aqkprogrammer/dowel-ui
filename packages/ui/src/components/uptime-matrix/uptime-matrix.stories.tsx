import type { Meta, StoryObj } from "@storybook/react-vite";

import { UptimeMatrix, type UptimeDay } from "./uptime-matrix";

/** amicro's 90 days: degraded on days 12, 45 and 78, down on 22 and 60. */
function history(): UptimeDay[] {
  const end = new Date(2026, 6, 14);
  return Array.from({ length: 90 }, (_, i) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (89 - i));
    const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (i === 12 || i === 45 || i === 78)
      return { label, status: "degraded", uptime: 99.1, note: "Elevated latency" };
    if (i === 22 || i === 60)
      return { label, status: "outage", uptime: 94.6, note: "Service unavailable" };
    return { label, status: "operational", uptime: 100 };
  });
}

const DAYS = history();

const meta: Meta<typeof UptimeMatrix> = {
  title: "Data/Uptime Matrix",
  component: UptimeMatrix,
  args: {
    days: DAYS,
    label: "API uptime, last 90 days",
    startLabel: "90 days ago",
    endLabel: "Today",
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    days: { control: false },
    formatUptime: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** amicro's System Uptime Matrix: thin tiles wrapping into rows. */
function SystemUptime() {
  return (
    <div className="flex max-w-md flex-col gap-3 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <p className="text-sm font-semibold">System status</p>
      <UptimeMatrix
        days={DAYS}
        columns={45}
        size="lg"
        label="System uptime, last 90 days"
        startLabel="90 days ago"
        endLabel="Today"
      />
    </div>
  );
}

export const SystemUptimeMatrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => <SystemUptime />,
};

/** Every amicro source item this component covers. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-2">
      <SystemUptime />
      <figcaption className="text-xs text-muted-foreground">System Uptime Matrix</figcaption>
    </figure>
  ),
};

export const WithVisibleTable: Story = {
  args: { showTable: true, days: DAYS.slice(-14), startLabel: undefined, endLabel: undefined },
};

export const Static: Story = {
  args: { animate: false },
};
