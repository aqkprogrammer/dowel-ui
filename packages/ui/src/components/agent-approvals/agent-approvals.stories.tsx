import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

import { AgentSurface, useAgentTool, type AgentSurfaceApi } from "@/components/agent-surface";
import { Button } from "@/components/button";

import { AgentApprovals } from "./agent-approvals";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-xl">
    <Story />
  </div>
);

const meta = {
  title: "AI/Agent Approvals",
  component: AgentApprovals,
  decorators: [withWidth],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof AgentApprovals>;

export default meta;
type Story = StoryObj<typeof meta>;

function Outbox({ onSent }: { onSent: (line: string) => void }) {
  useAgentTool<{ to: string; subject: string; body: string }>({
    name: "send_email",
    title: "Email the customer about their refund",
    description: "Send an email.",
    reversibility: "irreversible",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "To" },
        subject: { type: "string", description: "Subject" },
        body: { type: "string", description: "Body" },
      },
      required: ["to", "subject", "body"],
    },
    describe: ({ to }) => `Emailed ${to}`,
    execute: ({ to, subject }) => {
      onSent(`Sent “${subject}” to ${to}`);
    },
  });
  useAgentTool<{ amount: number }>({
    name: "refund",
    title: "Refund the order",
    description: "Refund an amount to the original payment method.",
    reversibility: "compensable",
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: { amount: { type: "number", description: "Amount (USD)", minimum: 0 } },
      required: ["amount"],
    },
    describe: ({ amount }) => `Refunded $${String(amount)}`,
    execute: ({ amount }) => {
      onSent(`Refunded $${String(amount)}`);
    },
  });
  return null;
}

/**
 * Ask the agent to act. The request arrives as an approval you can correct —
 * change the recipient, then approve — or allow for the rest of the session.
 * Ask twice quickly and the second waits its turn. Deny with a reason and the
 * agent is told the reason.
 */
export const Default: Story = {
  render: function Render() {
    const apiRef = useRef<AgentSurfaceApi>(null);
    const [log, setLog] = useState<string[]>([]);
    const add = (line: string) => {
      setLog((current) => [...current, line]);
    };
    const ask = async (tool: string, input: Record<string, unknown>) => {
      const result = await apiRef.current?.call(tool, input);
      if (result) add(`Agent told: ${result.text}`);
    };

    return (
      <AgentSurface apiRef={apiRef} agentName="Claude" className="flex flex-col gap-4 p-4">
        <Outbox onSent={add} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              void ask("send_email", {
                to: "dana@acme.test",
                subject: "Your refund is on its way",
                body: "Hi Dana,\n\nWe have refunded $240 to your original payment method.",
              })
            }
          >
            Agent: send the email
          </Button>
          <Button variant="outline" onClick={() => void ask("refund", { amount: 240 })}>
            Agent: refund $240
          </Button>
        </div>
        <AgentApprovals />
        {log.length > 0 ? (
          <ol className="flex flex-col gap-1 text-xs text-muted-foreground">
            {log.map((line, index) => (
              <li key={`${String(index)}-${line}`}>{line}</li>
            ))}
          </ol>
        ) : null}
      </AgentSurface>
    );
  },
};
