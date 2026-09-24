import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heart } from "lucide-react";
import { useState } from "react";

import { Rating } from "./rating";

const meta = {
  title: "Form/Rating",
  component: Rating,
  args: {
    defaultValue: 3,
    max: 5,
    allowHalf: false,
    readOnly: false,
    disabled: false,
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    max: { control: { type: "range", min: 1, max: 10, step: 1 } },
    icon: { control: false },
    value: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Point at the start or end half of a star to choose it by half. */
export const HalfStars: Story = {
  args: { allowHalf: true, defaultValue: 3.5, size: "lg" },
};

/** Any fraction, read as "4.3 out of 5". Nothing can be chosen. */
export const ReadOnly: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-2">
      <Rating readOnly value={4.3} size="sm" />
      <span className="text-sm text-muted-foreground">4.3 · 1,284 reviews</span>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid justify-items-start gap-4">
      <Rating size="sm" defaultValue={2} aria-label="Small rating" />
      <Rating size="md" defaultValue={3} aria-label="Medium rating" />
      <Rating size="lg" defaultValue={4} aria-label="Large rating" />
    </div>
  ),
};

/** Any glyph can stand in for the star; it is drawn as an outline and a solid fill. */
export const CustomIcon: Story = {
  args: {
    icon: <Heart />,
    defaultValue: 2,
    getLabel: (value: number) => `${String(value)} ${value === 1 ? "heart" : "hearts"}`,
    "aria-label": "How much did you love it?",
  },
};

/** Controlled, with a visible label and a caption that follows the value. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState(0);
    const captions = ["Tap a star", "Poor", "Fair", "Good", "Great", "Excellent"];
    return (
      <div className="grid justify-items-center gap-2">
        <span id="controlled-rating" className="text-sm font-medium">
          How was your stay?
        </span>
        <Rating
          value={value}
          onValueChange={setValue}
          size="lg"
          aria-labelledby="controlled-rating"
        />
        <span className="text-sm text-muted-foreground">{captions[value]}</span>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
