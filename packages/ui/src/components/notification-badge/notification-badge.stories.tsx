import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, Mail, Minus, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { Button } from "@/components/button";

import { NotificationBadge } from "./notification-badge";

const meta: Meta<typeof NotificationBadge> = {
  title: "Feedback/Notification Badge",
  component: NotificationBadge,
  args: {
    variant: "count",
    count: 5,
    max: 99,
    status: "online",
    tone: "default",
    ping: false,
    showZero: false,
  },
  argTypes: {
    variant: { control: "select", options: ["dot", "count", "status"] },
    status: { control: "select", options: ["online", "offline", "busy", "away"] },
    tone: {
      control: "select",
      options: ["default", "secondary", "destructive", "success", "warning", "info"],
    },
    position: {
      control: "select",
      options: ["top-end", "top-start", "bottom-end", "bottom-start"],
    },
  },
  render: (args) => (
    <NotificationBadge {...args}>
      <Button variant="secondary" size="icon" aria-label="Notifications">
        <Bell />
      </Button>
    </NotificationBadge>
  ),
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function CounterDemo() {
  const [count, setCount] = useState(5);
  return (
    <div className="flex flex-col items-center gap-6">
      <NotificationBadge variant="count" count={count}>
        <Button variant="secondary" className="size-16 rounded-xl" aria-label="Notifications">
          <Bell className="size-8" />
        </Button>
      </NotificationBadge>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Remove one"
          onClick={() => {
            setCount((value) => Math.max(0, value - 1));
          }}
        >
          <Minus />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Add one"
          onClick={() => {
            setCount((value) => value + 1);
          }}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function Captioned({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-3">
      {children}
      <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/**
 * SmoothUI Notification Badge: the demo (a bell with a count and −/+ buttons —
 * the count rolls up and down and hides at zero), and each documented feature:
 * dot, count, 99+, ping, the four presence statuses and the four corners.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-10">
      <Captioned caption="Notification Badge — demo (count with −/+)">
        <CounterDemo />
      </Captioned>
      <div className="flex flex-wrap items-end justify-center gap-10">
        <Captioned caption="dot">
          <NotificationBadge>
            <Mail className="size-6" aria-label="Mail" />
          </NotificationBadge>
        </Captioned>
        <Captioned caption="count">
          <NotificationBadge variant="count" count={8}>
            <Mail className="size-6" aria-label="Mail" />
          </NotificationBadge>
        </Captioned>
        <Captioned caption="count, max 99">
          <NotificationBadge variant="count" count={120} tone="destructive">
            <Mail className="size-6" aria-label="Mail" />
          </NotificationBadge>
        </Captioned>
        <Captioned caption="ping">
          <NotificationBadge ping tone="destructive">
            <Bell className="size-6" aria-label="Alerts" />
          </NotificationBadge>
        </Captioned>
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        {(["online", "away", "busy", "offline"] as const).map((status) => (
          <Captioned key={status} caption={`status: ${status}`}>
            <NotificationBadge variant="status" status={status} position="bottom-end">
              <Avatar>
                <AvatarImage
                  src={`https://picsum.photos/seed/${status}/80/80`}
                  alt="Ada Lovelace"
                />
                <AvatarFallback>AL</AvatarFallback>
              </Avatar>
            </NotificationBadge>
          </Captioned>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        {(["top-end", "top-start", "bottom-end", "bottom-start"] as const).map((position) => (
          <Captioned key={position} caption={position}>
            <NotificationBadge variant="count" count={3} position={position}>
              <span className="block size-10 rounded-lg bg-muted" />
            </NotificationBadge>
          </Captioned>
        ))}
      </div>
    </div>
  ),
};

export const Status: Story = {
  args: { variant: "status", status: "busy", position: "bottom-end" },
  render: (args) => (
    <NotificationBadge {...args}>
      <Avatar size="lg">
        <AvatarImage src="https://picsum.photos/seed/avatar/96/96" alt="Grace Hopper" />
        <AvatarFallback>GH</AvatarFallback>
      </Avatar>
    </NotificationBadge>
  ),
};

/** Standalone, the badge renders inline — beside a nav label, for instance. */
export const Inline: Story = {
  render: () => (
    <span className="inline-flex items-center gap-2 text-sm">
      Inbox <NotificationBadge variant="count" count={12} />
    </span>
  ),
};
