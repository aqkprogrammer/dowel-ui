import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { HeroSpotlightBlock } from "./hero-spotlight";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof HeroSpotlightBlock> = {
  title: "Blocks/Hero spotlight",
  component: HeroSpotlightBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Dark in either theme. The beam opens once, when the block scrolls into view. */
export const Default: Story = {};

/** The source's layout and copy, captioned with its name. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <HeroSpotlightBlock
        title="Build stunning interfaces"
        description="Beautifully animated components built with React, Motion, and Tailwind CSS. Open source and ready for production."
        primaryAction={{ label: "Get Started", href: "#" }}
        secondaryAction={{ label: "Documentation", href: "#" }}
      />
      <figcaption className="px-4 text-sm text-muted-foreground">SmoothUI Hero 5</figcaption>
    </figure>
  ),
};

/** Scroll down: the entrance waits until the block is in view. */
export const BelowTheFold: Story = {
  render: (args) => (
    <div>
      <div className="flex h-[120vh] items-center justify-center text-muted-foreground">
        Scroll down
      </div>
      <HeroSpotlightBlock {...args} />
    </div>
  ),
};
