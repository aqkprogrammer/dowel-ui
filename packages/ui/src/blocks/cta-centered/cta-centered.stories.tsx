import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { CtaCenteredBlock } from "./cta-centered";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof CtaCenteredBlock> = {
  title: "Blocks/CTA centered",
  component: CtaCenteredBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The copy rises in once, when the band scrolls into view. */
export const Default: Story = {};

/** The source's layout and copy, captioned with its name. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <CtaCenteredBlock
        title="Ready to build something amazing?"
        description="Start building with beautifully animated components today. Free, open source, and ready for production."
        primaryAction={{ label: "Get Started", href: "#" }}
        secondaryAction={{ label: "Learn More", href: "#" }}
      />
      <figcaption className="px-4 text-sm text-muted-foreground">SmoothUI CTA 1</figcaption>
    </figure>
  ),
};

export const SingleAction: Story = {
  args: { secondaryAction: null },
};
