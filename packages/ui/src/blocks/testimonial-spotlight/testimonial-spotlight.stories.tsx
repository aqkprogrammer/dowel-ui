import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import {
  DEFAULT_SPOTLIGHT_TESTIMONIALS,
  TestimonialSpotlightBlock,
} from "./testimonial-spotlight";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[80rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof TestimonialSpotlightBlock> = {
  title: "Blocks/Testimonial spotlight",
  component: TestimonialSpotlightBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof TestimonialSpotlightBlock>;

/** Placeholder portraits, in stories only. */
const withAvatars = DEFAULT_SPOTLIGHT_TESTIMONIALS.map((testimonial, index) => ({
  ...testimonial,
  avatarSrc: `https://picsum.photos/seed/dowel-spotlight-${String(index)}/96/96`,
}));

/** SmoothUI "Testimonials 2": step through the stack; each quote blurs in word by word. */
export const Default: Story = {
  args: { testimonials: withAvatars },
};

/** Every source item: SmoothUI "Testimonials 2" (Testimonials Grid). */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <TestimonialSpotlightBlock testimonials={withAvatars} />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Testimonials 2 — Testimonials Grid
      </figcaption>
    </figure>
  ),
};

/** Without images: initials stand in. */
export const Initials: Story = {};
