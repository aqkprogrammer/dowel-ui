import type { Meta, StoryObj } from "@storybook/react-vite";

import { TypewriterText } from "./typewriter-text";

const meta = {
  title: "Effects/Typewriter Text",
  component: TypewriterText,
  args: {
    children: "Welcome to Dowel! This is a typewriter effect.",
    speed: 100,
    className: "text-lg",
  },
  argTypes: {
    caret: { control: "select", options: ["bar", "block", "none"] },
    as: { control: "select", options: ["span", "p", "div", "h1", "h2", "h3"] },
  },
} satisfies Meta<typeof TypewriterText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** SmoothUI's Typewriter Text demo, item for item. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col items-center gap-4 text-center">
      <h2 className="mb-4 text-2xl font-bold">Typewriter Effect Examples</h2>
      <TypewriterText as="p" speed={100} className="text-lg">
        Welcome to Dowel! This is a typewriter effect.
      </TypewriterText>
      <TypewriterText as="p" loop speed={50} className="text-lg">
        This text loops continuously with a faster speed.
      </TypewriterText>
      <TypewriterText as="p" speed={30} className="text-sm text-muted-foreground">
        Perfect for creating engaging user experiences and dynamic content.
      </TypewriterText>
      <figcaption className="text-xs text-muted-foreground">Typewriter Text</figcaption>
    </figure>
  ),
};

/** A list types, holds, deletes and cycles. */
export const Cycling: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <h1 className="text-4xl font-bold tracking-tight">
      Build interfaces that are{" "}
      <TypewriterText className="text-primary">
        {["fast", "accessible", "yours"]}
      </TypewriterText>
    </h1>
  ),
};

export const BlockCaret: Story = {
  args: { caret: "block", className: "font-mono text-lg", children: "npx dowel add button" },
};
