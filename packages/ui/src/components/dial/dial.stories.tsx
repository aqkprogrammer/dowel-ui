import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Dial } from "./dial";

const meta = {
  title: "Form/Dial",
  component: Dial,
  args: {
    "aria-label": "Humidity",
    defaultValue: 45,
    min: 0,
    max: 100,
    step: 1,
    detents: 11,
    sweep: 270,
    size: "md",
    format: (value: number) => `${String(value)}%`,
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    sweep: { control: { type: "range", min: 90, max: 330, step: 10 } },
    format: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Dial>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drag the knob, or focus it and use the arrows, PageUp/PageDown or the wheel. */
export const Default: Story = {};

function Thermostat() {
  const [value, setValue] = useState(21);
  return (
    <Dial
      aria-label="Temperature"
      min={16}
      max={28}
      step={0.5}
      detents={13}
      value={value}
      onValueChange={setValue}
      format={(v) => `${v.toFixed(1)}°`}
      caption="Heating"
      size="lg"
    />
  );
}

/** Original design for bencho's (paid) Wheel pattern: humidity, a detented fan, a thermostat. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-10 rounded-xl bg-muted p-10">
      <figure className="flex flex-col items-center gap-2">
        <Dial
          aria-label="Humidity"
          defaultValue={45}
          format={(v) => `${String(v)}%`}
          caption="Humidity"
        />
        <figcaption className="text-xs text-muted-foreground">Dial (0–100%)</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <Dial
          aria-label="Fan speed"
          size="sm"
          detents={5}
          snapToDetents
          sweep={180}
          defaultValue={50}
          format={(v) => ["Off", "Low", "Mid", "High", "Max"][Math.round(v / 25)] ?? ""}
        />
        <figcaption className="text-xs text-muted-foreground">
          Snap to 5 detents · 180°
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <Thermostat />
        <figcaption className="text-xs text-muted-foreground">Half-degree steps</figcaption>
      </figure>
    </div>
  ),
};
