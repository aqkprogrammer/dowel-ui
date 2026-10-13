import type { Meta, StoryObj } from "@storybook/react-vite";

import { ImageTrail } from "./image-trail";

/** Generated tiles, so the story needs no image files. */
const TILES = [
  ["#5b5bd6", "#0ea5e9"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#0ea5e9"],
  ["#8b5cf6", "#ec4899"],
  ["#111827", "#5b5bd6"],
].map(
  ([from, to]) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from ?? ""}"/><stop offset="1" stop-color="${to ?? ""}"/></linearGradient></defs><rect width="320" height="400" fill="url(#g)"/><circle cx="230" cy="110" r="46" fill="white" fill-opacity="0.35"/></svg>`,
    )}`,
);

const meta = {
  title: "Effects/Image Trail",
  component: ImageTrail,
  args: {
    images: TILES,
    size: 160,
    ratio: 1.25,
    spacing: 80,
    lifetime: 900,
    tilt: 8,
    poolSize: 10,
    layer: "behind",
  },
  argTypes: {
    size: { control: { type: "range", min: 60, max: 320, step: 10 } },
    spacing: { control: { type: "range", min: 20, max: 240, step: 10 } },
    lifetime: { control: { type: "range", min: 300, max: 3000, step: 100 } },
    tilt: { control: { type: "range", min: 0, max: 30, step: 1 } },
    layer: { control: "inline-radio", options: ["behind", "above"] },
    images: { table: { disable: true } },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ImageTrail>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sweep the mouse across the section. */
export const Default: Story = {
  render: (args) => (
    <ImageTrail {...args} className="min-h-[28rem] bg-background">
      <div className="grid min-h-[28rem] place-items-center px-6 text-center">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Studio
          </p>
          <h2 className="mt-2 text-5xl font-semibold tracking-tight text-foreground">
            Selected work
          </h2>
        </div>
      </div>
    </ImageTrail>
  ),
};
