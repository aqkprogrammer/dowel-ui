import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Copy, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { Response } from "@/components/ai-response";
import { Button } from "@/components/button";
import { CopyButton } from "@/components/copy-button";

import {
  Message,
  MessageActions,
  MessageAvatar,
  MessageBody,
  MessageFooter,
  MessageTimestamp,
} from "./ai-message";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <ol className="flex w-[32rem] flex-col gap-6">
    <Story />
  </ol>
);

const meta = {
  title: "AI/Message",
  component: Message,
  args: { from: "assistant" },
  argTypes: { from: { control: "inline-radio", options: ["user", "assistant", "system"] } },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Message {...args}>
      {args.from === "assistant" ? <MessageAvatar>AI</MessageAvatar> : null}
      <MessageBody from={args.from}>
        {args.from === "user"
          ? "How do I make a table keyboard-scrollable?"
          : 'Give the scrolling wrapper tabindex="0" and an accessible name. Without it, columns past the edge are unreachable by keyboard.'}
      </MessageBody>
    </Message>
  ),
};

export const Roles: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <>
      <Message from="system">
        <MessageBody from="system">Conversation started with the Balanced model.</MessageBody>
      </Message>
      <Message from="user">
        <MessageBody from="user">What is the capital of France?</MessageBody>
      </Message>
      <Message from="assistant">
        <MessageAvatar>AI</MessageAvatar>
        <MessageBody from="assistant">
          <Response>Paris.</Response>
        </MessageBody>
      </Message>
    </>
  ),
};

/** Actions fade in on hover but stay in the tab order the whole time. */
export const WithActions: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Message from="assistant">
      <MessageAvatar>AI</MessageAvatar>
      <MessageBody from="assistant">
        <Response>
          A Sheet slides in from an edge; a Drawer is bottom-anchored and can be dragged away.
        </Response>
        <MessageActions>
          {[
            { icon: Copy, label: "Copy" },
            { icon: RefreshCw, label: "Regenerate" },
            { icon: ThumbsUp, label: "Good response" },
            { icon: ThumbsDown, label: "Bad response" },
          ].map(({ icon: Icon, label }) => (
            <Button key={label} variant="ghost" size="icon-sm" aria-label={label}>
              <Icon />
            </Button>
          ))}
        </MessageActions>
      </MessageBody>
    </Message>
  ),
};

export const WithFooter: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Message from="assistant">
      <MessageAvatar>AI</MessageAvatar>
      <MessageBody from="assistant">
        <Response>Paris has been the capital since 987.</Response>
        <MessageFooter>
          <span className="text-2xs text-muted-foreground">2 sources · 148 tokens</span>
        </MessageFooter>
      </MessageBody>
    </Message>
  ),
};

const ANSWER =
  "A Sheet slides in from an edge; a Drawer is bottom-anchored and can be dragged away.";

/**
 * Actions slide out of the bubble's own edge — from the inline start for the
 * assistant, the inline end for the user — with a timestamp pinned before
 * them. Copy uses CopyButton, which announces success and failure; votes are
 * assistant-only toggles with `aria-pressed`. Motion from SmoothUI AI Message.
 */
export const ActionsReveal: Story = {
  parameters: { controls: { disable: true } },
  render: function ActionsReveal() {
    const [vote, setVote] = useState<"up" | "down" | null>(null);

    return (
      <>
        <Message from="user">
          <MessageBody from="user">When would I use a Drawer?</MessageBody>
          <MessageActions className="flex-row-reverse">
            <MessageTimestamp dateTime="2026-09-19T09:30:00Z">09:30</MessageTimestamp>
            <CopyButton value="When would I use a Drawer?" size="icon-sm" variant="ghost" />
          </MessageActions>
        </Message>
        <Message from="assistant">
          <MessageAvatar>AI</MessageAvatar>
          <MessageBody from="assistant">
            <Response>{ANSWER}</Response>
            <MessageActions>
              <MessageTimestamp dateTime="2026-09-19T09:30:04Z">09:30</MessageTimestamp>
              <CopyButton value={ANSWER} size="icon-sm" variant="ghost" />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Good response"
                aria-pressed={vote === "up"}
                onClick={() => {
                  setVote((current) => (current === "up" ? null : "up"));
                }}
              >
                <ThumbsUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Bad response"
                aria-pressed={vote === "down"}
                onClick={() => {
                  setVote((current) => (current === "down" ? null : "down"));
                }}
              >
                <ThumbsDown />
              </Button>
            </MessageActions>
          </MessageBody>
        </Message>
      </>
    );
  },
};
