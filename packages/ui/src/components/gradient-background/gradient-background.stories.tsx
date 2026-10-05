import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/button";

import { GradientBackground } from "./gradient-background";

const meta: Meta<typeof GradientBackground> = {
  title: "Effects/Gradient Background",
  component: GradientBackground,
  args: { variant: "mesh", speed: "normal", grain: true, interactive: true },
  argTypes: {
    variant: { control: "inline-radio", options: ["linear", "aurora", "mesh"] },
    speed: { control: "inline-radio", options: ["slow", "normal", "fast"] },
    colors: { control: false },
  },
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** An orbiting mesh with film grain behind a hero. Move the pointer for a soft light. */
export const Default: Story = {
  render: (args) => (
    <GradientBackground {...args} className="min-h-[32rem]">
      <div className="flex min-h-[32rem] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm font-medium tracking-widest text-foreground/70 uppercase">
          Dowel 2.0
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-6xl">
          Colour in motion, tuned to your theme
        </h1>
        <p className="max-w-lg text-base text-pretty text-foreground/80">
          Four blooms circle their anchors at their own pace, blurred into a mesh that never
          quite repeats.
        </p>
        <Button size="lg">
          Explore components <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </GradientBackground>
  ),
};

/** The three moods side by side. */
export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-4 p-6 md:grid-cols-3">
      {(["linear", "aurora", "mesh"] as const).map((variant) => (
        <GradientBackground
          key={variant}
          variant={variant}
          className="h-64 rounded-xl border border-border"
        >
          <p className="m-4 inline-block rounded-md bg-background/70 px-2 py-1 text-sm font-medium text-foreground backdrop-blur">
            {variant}
          </p>
        </GradientBackground>
      ))}
    </div>
  ),
};

/** Aurora ribbons drawn from the warning and success tokens, slow, with grain. */
export const Aurora: Story = {
  args: {
    variant: "aurora",
    speed: "slow",
    grain: true,
    interactive: false,
    colors: [
      "var(--color-success)",
      "color-mix(in oklab, var(--color-success) 50%, var(--color-info))",
      "var(--color-primary)",
      "var(--color-info)",
    ],
  },
  render: (args) => (
    <GradientBackground {...args} className="grid min-h-96 place-items-center">
      <p className="text-2xl font-semibold text-foreground">Northern lights</p>
    </GradientBackground>
  ),
};

/** The classic panning gradient, fast, as a banner. */
export const LinearBanner: Story = {
  args: { variant: "linear", speed: "fast", grain: false, interactive: false },
  render: (args) => (
    <GradientBackground {...args} className="m-6 rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="text-lg font-semibold text-primary-foreground">
          Early access is open — join the beta.
        </p>
        <Button variant="secondary">Request invite</Button>
      </div>
    </GradientBackground>
  ),
};
