import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { CommentBubble, type CommentBubbleComment } from "./comment-bubble";

const SOURCE: CommentBubbleComment[] = [
  {
    id: "1",
    author: { name: "Edu Calvo", avatarUrl: "https://picsum.photos/seed/edu/96/96" },
    timestamp: "Just now",
    message:
      "What happens if we adjust this to handle a light and dark mode? I'm not sure if we're ready to handle...",
  },
];

const meta: Meta<typeof CommentBubble> = {
  title: "Display/Comment Bubble",
  component: CommentBubble,
  args: { comments: SOURCE, width: 200 },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** SmoothUI "Figma Comment": press the avatar pin to read the comment. */
export const Default: Story = {
  render: (args) => (
    <div className="flex min-h-48 items-end p-8">
      <CommentBubble {...args} />
    </div>
  ),
};

/**
 * Every source item this component covers.
 *
 * - SmoothUI "Figma Comment" → a single-comment pin, 200px wide.
 * - Extended per the brief: a thread with replies and a working composer.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [thread, setThread] = useState<CommentBubbleComment[]>([
      ...SOURCE,
      {
        id: "2",
        author: { name: "Sam Lee" },
        timestamp: "1m",
        message: "Tokens already cover it.",
      },
    ]);
    return (
      <div className="flex flex-wrap items-end gap-64">
        <figure className="flex flex-col gap-3">
          <CommentBubble comments={SOURCE} width={200} />
          <figcaption className="text-xs text-muted-foreground">
            SmoothUI Figma Comment
          </figcaption>
        </figure>
        <figure className="flex flex-col gap-3">
          <CommentBubble
            comments={thread}
            width="15rem"
            onReply={(message) =>
              setThread((t) => [
                ...t,
                {
                  id: String(t.length + 1),
                  author: { name: "You" },
                  timestamp: "now",
                  message,
                },
              ])
            }
          />
          <figcaption className="text-xs text-muted-foreground">
            Thread with composer
          </figcaption>
        </figure>
      </div>
    );
  },
};
