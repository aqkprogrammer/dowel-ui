import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { LightBeams } from "./light-beams";

const meta = {
  title: "Effects/Light Beams",
  component: LightBeams,
  args: {
    origin: "top",
    rays: 12,
    spread: 70,
    intensity: 0.5,
    blur: 14,
    speed: 1,
    blend: "normal",
  },
  argTypes: {
    origin: { control: "select", options: ["top", "top-left", "top-right", "center"] },
    rays: { control: { type: "range", min: 3, max: 32, step: 1 } },
    spread: { control: { type: "range", min: 20, max: 180, step: 5 } },
    intensity: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    blur: { control: { type: "range", min: 0, max: 40, step: 1 } },
    speed: { control: { type: "range", min: 0, max: 4, step: 0.25 } },
    color: { control: "select", options: ["primary", "info", "warning", "foreground"] },
    blend: { control: "inline-radio", options: ["normal", "screen"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LightBeams>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A launch hero lit from above. Best on a dark surface. */
export const Default: Story = {
  render: (args) => (
    <LightBeams {...args} className="dark min-h-[28rem] bg-background">
      <div className="flex min-h-[28rem] flex-col items-center justify-end gap-4 px-6 pb-16 text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-foreground">
          Version 1.0 is here
        </h2>
        <Button>See what is new</Button>
      </div>
    </LightBeams>
  ),
};

/** A warm, wide light from the corner. */
export const FromTheCorner: Story = {
  args: { origin: "top-left", color: "warning", spread: 110, rays: 16, intensity: 0.4 },
  render: (args) => <LightBeams {...args} className="dark h-80 bg-background" />,
};
