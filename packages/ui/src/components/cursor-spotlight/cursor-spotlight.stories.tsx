import type { Meta, StoryObj } from "@storybook/react-vite";

import { PatternBackground } from "@/components/pattern-background";

import { CursorSpotlight } from "./cursor-spotlight";

const meta = {
  title: "Effects/Cursor Spotlight",
  component: CursorSpotlight,
  args: { mode: "light", radius: 220 },
  argTypes: {
    mode: { control: "inline-radio", options: ["light", "reveal"] },
    radius: { control: { type: "range", min: 40, max: 600, step: 10 } },
    intensity: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    color: { control: "select", options: ["primary", "info", "warning", "foreground"] },
    layer: { control: "inline-radio", options: ["behind", "above"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CursorSpotlight>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A glow that follows the mouse across a dark section. */
export const Default: Story = {
  render: (args) => (
    <CursorSpotlight {...args} className="dark min-h-96 bg-background">
      <div className="grid min-h-96 place-items-center px-6 text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-foreground">
          Follow the light
        </h2>
      </div>
    </CursorSpotlight>
  ),
};

/** A flashlight over a dot grid: everything dims but the circle under the mouse. */
export const Reveal: Story = {
  args: { mode: "reveal", radius: 180 },
  render: (args) => (
    <CursorSpotlight {...args} className="min-h-96 bg-background">
      <PatternBackground pattern="dots" color="muted-foreground" className="min-h-96">
        <div className="grid min-h-96 place-items-center px-6 text-center">
          <p className="max-w-sm text-lg text-foreground">
            Point anywhere. Nothing is hidden when you are not pointing.
          </p>
        </div>
      </PatternBackground>
    </CursorSpotlight>
  ),
};
