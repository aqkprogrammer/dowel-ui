import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";

import { DirectionProvider } from "@/components/direction";

import { SlideToConfirm } from "./slide-to-confirm";

const meta = {
  title: "Form/Slide to Confirm",
  component: SlideToConfirm,
  args: {
    variant: "confirm",
    fill: "light",
    stroke: false,
    speed: 50,
    corner: 28,
    holdDuration: 1000,
    disabled: false,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["confirm", "power"] },
    fill: { control: "inline-radio", options: ["light", "dark"] },
    speed: { control: { type: "range", min: 0, max: 100, step: 5 } },
    corner: { control: { type: "range", min: 0, max: 28, step: 1 } },
    holdDuration: { control: { type: "range", min: 300, max: 3000, step: 100 } },
  },
  render: (args) => (
    <div className="flex min-h-40 items-center justify-center rounded-xl bg-muted p-10">
      <SlideToConfirm {...args} />
    </div>
  ),
} satisfies Meta<typeof SlideToConfirm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Item({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="flex min-h-24 items-center justify-center rounded-xl bg-muted px-8 py-6">
        {children}
      </div>
      <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-10 md:grid-cols-2">
      <Item caption="bencho · Slide to confirm">
        <SlideToConfirm />
      </Item>
      <Item caption="SmoothUI · Power Off Slide">
        <SlideToConfirm variant="power" className="w-56" />
      </Item>
      <Item caption="bencho · Slide to confirm (Fill: Dark, Stroke: On)">
        <SlideToConfirm fill="dark" stroke />
      </Item>
      <Item caption="bencho · Slide to confirm (Speed 10 · Speed 90)">
        <div className="flex flex-col gap-3">
          <SlideToConfirm speed={10} />
          <SlideToConfirm speed={90} />
        </div>
      </Item>
      <Item caption="bencho · Slide to confirm (Width 220 · Width 380)">
        <div className="flex flex-col gap-3">
          <SlideToConfirm className="w-55" />
          <SlideToConfirm className="w-95" />
        </div>
      </Item>
      <Item caption="bencho · Slide to confirm (Corner 0 · Corner 12)">
        <div className="flex flex-col gap-3">
          <SlideToConfirm corner={0} />
          <SlideToConfirm corner={12} />
        </div>
      </Item>
      <Item caption="SmoothUI · Power Off Slide (disabled)">
        <SlideToConfirm variant="power" className="w-56" disabled />
      </Item>
      <Item caption="SmoothUI · Power Off Slide (Fill: Dark)">
        <SlideToConfirm variant="power" className="w-56" fill="dark" />
      </Item>
    </div>
  ),
};

/** Stays confirmed (`resetAfter={null}`) and reports each confirm to the page. */
export const StaysConfirmed: Story = {
  render: (args) => {
    function Demo() {
      const [count, setCount] = useState(0);
      return (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-muted p-10">
          <SlideToConfirm
            {...args}
            label="Slide to send"
            confirmedLabel="Sent"
            resetAfter={null}
            onConfirm={() => setCount((value) => value + 1)}
          />
          <p className="text-sm text-muted-foreground">Confirmed {count} time(s)</p>
        </div>
      );
    }
    return <Demo />;
  },
};

/** Press and hold Enter or Space on the grip: the pointer-free path. */
export const PressAndHold: Story = {
  args: { holdDuration: 1600 },
};

export const RightToLeft: Story = {
  render: (args) => (
    <DirectionProvider dir="rtl">
      <div
        dir="rtl"
        className="flex min-h-40 items-center justify-center rounded-xl bg-muted p-10"
      >
        <SlideToConfirm {...args} label="اسحب للتأكيد" confirmedLabel="تم التأكيد" />
      </div>
    </DirectionProvider>
  ),
};
