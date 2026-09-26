import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

import { AgentSurface, useAgentTool, type AgentSurfaceApi } from "@/components/agent-surface";
import { Button } from "@/components/button";

import { AgentLedger } from "./agent-ledger";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-xl">
    <Story />
  </div>
);

const meta = {
  title: "AI/Agent Ledger",
  component: AgentLedger,
  decorators: [withWidth],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof AgentLedger>;

export default meta;
type Story = StoryObj<typeof meta>;

function Contacts() {
  const [contacts, setContacts] = useState(["Ada Lovelace", "Bo Diddley", "Cy Twombly"]);
  const [balance, setBalance] = useState(500);

  useAgentTool<{ name: string }>({
    name: "delete_contact",
    title: "Delete a contact",
    description: "Delete a contact by name.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
    describe: ({ name }) => `Deleted ${name}`,
    execute: ({ name }, { onUndo }) => {
      const before = contacts;
      setContacts(before.filter((contact) => contact !== name));
      onUndo(() => {
        setContacts(before);
      });
    },
  });
  useAgentTool<{ amount: number }>({
    name: "refund",
    title: "Refund",
    description: "Refund an amount.",
    reversibility: "compensable",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: { amount: { type: "number" } },
      required: ["amount"],
    },
    describe: ({ amount }) => `Refunded $${String(amount)}`,
    execute: ({ amount }, { onUndo }) => {
      setBalance((current) => current - amount);
      // Not an undo: a refund cannot un-happen. The offset is a new charge.
      onUndo(() => {
        setBalance((current) => current + amount);
      });
    },
  });
  useAgentTool({
    name: "email_everyone",
    title: "Email every contact",
    description: "Email every contact.",
    reversibility: "irreversible",
    requiresApproval: false,
    describe: () => `Emailed ${String(contacts.length)} contacts`,
    execute: () => "Sent.",
  });

  return (
    <div className="text-sm">
      <p>Contacts: {contacts.join(", ") || "none"}</p>
      <p>Balance: ${balance}</p>
    </div>
  );
}

/**
 * Let the agent do three things: delete a contact (undoable), refund an order
 * (can be offset, not undone) and email everyone (permanent). The ledger says
 * which is which before you click, and undoing one tells the agent, with its
 * next result, that you did.
 */
export const Default: Story = {
  render: function Render() {
    const apiRef = useRef<AgentSurfaceApi>(null);
    const run = async () => {
      const api = apiRef.current;
      if (!api) return;
      await api.call("delete_contact", { name: "Bo Diddley" });
      await api.call("refund", { amount: 120 });
      await api.call("email_everyone");
    };
    return (
      <AgentSurface apiRef={apiRef} agentName="Claude" className="flex flex-col gap-4 p-4">
        <Contacts />
        <Button variant="outline" className="self-start" onClick={() => void run()}>
          Let the agent act
        </Button>
        <AgentLedger />
      </AgentSurface>
    );
  },
};
