import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sparkles } from "lucide-react";

import { StarsBackground } from "./stars-background";

const meta = {
  title: "Effects/Stars Background",
  component: StarsBackground,
  args: {
    color: "foreground",
    density: 1,
    speed: 1,
    shootingStars: true,
    interactive: true,
    fade: "none",
  },
  argTypes: {
    color: {
      control: "select",
      options: ["foreground", "primary", "info", "muted-foreground"],
    },
    density: { control: { type: "range", min: 0.25, max: 4, step: 0.25 } },
    speed: { control: { type: "range", min: 0, max: 4, step: 0.25 } },
    fade: { control: "inline-radio", options: ["none", "edges", "bottom"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof StarsBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Move the pointer across the sky: the near layer leans furthest. Wait a few seconds for a shooting star. */
export const Default: Story = {
  render: (args) => (
    <StarsBackground {...args} className="min-h-[28rem] bg-background">
      <div className="flex min-h-[28rem] flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Now in public beta
        </span>
        <h2 className="max-w-xl text-4xl font-semibold tracking-tight text-balance text-foreground">
          Build under a sky that never sits still
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Three layers of stars drift at their own pace. Each one twinkles on its own clock.
        </p>
      </div>
    </StarsBackground>
  ),
};

/** Stars in the brand colour, faded at the edges so the sky sits inside a card. */
export const BrandCard: Story = {
  args: { color: "primary", density: 2, fade: "edges" },
  parameters: { layout: "centered" },
  render: (args) => (
    <StarsBackground
      {...args}
      className="w-[min(32rem,90vw)] rounded-2xl border border-border bg-card"
    >
      <div className="flex h-64 flex-col justify-end gap-1 p-6">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">
          Observatory
        </p>
        <p className="text-lg font-semibold text-card-foreground">2,481 stars catalogued</p>
      </div>
    </StarsBackground>
  ),
};

/** The sky inverted against the page: a dark band in a light theme, and the reverse. */
export const Inverted: Story = {
  args: { color: "background", density: 1.5, fade: "bottom" },
  render: (args) => (
    <StarsBackground {...args} className="bg-foreground">
      <div className="flex h-72 items-center justify-center">
        <p className="text-2xl font-semibold text-background">Good night.</p>
      </div>
    </StarsBackground>
  ),
};

/** Held still: no drift, no parallax, no shooting stars — only the twinkle remains. */
export const Still: Story = {
  args: { speed: 0, interactive: false, shootingStars: false, density: 2.5 },
  render: (args) => <StarsBackground {...args} className="h-72 bg-background" />,
};
