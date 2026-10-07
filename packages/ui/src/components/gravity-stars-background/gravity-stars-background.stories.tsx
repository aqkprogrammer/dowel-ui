import type { Meta, StoryObj } from "@storybook/react-vite";
import { MousePointerClick } from "lucide-react";

import { GravityStarsBackground } from "./gravity-stars-background";

const meta = {
  title: "Effects/Gravity Stars Background",
  component: GravityStarsBackground,
  args: {
    color: "foreground",
    glowColor: "primary",
    density: 1.4,
    connections: true,
    linkDistance: 110,
    interactive: true,
    fade: "none",
  },
  argTypes: {
    color: { control: "select", options: ["foreground", "muted-foreground", "primary"] },
    glowColor: { control: "select", options: ["primary", "info", "success", "warning"] },
    density: { control: { type: "range", min: 0.25, max: 4, step: 0.25 } },
    linkDistance: { control: { type: "range", min: 0, max: 200, step: 10 } },
    fade: { control: "inline-radio", options: ["none", "edges"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof GravityStarsBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover to pull the particles into orbit, sweep away to sling them out, click for a shockwave. */
export const Default: Story = {
  render: (args) => (
    <GravityStarsBackground {...args} className="min-h-[28rem] bg-background">
      <div className="flex min-h-[28rem] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-widest text-primary uppercase">
          <MousePointerClick className="size-3.5" aria-hidden="true" />
          Hover, sweep, click
        </p>
        <h2 className="max-w-lg text-4xl font-semibold tracking-tight text-balance text-foreground">
          Everything falls toward what you point at
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          A field of drifting particles bends around the pointer like a gravity well.
        </p>
      </div>
    </GravityStarsBackground>
  ),
};

/** A dense web, faded at the edges, inside a card. */
export const Constellation: Story = {
  args: { density: 3, linkDistance: 90, fade: "edges", glowColor: "info" },
  parameters: { layout: "centered" },
  render: (args) => (
    <GravityStarsBackground
      {...args}
      className="h-72 w-[min(36rem,90vw)] rounded-2xl border border-border bg-card"
    />
  ),
};

/** Loose particles with no links: just drift, orbits and trails. */
export const Dust: Story = {
  args: { connections: false, density: 2.5, color: "muted-foreground", glowColor: "warning" },
  render: (args) => <GravityStarsBackground {...args} className="h-80 bg-background" />,
};
