import type { Meta, StoryObj } from "@storybook/react-vite";
import { PartyPopper } from "lucide-react";

import { FireworksBackground } from "./fireworks-background";

const meta = {
  title: "Effects/Fireworks Background",
  component: FireworksBackground,
  args: {
    autoLaunch: true,
    rate: 0.8,
    particleCount: 70,
    interactive: true,
    fade: "none",
  },
  argTypes: {
    color: {
      control: "select",
      options: [
        undefined,
        "primary",
        "info",
        "success",
        "warning",
        "destructive",
        "foreground",
      ],
    },
    rate: { control: { type: "range", min: 0.1, max: 3, step: 0.1 } },
    particleCount: { control: { type: "range", min: 10, max: 200, step: 10 } },
    fade: { control: "inline-radio", options: ["none", "bottom"] },
    palette: { control: false },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FireworksBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rockets launch on their own and cycle through the theme. Click anywhere to launch one there. */
export const Default: Story = {
  render: (args) => (
    <FireworksBackground {...args} className="min-h-[28rem] bg-background">
      <div className="flex min-h-[28rem] flex-col items-center justify-center gap-4 px-6 text-center">
        <PartyPopper className="size-8 text-primary" aria-hidden="true" />
        <h2 className="max-w-lg text-4xl font-semibold tracking-tight text-balance text-foreground">
          Version 2.0 is here
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Click anywhere in the sky to launch a rocket of your own.
        </p>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          See what’s new
        </button>
      </div>
    </FireworksBackground>
  ),
};

/** A celebration card in one colour, with the launch site faded out. */
export const Monochrome: Story = {
  args: { color: "warning", rate: 1.4, particleCount: 90, fade: "bottom" },
  parameters: { layout: "centered" },
  render: (args) => (
    <FireworksBackground
      {...args}
      className="w-[min(32rem,90vw)] rounded-2xl border border-border bg-card"
    >
      <div className="flex h-72 flex-col items-center justify-end gap-1 p-6 text-center">
        <p className="text-lg font-semibold text-card-foreground">Goal reached</p>
        <p className="text-sm text-muted-foreground">1,000,000 downloads</p>
      </div>
    </FireworksBackground>
  ),
};

/** Nothing launches until you click: the sky is yours. */
export const OnClick: Story = {
  args: { autoLaunch: false, particleCount: 120 },
  render: (args) => (
    <FireworksBackground {...args} className="h-96 bg-background">
      <p className="flex h-96 items-center justify-center text-sm text-muted-foreground">
        Click to launch
      </p>
    </FireworksBackground>
  ),
};

/** A grand finale: a custom palette at the top rate. */
export const Finale: Story = {
  args: { rate: 3, particleCount: 110, palette: ["primary", "info", "success"] },
  render: (args) => <FireworksBackground {...args} className="h-96 bg-background" />,
};
