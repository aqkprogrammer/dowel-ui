import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";

import { DirectionProvider } from "@/components/direction";

import { GooBall, type GooBallValue } from "./goo-ball";

/*
 * bencho "Dragging ball": one ball centred in an invisible 300x200 well on a
 * muted stage. The Gallery reproduces the block and its workbench levels
 * (Stretch, Give, Grip, Size, Fill, Stroke) as props.
 */

const meta = {
  title: "Effects/Goo Ball",
  component: GooBall,
  args: {
    size: 56,
    stretch: 36,
    give: 50,
    grip: 50,
    fill: "light",
    stroke: false,
    disabled: false,
  },
  argTypes: {
    size: { control: { type: "range", min: 32, max: 84, step: 4 } },
    stretch: { control: { type: "range", min: 0, max: 70, step: 2 } },
    give: { control: { type: "range", min: 10, max: 100, step: 5 } },
    grip: { control: { type: "range", min: 0, max: 100, step: 5 } },
    fill: { control: "inline-radio", options: ["light", "dark"] },
  },
  render: (args) => (
    <div className="flex items-center justify-center rounded-2xl bg-muted p-10">
      <GooBall {...args} />
    </div>
  ),
} satisfies Meta<typeof GooBall>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Stage({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="rounded-2xl bg-muted p-6">{children}</div>
      <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-10">
      <Stage caption="bencho Dragging ball">
        <GooBall />
      </Stage>
      <Stage caption="bencho Dragging ball · Fill dark">
        <GooBall fill="dark" aria-label="Dark goo ball (decorative)" />
      </Stage>
      <Stage caption="bencho Dragging ball · Stroke on">
        <GooBall stroke aria-label="Outlined goo ball (decorative)" />
      </Stage>
      <Stage caption="bencho Dragging ball · Stretch 0 (rigid)">
        <GooBall stretch={0} aria-label="Rigid goo ball (decorative)" />
      </Stage>
      <Stage caption="bencho Dragging ball · Stretch 70, Give 100 (wobbly)">
        <GooBall stretch={70} give={100} aria-label="Wobbly goo ball (decorative)" />
      </Stage>
      <Stage caption="bencho Dragging ball · Grip 0 (lags) vs Grip 100">
        <div className="flex flex-col gap-4">
          <GooBall grip={0} className="h-[6.25rem]" aria-label="Loose goo ball (decorative)" />
          <GooBall
            grip={100}
            className="h-[6.25rem]"
            aria-label="Tight goo ball (decorative)"
          />
        </div>
      </Stage>
      <Stage caption="bencho Dragging ball · Size 32 and 84">
        <div className="flex flex-col gap-4">
          <GooBall size={32} className="h-[6.25rem]" aria-label="Small goo ball (decorative)" />
          <GooBall size={84} className="h-[8rem]" aria-label="Large goo ball (decorative)" />
        </div>
      </Stage>
    </div>
  ),
};

/** Controlled: the position lives in state and is echoed below. */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<GooBallValue>({ x: 20, y: 30 });
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted p-10">
        <GooBall {...args} value={value} onValueChange={setValue} />
        <output className="text-sm text-muted-foreground tabular-nums">
          {Math.round(value.x)}% across, {Math.round(value.y)}% down
        </output>
        <button
          type="button"
          className="rounded-md border border-border bg-card px-3 py-1 text-sm"
          onClick={() => setValue({ x: 50, y: 50 })}
        >
          Centre
        </button>
      </div>
    );
  },
};

/** A wider well via className. */
export const WideWell: Story = {
  render: (args) => (
    <div className="rounded-2xl bg-muted p-6">
      <GooBall {...args} className="h-[10rem] w-[32rem]" />
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true } };

/** Arrow keys mirror: ArrowRight moves toward the inline end (left). */
export const RightToLeft: Story = {
  render: (args) => (
    <DirectionProvider dir="rtl">
      <div dir="rtl" className="flex items-center justify-center rounded-2xl bg-muted p-10">
        <GooBall {...args} defaultValue={{ x: 10, y: 50 }} />
      </div>
    </DirectionProvider>
  ),
};
