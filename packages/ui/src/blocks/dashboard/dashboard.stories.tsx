import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { DashboardBlock, type DashboardEvent, type DashboardStat } from "./dashboard";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const STATS: DashboardStat[] = [
  {
    id: "mrr",
    label: "Monthly revenue",
    value: "$48,120",
    change: 12.4,
    comparison: "on last month",
  },
  {
    id: "users",
    label: "Active users",
    value: "2,410",
    change: 4.2,
    comparison: "on last week",
  },
  {
    id: "churn",
    label: "Churn",
    value: "1.8%",
    change: 0.4,
    comparison: "on last month",
    higherIsBetter: false,
  },
  { id: "uptime", label: "Uptime", value: "99.98%" },
];

const EVENTS: DashboardEvent[] = [
  {
    id: "1",
    title: "Deployed to production",
    detail: "Build 1420 · main",
    at: "2026-09-01T09:12:00Z",
    label: "12 minutes ago",
    tone: "success",
  },
  {
    id: "2",
    title: "Build finished with warnings",
    detail: "3 unused exports",
    at: "2026-09-01T09:04:00Z",
    label: "20 minutes ago",
    tone: "warning",
  },
  {
    id: "3",
    title: "Build failed",
    detail: "Type error in table.tsx",
    at: "2026-09-01T08:31:00Z",
    label: "53 minutes ago",
    tone: "destructive",
  },
  {
    id: "4",
    title: "Opened pull request #482",
    at: "2026-08-31T17:20:00Z",
    label: "Yesterday",
  },
];

const meta = {
  title: "Blocks/Dashboard",
  component: DashboardBlock,
  args: { stats: STATS, events: EVENTS },
  parameters: { controls: { disable: true } },
  decorators: [withPageWidth],
} satisfies Meta<typeof DashboardBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every change is stated in words — "up 12.4%", not a green triangle. */
export const Default: Story = {};

export const Loading: Story = {
  args: { loading: true },
};

export const MetricsOnly: Story = {
  args: { events: [] },
};

export const WithActions: Story = {
  args: {
    actions: (
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          Last 30 days
        </Button>
        <Button size="sm">Export</Button>
      </div>
    ),
  },
};
