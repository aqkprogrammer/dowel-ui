import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef } from "react";

import { Button } from "@/components/button";

import { FallingText, type FallingTextHandle } from "./falling-text";

const meta = {
  title: "Effects/Falling Text",
  component: FallingText,
  args: {
    children: "Gravity always wins in the end, so hold on to your words",
    by: "word",
    trigger: "hover",
    gravity: 2400,
    bounce: 0.35,
    className: "w-[28rem] max-w-full rounded-lg border p-4 text-2xl font-semibold",
  },
  argTypes: {
    by: { control: "inline-radio", options: ["word", "letter"] },
    trigger: { control: "select", options: ["hover", "click", "inView", "manual"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof FallingText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover the box: the words fall. */
export const Default: Story = {};

/** Click (or press Enter) to drop the letters; click again to bring them back. */
export const Letters: Story = {
  args: {
    children: "Click to drop",
    by: "letter",
    trigger: "click",
    className: "w-80 rounded-lg border p-4 text-4xl font-black",
  },
};

function Manual() {
  const handle = useRef<FallingTextHandle>(null);
  return (
    <div className="flex flex-col items-center gap-3">
      <FallingText
        handleRef={handle}
        trigger="manual"
        className="w-[28rem] max-w-full rounded-lg border p-4 text-2xl font-semibold"
      >
        Driven from outside with drop and reset
      </FallingText>
      <div className="flex gap-2">
        <Button onClick={() => handle.current?.drop()}>Drop</Button>
        <Button variant="outline" onClick={() => handle.current?.reset()}>
          Reset
        </Button>
      </div>
    </div>
  );
}

/** Driven by `drop()` and `reset()` through `handleRef`. */
export const Imperative: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Manual />,
};
