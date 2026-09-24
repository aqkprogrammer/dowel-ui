import type { Meta, StoryObj } from "@storybook/react-vite";
import { Minus, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { Button } from "@/components/button";

import { NotificationBell } from "./notification-bell";

const meta = {
  title: "Feedback/Notification Bell",
  component: NotificationBell,
  args: {
    count: 3,
    max: 99,
    variant: "count",
    size: 40,
    tone: "destructive",
    appearance: "soft",
    live: false,
  },
  argTypes: {
    count: { control: { type: "number", min: 0 } },
    variant: { control: "inline-radio", options: ["count", "dot"] },
    size: { control: { type: "range", min: 24, max: 96, step: 4 } },
    tone: {
      control: "select",
      options: ["destructive", "default", "info", "success", "warning", "secondary"],
    },
    appearance: { control: "inline-radio", options: ["soft", "ghost", "outline"] },
    label: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof NotificationBell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Counter({
  children,
  onChange,
}: {
  children: ReactNode;
  onChange: (delta: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      {children}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Clear one"
          onClick={() => {
            onChange(-1);
          }}
        >
          <Minus />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Add one"
          onClick={() => {
            onChange(1);
          }}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function PlaygroundDemo() {
  const [count, setCount] = useState(2);
  return (
    <Counter
      onChange={(delta) => {
        setCount((value) => Math.max(0, value + delta));
      }}
    >
      <NotificationBell count={count} size={64} live />
    </Counter>
  );
}

/**
 * Press plus to land a notification, minus to clear one. The bell swings on
 * each arrival and swings harder when several land quickly; the count rolls,
 * and the badge shrinks away at zero. Announced politely with `live`.
 */
export const Playground: Story = {
  parameters: { controls: { disable: true } },
  render: () => <PlaygroundDemo />,
};

/** A dot instead of a number. It appears and leaves on the same counts. */
export const Dot: Story = {
  args: { variant: "dot", count: 1 },
};

/** Past `max` the badge reads "99+", and the name says "more than 99 unread". */
export const Overflow: Story = {
  args: { count: 240 },
};

/** Everything is a fraction of `size`: the bell, the badge, its digits and its cut-out. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-6">
      {[28, 40, 56, 80].map((size) => (
        <NotificationBell key={size} size={size} count={size === 80 ? 128 : 7} />
      ))}
    </div>
  ),
};

export const Tones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-6">
      {(["destructive", "default", "info", "success", "warning"] as const).map((tone) => (
        <NotificationBell key={tone} tone={tone} count={4} appearance="outline" />
      ))}
    </div>
  ),
};

/**
 * `asChild` puts the badge on your own element — here an avatar link. It keeps
 * its own name, the badge's text follows it, and only the built-in bell swings.
 */
export const OnAnAvatar: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <NotificationBell asChild count={5} size={48}>
      <a href="#profile" className="rounded-full">
        <Avatar className="size-full">
          <AvatarImage src="https://picsum.photos/seed/bell/96/96" alt="Your profile" />
          <AvatarFallback>YP</AvatarFallback>
        </Avatar>
      </a>
    </NotificationBell>
  ),
};
