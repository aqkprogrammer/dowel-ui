import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import type { ControlHolder } from "@/components/agent-surface";

import { ControlBaton } from "./control-baton";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-xl">
    <Story />
  </div>
);

const meta = {
  title: "AI/Control Baton",
  component: ControlBaton,
  decorators: [withWidth],
  args: { holder: "agent", agentName: "Claude", activity: "Filling in the shipping address…" },
} satisfies Meta<typeof ControlBaton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The agent is driving. One button takes over. */
export const AgentWorking: Story = {};

/**
 * The person took over. Handing back asks what the agent should know — they
 * just did something it did not see.
 */
export const PersonHasControl: Story = {
  args: { holder: "person", activity: undefined },
};

/** The agent handed over because it needs something only a person can do. */
export const AgentNeedsYou: Story = {
  args: {
    holder: "person",
    reason: "Sign in to your bank to authorise the transfer",
    activity: undefined,
  },
};

/** Nobody is driving, but an agent can act on the page. The button stops it. */
export const Shared: Story = {
  args: { holder: "shared", activity: undefined },
};

export const Compact: Story = {
  args: { size: "compact" },
};

/**
 * On its own, outside an AgentSurface — watching a remote browser session,
 * for instance. The parent owns the state; the baton reports the person's
 * choices and announces changes itself.
 */
export const Standalone: Story = {
  render: function Render(args) {
    const [holder, setHolder] = useState<ControlHolder>("agent");
    const [notes, setNotes] = useState<string[]>([]);
    return (
      <div className="flex flex-col gap-3">
        <ControlBaton
          {...args}
          holder={holder}
          activity={holder === "agent" ? args.activity : undefined}
          onTakeOver={() => {
            setHolder("person");
          }}
          onHandBack={(note) => {
            setHolder("agent");
            if (note) setNotes((current) => [...current, note]);
          }}
        />
        {notes.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Notes the agent received: {notes.join(" · ")}
          </p>
        ) : null}
      </div>
    );
  },
};
