import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ImageAccordion, type ImageAccordionItem } from "./image-accordion";

/** Neutral placeholders from theme tokens — no photographs. */
const gradients = [
  "from-primary to-accent",
  "from-info to-muted",
  "from-success to-secondary",
  "from-warning to-muted",
  "from-destructive to-accent",
];

const places = [
  { title: "Dunes", description: "Wind-cut ridges at first light" },
  { title: "Harbour", description: "Boats coming in at dusk" },
  { title: "Meadow", description: "Long grass after rain" },
  { title: "Ridge", description: "The last climb before the summit" },
  { title: "Orchard", description: "Rows of pear trees in bloom" },
];

const items: ImageAccordionItem[] = places.map((place, index) => ({
  id: place.title,
  ...place,
  media: <div className={`size-full bg-linear-to-br ${gradients[index] ?? ""}`} />,
}));

// The wrappers take a width rather than `w-full`: Storybook centres the story
// in a box that is only as wide as its content, so `w-full` resolved to the
// narrowest the accordion could be and every panel, the open one included,
// sat at its minimum.
const meta = {
  title: "Display/Image Accordion",
  component: ImageAccordion,
  args: {
    items,
    activateOn: "hover",
    expandedSize: 4,
    orientation: "horizontal",
    headingLevel: 3,
  },
  argTypes: {
    items: { control: false },
    activateOn: { control: "inline-radio", options: ["hover", "click"] },
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
  },
  render: (args) => (
    <div className="w-3xl max-w-full">
      <ImageAccordion {...args} />
    </div>
  ),
} satisfies Meta<typeof ImageAccordion>;

export default meta;
type Story = StoryObj<typeof meta>;

/** bencho "Image accordion": five panels; point at, focus or press one to open it. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - bencho "Image accordion" (a parked block) → the defaults. The live block
 *   was not reachable on bencho.dev (no parked blocks are listed and search
 *   finds none), so this is the well-known horizontal image-accordion pattern,
 *   designed from scratch: panels share the row, the open one grows, closed
 *   ones show their title on end. Photographs are replaced with gradients.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex w-3xl max-w-full flex-col gap-2">
      <ImageAccordion items={items} />
      <figcaption className="text-xs text-muted-foreground">bencho Image accordion</figcaption>
    </figure>
  ),
};

export const WithImages: Story = {
  args: {
    items: places.map((place) => ({
      id: place.title,
      ...place,
      image: `https://picsum.photos/seed/${place.title.toLowerCase()}/600/400`,
      imageAlt: place.description,
    })),
  },
};

export const ClickToOpen: Story = {
  args: { activateOn: "click" },
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div className="w-sm max-w-full">
      <ImageAccordion {...args} />
    </div>
  ),
};

export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [active, setActive] = useState(2);
    return (
      <div className="flex w-3xl max-w-full flex-col gap-2">
        <ImageAccordion items={items} activeIndex={active} onActiveIndexChange={setActive} />
        <p className="text-sm text-muted-foreground">Open: {places[active]?.title}</p>
      </div>
    );
  },
};

export const RightToLeft: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div dir="rtl" className="w-3xl max-w-full">
      <ImageAccordion items={items} />
    </div>
  ),
};
