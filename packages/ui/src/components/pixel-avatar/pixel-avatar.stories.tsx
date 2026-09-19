import type { Meta, StoryObj } from "@storybook/react-vite";

import { PixelAvatar } from "./pixel-avatar";

const meta: Meta<typeof PixelAvatar> = {
  title: "Display/Pixel Avatar",
  component: PixelAvatar,
  args: { seed: "Harper", size: 80, cells: 6, animated: true, shape: "circle" },
  argTypes: {
    shape: { control: "inline-radio", options: ["circle", "square"] },
    cells: { control: { type: "range", min: 3, max: 12, step: 1 } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const NAMES = ["Harper", "Lucas", "Olivia", "Benjamin", "Charlotte"];

/** SmoothUI "Agent Avatar": the five seeded agents from its demo. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-muted-foreground">SmoothUI — Agent Avatar</p>
      <div className="flex flex-wrap items-center gap-6">
        {NAMES.map((name) => (
          <figure key={name} className="flex flex-col items-center gap-2">
            <PixelAvatar seed={name} size={80} />
            <figcaption className="text-sm text-muted-foreground">{name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  ),
};

export const ShapesAndDensity: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-6">
      <PixelAvatar seed="Olivia" size={64} shape="square" />
      <PixelAvatar seed="Olivia" size={64} cells={10} />
      <PixelAvatar seed="Olivia" size={32} animated={false} />
    </div>
  ),
};
