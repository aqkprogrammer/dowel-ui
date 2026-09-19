import type { Meta, StoryObj } from "@storybook/react-vite";
import { Database, Mail, Zap } from "lucide-react";

import { Button } from "@/components/button";

import { ExpandableList, type ExpandableListItem } from "./expandable-list";

// Neutral stand-ins for the source's company logos.
const JOBS: ExpandableListItem[] = [
  {
    id: "resend",
    title: "Resend",
    media: <Mail />,
    subtitle: "Senior Frontend Engineer / $120k – $180k",
    meta: "Hybrid / San Francisco | Full-time",
    content:
      "We're looking for a senior frontend engineer to help us build the future of email infrastructure. You'll work on our React-based dashboard and help scale our platform.",
    actions: <Button size="sm">Apply</Button>,
  },
  {
    id: "turso",
    title: "Turso",
    media: <Database />,
    subtitle: "Backend Developer / $100k – $150k",
    meta: "Remote | Full-time",
    content:
      "Join our team to build the next generation of edge database technology. You'll work with Rust and help optimize our distributed database system.",
  },
  {
    id: "supabase",
    title: "Supabase",
    media: <Zap />,
    subtitle: "Developer Advocate / $90k – $130k",
    meta: "Remote | Full-time",
    content:
      "Help developers around the world discover and adopt Supabase. You'll create content, speak at conferences, and build community around our open-source platform.",
  },
];

// Annotated rather than `satisfies`: decorators make the inferred type unnameable (TS2883).
const meta: Meta<typeof ExpandableList> = {
  title: "Display/Expandable List",
  component: ExpandableList,
  args: { items: JOBS, density: "comfortable" },
  argTypes: { density: { control: "select", options: ["comfortable", "compact"] } },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-lg p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ExpandableList>;

/** Open a row: it grows into a dialog. Escape, the backdrop or Close return it. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Job Listing Component" → three job rows (company, role /
 *   salary, location | schedule) that grow into a detail card. Its fixed Job
 *   shape is generalised to title / subtitle / meta / media / content, and the
 *   detail is a real modal dialog with a Close button.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-4">
      <ExpandableList items={JOBS} />
      <figcaption className="text-xs text-muted-foreground">
        SmoothUI · Job Listing Component
      </figcaption>
    </figure>
  ),
};

export const Compact: Story = { args: { density: "compact" } };

export const WithoutMedia: Story = {
  args: { items: JOBS.map(({ media: _media, ...item }) => item) },
};
