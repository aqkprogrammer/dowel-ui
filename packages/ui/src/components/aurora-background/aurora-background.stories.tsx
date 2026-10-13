import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";
import { Input } from "@/components/input";

import { AuroraBackground } from "./aurora-background";

const meta = {
  title: "Effects/Aurora Background",
  component: AuroraBackground,
  args: {
    variant: "curtain",
    fade: "none",
    intensity: 0.6,
    speed: 1,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["curtain", "glow"] },
    fade: { control: "inline-radio", options: ["none", "edges", "bottom", "top"] },
    intensity: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    speed: { control: { type: "range", min: 0, max: 4, step: 0.25 } },
    blur: { control: { type: "range", min: 0, max: 120, step: 4 } },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AuroraBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Streaked curtains hung over a hero, in the theme's primary, info and warning colours. */
export const Default: Story = {
  render: (args) => (
    <AuroraBackground {...args} className="min-h-[28rem] bg-background">
      <div className="flex min-h-[28rem] flex-col items-center justify-center gap-4 px-6 text-center">
        <h2 className="max-w-xl text-4xl font-semibold tracking-tight text-balance text-foreground">
          Interfaces that feel like weather
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Two layers of light shear past each other, slowly, behind whatever you put here.
        </p>
        <Button>Start building</Button>
      </div>
    </AuroraBackground>
  ),
};

/** Soft fields of colour wandering behind a sign-up form, faded toward the bottom. */
export const Glow: Story = {
  args: { variant: "glow", fade: "bottom", intensity: 0.5 },
  render: (args) => (
    <AuroraBackground {...args} className="min-h-96 bg-background">
      <form
        className="mx-auto flex min-h-96 max-w-sm flex-col justify-center gap-3 px-6"
        onSubmit={(event) => event.preventDefault()}
      >
        <h2 className="text-2xl font-semibold text-foreground">Join the waitlist</h2>
        <Input type="email" aria-label="Email" placeholder="you@company.com" />
        <Button type="submit">Request access</Button>
      </form>
    </AuroraBackground>
  ),
};

/** Any palette: status colours, faster and sharper, inside a card. */
export const CustomColours: Story = {
  args: { colors: ["success", "info"], speed: 2, blur: 32, fade: "edges" },
  parameters: { layout: "centered" },
  render: (args) => (
    <AuroraBackground
      {...args}
      className="w-[min(32rem,90vw)] rounded-2xl border border-border bg-card"
    >
      <div className="flex h-60 flex-col justify-end gap-1 p-6">
        <p className="text-xs font-medium tracking-widest text-success uppercase">Healthy</p>
        <p className="text-lg font-semibold text-card-foreground">All 12 regions serving</p>
      </div>
    </AuroraBackground>
  ),
};
