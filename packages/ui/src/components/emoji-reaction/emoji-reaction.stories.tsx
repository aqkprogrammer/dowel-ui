import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";

import { EmojiReaction } from "./emoji-reaction";

// Annotated rather than `satisfies`: the decorator makes the inferred type
// unnameable in declaration emit (TS2883).
const meta: Meta<typeof EmojiReaction> = {
  title: "Feedback/Emoji Reaction",
  component: EmojiReaction,
  args: {
    size: "md",
    align: "center",
    label: "React",
    barLabel: "Reactions",
    disabled: false,
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    align: { control: "inline-radio", options: ["start", "center", "end"] },
    emojis: { control: false },
    labels: { control: false },
  },
  // Room above the trigger for the bar and the copies that float out of it.
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="flex min-h-72 items-end justify-center pb-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Click to open the bar, then pick — or press the button and drag straight
 * onto an emoji. Hold an emoji to keep them coming. The cross, Escape or a
 * click outside closes it, and the button shows your last pick.
 */
export const Default: Story = {};

function Captioned({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      {children}
      <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/** One scale for the trigger, the bar and the copies that fly up. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-end gap-10">
      <Captioned caption="sm">
        <EmojiReaction size="sm" />
      </Captioned>
      <Captioned caption="md">
        <EmojiReaction size="md" defaultValue="❤️" />
      </Captioned>
      <Captioned caption="lg">
        <EmojiReaction size="lg" />
      </Captioned>
    </div>
  ),
};

/**
 * Which edge of the bar lines up with the button. Near the edge of the screen
 * it still slides inward, and with no room above it flips below.
 */
export const Alignment: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-96 max-w-full justify-between">
      <EmojiReaction align="start" />
      <EmojiReaction align="center" />
      <EmojiReaction align="end" />
    </div>
  ),
};

/** Any emoji: bare strings named through `labels`, or `{ emoji, label }` objects. */
export const CustomEmoji: Story = {
  args: {
    emojis: ["🎉", "🔥", "🚀", { emoji: "👀", label: "Watching" }, "✅", "💯"],
    labels: { "🎉": "Party", "🔥": "Fire", "🚀": "Ship it", "✅": "Done", "💯": "Hundred" },
  },
};

function MessageDemo() {
  const [reactions, setReactions] = useState(0);
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      <EmojiReaction
        asChild
        align="start"
        onReact={() => {
          setReactions((count) => count + 1);
        }}
        onValueChange={setLast}
      >
        <button
          type="button"
          className="max-w-64 rounded-2xl rounded-es-sm bg-muted px-4 py-2.5 text-start text-sm text-foreground"
        >
          Shipping the release at five — can someone check the changelog?
        </button>
      </EmojiReaction>
      <p className="ps-2 text-xs text-muted-foreground">
        {last ? `${last} · ${String(reactions)} sent` : "Press the message to react"}
      </p>
    </div>
  );
}

/**
 * `asChild` hangs the bar off your own element — a message here. It keeps its
 * own content and name; `onReact` counts every pick, including each repeat
 * while one is held.
 */
export const OnAMessage: Story = {
  parameters: { controls: { disable: true } },
  render: () => <MessageDemo />,
};

function CloseOnPickDemo() {
  const [open, setOpen] = useState(false);
  return (
    <EmojiReaction
      open={open}
      onOpenChange={setOpen}
      onReact={() => {
        setOpen(false);
      }}
    />
  );
}

/** The bar stays open after a pick by default; control `open` to close it from `onReact`. */
export const CloseOnPick: Story = {
  parameters: { controls: { disable: true } },
  render: () => <CloseOnPickDemo />,
};
