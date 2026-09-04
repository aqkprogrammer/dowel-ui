import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import type { LedgerAction } from "@/components/ai-action-ledger";
import type { PlanStep } from "@/components/ai-agent-plan";
import type { ApprovalDecision } from "@/components/ai-approval-request";

import { AgentConsoleBlock, type AgentApproval } from "./agent-console";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const PLAN: PlanStep[] = [
  { id: "1", title: "Scan the contact table", status: "done", detail: "18,402 records" },
  {
    id: "2",
    title: "Group likely duplicates",
    status: "done",
    detail: "41 groups, 96 records",
  },
  { id: "3", title: "Merge each group", status: "running" },
  { id: "4", title: "Notify the record owners", status: "pending" },
];

const ACTIONS: LedgerAction[] = [
  {
    id: "a1",
    summary: "Merged 3 contacts into Acme Inc.",
    target: "crm.contacts",
    reversibility: "revertible",
    status: "applied",
    timestamp: "2026-03-04T09:14:00Z",
  },
  {
    id: "a2",
    summary: "Refunded $40.00 to Acme Inc.",
    target: "billing",
    reversibility: "compensable",
    status: "applied",
    timestamp: "2026-03-04T09:15:00Z",
  },
  {
    id: "a3",
    summary: "Emailed 12 record owners",
    target: "notifications",
    reversibility: "irreversible",
    status: "applied",
    timestamp: "2026-03-04T09:16:00Z",
  },
];

const APPROVAL: AgentApproval = {
  tool: "delete_contacts",
  summary: "Delete 3 contacts that look like duplicates of existing records.",
  arguments: { ids: "c_8812, c_8813, c_8901", reason: "duplicate of c_1204" },
  fields: [
    // Ids are resolved facts, not something to retype; the reason is the part
    // worth correcting before the call runs.
    { name: "ids", label: "Contact ids", readOnly: true },
    { name: "reason", label: "Reason" },
  ],
  irreversible: "Deleted contacts cannot be restored.",
};

const meta = {
  title: "Blocks/Agent console",
  component: AgentConsoleBlock,
  parameters: { controls: { disable: true }, layout: "padded" },
  decorators: [withPageWidth],
  args: {
    title: "Deduplicate contacts",
    description: "Nightly cleanup across the CRM.",
    state: "working",
  },
} satisfies Meta<typeof AgentConsoleBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Working: Story = {
  args: {
    state: "working",
    plan: PLAN,
    tokensUsed: 42_180,
    tokenLimit: 128_000,
    actions: ACTIONS,
    onStop: () => undefined,
    onRevert: () => undefined,
  },
};

/** Blocked on a person, and saying so before anything else on the page. */
export const WaitingForApproval: Story = {
  args: {
    ...Working.args,
    state: "waiting",
    approval: APPROVAL,
    onApprovalDecision: () => undefined,
  },
};

/** Nothing has happened yet: no plan, no history, and both say so. */
export const JustStarted: Story = {
  args: { state: "thinking", tokensUsed: 1_200, tokenLimit: 128_000 },
};

export const Finished: Story = {
  args: {
    state: "done",
    plan: PLAN.map((step) => ({ ...step, status: "done" as const })),
    tokensUsed: 61_400,
    tokenLimit: 128_000,
    actions: ACTIONS,
    onRevert: () => undefined,
  },
};

export const Failed: Story = {
  args: {
    state: "error",
    plan: [
      ...PLAN.slice(0, 2),
      {
        id: "3",
        title: "Merge each group",
        status: "failed" as const,
        error: "crm.contacts returned 409 for group 12",
      },
      { id: "4", title: "Notify the record owners", status: "skipped" as const },
    ],
    tokensUsed: 38_900,
    tokenLimit: 128_000,
    actions: ACTIONS.slice(0, 1),
    onRevert: () => undefined,
  },
};

/** Deciding the approval lets the run continue. */
export const Interactive: Story = {
  render: (args) => {
    const [decision, setDecision] = useState<ApprovalDecision | undefined>(undefined);

    return (
      <AgentConsoleBlock
        {...args}
        state={decision ? "working" : "waiting"}
        plan={PLAN}
        tokensUsed={42_180}
        tokenLimit={128_000}
        approval={{ ...APPROVAL, decision }}
        onApprovalDecision={setDecision}
        actions={ACTIONS}
        onRevert={() => undefined}
        onStop={() => undefined}
      />
    );
  },
};
