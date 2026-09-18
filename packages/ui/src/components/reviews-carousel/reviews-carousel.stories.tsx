import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ReviewsCarousel, type Review } from "./reviews-carousel";

const reviews = [
  {
    id: 1,
    author: "Sarah Johnson",
    title: "Frontend Developer",
    body: "It has completely changed how I build interfaces. The motion is calm, the components are well designed, and the documentation is excellent.",
  },
  {
    id: 2,
    author: "Michael Chen",
    title: "UI/UX Designer",
    body: "I have used it on my latest project and the quality shows. Transitions feel natural and the API is intuitive.",
  },
  {
    id: 3,
    author: "Emily Rodriguez",
    title: "Full Stack Developer",
    body: "The best part is how easy it is to customise. Polished, animated interfaces without hours of implementation detail.",
  },
  {
    id: 4,
    author: "David Kim",
    title: "Product Engineer",
    body: "As someone who values both aesthetics and performance, it hits the balance. Fast, and it looks good.",
  },
  {
    id: 5,
    author: "Lisa Anderson",
    title: "Creative Director",
    body: "The carousel is the standout. The stacked cards make stepping through feedback feel deliberate.",
  },
] satisfies Review[];

function Initials({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
    >
      {name
        .split(" ")
        .map((part) => part[0])
        .join("")}
    </span>
  );
}

const meta = {
  title: "Display/Reviews Carousel",
  component: ReviewsCarousel,
  args: {
    reviews,
    loop: false,
    showNavigation: true,
    showIndicators: true,
    autoPlay: false,
    autoPlayInterval: 5000,
  },
  argTypes: {
    reviews: { control: false },
  },
} satisfies Meta<typeof ReviewsCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SmoothUI "Reviews Carousel": five testimonials in a stack, at 300px tall. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Reviews Carousel" demo → the defaults: buttons, indicators, hard
 *   stops at the ends.
 * - Its `autoPlay` / `autoPlayInterval` props → `autoPlay`, which here also
 *   renders the APG stop/start control and pauses on hover and focus.
 * - Its `showNavigation={false}` / `showIndicators={false}` → the same props;
 *   with both off the carousel itself takes focus for the arrow keys.
 * - Its `excludeIds` prop is not carried over: filter `reviews` before passing
 *   them in.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-full flex-col gap-10">
      <figure className="flex flex-col gap-2">
        <ReviewsCarousel reviews={reviews} aria-label="Reviews (default)" />
        <figcaption className="text-center text-xs text-muted-foreground">
          SmoothUI Reviews Carousel — default
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <ReviewsCarousel
          reviews={reviews}
          autoPlay
          autoPlayInterval={4000}
          aria-label="Reviews (autoplay)"
        />
        <figcaption className="text-center text-xs text-muted-foreground">
          SmoothUI Reviews Carousel — autoPlay
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <ReviewsCarousel
          reviews={reviews}
          showNavigation={false}
          showIndicators={false}
          aria-label="Reviews (no controls)"
        />
        <figcaption className="text-center text-xs text-muted-foreground">
          SmoothUI Reviews Carousel — no navigation or indicators (use the arrow keys)
        </figcaption>
      </figure>
    </div>
  ),
};

export const WithAvatars: Story = {
  args: {
    reviews: reviews.map((review) => ({
      ...review,
      avatar: <Initials name={review.author} />,
    })),
  },
};

export const Looping: Story = {
  args: { loop: true },
};

export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [index, setIndex] = useState(2);
    return (
      <div className="flex w-full flex-col items-center gap-2">
        <ReviewsCarousel reviews={reviews} index={index} onIndexChange={setIndex} />
        <p className="text-sm text-muted-foreground">Showing review {index + 1}</p>
      </div>
    );
  },
};

export const RightToLeft: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div dir="rtl" className="w-full">
      <ReviewsCarousel reviews={reviews} />
    </div>
  ),
};
