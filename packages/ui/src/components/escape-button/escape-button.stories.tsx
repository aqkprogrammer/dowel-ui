import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { EscapeButton } from "./escape-button";

const meta: Meta<typeof EscapeButton> = {
  title: "Effects/Escape Button",
  component: EscapeButton,
  args: {
    children: "Touch me",
    caughtLabel: "Fine.",
    patience: 4,
    radius: 120,
    skittishness: 55,
    stroke: false,
  },
  argTypes: {
    patience: { control: { type: "range", min: 1, max: 8, step: 1 } },
    radius: { control: { type: "range", min: 60, max: 200, step: 5 } },
    skittishness: { control: { type: "range", min: 0, max: 100, step: 5 } },
  },
  decorators: [
    (Story) => (
      <div className="grid h-60 w-[22.5rem] max-w-full place-items-center rounded-xl bg-muted">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof EscapeButton>;

/** Chase it with a mouse. Tab to it and it holds still. */
export const Default: Story = {};

function Counter() {
  const [presses, setPresses] = useState(0);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid h-60 w-[22.5rem] max-w-full place-items-center rounded-xl bg-muted">
        <EscapeButton
          onClick={() => {
            setPresses((count) => count + 1);
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        bencho Escape button · pressed {presses} time{presses === 1 ? "" : "s"}
      </p>
    </div>
  );
}

/** bencho "Escape button": Patience 4, Radius 120, Skittishness 55; plus a jumpy, stroked one. */
export const Gallery: Story = {
  decorators: [(Story) => <Story />],
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6">
      <Counter />
      <figure className="flex flex-col items-center gap-2">
        <div className="grid h-60 w-[22.5rem] max-w-full place-items-center rounded-xl bg-muted">
          <EscapeButton
            stroke
            patience={8}
            skittishness={100}
            radius={200}
            className="rounded-xl"
          >
            Catch me
          </EscapeButton>
        </div>
        <figcaption className="text-xs text-muted-foreground">
          Patience 8 · Skittishness 100 · Radius 200 · Stroke · Corner 12
        </figcaption>
      </figure>
    </div>
  ),
};
