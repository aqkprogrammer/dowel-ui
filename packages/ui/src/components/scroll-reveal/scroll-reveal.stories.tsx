import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/card";

import { ScrollReveal } from "./scroll-reveal";

const meta = {
  title: "Effects/Scroll Reveal",
  component: ScrollReveal,
  args: { effect: "up", distance: 24, duration: 600, delay: 0, stagger: 0, once: true },
  argTypes: {
    effect: {
      control: "select",
      options: ["fade", "up", "down", "start", "end", "scale", "blur"],
    },
    distance: { control: { type: "range", min: 0, max: 120, step: 4 } },
    duration: { control: { type: "range", min: 100, max: 2000, step: 50 } },
    stagger: { control: { type: "range", min: 0, max: 300, step: 10 } },
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ScrollReveal>;

export default meta;
type Story = StoryObj<typeof meta>;

const FEATURES = [
  ["Own the code", "Every component installs as source you can read and change."],
  ["Accessible", "Keyboard, screen readers and reduced motion, tested in CI."],
  ["Themeable", "OKLCH tokens, thirteen presets, light and dark."],
  ["Agent-ready", "A registry and an MCP server your coding agent can read."],
  ["Fast", "CSS first; canvas and WebGL only where they earn it."],
  ["Free", "Components and sections are free, and stay free."],
];

/** Scroll down: the heading rises in, then the cards arrive one after another. */
export const Default: Story = {
  args: { stagger: 80 },
  render: (args) => (
    <div className="mx-auto max-w-3xl">
      <p className="flex h-[110vh] items-center justify-center text-sm text-muted-foreground">
        Scroll down ↓
      </p>
      <ScrollReveal effect="up" className="mb-6">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">Why Dowel</h2>
      </ScrollReveal>
      <ScrollReveal {...args} className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map(([title, body]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </ScrollReveal>
      <div className="h-[40vh]" />
    </div>
  ),
};

/** Every effect, one per row. Set `once` off to watch them replay as you scroll back. */
export const Effects: Story = {
  args: { once: false },
  render: (args) => (
    <div className="mx-auto grid max-w-md gap-24 py-[70vh]">
      {(["fade", "up", "down", "start", "end", "scale", "blur"] as const).map((effect) => (
        <ScrollReveal key={effect} {...args} effect={effect}>
          <div className="rounded-xl border border-border bg-card p-6 text-card-foreground">
            <p className="font-mono text-sm">{effect}</p>
          </div>
        </ScrollReveal>
      ))}
    </div>
  ),
};
