import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bookmark, Star, ThumbsUp } from "lucide-react";
import { useState, type ReactNode } from "react";

import { LikeButton } from "./like-button";

const meta = {
  title: "Feedback/Like Button",
  component: LikeButton,
  args: {
    count: 128,
    showCount: true,
    label: "Like",
    tone: "destructive",
    size: "md",
    disabled: false,
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["destructive", "primary", "warning", "success", "foreground"],
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    icon: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof LikeButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click to like: the heart pops, a ring bursts and dots fly off. Click again to deflate. */
export const Default: Story = {};

function Captioned({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      {children}
      <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/** The same mechanism with other glyphs — any stroked icon fills the same way. */
export const Glyphs: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-end justify-center gap-10">
      <Captioned caption="heart">
        <LikeButton count={128} />
      </Captioned>
      <Captioned caption="star · warning">
        <LikeButton count={2400} icon={<Star />} tone="warning" label="Star" />
      </Captioned>
      <Captioned caption="bookmark · primary">
        <LikeButton icon={<Bookmark />} tone="primary" label="Save" />
      </Captioned>
      <Captioned caption="thumbs up · foreground">
        <LikeButton count={9} icon={<ThumbsUp />} tone="foreground" label="Upvote" />
      </Captioned>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-6">
      <LikeButton size="sm" count={7} />
      <LikeButton size="md" count={77} />
      <LikeButton size="lg" count={777} />
    </div>
  ),
};

/** Large counts compact through Intl.NumberFormat, in the name as well as on screen. */
export const CompactCount: Story = {
  args: { count: 12_480, format: { notation: "compact" } },
};

/** Icon only: without a count the button is a circle, named by its label alone. */
export const IconOnly: Story = {
  args: { count: undefined },
};

function ControlledDemo() {
  const [post, setPost] = useState({ liked: true, likes: 57 });
  return (
    <div className="flex flex-col items-center gap-3">
      <LikeButton
        liked={post.liked}
        count={post.likes}
        onLikedChange={(liked) => {
          setPost((current) => ({ liked, likes: current.likes + (liked ? 1 : -1) }));
        }}
      />
      <p className="text-xs text-muted-foreground">
        Controlled: the parent owns both <code>liked</code> and the total.
      </p>
    </div>
  );
}

/** Controlled, the count is shown exactly as given, so the owner updates it with `liked`. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: () => <ControlledDemo />,
};
