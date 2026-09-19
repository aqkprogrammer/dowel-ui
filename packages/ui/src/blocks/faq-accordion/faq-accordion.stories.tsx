import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { FaqAccordionBlock } from "./faq-accordion";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof FaqAccordionBlock> = {
  title: "Blocks/FAQ accordion",
  component: FaqAccordionBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof FaqAccordionBlock>;

/** SmoothUI "FAQ 2": bordered question cards that rise in, one answer open at a time. */
export const Default: Story = {};

/** Every source item: SmoothUI "FAQ 2" (Faqs Accordion), with its default content. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <FaqAccordionBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI FAQ 2 — Faqs Accordion
      </figcaption>
    </figure>
  ),
};

/** Your own questions, all closed to begin with. */
export const CustomContent: Story = {
  args: {
    heading: "Shipping and returns",
    description: "Everything about getting an order to you, and back if it is not right.",
    defaultOpen: null,
    items: [
      { question: "How long does delivery take?", answer: "Two to four working days." },
      { question: "Can I return an item?", answer: "Yes, within 30 days, unused." },
      {
        question: "Do you ship internationally?",
        answer: "To most of Europe and North America.",
      },
    ],
  },
};

/** Under a page `h1`, the section heading can be level 2 (default) or any other. */
export const HeadingLevelOne: Story = {
  args: { headingLevel: 1 },
};
