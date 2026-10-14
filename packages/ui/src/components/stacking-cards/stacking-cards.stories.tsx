import type { Meta, StoryObj } from "@storybook/react-vite";

import { StackingCard, StackingCards } from "./stacking-cards";

const meta = {
  title: "Effects/Stacking Cards",
  component: StackingCards,
  args: { offset: 80, gap: 16, shrink: 0.04 },
  argTypes: {
    offset: { control: { type: "range", min: 0, max: 240, step: 8 } },
    gap: { control: { type: "range", min: 0, max: 64, step: 2 } },
    shrink: { control: { type: "range", min: 0, max: 0.2, step: 0.01 } },
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof StackingCards>;

export default meta;
type Story = StoryObj<typeof meta>;

const STEPS = [
  ["01", "Install", "npx @dowel-ui/cli init — tokens, utilities and a components.json."],
  ["02", "Add", "dowel add carousel — the source lands in your repo, ready to edit."],
  ["03", "Theme", "Pick a preset or build one in OKLCH; every component follows."],
  ["04", "Ship", "No runtime dependency on us: it is your code now."],
];

/** Scroll: each step slides up over the last, which eases back. */
export const Default: Story = {
  render: (args) => (
    <div className="mx-auto max-w-xl">
      <p className="py-[30vh] text-center text-sm text-muted-foreground">Scroll down ↓</p>
      <StackingCards {...args}>
        {STEPS.map(([n, title, body]) => (
          <StackingCard key={n} className="flex min-h-64 flex-col justify-between p-8">
            <span className="font-mono text-sm text-muted-foreground">{n}</span>
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          </StackingCard>
        ))}
      </StackingCards>
      <div className="h-[80vh]" />
    </div>
  ),
};
