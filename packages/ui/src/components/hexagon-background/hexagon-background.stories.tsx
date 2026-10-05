import type { Meta, StoryObj } from "@storybook/react-vite";
import { Hexagon } from "lucide-react";

import { Button } from "@/components/button";

import { HexagonBackground } from "./hexagon-background";

const meta: Meta<typeof HexagonBackground> = {
  title: "Effects/Hexagon Background",
  component: HexagonBackground,
  args: { size: "md", gap: 4, interactive: true, idle: true, idleInterval: 3600 },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    gap: { control: { type: "range", min: 0, max: 16, step: 1 } },
    idleInterval: { control: { type: "number", min: 1000, step: 200 } },
  },
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Sweep the pointer across the honeycomb to paint a fading trail; idle ripples roll in between. */
export const Default: Story = {
  render: (args) => (
    <HexagonBackground {...args} className="min-h-[32rem]">
      <div className="flex min-h-[32rem] flex-col items-center justify-center gap-5 px-6 text-center">
        <span className="grid size-12 place-items-center rounded-xl border border-border bg-background/80 text-primary shadow-sm backdrop-blur">
          <Hexagon aria-hidden="true" />
        </span>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
          Every cell, ready to light
        </h1>
        <p className="max-w-md rounded-lg bg-background/70 px-3 py-1.5 text-base text-pretty text-muted-foreground backdrop-blur">
          Move across the grid — tiles glow under the pointer and fade behind it.
        </p>
        <Button size="lg">Start building</Button>
      </div>
    </HexagonBackground>
  ),
};

/** Three tile sizes; past 720 tiles the honeycomb grows its cells instead of adding nodes. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-4 p-6 md:grid-cols-3">
      {(["sm", "md", "lg"] as const).map((size) => (
        <HexagonBackground
          key={size}
          size={size}
          className="h-64 rounded-xl border border-border"
        >
          <p className="m-4 inline-block rounded-md bg-background/80 px-2 py-1 text-sm font-medium text-foreground">
            size=&quot;{size}&quot;
          </p>
        </HexagonBackground>
      ))}
    </div>
  ),
};

/** No pointer at all: a wide gap and a quick idle ripple make it an ambient backdrop. */
export const IdleRipple: Story = {
  args: { size: "lg", gap: 10, interactive: false, idle: true, idleInterval: 2400 },
  render: (args) => <HexagonBackground {...args} className="h-96" />,
};

/** Tight tiles behind a sign-in card, as a hero panel. */
export const Panel: Story = {
  parameters: { layout: "centered", controls: { disable: true } },
  render: () => (
    <HexagonBackground
      size="sm"
      gap={2}
      className="w-[min(100vw,36rem)] rounded-2xl border border-border"
    >
      <div className="grid min-h-80 place-items-center p-8">
        <div className="w-full max-w-xs rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg">
          <p className="text-lg font-semibold">Welcome back</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue to your workspace.
          </p>
          <Button className="mt-4 w-full">Continue</Button>
        </div>
      </div>
    </HexagonBackground>
  ),
};
