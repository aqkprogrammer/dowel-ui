import type { Meta, StoryObj } from "@storybook/react-vite";

import { ShimmerText } from "./shimmer-text";

const meta = {
  title: "Effects/Shimmer Text",
  component: ShimmerText,
  args: {
    children: "Shipping soon",
    variant: "shine",
    repeat: "loop",
    className: "text-4xl font-bold tracking-tight",
  },
  argTypes: {
    variant: { control: "select", options: ["shine", "sweep"] },
    repeat: { control: "select", options: ["loop", "once"] },
    as: { control: "select", options: ["span", "p", "div", "h1", "h2", "h3"] },
  },
} satisfies Meta<typeof ShimmerText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every SmoothUI demo item this component covers, captioned with its source name. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 sm:grid-cols-2">
      <figure className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-lg border border-border p-6 text-center">
        <ShimmerText className="text-4xl font-bold tracking-tight">Shipping soon</ShimmerText>
        <ShimmerText className="text-lg" duration={2000}>
          A light sweep across the text.
        </ShimmerText>
        <figcaption className="text-xs text-muted-foreground">Shine Text</figcaption>
      </figure>
      <figure className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-lg border border-border p-6 text-center">
        <ShimmerText variant="sweep" className="text-4xl font-bold tracking-tight">
          Motion is meaning.
        </ShimmerText>
        <ShimmerText variant="sweep" delay={400} className="text-lg text-muted-foreground">
          A subtle sweep across a clean headline.
        </ShimmerText>
        <figcaption className="text-xs text-muted-foreground">Shimmer Sweep</figcaption>
      </figure>
    </div>
  ),
};

/** A single pass of the band, then plain text. */
export const Once: Story = {
  args: { repeat: "once", children: "Saved to your library" },
};

/** Token colours for the base and the band. */
export const Colours: Story = {
  args: {
    baseColor: "var(--color-primary)",
    shineColor: "var(--color-primary-foreground)",
    children: "New in Dowel",
  },
};

/** The entrance waits until it scrolls into view. */
export const OnView: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="h-[200vh] pt-[120vh]">
      <ShimmerText as="h2" variant="sweep" triggerOnView className="text-3xl font-semibold">
        Arrives when you get here
      </ShimmerText>
    </div>
  ),
};
