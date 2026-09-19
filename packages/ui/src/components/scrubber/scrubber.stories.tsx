import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Scrubber } from "./scrubber";

// Annotated rather than `satisfies`: decorators make the inferred type unnameable (TS2883).
const meta: Meta<typeof Scrubber> = {
  title: "Form/Scrubber",
  component: Scrubber,
  args: {
    label: "Opacity",
    defaultValue: 0.4,
    min: 0,
    max: 1,
    step: 0.01,
    ticks: 9,
    size: "md",
    editable: true,
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Scrubber>;

/** Drag across the bar, use the arrow keys, or press Enter to type a value. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Scrubber" → the demo's three controlled scrubbers: Opacity
 *   (0–1, step 0.01, 9 ticks), Scale (0–3, step 0.1, 5 ticks) and Rotation
 *   (0–360, step 1, 7 ticks). Typed entry is new: a design-tool field that
 *   cannot be typed into is a slider.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [opacity, setOpacity] = useState(0.4);
    const [scale, setScale] = useState(1.5);
    const [rotation, setRotation] = useState(45);
    return (
      <figure className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Scrubber label="Opacity" value={opacity} onValueChange={setOpacity} />
          <Scrubber
            label="Scale"
            min={0}
            max={3}
            step={0.1}
            ticks={5}
            value={scale}
            onValueChange={setScale}
          />
          <Scrubber
            label="Rotation"
            min={0}
            max={360}
            step={1}
            ticks={7}
            value={rotation}
            onValueChange={setRotation}
            formatValue={(v) => `${String(v)}°`}
          />
        </div>
        <figcaption className="text-xs text-muted-foreground">SmoothUI · Scrubber</figcaption>
      </figure>
    );
  },
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-3">
      <Scrubber size="sm" label="Small" defaultValue={0.2} />
      <Scrubber size="md" label="Medium" defaultValue={0.5} />
      <Scrubber size="lg" label="Large" defaultValue={0.8} />
    </div>
  ),
};

export const WithoutTicks: Story = {
  args: { ticks: 0, label: "Blur", max: 40, step: 1, defaultValue: 12 },
};

export const DragOnly: Story = {
  args: { editable: false, label: "Drag only" },
};

export const Disabled: Story = {
  args: { disabled: true },
};
