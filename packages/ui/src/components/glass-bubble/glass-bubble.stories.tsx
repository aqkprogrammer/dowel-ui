import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";

import { DirectionProvider } from "@/components/direction";

import { GlassBubble, type GlassBubbleValue } from "./glass-bubble";

/*
 * bencho "Glass bubble" (parked): a 132px lens over a 360x360 photo in a
 * 600x600 field. bencho's photo is not licensed, so the stories use a picsum
 * placeholder or a token gradient. The Gallery reproduces the block and its
 * workbench levels (Bend, Fringe, Size) as props.
 */

function Photo({ seed = "glass" }: { seed?: string }) {
  return (
    <img
      src={`https://picsum.photos/seed/${seed}/720/720`}
      alt=""
      className="absolute inset-[20%] size-[60%] rounded-[1.125rem] object-cover"
      draggable={false}
    />
  );
}

function Gradient() {
  return (
    <div
      className="absolute inset-[20%] rounded-[1.125rem]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, var(--color-primary) 0 12px, var(--color-card) 12px 24px)," +
          "radial-gradient(circle at 30% 30%, var(--color-warning), transparent 60%)",
        backgroundBlendMode: "multiply",
      }}
    />
  );
}

const meta = {
  title: "Effects/Glass Bubble",
  component: GlassBubble,
  args: {
    size: 132,
    bend: 70,
    fringe: 18,
    lens: "auto",
    disabled: false,
    defaultValue: { x: 49, y: 36 },
  },
  argTypes: {
    size: { control: { type: "range", min: 80, max: 240, step: 4 } },
    bend: { control: { type: "range", min: 0, max: 100, step: 5 } },
    fringe: { control: { type: "range", min: 0, max: 40, step: 2 } },
    lens: { control: "inline-radio", options: ["auto", "svg", "fallback"] },
    children: { control: false },
  },
  render: (args) => (
    <div className="flex justify-center rounded-2xl bg-muted p-4">
      <GlassBubble {...args} className="max-w-[30rem]">
        <Photo />
      </GlassBubble>
    </div>
  ),
} satisfies Meta<typeof GlassBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Stage({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="flex w-[18rem] flex-col items-center gap-3">
      <div className="w-full rounded-2xl bg-muted p-2">{children}</div>
      <figcaption className="text-center text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-8">
      <Stage caption="bencho Glass bubble">
        <GlassBubble defaultValue={{ x: 49, y: 36 }} size={80}>
          <Photo />
        </GlassBubble>
      </Stage>
      <Stage caption="bencho Glass bubble · Bend 0 (flat glass)">
        <GlassBubble bend={0} size={80} aria-label="Flat glass bubble">
          <Photo />
        </GlassBubble>
      </Stage>
      <Stage caption="bencho Glass bubble · Bend 100, Fringe 40">
        <GlassBubble bend={100} fringe={40} size={80} aria-label="Strong glass bubble">
          <Photo />
        </GlassBubble>
      </Stage>
      <Stage caption="bencho Glass bubble · Fringe 0 (no colour spread)">
        <GlassBubble fringe={0} size={80} aria-label="Clear glass bubble">
          <Gradient />
        </GlassBubble>
      </Stage>
      <Stage caption="bencho Glass bubble · Size 132 over a gradient">
        <GlassBubble size={132} aria-label="Large glass bubble">
          <Gradient />
        </GlassBubble>
      </Stage>
      <Stage caption="Fallback lens (Safari / Firefox look)">
        <GlassBubble lens="fallback" size={80} aria-label="Fallback glass bubble">
          <Photo />
        </GlassBubble>
      </Stage>
    </div>
  ),
};

/** Controlled: position in state, echoed below. */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<GlassBubbleValue>({ x: 49, y: 36 });
    return (
      <div className="flex flex-col items-center gap-3">
        <GlassBubble {...args} value={value} onValueChange={setValue} className="max-w-[24rem]">
          <Photo seed="lens" />
        </GlassBubble>
        <output className="text-sm text-muted-foreground tabular-nums">
          {Math.round(value.x)} across, {Math.round(value.y)} down
        </output>
      </div>
    );
  },
};

export const Disabled: Story = { args: { disabled: true } };

export const RightToLeft: Story = {
  render: (args) => (
    <DirectionProvider dir="rtl">
      <div dir="rtl" className="flex justify-center">
        <GlassBubble {...args} className="max-w-[24rem]">
          <Photo />
        </GlassBubble>
      </div>
    </DirectionProvider>
  ),
};
