import type { Meta, StoryObj } from "@storybook/react-vite";
import { AtSign, Code, Mail, MessageCircle, Rss, Send } from "lucide-react";
import { useState } from "react";

import { ShareButton, type ShareTarget } from "./share-button";

const TARGETS: ShareTarget[] = [
  {
    label: "Share by email",
    icon: <Mail />,
    href: "mailto:?subject=Dowel&body=https://dowel.dev",
  },
  { label: "Share in a message", icon: <MessageCircle />, href: "https://example.com/message" },
  { label: "Share to Threads", icon: <AtSign />, href: "https://example.com/threads" },
  { label: "Send to a friend", icon: <Send />, href: "https://example.com/send" },
];

const meta = {
  title: "Form/Share Button",
  component: ShareButton,
  args: {
    targets: TARGETS,
    url: "https://dowel.dev/blog/springs",
    label: "Share",
    variant: "solid",
    size: "lg",
    openOn: "hover",
    native: false,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["solid", "outline", "soft"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    openOn: { control: "inline-radio", options: ["hover", "click"] },
    targets: { control: false },
    icon: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ShareButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover, tab to it or tap it: the pill springs open and the targets pop in one after another. */
export const Default: Story = {};

/** Three surfaces, all opening the same way. */
export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-6">
      <ShareButton variant="solid" targets={TARGETS.slice(0, 3)} url="https://dowel.dev" />
      <ShareButton variant="outline" targets={TARGETS.slice(0, 3)} url="https://dowel.dev" />
      <ShareButton variant="soft" targets={TARGETS.slice(0, 3)} url="https://dowel.dev" />
    </div>
  ),
};

function ActionsDemo() {
  const [last, setLast] = useState("Nothing chosen yet.");
  return (
    <div className="flex flex-col items-center gap-3">
      <ShareButton
        openOn="click"
        variant="outline"
        size="md"
        url="https://dowel.dev/components/share-button"
        onCopy={() => {
          setLast("Copied the link.");
        }}
        targets={[
          {
            label: "Copy embed code",
            icon: <Code />,
            onSelect: () => {
              setLast("Copied the embed code.");
            },
          },
          {
            label: "Subscribe to the feed",
            icon: <Rss />,
            onSelect: () => {
              setLast("Subscribed.");
            },
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">{last}</p>
    </div>
  );
}

/** `openOn="click"`, with action targets beside the built-in copy link, whose icon morphs into a check. */
export const ClickAndActions: Story = {
  parameters: { controls: { disable: true } },
  render: () => <ActionsDemo />,
};

/** With `native`, browsers that have a system share sheet use it; the rest get the tray. */
export const Native: Story = {
  args: { native: true, shareTitle: "Springs, explained", openOn: "click" },
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-6">
      <ShareButton size="sm" targets={TARGETS.slice(0, 2)} url="https://dowel.dev" />
      <ShareButton size="md" targets={TARGETS.slice(0, 2)} url="https://dowel.dev" />
      <ShareButton size="lg" targets={TARGETS.slice(0, 2)} url="https://dowel.dev" />
    </div>
  ),
};
