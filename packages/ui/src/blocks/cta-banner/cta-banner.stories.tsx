import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { CtaBannerBlock } from "./cta-banner";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof CtaBannerBlock> = {
  title: "Blocks/CTA banner",
  component: CtaBannerBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The banner settles in once, when it scrolls into view. */
export const Default: Story = {};

/** The source's layout and copy, captioned with its name. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <CtaBannerBlock
        title="Start building today"
        description="Install any component with a single command."
        action={{ label: "Get Started", href: "#" }}
      />
      <figcaption className="px-4 text-sm text-muted-foreground">SmoothUI CTA 3</figcaption>
    </figure>
  ),
};

/** Narrow: the banner stacks below the md breakpoint. */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};
