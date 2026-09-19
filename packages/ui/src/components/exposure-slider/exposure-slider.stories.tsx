import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ExposureSlider } from "./exposure-slider";

// Annotated rather than `satisfies`: decorators make the inferred type unnameable (TS2883).
const meta: Meta<typeof ExposureSlider> = {
  title: "Form/Exposure Slider",
  component: ExposureSlider,
  args: {
    "aria-label": "Exposure",
    min: -20,
    max: 20,
    step: 1,
    defaultValue: 0,
    showIndicator: true,
    accent: "warning",
  },
  argTypes: {
    accent: {
      control: "select",
      options: ["primary", "warning", "destructive", "success", "info", "foreground"],
    },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-72 items-center justify-center p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ExposureSlider>;

/** SmoothUI "Exposure Slider": drag the ruler, or focus it and use the arrow keys. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Exposure Slider" → the defaults: −20…20 in whole steps with the
 *   ring. The source's `accentColor` prop is the `accent` variant, so the
 *   colour follows the theme.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex w-full max-w-md flex-col items-center gap-4">
      <ExposureSlider aria-label="Exposure" />
      <figcaption className="text-xs text-muted-foreground">
        SmoothUI · Exposure Slider
      </figcaption>
    </figure>
  ),
};

/** Photographic stops, with a formatted `aria-valuetext`. */
export const Stops: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState(0);
    const format = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-3">
        <ExposureSlider
          aria-label="Exposure compensation"
          min={-3}
          max={3}
          step={1 / 3}
          value={value}
          onValueChange={setValue}
          formatValue={format}
          accent="primary"
        />
        <p className="text-sm text-muted-foreground">{format(value)} EV</p>
      </div>
    );
  },
};

export const WithoutIndicator: Story = {
  args: { showIndicator: false },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 5 },
};

export const RightToLeft: Story = {
  args: { dir: "rtl" },
};
