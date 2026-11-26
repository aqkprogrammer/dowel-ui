import type { Meta, StoryObj } from "@storybook/react-vite";

import { GlassTiltCard } from "./glass-tilt-card";

function Contents() {
  return (
    <div className="flex h-full flex-col justify-between p-4">
      <span className="size-6 rounded-full bg-info" />
      <div className="flex flex-col gap-1.5">
        <span className="h-1.5 w-3/4 rounded-full bg-foreground/35" />
        <span className="h-1.5 w-1/2 rounded-full bg-foreground/20" />
      </div>
    </div>
  );
}

const meta = {
  title: "Display/Glass Tilt Card",
  component: GlassTiltCard,
  args: { className: "h-28 w-44", children: <Contents /> },
  parameters: { layout: "centered" },
} satisfies Meta<typeof GlassTiltCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sways at rest; move the pointer over it to tilt it. */
export const Default: Story = {};

/** On a dark tile like the reference, with the blue avatar dot. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex size-64 items-center justify-center rounded-3xl bg-[#161618] p-10 text-white">
      <GlassTiltCard className="h-24 w-36" swayDuration={4000}>
        <div className="flex h-full flex-col justify-between p-3">
          <span className="size-5 rounded-full bg-sky-400/80" />
          <div className="flex flex-col gap-1.5">
            <span className="h-1 w-3/4 rounded-full bg-white/35" />
            <span className="h-1 w-1/2 rounded-full bg-white/20" />
          </div>
        </div>
      </GlassTiltCard>
    </div>
  ),
};

/** Over a colourful background, where the frosting shows. */
export const OverColour: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="relative flex h-80 w-96 items-center justify-center overflow-hidden rounded-3xl bg-background">
      <span className="absolute top-10 left-16 size-32 rounded-full bg-fuchsia-500/70 blur-2xl" />
      <span className="absolute right-12 bottom-8 size-40 rounded-full bg-sky-500/70 blur-2xl" />
      <GlassTiltCard className="h-36 w-60">
        <Contents />
      </GlassTiltCard>
    </div>
  ),
};

/** Still: no sway, no tilt. */
export const Disabled: Story = { args: { disabled: true } };
