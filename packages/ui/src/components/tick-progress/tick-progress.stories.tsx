import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { TickProgress } from "./tick-progress";

const meta: Meta<typeof TickProgress> = {
  title: "Data/Tick Progress",
  component: TickProgress,
  args: {
    "aria-label": "Completion",
    defaultValue: 66,
    ticks: 34,
    interactive: true,
    stroke: false,
  },
  argTypes: {
    ticks: { control: { type: "range", min: 8, max: 60, step: 1 } },
    heights: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="rounded-xl bg-muted p-10">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof TickProgress>;

/** Hover to preview, click (or use the arrow keys) to commit. */
export const Default: Story = {};

function Running() {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setValue((current) => (current >= 100 ? 0 : current + 3));
    }, 400);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return <TickProgress aria-label="Export progress" value={value} />;
}

/** bencho "Progress ticks" (Fill, Stroke), plus the display-only progress bar. */
export const Gallery: Story = {
  decorators: [(Story) => <Story />],
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 rounded-xl bg-muted p-10">
      <figure className="flex flex-col items-center gap-2">
        <TickProgress aria-label="Completion" interactive defaultValue={66} />
        <figcaption className="text-xs text-muted-foreground">bencho Progress ticks</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <TickProgress aria-label="Completion" interactive stroke defaultValue={40} />
        <figcaption className="text-xs text-muted-foreground">Stroke on</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <Running />
        <figcaption className="text-xs text-muted-foreground">
          Display-only progress bar
        </figcaption>
      </figure>
    </div>
  ),
};

export const Display: Story = { args: { interactive: false, "aria-label": "Upload" } };
