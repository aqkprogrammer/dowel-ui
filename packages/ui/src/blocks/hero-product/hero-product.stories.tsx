import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { HeroProductBlock } from "./hero-product";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof HeroProductBlock> = {
  title: "Blocks/Hero product",
  component: HeroProductBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover the screenshot: it tilts a couple of degrees (not under reduced motion). */
export const Default: Story = {
  args: {
    image: {
      src: "https://picsum.photos/seed/dowel-hero-product/1440/900",
      alt: "A product dashboard",
      width: 1440,
      height: 900,
    },
  },
};

/** The source's layout and copy, captioned with its name. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <HeroProductBlock
        announcement={{ label: "New animation library", href: "#" }}
        title="Build Beautiful UIs, Effortlessly"
        description="Craft. Build. Ship Modern Websites With Smooth Animations."
        primaryAction={{ label: "Start Building", href: "#" }}
        secondaryAction={{ label: "Watch Video", href: "#" }}
        image={{
          src: "https://picsum.photos/seed/dowel-hero-2/1440/920",
          alt: "A desktop application interface",
        }}
      />
      <figcaption className="px-4 text-sm text-muted-foreground">SmoothUI Hero 2</figcaption>
    </figure>
  ),
};

/** Without an image, a token gradient holds the screenshot's place. */
export const Placeholder: Story = {};

export const WithoutAnnouncement: Story = {
  args: { announcement: null, secondaryAction: null },
};
