import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { AiDashboardBlock, type AiModelUsage, type AiRunSummary } from "./ai-dashboard";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const MODELS: AiModelUsage[] = [
  { id: "opus", model: "claude-opus-5", runs: 118, tokens: 4_240_000, cost: "$182.40" },
  { id: "sonnet", model: "claude-sonnet-5", runs: 942, tokens: 8_060_000, cost: "$61.20" },
  { id: "haiku", model: "claude-haiku-4-5", runs: 2_410, tokens: 3_180_000, cost: "$8.90" },
];

const RUNS: AiRunSummary[] = [
  {
    id: "r1",
    title: "Deduplicate contacts",
    state: "working",
    model: "claude-opus-5",
    tokens: 42_180,
    at: "2026-03-04T09:14:00Z",
    label: "4 minutes ago",
    href: "#r1",
  },
  {
    id: "r2",
    title: "Draft weekly digest",
    state: "waiting",
    model: "claude-sonnet-5",
    tokens: 18_400,
    at: "2026-03-04T09:02:00Z",
    label: "16 minutes ago",
    href: "#r2",
  },
  {
    id: "r3",
    title: "Classify inbound tickets",
    state: "done",
    model: "claude-haiku-4-5",
    tokens: 6_120,
    at: "2026-03-04T08:40:00Z",
    label: "38 minutes ago",
    href: "#r3",
  },
  {
    id: "r4",
    title: "Reconcile invoices",
    state: "error",
    model: "claude-sonnet-5",
    tokens: 9_800,
    at: "2026-03-04T08:12:00Z",
    label: "an hour ago",
    href: "#r4",
  },
];

const meta = {
  title: "Blocks/AI dashboard",
  component: AiDashboardBlock,
  parameters: { controls: { disable: true }, layout: "padded" },
  decorators: [withPageWidth],
} satisfies Meta<typeof AiDashboardBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tokens: 15_480_000,
    previousTokens: 11_200_000,
    spend: "$252.50",
    spendValue: 252.5,
    previousSpendValue: 198.4,
    runs: 3_470,
    previousRuns: 2_910,
    failureRate: 0.041,
    previousFailureRate: 0.062,
    models: MODELS,
    recentRuns: RUNS,
  },
};

/** The case the block exists for: the bill is up, and it is not painted green. */
export const SpendUp: Story = {
  args: {
    ...Default.args,
    spend: "$612.80",
    spendValue: 612.8,
    previousSpendValue: 252.5,
    failureRate: 0.089,
    previousFailureRate: 0.041,
  },
};

export const NothingYet: Story = {
  args: { tokens: 0, spend: "$0.00", runs: 0 },
};

export const WithActions: Story = {
  args: {
    ...Default.args,
    actions: (
      <Button variant="outline" size="sm">
        Export usage
      </Button>
    ),
  },
};
