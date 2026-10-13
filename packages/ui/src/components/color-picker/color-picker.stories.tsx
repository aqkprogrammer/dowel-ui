import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";

import { ColorPicker } from "./color-picker";

const BRAND = ["#5b5bd6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#111827"];

const meta = {
  title: "Form/Color Picker",
  component: ColorPicker,
  args: {
    format: "hex",
    alpha: false,
    eyeDropper: true,
    disabled: false,
  },
  argTypes: {
    format: { control: "inline-radio", options: ["hex", "rgb", "oklch"] },
    contrastWith: { control: "text" },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Square, hue, field, swatches, and how the colour reads as text on the page background. */
export const Default: Story = {
  args: { swatches: BRAND, contrastWith: "background", label: "Brand colour" },
};

/** With opacity, written as OKLCH — the space Dowel's themes are defined in. */
export const AlphaAndOklch: Story = {
  args: { alpha: true, format: "oklch", defaultValue: "#0ea5e980", label: "Overlay tint" },
};

/** The usual home for one: a swatch button that opens it in a popover. */
export const InAPopover: Story = {
  render: function Render(args) {
    const [color, setColor] = useState("#10b981");
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <span
              aria-hidden="true"
              className="size-4 rounded-sm border border-border"
              style={{ backgroundColor: color }}
            />
            Accent · <span className="font-mono">{color}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent aria-label="Accent colour" className="w-auto p-0">
          <ColorPicker
            {...args}
            value={color}
            onValueChange={setColor}
            label="Accent"
            swatches={BRAND}
            className="border-0"
          />
        </PopoverContent>
      </Popover>
    );
  },
};
