import type { Meta, StoryObj } from "@storybook/react-vite";
import { Circle, Hexagon, Square, Star, Triangle } from "lucide-react";
import { useState, type ReactNode } from "react";

import { MagneticSelect, type MagneticSelectOption } from "./magnetic-select";

const options = (count: number): MagneticSelectOption[] =>
  Array.from({ length: count }, (_, index) => ({
    value: `option-${String(index + 1)}`,
    label: `Option ${String(index + 1)}`,
  }));

const SEVEN = options(7);

const meta: Meta<typeof MagneticSelect> = {
  title: "Form/Magnetic Select",
  component: MagneticSelect,
  args: {
    "aria-label": "Shape",
    options: SEVEN,
    defaultValue: "option-4",
    pull: 55,
    bounce: 55,
    give: 50,
    chipSize: 44,
    stroke: false,
  },
  argTypes: {
    pull: { control: { type: "range", min: 0, max: 100, step: 5 } },
    bounce: { control: { type: "range", min: 0, max: 100, step: 5 } },
    give: { control: { type: "range", min: 0, max: 100, step: 5 } },
    chipSize: { control: { type: "range", min: 24, max: 72, step: 2 } },
    options: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="grid min-h-80 place-items-center rounded-xl bg-muted p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MagneticSelect>;

/** bencho "Magnetic select", Large: seven chips, the centre one chosen. Click or use the arrow keys. */
export const Default: Story = {};

function Caption({ source, children }: { source: string; children: ReactNode }) {
  return (
    <figure className="grid justify-items-center gap-3">
      {children}
      <figcaption className="text-center text-xs text-muted-foreground">{source}</figcaption>
    </figure>
  );
}

/**
 * Every workbench state of the source block.
 *
 * - Size Large / Small → 7 or 3 `options` (three form the triangle).
 * - Stroke → `stroke`.
 * - Pull, Bounce, Give sliders → the props of the same names (0–100).
 * - The iridescent orb photo → `image` per option (a placeholder here) or the
 *   default token gradient.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
      <Caption source="Magnetic select — Large (default)">
        <MagneticSelect aria-label="Large" options={SEVEN} defaultValue="option-4" />
      </Caption>
      <Caption source="Magnetic select — Small (3 chips)">
        <MagneticSelect aria-label="Small" options={options(3)} defaultValue="option-1" />
      </Caption>
      <Caption source="Magnetic select — Stroke on">
        <MagneticSelect aria-label="Stroke" options={SEVEN} defaultValue="option-2" stroke />
      </Caption>
      <Caption source="Pull 0 / Bounce 0 (critically damped)">
        <MagneticSelect
          aria-label="Weak"
          options={SEVEN}
          defaultValue="option-4"
          pull={0}
          bounce={0}
        />
      </Caption>
      <Caption source="Pull 100 / Bounce 100">
        <MagneticSelect
          aria-label="Strong"
          options={SEVEN}
          defaultValue="option-4"
          pull={100}
          bounce={100}
        />
      </Caption>
      <Caption source="Give 100 (loose, slow settle)">
        <MagneticSelect aria-label="Loose" options={SEVEN} defaultValue="option-4" give={100} />
      </Caption>
      <Caption source="Selected image (placeholder photo)">
        <MagneticSelect
          aria-label="With image"
          defaultValue="option-4"
          options={SEVEN.map((option) => ({
            ...option,
            image: `https://picsum.photos/seed/${option.value}/200/200`,
          }))}
        />
      </Caption>
    </div>
  ),
};

/** Chips can carry content in every state — icons, initials, swatches. */
export const WithContent: Story = {
  args: {
    "aria-label": "Shape",
    defaultValue: "circle",
    stroke: true,
    options: [
      { value: "circle", label: "Circle", content: <Circle className="size-4" /> },
      { value: "square", label: "Square", content: <Square className="size-4" /> },
      { value: "triangle", label: "Triangle", content: <Triangle className="size-4" /> },
      { value: "hexagon", label: "Hexagon", content: <Hexagon className="size-4" /> },
      { value: "star", label: "Star", content: <Star className="size-4" /> },
    ],
  },
};

/** A full two-ring honeycomb: nineteen chips, the most it packs. */
export const Nineteen: Story = {
  args: { options: options(19), defaultValue: "option-10", chipSize: 36 },
};

/** Controlled, with the value shown beside it. */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState("option-1");
    return (
      <div className="grid justify-items-center gap-4">
        <MagneticSelect {...args} value={value} onValueChange={setValue} />
        <output className="text-sm text-muted-foreground">Selected: {value}</output>
      </div>
    );
  },
};

/** Right-to-left: the honeycomb mirrors, pushes and tilts flip, ArrowRight moves back. */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <MagneticSelect {...args} />
    </div>
  ),
};
