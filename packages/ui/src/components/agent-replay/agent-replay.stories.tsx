import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

import {
  AgentSurface,
  useAgentTool,
  type AgentSurfaceApi,
  type AgentToolCall,
  type ControlEvent,
} from "@/components/agent-surface";
import { Button } from "@/components/button";
import { ControlBaton } from "@/components/control-baton";

import { AgentReplay } from "./agent-replay";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-2xl">
    <Story />
  </div>
);

const meta = {
  title: "AI/Agent Replay",
  component: AgentReplay,
  decorators: [withWidth],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof AgentReplay>;

export default meta;
type Story = StoryObj<typeof meta>;

const START = Date.UTC(2026, 8, 25, 14, 2, 0);

function call(
  id: string,
  seconds: number,
  fields: Partial<AgentToolCall> & Pick<AgentToolCall, "title" | "summary">,
): AgentToolCall {
  return {
    id,
    tool: id.replace(/-\d+$/, ""),
    input: {},
    source: "app",
    status: "done",
    effect: "write",
    reversibility: "revertible",
    undoable: false,
    startedAt: START + seconds * 1000,
    finishedAt: START + seconds * 1000 + 400,
    ...fields,
  };
}

const CALLS: AgentToolCall[] = [
  call("list_deals-1", 2, {
    title: "Read deals",
    summary: "Read the deals table",
    effect: "read",
    told: '{"deals":[{"id":"d2","name":"Bolt renewal"},{"id":"d5","name":"Echo renewal"}]}',
  }),
  call("filter_deals-2", 5, {
    title: "Filter deals",
    summary: "Filtered deals to “renewal”",
    input: { text: "renewal" },
    told: "2 deals match.",
  }),
  call("select_deals-3", 9, {
    title: "Select deals",
    summary: "Selected 2 deals",
    input: { ids: ["d2", "d5"] },
    told: "Done: Selected 2 deals.",
  }),
  call("email_owners-4", 13, {
    title: "Email deal owners",
    summary: "Email deal owners",
    status: "refused",
    reversibility: "irreversible",
    told: "The person has taken control of this page. Wait until they hand it back, then try again.",
  }),
  call("email_owners-5", 31, {
    title: "Email deal owners",
    summary: "Emailed the owners of 1 deal",
    reversibility: "irreversible",
    input: { ids: ["d5"] },
    edited: ["ids"],
    told:
      'Note from the person, who handed control back: "Bolt already renewed — only email Echo."\n\n' +
      "Sent 1 email.",
  }),
];

const CONTROL: ControlEvent[] = [
  { holder: "agent", previous: "shared", by: "app", at: START + 1000 },
  { holder: "person", previous: "agent", by: "person", at: START + 11_000 },
  {
    holder: "agent",
    previous: "person",
    by: "person",
    note: "Bolt already renewed — only email Echo.",
    at: START + 29_000,
  },
  { holder: "shared", previous: "agent", by: "app", at: START + 33_000 },
];

/**
 * A recorded run: the agent filters and selects, you take over before it
 * emails, hand back with a note, and it emails only the one you meant — after
 * you corrected its arguments. Step through it, or press Play.
 */
export const Default: Story = {
  args: { calls: CALLS, controlLog: CONTROL, agentName: "Claude" },
};

/** Only what the agent did: control changes left out. */
export const CallsOnly: Story = {
  args: {
    calls: CALLS,
    controlLog: CONTROL,
    agentName: "Claude",
    include: (step) => step.kind === "call",
  },
};

function Counter() {
  const [count, setCount] = useState(0);
  useAgentTool<{ by: number }>({
    name: "add",
    title: "Add to the counter",
    description: "Adds to the counter.",
    inputSchema: { type: "object", properties: { by: { type: "number" } }, required: ["by"] },
    describe: ({ by }) => `Added ${String(by)}`,
    execute: ({ by }) => {
      setCount((current) => current + by);
      return `The counter is now ${String(count + by)}.`;
    },
  });
  return <p className="text-sm">Counter: {count}</p>;
}

/**
 * Inside a surface it replays that surface's own history, and grows as the
 * run does. Run the agent, take over part-way if you like, then step back
 * through what happened.
 */
export const OfALiveSurface: Story = {
  render: function Render() {
    const apiRef = useRef<AgentSurfaceApi>(null);
    const run = async () => {
      const api = apiRef.current;
      if (!api) return;
      api.grant();
      for (const by of [1, 2, 3]) {
        await new Promise((resolve) => {
          setTimeout(resolve, 900);
        });
        await api.call("add", { by });
      }
      api.release();
    };
    return (
      <AgentSurface apiRef={apiRef} agentName="Claude" className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <ControlBaton className="flex-1" />
          <Button variant="outline" onClick={() => void run()}>
            Run the agent
          </Button>
        </div>
        <Counter />
        <AgentReplay />
      </AgentSurface>
    );
  },
};
