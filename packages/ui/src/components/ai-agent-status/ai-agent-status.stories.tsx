import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  ActivityContent,
  ActivityFeed,
  ActivityIndicator,
  ActivityItem,
  ActivityTime,
  ActivityTitle,
} from "@/components/activity-feed";

import { AgentStatus } from "./ai-agent-status";

const meta = {
  title: "AI/Agent Status",
  component: AgentStatus,
  args: { state: "working", live: false },
  argTypes: {
    state: {
      control: "select",
      options: ["idle", "thinking", "working", "waiting", "done", "error"],
    },
    live: { control: "boolean" },
  },
} satisfies Meta<typeof AgentStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every state is a word. Colour never carries it alone. */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(["idle", "thinking", "working", "waiting", "done", "error"] as const).map((state) => (
        <AgentStatus key={state} state={state} />
      ))}
    </div>
  ),
};

export const CustomWording: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <AgentStatus state="working" label="Indexing 412 files" />
      <AgentStatus state="waiting" label="Needs your approval" />
      <AgentStatus state="error" label="Rate limited — retrying in 30s" />
    </div>
  ),
};

/** In a fleet view, announcements stay off: six agents narrating is noise. */
export const AgentFleet: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="w-96">
      <ActivityFeed>
        {[
          {
            id: "1",
            name: "Researcher",
            state: "working" as const,
            at: "2026-09-01T09:12:00Z",
          },
          { id: "2", name: "Writer", state: "waiting" as const, at: "2026-09-01T09:10:00Z" },
          { id: "3", name: "Reviewer", state: "done" as const, at: "2026-09-01T09:02:00Z" },
          { id: "4", name: "Publisher", state: "error" as const, at: "2026-09-01T08:58:00Z" },
        ].map((agent, index, all) => (
          <ActivityItem key={agent.id} last={index === all.length - 1}>
            <ActivityIndicator />
            <ActivityContent>
              <ActivityTitle className="flex items-center gap-2">
                {agent.name}
                <AgentStatus state={agent.state} />
              </ActivityTitle>
              <ActivityTime dateTime={agent.at}>Updated recently</ActivityTime>
            </ActivityContent>
          </ActivityItem>
        ))}
      </ActivityFeed>
    </div>
  ),
};
