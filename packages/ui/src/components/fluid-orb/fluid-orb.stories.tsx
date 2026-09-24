import type { Meta, StoryObj } from "@storybook/react-vite";

import { FluidOrb } from "./fluid-orb";

const meta = {
  title: "AI/Fluid Orb",
  component: FluidOrb,
  args: { size: 200, glow: false },
  argTypes: {
    color: { control: "text" },
    size: { control: { type: "range", min: 32, max: 400, step: 4 } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof FluidOrb>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rare UI "Fluid Orb" (original design): the theme's primary, drifting on its own. */
export const Default: Story = {};

/**
 * Any CSS colour works — here the theme's status tokens. The pale middle band
 * and the near-white crown are derived from each one.
 */
export const Colours: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <FluidOrb size={120} />
      <FluidOrb size={120} color="var(--color-destructive)" />
      <FluidOrb size={120} color="var(--color-warning)" />
      <FluidOrb size={120} color="var(--color-success)" />
      <FluidOrb size={120} color="var(--color-info)" />
    </div>
  ),
};

/** A soft bloom of the colour behind the orb. */
export const Glow: Story = {
  args: { glow: true, size: 220 },
};

/** From an avatar-sized dot to a hero piece. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-end gap-6">
      <FluidOrb size={24} />
      <FluidOrb size={48} />
      <FluidOrb size={96} />
      <FluidOrb size={180} />
    </div>
  ),
};

/** Standing in for an assistant: named, and paired with a visible status. */
export const WithStatus: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 pe-6">
      <FluidOrb size={56} aria-label="Assistant" />
      <div className="grid gap-0.5">
        <p className="text-sm font-medium">Assistant</p>
        <p className="text-xs text-muted-foreground">Ready when you are</p>
      </div>
    </div>
  ),
};
