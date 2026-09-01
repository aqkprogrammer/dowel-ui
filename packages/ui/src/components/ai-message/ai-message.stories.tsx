import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Copy, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";

import { Response } from "@/components/ai-response";
import { Button } from "@/components/button";

import {
  Message,
  MessageActions,
  MessageAvatar,
  MessageBody,
  MessageFooter,
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
