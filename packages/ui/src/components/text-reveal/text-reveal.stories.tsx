import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { TextReveal } from "./text-reveal";

const meta = {
  title: "Effects/Text Reveal",
  component: TextReveal,
  args: {
    text: "Moments",
    size: "md",
    loop: false,
    interval: 2000,
    stagger: 45,
    duration: 420,
  },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof TextReveal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Edit `text` in the controls to watch the letters roll. */
export const Default: Story = {};

/** The reference: "Moments" rolling into itself on a loop, on a dark tile. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex flex-col items-center gap-6 rounded-3xl bg-[#161618] p-10 text-white">
      <TextReveal text="Moments" loop interval={1000} />
      <span className="text-sm font-medium">Text Reveal</span>
    </div>
  ),
};

const WORDS = ["Moments", "Motion", "Details", "Craft"];

function Cycling() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % WORDS.length);
    }, 1600);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return <TextReveal size="lg" text={WORDS[index] ?? ""} />;
}

/** Changing words: each letter rolls from the old glyph to the new one. */
export const ChangingText: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Cycling />,
};
