import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { CtaSplitImageBlock } from "./cta-split-image";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof CtaSplitImageBlock> = {
  title: "Blocks/CTA split image",
  component: CtaSplitImageBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Copy and image slide in from either side, following reading direction. */
export const Default: Story = {
  args: {
    image: {
      src: "https://picsum.photos/seed/dowel-cta-split/960/720",
      alt: "A preview of the component library",
      width: 960,
      height: 720,
    },
  },
};

/** The source's layout and copy, captioned with its name. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <CtaSplitImageBlock
        title="Ship faster with animated components"
        description="Stop building UI from scratch. Use production-ready, beautifully animated components that work with your existing design system."
        primaryAction={{ label: "Browse Components", href: "#" }}
        secondaryAction={{ label: "View the source", href: "#" }}
        image={{
          src: "https://picsum.photos/seed/dowel-cta-2/960/720",
          alt: "Product preview showing animated UI components",
        }}
      />
      <figcaption className="px-4 text-sm text-muted-foreground">SmoothUI CTA 2</figcaption>
    </figure>
  ),
};

/** Without an image, a token gradient holds its place. */
export const Placeholder: Story = {};

/** In right-to-left text each half arrives from its own side. */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <CtaSplitImageBlock
        {...args}
        title="اشحن أسرع مع مكونات متحركة"
        description="توقف عن بناء الواجهات من الصفر."
        primaryAction={{ label: "تصفح المكونات", href: "#" }}
        secondaryAction={{ label: "اقرأ الوثائق", href: "#" }}
      />
    </div>
  ),
};
