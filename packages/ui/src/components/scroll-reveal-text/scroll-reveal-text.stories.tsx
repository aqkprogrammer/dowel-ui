import type { Meta, StoryObj } from "@storybook/react-vite";

import { ScrollRevealText } from "./scroll-reveal-text";

const PARAGRAPH = `Lorem ipsum dolor sit amet,
  consectetur adipiscing elit. Sed do eiusmod tempor
  incididunt ut labore et dolore magna aliqua.
  Ut enim ad minim veniam, quis nostrud exercitation
  ullamco laboris nisi ut aliquip ex ea commodo
  consequat. Duis aute irure dolor in reprehenderit`;

// Annotated: the decorator's inferred type cannot be named in declaration emit.
const meta: Meta<typeof ScrollRevealText> = {
  title: "Effects/Scroll Reveal Text",
  component: ScrollRevealText,
  args: {
    children: PARAGRAPH,
    size: "md",
    dimOpacity: 0.1,
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
    as: { control: "select", options: ["p", "div", "h1", "h2", "h3"] },
  },
  decorators: [
    (Story) => (
      <div className="pt-[60vh] pb-[100vh]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** SmoothUI's Scroll Reveal Paragraph demo. Scroll to reveal. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-4">
      <ScrollRevealText className="text-foreground">{PARAGRAPH}</ScrollRevealText>
      <figcaption className="text-xs text-muted-foreground">Scroll Reveal Paragraph</figcaption>
    </figure>
  ),
};

export const Headline: Story = {
  args: {
    as: "h2",
    size: "xl",
    children: "Every word arrives as you read it, and not a moment before.",
  },
};
