import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { burstConfetti, ConfettiButton } from "./confetti-button";

const meta = {
  title: "Effects/Confetti Button",
  component: ConfettiButton,
  args: { children: "Ship it 🎉" },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ConfettiButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Press it. */
export const Default: Story = {};

/** A wider, faster burst in two colours. */
export const Custom: Story = {
  args: {
    children: "Celebrate",
    variant: "outline",
    confetti: { count: 160, speed: 900, spread: 110, colors: ["warning", "success"] },
  },
};

/** burstConfetti() from anywhere: here, from the middle of a card when its task completes. */
export const FromAnElement: Story = {
  render: () => (
    <div
      id="task-card"
      className="grid w-72 gap-3 rounded-xl border border-border bg-card p-5 text-card-foreground"
    >
      <p className="text-sm">Migration finished: 1,204 rows moved.</p>
      <Button
        size="sm"
        onClick={() => {
          const card = document.getElementById("task-card");
          if (card) burstConfetti(card, { count: 60, spread: 160 });
        }}
      >
        Mark as done
      </Button>
    </div>
  ),
};
