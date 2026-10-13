import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { ShaderBackground } from "./shader-background";
import { SHADER_BACKGROUND_PRESET_NAMES } from "./shader-background-presets";

const meta = {
  title: "Effects/Shader Background",
  component: ShaderBackground,
  args: {
    preset: "mesh-gradient",
    fade: "none",
    speed: 1,
    scale: 1,
    grain: 0.25,
    vignette: 0.3,
    resolution: 1,
  },
  argTypes: {
    preset: { control: "select", options: SHADER_BACKGROUND_PRESET_NAMES },
    attach: { control: "inline-radio", options: ["box", "viewport"] },
    fade: { control: "inline-radio", options: ["none", "edges", "bottom", "top"] },
    speed: { control: { type: "range", min: 0, max: 4, step: 0.25 } },
    scale: { control: { type: "range", min: 0.5, max: 2, step: 0.05 } },
    grain: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    vignette: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    resolution: { control: { type: "range", min: 0.25, max: 1, step: 0.05 } },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ShaderBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The theme's own colours, wandering behind a hero. */
export const Default: Story = {
  render: (args) => (
    <ShaderBackground {...args} className="min-h-[28rem]">
      <div className="flex min-h-[28rem] flex-col items-center justify-center gap-4 px-6 text-center">
        <h2 className="max-w-xl text-4xl font-semibold tracking-tight text-balance text-foreground">
          Ship the mood, not the megabytes
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          One fragment shader, no images. It follows the theme and stops when nobody is looking.
        </p>
        <Button>Start building</Button>
      </div>
    </ShaderBackground>
  ),
};

/** A landscape behind white type: dusk over the dunes. */
export const Dunes: Story = {
  args: { preset: "dunes" },
  render: (args) => (
    <ShaderBackground {...args} className="min-h-[28rem]">
      <div className="flex min-h-[28rem] flex-col justify-end gap-2 p-10">
        <p className="text-xs font-medium tracking-widest text-white/80 uppercase">
          Field notes
        </p>
        <h2 className="max-w-lg text-4xl font-semibold tracking-tight text-white">
          The quiet hour after the wind drops
        </h2>
      </div>
    </ShaderBackground>
  ),
};

/** Space, behind a centred call to action, faded out at the bottom of the section. */
export const Nebula: Story = {
  args: { preset: "nebula", fade: "bottom" },
  render: (args) => (
    <ShaderBackground {...args} className="min-h-[28rem] bg-background">
      <div className="flex min-h-[28rem] flex-col items-center justify-center gap-4 px-6 text-center">
        <h2 className="max-w-xl text-4xl font-semibold tracking-tight text-white">
          Further than the last release
        </h2>
        <Button>Read the changelog</Button>
      </div>
    </ShaderBackground>
  ),
};

/** Any preset re-dressed: the contour map in status colours, inside a card. */
export const CustomColours: Story = {
  args: { preset: "topography", colors: ["card", "border", "success", "foreground"] },
  parameters: { layout: "centered" },
  render: (args) => (
    <ShaderBackground
      {...args}
      className="w-[min(32rem,90vw)] rounded-2xl border border-border bg-card"
    >
      <div className="flex h-60 flex-col justify-end gap-1 p-6">
        <p className="text-xs font-medium tracking-widest text-success uppercase">Healthy</p>
        <p className="text-lg font-semibold text-card-foreground">All 12 regions serving</p>
      </div>
    </ShaderBackground>
  ),
};

/** Behind a whole page: the scene stays on screen while the content scrolls over it. */
export const PageBackground: Story = {
  args: { preset: "particle-ocean", attach: "viewport" },
  render: (args) => (
    <ShaderBackground {...args}>
      <header className="sticky top-0 border-b border-white/10 bg-black/30 px-6 py-3 text-sm font-medium text-white backdrop-blur">
        Northwind
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-24 px-6 py-24 text-white">
        {["Collect", "Understand", "Act"].map((step) => (
          <section key={step} className="flex min-h-[60vh] flex-col justify-center gap-3">
            <h2 className="text-4xl font-semibold tracking-tight">{step}</h2>
            <p className="max-w-md text-white/75">
              The background is pinned to the viewport and drawn once per frame at screen size,
              however long the page grows.
            </p>
          </section>
        ))}
      </main>
    </ShaderBackground>
  ),
};
