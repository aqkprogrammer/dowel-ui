import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { DEFAULT_ROTATOR_TESTIMONIALS, TestimonialRotatorBlock } from "./testimonial-rotator";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof TestimonialRotatorBlock> = {
  title: "Blocks/Testimonial rotator",
  component: TestimonialRotatorBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof TestimonialRotatorBlock>;

/** Placeholder portraits, in stories only. */
const withAvatars = DEFAULT_ROTATOR_TESTIMONIALS.map((testimonial, index) => ({
  ...testimonial,
  avatarSrc: `https://picsum.photos/seed/dowel-rotator-${String(index)}/96/96`,
}));

/**
 * SmoothUI "Testimonials 1": rotates every five seconds while the active indicator fills.
 * Hover or focus pauses it; the button stops it.
 */
export const Default: Story = {
  args: { testimonials: withAvatars },
};

/** Every source item: SmoothUI "Testimonials 1" (Testimonials Simple). */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <TestimonialRotatorBlock testimonials={withAvatars} />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Testimonials 1 — Testimonials Simple
      </figcaption>
    </figure>
  ),
};

/** No timer: indicators and arrow keys only. */
export const Manual: Story = {
  args: {
    testimonials: withAvatars,
    autoPlay: false,
    showHeading: true,
    heading: "Kind words",
  },
};
