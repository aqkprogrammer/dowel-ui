import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { CrmBlock, type CrmActivity, type CrmDeal, type CrmStage } from "./crm";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const STAGES: CrmStage[] = [
  { id: "lead", label: "Lead", count: 6, value: 84_000 },
  { id: "qualified", label: "Qualified", count: 4, value: 142_000 },
  { id: "proposal", label: "Proposal", count: 3, value: 236_000 },
  { id: "negotiation", label: "Negotiation", count: 2, value: 128_000 },
];

const DEALS: CrmDeal[] = [
  {
    id: "d1",
    company: "Acme Corp",
    contact: "Dana Whitfield",
    stage: "proposal",
    value: 120_000,
    owner: "Priya Nair",
    closeAt: "2026-03-14",
    closeLabel: "14 Mar",
    href: "#d1",
  },
  {
    id: "d2",
    company: "Northwind Traders",
    contact: "Miguel Santos",
    stage: "negotiation",
    value: 88_000,
    owner: "Sam Okafor",
    closeAt: "2026-03-21",
    closeLabel: "21 Mar",
    href: "#d2",
  },
  {
    id: "d3",
    company: "Globex",
    contact: "Lee Tanaka",
    stage: "proposal",
    value: 76_000,
    owner: "Priya Nair",
    closeAt: "2026-03-28",
    closeLabel: "28 Mar",
    href: "#d3",
  },
  {
    id: "d4",
    company: "Initech",
    stage: "qualified",
    value: 54_000,
    owner: "Sam Okafor",
    closeAt: "2026-04-02",
    closeLabel: "2 Apr",
    href: "#d4",
  },
  {
    id: "d5",
    company: "Umbrella Health",
    contact: "Rosa Diaz",
    stage: "negotiation",
    value: 40_000,
    owner: "Aisha Bello",
    closeAt: "2026-03-18",
    closeLabel: "18 Mar",
    href: "#d5",
  },
  {
    id: "d6",
    company: "Stark Logistics",
    stage: "qualified",
    value: 38_000,
    owner: "Aisha Bello",
    href: "#d6",
  },
  {
    id: "d7",
    company: "Wayne Foods",
    contact: "Terry Osei",
    stage: "lead",
    value: 24_000,
    owner: "Priya Nair",
    href: "#d7",
  },
  {
    id: "d8",
    company: "Hooli",
    stage: "lead",
    value: 12_000,
    owner: "Sam Okafor",
    href: "#d8",
  },
];

const ACTIVITY: CrmActivity[] = [
  {
    id: "a1",
    title: "Called Dana Whitfield at Acme",
    detail: "Pricing questions on the enterprise tier. Sending a revised proposal today.",
    at: "2026-03-04T09:14:00Z",
    label: "2 hours ago",
    kind: "call",
  },
  {
    id: "a2",
    title: "Demo with Northwind Traders",
    detail: "Security review scheduled for next week.",
    at: "2026-03-03T15:00:00Z",
    label: "yesterday",
    kind: "meeting",
  },
  {
    id: "a3",
    title: "Emailed Globex",
    detail: "Sent the SOC 2 report.",
    at: "2026-03-03T10:30:00Z",
    label: "yesterday",
    kind: "email",
  },
  {
    id: "a4",
    title: "Note on Initech",
    detail: "Champion moved teams; need a new sponsor.",
    at: "2026-03-02T17:40:00Z",
    label: "2 days ago",
    kind: "note",
  },
];

const meta = {
  title: "Blocks/CRM",
  component: CrmBlock,
  parameters: { controls: { disable: true }, layout: "padded" },
  decorators: [withPageWidth],
} satisfies Meta<typeof CrmBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pipelineValue: 590_000,
    previousPipelineValue: 512_000,
    wonValue: 186_000,
    previousWonValue: 164_000,
    winRate: 0.34,
    previousWinRate: 0.29,
    cycleDays: 31,
    previousCycleDays: 36,
    stages: STAGES,
    deals: DEALS,
    activity: ACTIVITY,
    onNewDeal: () => undefined,
    onOpenDeal: () => undefined,
  },
};

/** The case the polarity exists for: deals are closing more slowly, and it is not green. */
export const CycleSlowing: Story = {
  args: {
    ...Default.args,
    cycleDays: 44,
    previousCycleDays: 31,
    winRate: 0.26,
    previousWinRate: 0.34,
  },
};

export const NothingYet: Story = {
  args: {
    pipelineValue: 0,
    wonValue: 0,
    stages: [],
    deals: [],
    onNewDeal: () => undefined,
  },
};

export const WithActions: Story = {
  args: {
    ...Default.args,
    actions: (
      <Button variant="outline" size="sm">
        Export CSV
      </Button>
    ),
  },
};
