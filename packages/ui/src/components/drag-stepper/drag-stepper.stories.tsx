import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DragStepper } from "./drag-stepper";

const meta: Meta<typeof DragStepper> = {
  title: "Form/Drag Stepper",
  component: DragStepper,
  args: {
    "aria-label": "Quantity",
    defaultValue: 24,
    min: 0,
    max: 100,
    step: 1,
    largeStep: 10,
    holdDelay: 250,
    sensitivity: 0.6,
    fill: "light",
    stroke: false,
    disabled: false,
  },
  argTypes: {
    fill: { control: "inline-radio", options: ["light", "dark"] },
    holdDelay: { control: { type: "range", min: 100, max: 800, step: 50 } },
    sensitivity: { control: { type: "range", min: 0.1, max: 2, step: 0.1 } },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-40 items-center justify-center bg-muted p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DragStepper>;

/** Tap − or + to step. Hold either for a moment, then drag sideways to scrub. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - bencho "Drag stepper" → the block at rest (starts at 24, range 0–100), and
 *   its two workbench switches: Fill (Light / Dark) and Stroke (Off / On).
 *   Hold a side button ~250ms to enter the sweep; drag to scrub about 0.6 per px.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState(24);
    return (
      <figure className="flex flex-col items-center gap-6">
        <div className="grid grid-cols-2 gap-6">
          <DragStepper aria-label="Light" value={value} onValueChange={setValue} />
          <DragStepper
            aria-label="Light, stroke"
            stroke
            value={value}
            onValueChange={setValue}
          />
          <DragStepper aria-label="Dark" fill="dark" value={value} onValueChange={setValue} />
          <DragStepper
            aria-label="Dark, stroke"
            fill="dark"
            stroke
            value={value}
            onValueChange={setValue}
          />
        </div>
        <figcaption className="text-xs text-muted-foreground">bencho Drag stepper</figcaption>
      </figure>
    );
  },
};

/** A spoken unit through formatValue, with a larger step and page step. */
export const WithUnits: Story = {
  args: {
    "aria-label": "Guests",
    defaultValue: 4,
    min: 1,
    max: 20,
    largeStep: 5,
    formatValue: (value: number) => `${String(value)} guests`,
  },
};

export const Disabled: Story = { args: { disabled: true } };
