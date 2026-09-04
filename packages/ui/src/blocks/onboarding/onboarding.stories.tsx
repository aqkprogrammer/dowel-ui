import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";

import { OnboardingBlock, type OnboardingStep } from "./onboarding";

/** Named so its type is nameable in declaration output (TS2883). */
const withPanelWidth: Decorator = (Story) => (
  <div className="w-[38rem] max-w-full">
    <Story />
  </div>
);

const STEPS: OnboardingStep[] = [
  { id: "account", title: "Create your account", status: "done" },
  { id: "verify", title: "Verify your email", status: "done" },
  {
    id: "team",
    title: "Invite your team",
    description: "Add the people who will be working with you.",
    status: "current",
    actionLabel: "Invite",
    estimate: "2 minutes",
  },
  {
    id: "repo",
    title: "Connect a repository",
    description: "So deployments can be triggered from your commits.",
    status: "blocked",
    blockedReason: "An organisation owner has to grant access first.",
    actionLabel: "Connect",
  },
  {
    id: "deploy",
    title: "Ship your first deployment",
    status: "todo",
    actionLabel: "Start",
    estimate: "5 minutes",
  },
];

const meta = {
  title: "Blocks/Onboarding",
  component: OnboardingBlock,
  parameters: { controls: { disable: true }, layout: "padded" },
  decorators: [withPanelWidth],
  args: { steps: STEPS },
} satisfies Meta<typeof OnboardingBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { steps: STEPS },
};

export const NothingStarted: Story = {
  args: {
    steps: STEPS.map((step, index) => ({
      ...step,
      status: index === 0 ? "current" : "todo",
      blockedReason: undefined,
    })),
  },
};

export const Complete: Story = {
  args: { steps: STEPS.map((step) => ({ ...step, status: "done" })) },
};

export const WithSkip: Story = {
  args: {
    steps: STEPS,
    actions: (
      <Button variant="ghost" size="sm">
        Skip for now
      </Button>
    ),
  },
};

/** Completing a step moves the checklist on. */
export const Interactive: Story = {
  render: () => {
    const [steps, setSteps] = useState<OnboardingStep[]>(
      STEPS.map((step) => ({
        ...step,
        status: step.status === "blocked" ? "todo" : step.status,
      })),
    );

    const complete = (id: string) => {
      setSteps((previous) => {
        const next = previous.map((step) =>
          step.id === id ? { ...step, status: "done" as const } : step,
        );
        const first = next.find((step) => step.status !== "done");
        return next.map((step) =>
          step.id === first?.id ? { ...step, status: "current" as const } : step,
        );
      });
    };

    return (
      <OnboardingBlock
        steps={steps.map((step) => ({
          ...step,
          onAction: () => {
            complete(step.id);
          },
        }))}
      />
    );
  },
};
