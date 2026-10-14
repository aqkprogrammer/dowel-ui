import type { Meta, StoryObj } from "@storybook/react-vite";

import { ImageRing, type ImageRingItem } from "./image-ring";

/** Generated gradient tiles, so the story needs no image files. */
function tile(hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="440"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${String(hue)} 70% 60%)"/><stop offset="1" stop-color="hsl(${String((hue + 50) % 360)} 70% 35%)"/></linearGradient></defs><rect width="320" height="440" fill="url(#g)"/><text x="24" y="410" font-family="system-ui" font-size="28" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const names = [
  "Dunes",
  "Harbour",
  "Orchard",
  "Glacier",
  "Canyon",
  "Lagoon",
  "Meadow",
  "Summit",
  "Delta",
  "Fjord",
];
const images: ImageRingItem[] = names.map((name, i) => ({
  src: tile(i * 36, name),
  alt: `${name}, an abstract gradient`,
}));

const meta = {
  title: "Display/Image Ring",
  component: ImageRing,
  args: { label: "Places", images },
  argTypes: { images: { control: false } },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ImageRing>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Turns slowly; hover or focus to hold it, drag or use the arrow keys to turn it. */
export const Default: Story = {};

/** Smaller tiles and a stronger tilt. */
export const Tilted: Story = { args: { itemWidth: 110, itemHeight: 150, tilt: -16 } };
