import type { Meta, StoryObj } from "@storybook/react-vite";
import { Orbit } from "lucide-react";

import { HoleBackground } from "./hole-background";

const meta = {
  title: "Effects/Hole Background",
  component: HoleBackground,
  args: {
    color: "foreground",
    glowColor: "primary",
    density: 1,
    speed: 1,
    rings: 18,
    spokes: 28,
    shape: "well",
    interactive: true,
    vignette: "soft",
  },
  argTypes: {
    color: { control: "select", options: ["foreground", "muted-foreground", "primary"] },
    glowColor: { control: "select", options: ["primary", "info", "warning", "destructive"] },
    density: { control: { type: "range", min: 0, max: 3, step: 0.25 } },
    speed: { control: { type: "range", min: 0, max: 3, step: 0.25 } },
    rings: { control: { type: "range", min: 0, max: 40, step: 1 } },
    spokes: { control: { type: "range", min: 0, max: 64, step: 2 } },
    shape: { control: "inline-radio", options: ["well", "tunnel"] },
    vignette: { control: "inline-radio", options: ["none", "soft", "strong"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HoleBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Move the pointer: the vanishing point drifts after it and the whole tunnel bends. */
export const Default: Story = {
  render: (args) => (
    <HoleBackground {...args} className="min-h-[30rem] bg-background">
      <div className="flex min-h-[30rem] flex-col items-center justify-end gap-3 px-6 pb-12 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Orbit className="size-3.5" aria-hidden="true" />
          Event horizon
        </span>
        <h2 className="max-w-lg text-4xl font-semibold tracking-tight text-balance text-foreground">
          Everything ends up here
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Rings recede, particles spiral in, and nothing comes back out.
        </p>
      </div>
    </HoleBackground>
  ),
};

/** Straight down the tunnel, in the brand colour, with a heavier vignette. */
export const Tunnel: Story = {
  args: { shape: "tunnel", color: "primary", glowColor: "info", vignette: "strong", rings: 24 },
  render: (args) => <HoleBackground {...args} className="h-[26rem] bg-background" />,
};

/** A warp-speed card: fast flow, dense particles, no radial lines. */
export const Warp: Story = {
  args: { speed: 2.5, density: 2.5, spokes: 0, glowColor: "warning" },
  parameters: { layout: "centered" },
  render: (args) => (
    <HoleBackground
      {...args}
      className="h-72 w-[min(34rem,90vw)] rounded-2xl border border-border bg-card"
    >
      <div className="flex h-72 items-end p-6">
        <p className="text-lg font-semibold text-card-foreground">Engaging warp drive…</p>
      </div>
    </HoleBackground>
  ),
};
