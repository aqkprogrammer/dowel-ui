import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import {
  WorkflowGraph,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowStatus,
} from "./workflow-graph";

const steps: WorkflowNode[] = [
  { id: "trigger", label: "New support ticket", description: "webhook" },
  { id: "classify", label: "Classify intent", description: "small model" },
  { id: "search", label: "Search help centre", description: "retrieval" },
  { id: "history", label: "Load account history", description: "CRM" },
  { id: "draft", label: "Draft reply", description: "large model" },
  { id: "review", label: "Human review" },
  { id: "send", label: "Send reply" },
];
const links: WorkflowEdge[] = [
  { from: "trigger", to: "classify" },
  { from: "classify", to: "search" },
  { from: "classify", to: "history" },
  { from: "search", to: "draft" },
  { from: "history", to: "draft" },
  { from: "draft", to: "review" },
  { from: "review", to: "send" },
];

const statuses: Record<string, WorkflowStatus> = {
  trigger: "success",
  classify: "success",
  search: "success",
  history: "running",
  draft: "queued",
  review: "idle",
  send: "idle",
};

const meta = {
  title: "AI/Workflow Graph",
  component: WorkflowGraph,
  args: {
    label: "Support reply workflow",
    nodes: steps.map((step) => ({ ...step, status: statuses[step.id] })),
    edges: links,
    direction: "horizontal",
  },
  argTypes: {
    direction: { control: "inline-radio", options: ["horizontal", "vertical"] },
    nodes: { control: false },
    edges: { control: false },
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof WorkflowGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Top to bottom, which suits a narrow column. */
export const Vertical: Story = { args: { direction: "vertical" } };

/** A run playing through: each step runs, then the next ones start. */
export const Live: Story = {
  render: function Render(args) {
    const [done, setDone] = useState(0);
    useEffect(() => {
      const id = window.setInterval(() => {
        setDone((value) => (value >= steps.length + 2 ? 0 : value + 1));
      }, 1200);
      return () => {
        window.clearInterval(id);
      };
    }, []);
    const order = ["trigger", "classify", "search", "history", "draft", "review", "send"];
    const nodes = steps.map((step): WorkflowNode => {
      const index = order.indexOf(step.id);
      // search and history run side by side.
      const at = index >= 3 ? index - 1 : index;
      const status: WorkflowStatus =
        at < done - 1
          ? "success"
          : at === done - 1
            ? "running"
            : at === done
              ? "queued"
              : "idle";
      return { ...step, status };
    });
    return <WorkflowGraph {...args} nodes={nodes} />;
  },
};

/** Steps you can pick to inspect, and a failure. */
export const Selectable: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState("draft");
    const nodes = args.nodes.map((node) =>
      node.id === "history"
        ? { ...node, status: "error" as const, description: "timeout" }
        : node,
    );
    return (
      <div className="flex flex-col gap-3">
        <WorkflowGraph {...args} nodes={nodes} selected={selected} onSelect={setSelected} />
        <p className="text-sm text-muted-foreground">Selected: {selected}</p>
      </div>
    );
  },
};
