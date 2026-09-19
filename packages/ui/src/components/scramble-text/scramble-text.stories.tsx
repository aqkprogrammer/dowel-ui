import type { Meta, StoryObj } from "@storybook/react-vite";

import { ScrambleText } from "./scramble-text";

const meta = {
  title: "Effects/Scramble Text",
  component: ScrambleText,
  args: {
    children: "Hover over this text!",
    duration: 800,
    speed: 50,
    trigger: "hover",
    className: "text-3xl font-bold",
  },
  argTypes: {
    trigger: { control: "select", options: ["hover", "mount", "in-view"] },
    font: { control: "select", options: ["inherit", "mono"] },
    as: { control: "select", options: ["span", "p", "div", "h1", "h2", "h3"] },
  },
} satisfies Meta<typeof ScrambleText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** SmoothUI's Scramble Hover demo, item for item. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col items-center gap-4 text-center">
      <h2 className="mb-4 text-2xl font-bold">Scramble Hover Examples</h2>
      <ScrambleText duration={800} speed={50} className="text-3xl font-bold">
        Hover over this text!
      </ScrambleText>
      <ScrambleText duration={600} speed={30} className="text-xl">
        Watch the characters scramble
      </ScrambleText>
      <ScrambleText duration={1000} speed={40} className="text-lg">
        Dowel makes it easy
      </ScrambleText>
      <ScrambleText duration={500} speed={20} className="text-sm text-muted-foreground">
        Try hovering over any of these texts above!
      </ScrambleText>
      <figcaption className="text-xs text-muted-foreground">Scramble Hover</figcaption>
    </figure>
  ),
};

/** Inside a link: hover or keyboard focus on the link scrambles it. */
export const InALink: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <a href="#docs" className="rounded-sm text-lg font-medium underline underline-offset-4">
      <ScrambleText>Read the documentation</ScrambleText>
    </a>
  ),
};

/** Plays once on mount; `mono` keeps the line from jittering. */
export const OnMount: Story = {
  args: { trigger: "mount", font: "mono", children: "ACCESS GRANTED", duration: 1200 },
};
