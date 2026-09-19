import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";
import { DirectionProvider } from "@/components/direction";
import { FoldingFrame, type FoldingFrameProps } from "./folding-frame";

const PHOTO = "https://picsum.photos/seed/fold/600/428";
const ALT = "A placeholder landscape photo";

const meta: Meta<typeof FoldingFrame> = {
  title: "Effects/Folding Frame",
  component: FoldingFrame,
  args: {
    src: PHOTO,
    alt: ALT,
    defaultValue: 0,
    snap: false,
    liquid: 60,
    depth: 55,
    thickness: 9,
    corner: 14,
    fill: "light",
  },
  argTypes: {
    liquid: { control: { type: "range", min: 0, max: 100, step: 5 } },
    depth: { control: { type: "range", min: 0, max: 100, step: 5 } },
    thickness: { control: { type: "range", min: 0, max: 18, step: 1 } },
    corner: { control: { type: "range", min: 0, max: 24, step: 1 } },
    fill: { control: "inline-radio", options: ["light", "dark"] },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-96 items-center justify-center rounded-xl bg-muted p-12">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const FEELS: { caption: string; props: Partial<FoldingFrameProps> }[] = [
  { caption: "bencho Folding frame (shut)", props: {} },
  { caption: "bencho Folding frame · half open", props: { defaultValue: 45 } },
  { caption: "bencho Folding frame · open", props: { defaultValue: 100 } },
  { caption: "bencho Folding frame · Liquid 0", props: { liquid: 0 } },
  { caption: "bencho Folding frame · Liquid 100", props: { liquid: 100 } },
  { caption: "bencho Folding frame · Depth 0", props: { depth: 0 } },
  { caption: "bencho Folding frame · Depth 100", props: { depth: 100 } },
  {
    caption: "bencho Folding frame · Thickness 18",
    props: { thickness: 18, defaultValue: 30 },
  },
  { caption: "bencho Folding frame · Corner 0", props: { corner: 0, defaultValue: 30 } },
  { caption: "bencho Folding frame · Corner 24", props: { corner: 24, defaultValue: 30 } },
  { caption: "bencho Folding frame · Fill dark", props: { fill: "dark", defaultValue: 30 } },
  { caption: "bencho Folding frame · snap on release", props: { snap: true } },
];

/** The source block, its resting states and each feel control. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-x-16 gap-y-12">
      {FEELS.map(({ caption, props }, index) => (
        <figure key={caption} className="flex flex-col items-center gap-4">
          <FoldingFrame
            src={`https://picsum.photos/seed/fold-${String(index)}/600/428`}
            alt={ALT}
            className="w-60"
            {...props}
          />
          <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

function ControlledFrame() {
  const [value, setValue] = useState(0);
  return (
    <div className="flex flex-col items-center gap-6">
      <FoldingFrame src={PHOTO} alt={ALT} value={value} onValueChange={setValue} />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setValue(0);
          }}
        >
          Shut
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setValue(100);
          }}
        >
          Open
        </Button>
        <span className="w-12 text-end text-sm text-muted-foreground tabular-nums">
          {value}%
        </span>
      </div>
    </div>
  );
}

/** Controlled from outside: the buttons ease the cover with the CSS transition. */
export const Controlled: Story = {
  render: () => <ControlledFrame />,
};

/** Snaps fully open or shut when the pointer is released. */
export const SnapOnRelease: Story = {
  args: { snap: true },
};

/** The book opens the other way: the cover is the inline-end half. */
export const RightToLeft: Story = {
  render: (args) => (
    <DirectionProvider dir="rtl">
      <div dir="rtl">
        <FoldingFrame {...args} />
      </div>
    </DirectionProvider>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 40 },
};
