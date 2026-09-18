import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { SwipeCarousel } from "./swipe-carousel";

/** Neutral placeholders from theme tokens, standing in for bencho's photographs. */
const placeholders = [
  "from-primary to-accent",
  "from-info to-muted",
  "from-success to-secondary",
  "from-warning to-muted",
  "from-destructive to-accent",
];

function placeholderCards(count = 5) {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`flex size-full items-end bg-linear-to-br p-4 text-sm font-medium text-foreground ${
        placeholders[index % placeholders.length] ?? ""
      }`}
    >
      Card {index + 1}
    </div>
  ));
}

const meta = {
  title: "Display/Swipe Carousel",
  component: SwipeCarousel,
  args: {
    cardWidth: "13rem",
    aspectRatio: 1.417,
    float: true,
  },
  render: (args) => <SwipeCarousel {...args}>{placeholderCards()}</SwipeCarousel>,
} satisfies Meta<typeof SwipeCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** bencho "Carousel": five cards on a ring. Swipe, tap a side card, or use the buttons and arrow keys. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - bencho "Carousel" → the defaults: five portrait cards (206 × 292 in the
 *   source, 13rem at a 1.417 ratio here) on a ring, each with its own resting
 *   tilt and a slow idle float that pauses while held. Its photographs are
 *   replaced with token gradients. The block had no buttons; they are added
 *   because a swipe is never the only way through.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex w-full flex-col items-center gap-2">
      <SwipeCarousel aria-label="bencho Carousel">{placeholderCards()}</SwipeCarousel>
      <figcaption className="text-xs text-muted-foreground">bencho Carousel</figcaption>
    </figure>
  ),
};

export const WithImages: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <SwipeCarousel aria-label="Photos">
      {["dune", "harbour", "meadow", "ridge", "orchard"].map((seed) => (
        <img key={seed} src={`https://picsum.photos/seed/${seed}/600/400`} alt={seed} />
      ))}
    </SwipeCarousel>
  ),
};

export const SevenCards: Story = {
  render: (args) => <SwipeCarousel {...args}>{placeholderCards(7)}</SwipeCarousel>,
};

export const Still: Story = {
  args: { float: false },
};

export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [index, setIndex] = useState(2);
    return (
      <div className="flex w-full flex-col items-center gap-2">
        <SwipeCarousel index={index} onIndexChange={setIndex}>
          {placeholderCards()}
        </SwipeCarousel>
        <p className="text-sm text-muted-foreground">Card {index + 1} in front</p>
      </div>
    );
  },
};

/** Under dir="rtl" the next card waits on the left, and a swipe to the right brings it forward. */
export const RightToLeft: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div dir="rtl" className="w-full">
      <SwipeCarousel>{placeholderCards()}</SwipeCarousel>
    </div>
  ),
};
