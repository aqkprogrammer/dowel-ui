import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { LetterSwap } from "./letter-swap";

const meta = {
  title: "Effects/Letter Swap",
  component: LetterSwap,
  args: { children: "Pricing", direction: "up", stagger: 22, duration: 320 },
  argTypes: {
    direction: { control: "inline-radio", options: ["up", "down"] },
    stagger: { control: { type: "range", min: 0, max: 80, step: 2 } },
    duration: { control: { type: "range", min: 100, max: 800, step: 20 } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof LetterSwap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A row of nav links: point at one, or tab through them. */
export const Default: Story = {
  render: (args) => (
    <nav aria-label="Main" className="flex gap-6 text-sm font-medium text-foreground">
      {["Product", "Pricing", "Docs", "Changelog"].map((label) => (
        <a
          key={label}
          href={`#${label}`}
          className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LetterSwap {...args}>{label}</LetterSwap>
        </a>
      ))}
    </nav>
  ),
};

/** Inside a button. */
export const InAButton: Story = {
  args: { children: "Start building", direction: "down" },
  render: (args) => (
    <Button size="lg">
      <LetterSwap {...args} />
    </Button>
  ),
};
