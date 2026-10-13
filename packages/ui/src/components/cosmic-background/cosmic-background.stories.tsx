import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/button";

import { CosmicBackground } from "./cosmic-background";

const meta = {
  title: "Effects/Cosmic Background",
  component: CosmicBackground,
  args: {
    orbits: 2,
    rings: true,
    core: true,
    origin: "center",
    density: 1,
    speed: 1,
    glow: 0.7,
    interactive: true,
    fade: "none",
  },
  argTypes: {
    orbits: { control: { type: "range", min: 0, max: 3, step: 1 } },
    origin: { control: "select", options: ["center", "top", "top-end", "bottom-start"] },
    density: { control: { type: "range", min: 0, max: 4, step: 0.25 } },
    speed: { control: { type: "range", min: 0, max: 4, step: 0.25 } },
    glow: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    starColor: {
      control: "select",
      options: ["foreground", "muted-foreground", "primary", "info"],
    },
    fade: { control: "inline-radio", options: ["none", "edges", "bottom"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CosmicBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The mark as a hero: the core above the headline, both orbits turning. Move the pointer to lean the sky. */
export const Default: Story = {
  args: { origin: "top" },
  render: (args) => (
    <CosmicBackground {...args} className="min-h-[30rem] bg-background">
      <div className="flex min-h-[30rem] flex-col items-center justify-end gap-4 px-6 pb-16 text-center">
        <h2 className="max-w-xl text-4xl font-semibold tracking-tight text-balance text-foreground">
          Components with their own gravity
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Install what you need, own the code, and ship it into orbit.
        </p>
        <Button>
          Get started
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </CosmicBackground>
  ),
};

/** All three orbits around the centre, with no content — the mark at its fullest. */
export const FullSystem: Story = {
  args: { orbits: 3, glow: 1, density: 1.5 },
  render: (args) => <CosmicBackground {...args} className="h-[28rem] bg-background" />,
};

/** A quiet version for a card: no core, no rings, the orbits as faint movement only, faded at the edges. */
export const Subtle: Story = {
  args: { core: false, rings: false, glow: 0.35, density: 0.6, speed: 0.6, fade: "edges" },
  parameters: { layout: "centered" },
  render: (args) => (
    <CosmicBackground
      {...args}
      className="w-[min(32rem,90vw)] rounded-2xl border border-border bg-card"
    >
      <div className="flex h-64 flex-col justify-end gap-1 p-6">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">Telemetry</p>
        <p className="text-lg font-semibold text-card-foreground">3 agents in orbit</p>
      </div>
    </CosmicBackground>
  ),
};

/** Any palette works: here status colours, with the core in the corner of an empty state. */
export const CustomPalette: Story = {
  args: { palette: ["success", "info", "warning"], orbits: 3, origin: "top-end" },
  render: (args) => (
    <CosmicBackground {...args} className="min-h-80 bg-background">
      <div className="flex min-h-80 flex-col items-start justify-end gap-2 p-8">
        <p className="text-lg font-semibold text-foreground">All systems nominal</p>
        <p className="text-sm text-muted-foreground">Nothing has needed you for 14 days.</p>
      </div>
    </CosmicBackground>
  ),
};
