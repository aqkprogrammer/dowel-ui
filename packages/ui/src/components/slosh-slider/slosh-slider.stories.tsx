import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { SloshSlider } from "./slosh-slider";

const meta: Meta<typeof SloshSlider> = {
  title: "Form/Slosh Slider",
  component: SloshSlider,
  args: {
    "aria-label": "Flow",
    defaultValue: 62,
    min: 0,
    max: 100,
    step: 1,
    largeStep: 10,
    viscosity: 15,
    momentum: 55,
    tilt: 45,
    corner: 13,
    fill: "light",
    stroke: false,
    disabled: false,
  },
  argTypes: {
    fill: { control: "inline-radio", options: ["light", "dark"] },
    viscosity: { control: { type: "range", min: 0, max: 100, step: 5 } },
    momentum: { control: { type: "range", min: 0, max: 100, step: 5 } },
    tilt: { control: { type: "range", min: 0, max: 100, step: 5 } },
    corner: { control: { type: "range", min: 0, max: 20, step: 1 } },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-40 items-center justify-center bg-muted p-8">
        <div className="w-full max-w-xs">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SloshSlider>;

/** Drag, click anywhere, or use the arrow keys: the fill sloshes after the knob. */
export const Default: Story = {};

function Labelled({
  caption,
  ...props
}: { caption: string } & Parameters<typeof SloshSlider>[0]) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{caption}</span>
      <SloshSlider {...props} />
    </div>
  );
}

/**
 * Every source item this component reproduces.
 *
 * - bencho "Slosh slider" → the block at rest ("Flow", 62%, Corner 13), its Fill
 *   (Light / Dark) and Stroke switches, and the feel levels: Viscosity (15),
 *   Momentum (55), Tilt (45) and Corner (13) at their defaults, then pushed to
 *   either end. The source's arrow keys step by 2 — pass `step={2}` for that.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState(62);
    const shared = { value, onValueChange: setValue };
    return (
      <figure className="flex w-full flex-col gap-4">
        <Labelled caption="Light" aria-label="Flow" {...shared} />
        <Labelled caption="Light, stroke" aria-label="Flow, stroke" stroke {...shared} />
        <Labelled caption="Dark" aria-label="Flow, dark" fill="dark" {...shared} />
        <Labelled
          caption="Dark, stroke"
          aria-label="Flow, dark stroke"
          fill="dark"
          stroke
          {...shared}
        />
        <Labelled
          caption="Arrow step 2 (source)"
          aria-label="Flow, step 2"
          step={2}
          {...shared}
        />
        <Labelled caption="Thick: viscosity 90" aria-label="Thick" viscosity={90} {...shared} />
        <Labelled
          caption="Watery: viscosity 0, momentum 100"
          aria-label="Watery"
          viscosity={0}
          momentum={100}
          {...shared}
        />
        <Labelled caption="No tilt" aria-label="No tilt" tilt={0} {...shared} />
        <Labelled caption="Steep tilt" aria-label="Steep tilt" tilt={100} {...shared} />
        <Labelled caption="Square: corner 0" aria-label="Square" corner={0} {...shared} />
        <Labelled caption="Pill: corner 20" aria-label="Pill" corner={20} {...shared} />
        <figcaption className="text-xs text-muted-foreground">bencho Slosh slider</figcaption>
      </figure>
    );
  },
};

/** A spoken unit through formatValue. */
export const WithValueText: Story = {
  args: { "aria-label": "Opacity", formatValue: (value: number) => `${String(value)} percent` },
};

export const Disabled: Story = { args: { disabled: true } };
