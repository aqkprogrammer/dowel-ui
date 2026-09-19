import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Clock, Download, MessageCircle, Settings, Users, Zap } from "lucide-react";

import { FaqTabbedGridBlock } from "./faq-tabbed-grid";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[72rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof FaqTabbedGridBlock> = {
  title: "Blocks/FAQ tabbed grid",
  component: FaqTabbedGridBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof FaqTabbedGridBlock>;

/** SmoothUI "FAQ 1": category tabs with a sliding underline over a grid of answers. */
export const Default: Story = {};

/** Every source item: SmoothUI "FAQ 1" (Faqs Grid), with its default content. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <FaqTabbedGridBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI FAQ 1 — Faqs Grid
      </figcaption>
    </figure>
  ),
};

/** Icons per question, from the consuming app's icon set. */
export const WithIcons: Story = {
  args: {
    categories: [
      {
        id: "start",
        name: "Getting started",
        items: [
          {
            question: "How do I install it?",
            answer: "Run the init command.",
            icon: <Download />,
          },
          { question: "Is setup quick?", answer: "About a minute.", icon: <Zap /> },
          {
            question: "Can I configure it?",
            answer: "Through one JSON file.",
            icon: <Settings />,
          },
        ],
      },
      {
        id: "help",
        name: "Help",
        items: [
          {
            question: "Where do I ask?",
            answer: "In the discussions.",
            icon: <MessageCircle />,
          },
          { question: "Is there a team plan?", answer: "Yes.", icon: <Users /> },
          { question: "How fast do you reply?", answer: "Within a day.", icon: <Clock /> },
        ],
      },
    ],
  },
};
