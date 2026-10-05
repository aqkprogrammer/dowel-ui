import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/button";

import { BubbleBackground } from "./bubble-background";

const meta: Meta<typeof BubbleBackground> = {
  title: "Effects/Bubble Background",
  component: BubbleBackground,
  args: { interactive: true, blur: "md", speed: "normal" },
  argTypes: {
    blur: { control: "inline-radio", options: ["sm", "md", "lg"] },
    speed: { control: "inline-radio", options: ["slow", "normal", "fast"] },
    colors: { control: false },
  },
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** A hero over drifting, liquid-fused blobs. Move the pointer: one blob follows on a spring. */
export const Default: Story = {
  render: (args) => (
    <BubbleBackground {...args} className="min-h-[32rem]">
      <div className="flex min-h-[32rem] flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          New in Dowel
        </span>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-6xl">
          Interfaces that feel alive
        </h1>
        <p className="max-w-lg text-base text-pretty text-foreground/80">
          Colour that drifts and merges like liquid behind your content, drawn entirely from
          your theme tokens.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg">
            Get started <ArrowRight aria-hidden="true" />
          </Button>
          <Button size="lg" variant="outline">
            Read the docs
          </Button>
        </div>
      </div>
    </BubbleBackground>
  ),
};

/** `sm` keeps the goo edge readable; `lg` melts the blobs into light. */
export const Blur: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-4 p-6 sm:grid-cols-3">
      {(["sm", "md", "lg"] as const).map((blur) => (
        <BubbleBackground
          key={blur}
          blur={blur}
          className="h-56 rounded-xl border border-border"
        >
          <p className="p-4 text-sm font-medium text-foreground">blur=&quot;{blur}&quot;</p>
        </BubbleBackground>
      ))}
    </div>
  ),
};

/** Custom colours are any CSS colour expression built from tokens. */
export const WarmPalette: Story = {
  args: {
    speed: "slow",
    colors: [
      "var(--color-warning)",
      "var(--color-destructive)",
      "color-mix(in oklab, var(--color-warning) 50%, var(--color-destructive))",
      "color-mix(in oklab, var(--color-warning) 70%, var(--color-background))",
      "var(--color-primary)",
      "var(--color-warning)",
    ],
  },
  render: (args) => (
    <BubbleBackground {...args} className="grid min-h-96 place-items-center">
      <p className="rounded-xl bg-background/75 px-5 py-3 text-lg font-medium text-foreground backdrop-blur">
        Sunset, slowly
      </p>
    </BubbleBackground>
  ),
};

/** A compact card surface, fast and sharp. */
export const Card: Story = {
  parameters: { layout: "centered", controls: { disable: true } },
  render: () => (
    <BubbleBackground
      blur="sm"
      speed="fast"
      interactive
      className="w-80 rounded-2xl border border-border shadow-lg"
    >
      <div className="flex flex-col gap-2 bg-background/60 p-6 backdrop-blur-sm">
        <p className="text-sm font-medium text-muted-foreground">Pro plan</p>
        <p className="text-3xl font-semibold text-foreground">$24 / mo</p>
        <Button className="mt-2">Upgrade</Button>
      </div>
    </BubbleBackground>
  ),
};
