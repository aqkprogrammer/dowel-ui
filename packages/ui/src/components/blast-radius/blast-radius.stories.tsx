import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { ApprovalRequest } from "@/components/ai-approval-request";

import { BlastRadius, type BlastRadiusData } from "./blast-radius";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-lg">
    <Story />
  </div>
);

const CLOSE_STALE: BlastRadiusData = {
  total: 43,
  changes: [
    {
      id: "d1",
      label: "Acme expansion",
      kind: "update",
      detail: "Stage: Negotiation → Closed lost",
    },
    {
      id: "d2",
      label: "Bolt renewal",
      kind: "update",
      detail: "Stage: Proposal → Closed lost",
    },
    {
      id: "d3",
      label: "Cove pilot",
      kind: "delete",
      reversibility: "irreversible",
      detail: "Has no activity in 14 months; deleted rather than closed",
    },
    {
      id: "d4",
      label: "Dune upsell",
      kind: "update",
      detail: "Stage: Discovery → Closed lost",
    },
    {
      id: "d5",
      label: "Echo trial",
      kind: "delete",
      reversibility: "irreversible",
      detail: "Duplicate of Echo renewal",
    },
    {
      id: "d6",
      label: "Fjord add-on",
      kind: "update",
      detail: "Stage: Proposal → Closed lost",
    },
  ],
  note: "Also emails each deal's owner that it was closed.",
};

const meta = {
  title: "AI/Blast Radius",
  component: BlastRadius,
  decorators: [withWidth],
  args: { data: CLOSE_STALE, noun: { one: "deal", other: "deals" } },
} satisfies Meta<typeof BlastRadius>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A dry run of "close every stale deal": 43 deals, of which six are listed and
 * the two that cannot be undone come first. The counts say "at least",
 * because six is a sample of 43.
 */
export const Default: Story = {};

/** Where it lives: inside the approval, answering "what happens if I say yes?". */
export const InAnApproval: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <ApprovalRequest
      tool="close_stale_deals"
      summary="Close every deal with no activity for a year"
      arguments={{ older_than: "12 months" }}
      fields={[{ name: "older_than", label: "No activity for" }]}
      irreversible="Deleted deals cannot be recovered."
      onDecision={() => undefined}
    >
      <BlastRadius data={CLOSE_STALE} noun={{ one: "deal", other: "deals" }} className="mt-3" />
    </ApprovalRequest>
  ),
};

/** An action that is permanent as a whole says so once, for all of it. */
export const AllPermanent: Story = {
  args: {
    reversibility: "irreversible",
    noun: { one: "email", other: "emails" },
    data: {
      total: 12,
      changes: [
        {
          id: "e1",
          label: "dana@acme.test",
          kind: "create",
          detail: "Your refund is on its way",
        },
        {
          id: "e2",
          label: "sam@bolt.test",
          kind: "create",
          detail: "Your refund is on its way",
        },
      ],
    },
  },
};

/** The dry run is still working: the section is busy and says so. */
export const Loading: Story = {
  args: { data: undefined, loading: true },
};

/** The dry run failed. The person can still decide; they just know less. */
export const Failed: Story = {
  args: { data: undefined, error: "the reporting database is read-only right now" },
};

export const NothingChanges: Story = {
  args: { data: { changes: [] } },
};
