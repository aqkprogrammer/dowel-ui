import type { Meta, StoryObj } from "@storybook/react-vite";

import { PATTERN_BACKGROUND_PATTERNS, PatternBackground } from "./pattern-background";

const meta = {
  title: "Effects/Pattern Background",
  component: PatternBackground,
  args: { pattern: "dots", size: 24, thickness: 1, opacity: 1, drift: false, fade: "none" },
  argTypes: {
    pattern: { control: "select", options: [...PATTERN_BACKGROUND_PATTERNS] },
    size: { control: { type: "range", min: 8, max: 64, step: 2 } },
    thickness: { control: { type: "range", min: 0.5, max: 4, step: 0.5 } },
    opacity: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    color: {
      control: "select",
      options: ["border", "muted-foreground", "primary", "foreground"],
    },
    fade: { control: "inline-radio", options: ["none", "edges", "top", "bottom"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PatternBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A dot grid behind a hero, faded at the edges. */
export const Default: Story = {
  args: { fade: "edges" },
  render: (args) => (
    <PatternBackground {...args} className="min-h-96 bg-background">
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          Quiet texture, zero cost
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          One CSS gradient in a theme colour. It renders on the server and never repaints.
        </p>
      </div>
    </PatternBackground>
  ),
};

/** Every pattern, side by side. */
export const AllPatterns: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {PATTERN_BACKGROUND_PATTERNS.map((pattern) => (
        <PatternBackground
          key={pattern}
          {...args}
          pattern={pattern}
          opacity={pattern === "noise" ? 0.25 : 1}
          className="h-36 rounded-xl border border-border bg-card"
        >
          <p className="p-3 font-mono text-xs text-muted-foreground">{pattern}</p>
        </PatternBackground>
      ))}
    </div>
  ),
};

/** A grid drifting under an editor canvas. */
export const Drifting: Story = {
  args: { pattern: "grid", drift: true, size: 32, color: "muted-foreground", opacity: 0.25 },
  render: (args) => (
    <PatternBackground {...args} className="h-80 bg-background">
      <div className="grid h-80 place-items-center">
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm">
          Drop a component here
        </div>
      </div>
    </PatternBackground>
  ),
};
