import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { AgentPlan, type PlanStep } from "./ai-agent-plan";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-lg">
    <Story />
  </div>
);

const PLAN: PlanStep[] = [
  {
    id: "1",
    title: "Find duplicate contacts",
    status: "done",
    detail: "Matched on email, 3 pairs found",
  },
  { id: "2", title: "Merge into the oldest record", status: "running" },
  { id: "3", title: "Update the deal owner", status: "pending" },
  { id: "4", title: "Notify the account manager", status: "pending" },
];

const meta = {
  title: "AI/Agent Plan",
  component: AgentPlan,
  decorators: [withWidth],
  args: { label: "Deduplication plan", steps: PLAN },
} satisfies Meta<typeof AgentPlan>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Before anything runs. Nothing has happened, and the summary says so. */
export const Proposed: Story = {
  args: { steps: PLAN.map((step) => ({ ...step, status: "pending" as const })) },
};

/**
 * The reason this is not a stepper. A wizard's steps are fixed; an agent
 * revises its plan as it learns. Watch the fourth step appear, and note that
 * the change is announced rather than the list quietly growing.
 */
export const PlanChangesMidRun: Story = {
  parameters: { controls: { disable: true } },
  render: function PlanChangesMidRun() {
    const [steps, setSteps] = useState<PlanStep[]>([
      { id: "1", title: "Read the customer record", status: "done" },
      { id: "2", title: "Apply the refund", status: "running" },
    ]);

    useEffect(() => {
      const timers = [
        setTimeout(() => {
          setSteps((current) => [
            ...current.map((step) => ({ ...step, status: "done" as const })),
            {
              id: "3",
              title: "Reverse the loyalty points",
              status: "running",
              detail: "Added after the refund revealed a linked reward",
            },
          ]);
        }, 2200),
        setTimeout(() => {
          setSteps((current) => current.map((step) => ({ ...step, status: "done" as const })));
        }, 4400),
      ];
      return () => {
        for (const timer of timers) clearTimeout(timer);
      };
    }, []);

    return <AgentPlan label="Refund plan" steps={steps} />;
  },
};

/** A step that failed keeps its reason, and the plan stops rather than pretending. */
export const Failure: Story = {
  args: {
    steps: [
      { id: "1", title: "Find duplicate contacts", status: "done" },
      {
        id: "2",
        title: "Merge into the oldest record",
        status: "failed",
        error: "Two records are locked by another session",
      },
      { id: "3", title: "Update the deal owner", status: "skipped" },
      { id: "4", title: "Notify the account manager", status: "skipped" },
    ],
  },
};

/** Sub-steps, one level. Deeper than that is a tree, which this is not. */
export const WithSubSteps: Story = {
  args: {
    label: "Migration plan",
    steps: [
      {
        id: "1",
        title: "Inspect the source schema",
        status: "done",
        steps: [
          { id: "1a", title: "Read table definitions", status: "done" },
          { id: "1b", title: "Check for unsupported types", status: "done" },
        ],
      },
      {
        id: "2",
        title: "Copy rows in batches",
        status: "running",
        detail: "42,000 of 180,000",
        steps: [
          { id: "2a", title: "customers", status: "done" },
          { id: "2b", title: "orders", status: "running" },
          { id: "2c", title: "invoices", status: "pending" },
        ],
      },
      { id: "3", title: "Rebuild indexes", status: "pending" },
    ],
  },
};

/** Finished, with one step the agent decided it did not need. */
export const Complete: Story = {
  args: {
    steps: [
      { id: "1", title: "Find duplicate contacts", status: "done" },
      { id: "2", title: "Merge into the oldest record", status: "done" },
      { id: "3", title: "Update the deal owner", status: "skipped", detail: "Owner unchanged" },
      { id: "4", title: "Notify the account manager", status: "done" },
    ],
  },
};
