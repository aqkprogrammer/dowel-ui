import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import {
  DEFAULT_STAR_GRID_TESTIMONIALS,
  TestimonialStarGridBlock,
} from "./testimonial-star-grid";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof TestimonialStarGridBlock> = {
  title: "Blocks/Testimonial star grid",
  component: TestimonialStarGridBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof TestimonialStarGridBlock>;

/** Placeholder portraits, in stories only. */
const withAvatars = DEFAULT_STAR_GRID_TESTIMONIALS.map((testimonial, index) => ({
  ...testimonial,
  avatarSrc: `https://picsum.photos/seed/dowel-review-${String(index)}/96/96`,
}));

/** SmoothUI "Testimonials 3": cards cascade in, stars pop one after another. */
export const Default: Story = {
  args: { testimonials: withAvatars },
};

/** Every source item: SmoothUI "Testimonials 3" (Testimonials Stars). */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <TestimonialStarGridBlock testimonials={withAvatars} />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Testimonials 3 — Testimonials Stars
      </figcaption>
    </figure>
  ),
};

/** Without images: initials stand in. */
export const Initials: Story = {};
