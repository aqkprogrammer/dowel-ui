import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { LikeCounter } from "./like-counter";

const meta = {
  title: "Form/Like Counter",
  component: LikeCounter,
  args: { count: 128, label: "Like", size: "md", disabled: false },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    accent: { control: "color" },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof LikeCounter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click to like: the ring ripples, sparkles fly, and 128 rolls up to 129. */
export const Default: Story = {};

/** With the pink accent the reference picks up under its glow. */
export const PinkAccent: Story = { args: { accent: "#f9a8d4" } };

function TileDemo() {
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setLiked((value) => !value);
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);
  return (
    <div className="dark flex w-64 flex-col items-center gap-10 rounded-3xl bg-[#161618] p-10 text-foreground">
      <LikeCounter
        liked={liked}
        onLikedChange={setLiked}
        count={liked ? 129 : 128}
        accent="#f9a8d4"
      />
      <span className="text-lg font-medium">Like</span>
    </div>
  );
}

/** Plays itself the way the reference tile does: like, then unlike, every second. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => <TileDemo />,
};
