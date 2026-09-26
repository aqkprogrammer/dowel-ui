import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { MemoryInspector, type Memory, type MemoryInspectorProps } from "./memory-inspector";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-xl">
    <Story />
  </div>
);

const day = (date: number) => Date.UTC(2026, 8, date, 10);

const MEMORIES: Memory[] = [
  {
    id: "units",
    text: "Prefers metric units, and temperatures in Celsius.",
    source: { label: "Chat: planning the Lisbon trip", href: "#chat-lisbon" },
    createdAt: day(2),
    lastUsedAt: day(24),
    pinned: true,
  },
  {
    id: "diet",
    text: "Is vegetarian, and eats fish now and then.",
    source: { label: "Chat: weekly meal plan", href: "#chat-meals" },
    createdAt: day(4),
    lastUsedAt: day(21),
    scope: "Personal",
  },
  {
    id: "role",
    text: "Leads the design systems team at a company of about 400 people.",
    source: { label: "Chat: writing a job post" },
    createdAt: day(1),
    lastUsedAt: day(25),
    scope: "Work",
    pinned: true,
  },
  {
    id: "stack",
    text: "Works in TypeScript and React 19, with Tailwind for styling.",
    source: { label: "Project: Dowel UI", href: "#project-dowel" },
    createdAt: day(3),
    lastUsedAt: day(25),
    scope: "Project: Dowel UI",
  },
  {
    id: "tone",
    text: "Wants replies short, with no bullet points unless asked.",
    source: { label: "Settings: response style" },
    createdAt: day(1),
    lastUsedAt: day(25),
  },
  {
    id: "timezone",
    text: "Lives in Lisbon, on Western European Time.",
    source: { label: "Chat: scheduling a call", href: "#chat-call" },
    createdAt: day(5),
    lastUsedAt: day(19),
    scope: "Personal",
  },
  {
    id: "a11y",
    text: "Tests every component with NVDA and VoiceOver before release.",
    source: { label: "Project: Dowel UI", href: "#project-dowel" },
    createdAt: day(8),
    lastUsedAt: day(23),
    scope: "Project: Dowel UI",
  },
  {
    id: "manager",
    text: "Reports to Priya, who reviews the roadmap every quarter.",
    source: { label: "Chat: preparing a 1:1" },
    createdAt: day(10),
    lastUsedAt: day(17),
    scope: "Work",
  },
  {
    id: "running",
    text: "Is training for a half marathon in November.",
    source: { label: "Chat: running plan", href: "#chat-running" },
    createdAt: day(11),
    lastUsedAt: day(22),
    scope: "Personal",
  },
  {
    id: "copy",
    text: "Writes UI copy in sentence case and avoids marketing words.",
    source: { label: "Project: Dowel UI", href: "#project-dowel" },
    createdAt: day(12),
    lastUsedAt: day(24),
    scope: "Project: Dowel UI",
  },
  {
    id: "meetings",
    text: "Keeps Friday afternoons free of meetings.",
    source: { label: "Chat: planning next week" },
    createdAt: day(15),
    scope: "Work",
  },
  {
    id: "language",
    text: "Is learning Portuguese, at about A2.",
    source: { label: "Chat: translating a lease", href: "#chat-lease" },
    createdAt: day(18),
    lastUsedAt: day(20),
    scope: "Personal",
  },
];

/** The inspector wired to state, the way an application would hold it. */
function Stateful(
  props: Omit<MemoryInspectorProps, "memories" | "onEdit" | "onForget" | "onPin">,
) {
  const [memories, setMemories] = useState(MEMORIES);
  const [last, setLast] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <MemoryInspector
        {...props}
        memories={memories}
        onEdit={(id, text) => {
          setMemories((list) => list.map((m) => (m.id === id ? { ...m, text } : m)));
          setLast(`onEdit("${id}", "${text}")`);
        }}
        onPin={(id, pinned) => {
          setMemories((list) => list.map((m) => (m.id === id ? { ...m, pinned } : m)));
          setLast(`onPin("${id}", ${String(pinned)})`);
        }}
        onForget={(ids) => {
          setMemories((list) => list.filter((m) => !ids.includes(m.id)));
          setLast(`onForget([${ids.map((id) => `"${id}"`).join(", ")}])`);
        }}
      />
      <p className="font-mono text-2xs text-muted-foreground">
        {last ?? "Change something to see what the application receives."}
      </p>
    </div>
  );
}

const meta = {
  title: "AI/Memory Inspector",
  component: MemoryInspector,
  decorators: [withWidth],
  args: { memories: MEMORIES, agentName: "Claude" },
} satisfies Meta<typeof MemoryInspector>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Twelve memories across scopes, pinned ones first. Forget one and it is gone
 * at once, with Undo in its place for five seconds; the line underneath shows
 * `onForget` arriving only when that window closes.
 */
export const Default: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Stateful agentName="Claude" />,
};

/** The same memories under a heading for each scope. Unscoped ones are "General". */
export const GroupedByScope: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Stateful agentName="Claude" groupBy="scope" />,
};

/** For showing what is remembered where it cannot be changed, such as an export preview. */
export const ReadOnly: Story = {
  args: { readOnly: true },
};

/** Nothing remembered yet. */
export const Empty: Story = {
  args: { memories: [] },
};
