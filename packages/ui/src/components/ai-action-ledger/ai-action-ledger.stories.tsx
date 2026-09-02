import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  ActionLedger,
  ActionLedgerEntry,
  ActionLedgerList,
  ActionLedgerPayload,
  ActionLedgerSelectionSummary,
  ActionLedgerToolbar,
  type LedgerAction,
} from "./ai-action-ledger";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-2xl">
    <Story />
  </div>
);

const MIXED: LedgerAction[] = [
  {
    id: "1",
    summary: "Deleted 3 duplicate contacts",
    reversibility: "revertible",
    status: "applied",
    target: "contacts",
    timestamp: "14:02",
  },
  {
    id: "2",
    summary: "Refunded $240 to Acme Corp",
    reversibility: "compensable",
    status: "applied",
    target: "billing",
    timestamp: "14:02",
  },
  {
    id: "3",
    summary: "Emailed 12 customers about the outage",
    reversibility: "irreversible",
    status: "applied",
    target: "email",
    timestamp: "14:03",
  },
];

const meta = {
  title: "AI/Action Ledger",
  component: ActionLedger,
  decorators: [withWidth],
  args: { actions: MIXED },
} satisfies Meta<typeof ActionLedger>;

export default meta;
type Story = StoryObj<typeof meta>;

function Ledger({ actions }: { actions: LedgerAction[] }) {
  return (
    <ActionLedger actions={actions}>
      <ActionLedgerToolbar />
      <ActionLedgerSelectionSummary />
      <ActionLedgerList>
        {actions.map((action) => (
          <ActionLedgerEntry key={action.id} action={action} />
        ))}
      </ActionLedgerList>
    </ActionLedger>
  );
}

export const Default: Story = {
  render: (args) => <Ledger actions={args.actions} />,
};

/**
 * The distinction the component exists for. A deletion can be reverted; a
 * refund can only be offset by another transaction; a sent email is gone.
 * Presenting all three behind one "Undo" is a lie discovered after clicking.
 */
export const ThreeKindsOfUndo: Story = {
  render: (args) => <Ledger actions={args.actions} />,
};

/** Selecting the refund warns before the click, not after it. */
export const CompensableWarning: Story = {
  parameters: { controls: { disable: true } },
  render: function CompensableWarning() {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Select the refund to see what the summary says.
        </p>
        <Ledger actions={MIXED} />
      </div>
    );
  },
};

/** A revert that half worked. Each action carries its own outcome. */
export const PartialFailure: Story = {
  args: {
    actions: [
      {
        id: "1",
        summary: "Deleted 3 duplicate contacts",
        reversibility: "revertible",
        status: "reverted",
        target: "contacts",
      },
      {
        id: "2",
        summary: "Updated 40 deal stages",
        reversibility: "revertible",
        status: "failed",
        target: "deals",
        error: "12 deals were modified by someone else after the agent ran",
      },
      {
        id: "3",
        summary: "Archived 8 stale leads",
        reversibility: "revertible",
        status: "applied",
        target: "leads",
      },
    ],
  },
  render: (args) => <Ledger actions={args.actions} />,
};

/** Nothing here can be taken back, and the controls say so rather than teasing. */
export const NothingUndoable: Story = {
  args: {
    actions: [
      {
        id: "1",
        summary: "Sent 1,204 onboarding emails",
        reversibility: "irreversible",
        status: "applied",
        target: "email",
      },
      {
        id: "2",
        summary: "Posted to #general in Slack",
        reversibility: "irreversible",
        status: "applied",
        target: "slack",
      },
    ],
  },
  render: (args) => <Ledger actions={args.actions} />,
};

/** The payload is provenance, so it stays collapsed until asked for. */
export const WithPayload: Story = {
  parameters: { controls: { disable: true } },
  render: function WithPayload() {
    const actions: LedgerAction[] = [
      {
        id: "1",
        summary: "Deleted 3 duplicate contacts",
        reversibility: "revertible",
        status: "applied",
        target: "contacts",
      },
    ];

    return (
      <ActionLedger actions={actions}>
        <ActionLedgerToolbar />
        <ActionLedgerList>
          {actions.map((action) => (
            <ActionLedgerEntry key={action.id} action={action}>
              <ActionLedgerPayload label="Show what was deleted">
                <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-2xs">
                  {JSON.stringify(
                    [
                      { id: "c_18", email: "dana@acme.test" },
                      { id: "c_44", email: "dana@acme.test" },
                      { id: "c_91", email: "dana@acme.test" },
                    ],
                    null,
                    2,
                  )}
                </pre>
              </ActionLedgerPayload>
            </ActionLedgerEntry>
          ))}
        </ActionLedgerList>
      </ActionLedger>
    );
  },
};

/** Wired to a handler, the way an application would use it. */
export const Interactive: Story = {
  parameters: { controls: { disable: true } },
  render: function Interactive() {
    const [actions, setActions] = useState<LedgerAction[]>(MIXED);

    return (
      <ActionLedger
        actions={actions}
        onRevert={(chosen) => {
          const ids = new Set(chosen.map((action) => action.id));
          setActions((current) =>
            current.map((action) =>
              ids.has(action.id) ? { ...action, status: "reverted" as const } : action,
            ),
          );
        }}
      >
        <ActionLedgerToolbar />
        <ActionLedgerSelectionSummary />
        <ActionLedgerList>
          {actions.map((action) => (
            <ActionLedgerEntry key={action.id} action={action} />
          ))}
        </ActionLedgerList>
      </ActionLedger>
    );
  },
};
