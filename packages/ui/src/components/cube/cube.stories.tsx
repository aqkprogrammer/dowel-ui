import type { Meta, StoryObj } from "@storybook/react-vite";

import { Cube, type CubeFace } from "./cube";

const face = (label: string, body: string, tone: string): CubeFace => ({
  label,
  content: (
    <div className={`flex size-full flex-col justify-end gap-1 p-5 ${tone}`}>
      <p className="text-lg font-semibold">{label}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  ),
});

const faces = [
  face(
    "Fast",
    "Ships in milliseconds, not minutes.",
    "bg-linear-to-br from-primary/15 to-transparent",
  ),
  face(
    "Accessible",
    "Keyboard, screen reader and reduced motion, built in.",
    "bg-linear-to-br from-info/15 to-transparent",
  ),
  face(
    "Themed",
    "Every colour is a token you own.",
    "bg-linear-to-br from-success/15 to-transparent",
  ),
  face(
    "Yours",
    "Installed as source, not a black box.",
    "bg-linear-to-br from-warning/15 to-transparent",
  ),
];

const meta = {
  title: "Display/Cube",
  component: Cube,
  args: { label: "Why Dowel", faces, size: 240 },
  argTypes: { faces: { control: false } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Cube>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Turn it with the buttons, the arrow keys on the cube, or a drag. */
export const Default: Story = {};

/** Turns every three seconds; hover or focus to hold it. */
export const AutoRotate: Story = { args: { autoRotate: 3000 } };

/** Six faces: Up and Down reach the top and bottom. */
export const SixFaces: Story = {
  args: {
    faces: [
      ...faces,
      face("Top", "The lid.", "bg-muted"),
      face("Bottom", "The base.", "bg-muted"),
    ],
  },
};
