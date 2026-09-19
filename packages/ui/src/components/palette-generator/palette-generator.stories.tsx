import type { Meta, StoryObj } from "@storybook/react-vite";

import { PaletteGenerator, type PaletteGenerate } from "./palette-generator";

const meta: Meta<typeof PaletteGenerator> = {
  title: "Effects/Palette Generator",
  component: PaletteGenerator,
  args: {
    count: 4,
    morph: 50,
    radius: 14,
    stroke: false,
  },
  argTypes: {
    count: { control: { type: "range", min: 3, max: 5, step: 1 } },
    morph: { control: { type: "range", min: 0, max: 100, step: 5 } },
    radius: { control: { type: "range", min: 0, max: 29, step: 1 } },
    generate: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="rounded-xl bg-muted p-10">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof PaletteGenerator>;

/** The default generator ramps between two neighbouring theme hues. */
export const Default: Story = {};

const HUE_NAMES = ["red", "orange", "yellow", "green", "teal", "blue", "violet", "pink"];

/**
 * The source's free OKLCH ramp: one random hue family, light to dark, drifting
 * a little in hue. Colours are data, so a generator may build them from numbers.
 */
const oklchRamp: PaletteGenerate = (count, random) => {
  const hue = random() * 360;
  const drift = 20 + random() * 50;
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const lightness = 0.9 - t * 0.55;
    const chroma = 0.06 + Math.sin(t * Math.PI) * 0.1;
    const h = (hue + t * drift) % 360;
    const name = HUE_NAMES[Math.round(h / 45) % 8] ?? "hue";
    return {
      value: `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${h.toFixed(1)})`,
      name: `${t < 0.34 ? "light " : t > 0.66 ? "dark " : ""}${name}`,
    };
  });
};

/** bencho "Palette": Colours 3–5, Morph, Corner and Stroke, and its OKLCH ramp. */
export const Gallery: Story = {
  decorators: [(Story) => <Story />],
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 rounded-xl bg-muted p-10">
      <figure className="flex flex-col items-center gap-2">
        <PaletteGenerator generate={oklchRamp} />
        <figcaption className="text-xs text-muted-foreground">
          bencho Palette (OKLCH ramp, via `generate`)
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <PaletteGenerator />
        <figcaption className="text-xs text-muted-foreground">
          Theme-token ramp (default)
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <PaletteGenerator count={3} morph={100} radius={29} stroke generate={oklchRamp} />
        <figcaption className="text-xs text-muted-foreground">
          Colours 3 · Morph 100 · Corner 29 · Stroke
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <PaletteGenerator count={5} morph={0} radius={0} generate={oklchRamp} />
        <figcaption className="text-xs text-muted-foreground">
          Colours 5 · Morph 0 · Corner 0
        </figcaption>
      </figure>
    </div>
  ),
};
