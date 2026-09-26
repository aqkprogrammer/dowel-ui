import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  PermissionPrompt,
  usePermissionPrompt,
  type PermissionCapability,
  type PermissionDecision,
} from "./permission-prompt";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-lg">
    <Story />
  </div>
);

const CALENDAR: PermissionCapability = {
  id: "calendar.read",
  title: "read your calendar",
  can: ["See event times and titles", "See who is invited"],
  cannot: ["Change or delete events", "See your other calendars"],
  risk: "low",
  scope: "Work calendar, next two weeks",
};

const CONTACTS: PermissionCapability = {
  id: "contacts.read",
  title: "read your contacts",
  can: ["See names and email addresses"],
  cannot: ["Add, change or delete contacts"],
  risk: "medium",
};

const SEND: PermissionCapability = {
  id: "mail.send",
  title: "send email as you",
  description: "Messages go out from your address and appear in your Sent folder.",
  can: ["Send new messages", "Reply to threads you are in"],
  cannot: ["Read your inbox", "Delete messages"],
  risk: "high",
};

const meta = {
  title: "AI/Permission Prompt",
  component: PermissionPrompt,
  decorators: [withWidth],
  args: {
    requester: "Claude",
    capability: CALENDAR,
    reason: "to find a free slot for the meeting you asked for",
    onDecide: () => undefined,
  },
} satisfies Meta<typeof PermissionPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Claude asks to read a calendar at the moment it needs to, says why, and
 * says what that does and does not allow. Choose an answer to see the result
 * line, then Change to answer again.
 */
export const Default: Story = {};

/**
 * Sending email as someone can do real harm, so "Always allow" is not offered
 * unless `options` includes it. Each Allow button is described by "High risk",
 * so it is heard even by someone who tabs straight to it.
 */
export const HighRisk: Story = {
  args: {
    capability: SEND,
    reason: "to send the meeting invite you drafted to Dana and Sam",
  },
};

/** After answering: one line and Change, which brings the choices back. */
export const Decided: Story = {
  parameters: { controls: { disable: true } },
  render: function Decided() {
    const [decision, setDecision] = useState<PermissionDecision | null>("session");
    return (
      <PermissionPrompt
        requester="Claude"
        capability={CALENDAR}
        reason="to find a free slot for the meeting you asked for"
        decision={decision}
        onDecide={setDecision}
      />
    );
  },
};

/** The answer people most need to be able to give easily. */
export const Denied: Story = {
  args: { decision: "deny" },
};

/**
 * `usePermissionPrompt` driving a queue. "Find a meeting slot" makes two
 * requests at once; they are shown one at a time with the number waiting.
 * Answer the calendar with "Allow for this session", then ask again: the
 * second calendar request resolves without asking.
 */
export const Queue: Story = {
  parameters: { controls: { disable: true } },
  render: function Queue() {
    const { request, prompt, grants, revoke } = usePermissionPrompt();
    const [log, setLog] = useState<string[]>([]);

    const ask = (capability: PermissionCapability, reason: string) => {
      void request(capability, { requester: "Claude", reason }).then((decision) => {
        setLog((current) => [...current, `${capability.title}: ${decision}`]);
      });
    };

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
            onClick={() => {
              ask(CALENDAR, "to find a free slot for the meeting you asked for");
              ask(CONTACTS, "to look up Dana's and Sam's addresses for the invite");
            }}
          >
            Find a meeting slot
          </button>
          <button
            type="button"
            className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
            onClick={() => {
              ask(CALENDAR, "to check the slot is still free");
            }}
          >
            Ask for the calendar again
          </button>
          <button
            type="button"
            className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
            onClick={() => {
              void revoke(CALENDAR.id);
            }}
          >
            Forget calendar access
          </button>
        </div>
        {prompt}
        <p className="text-xs text-muted-foreground">
          Remembered:{" "}
          {grants.length > 0
            ? grants.map((grant) => `${grant.capabilityId} (${grant.decision})`).join(", ")
            : "nothing yet"}
        </p>
        {log.length > 0 ? (
          <ol className="list-decimal ps-5 font-mono text-2xs text-muted-foreground">
            {log.map((line, index) => (
              <li key={`${String(index)}-${line}`}>{line}</li>
            ))}
          </ol>
        ) : null}
      </div>
    );
  },
};
