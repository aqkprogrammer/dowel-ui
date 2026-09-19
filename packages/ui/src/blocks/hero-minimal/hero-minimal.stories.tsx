import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { HeroMinimalBlock } from "./hero-minimal";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof HeroMinimalBlock> = {
  title: "Blocks/Hero minimal",
  component: HeroMinimalBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The headline's letters draw together as the block scrolls into view. */
export const Default: Story = {};

/** The source's layout and copy, captioned with its name. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <HeroMinimalBlock
        title="Less is more"
        description="Simple, elegant components that speak for themselves."
        action={{ label: "Explore components", href: "#" }}
      />
      <figcaption className="px-4 text-sm text-muted-foreground">SmoothUI Hero 6</figcaption>
    </figure>
  ),
};

/** The arrow follows reading direction. */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <HeroMinimalBlock
        {...args}
        title="الأقل هو الأكثر"
        description="مكونات بسيطة وأنيقة تتحدث عن نفسها."
        action={{ label: "استكشف المكونات", href: "#" }}
      />
    </div>
  ),
};
