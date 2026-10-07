import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CalendarClock,
  GitMerge,
  MessageCircle,
  Rocket,
  ShieldAlert,
  Star,
} from "lucide-react";
import { useState } from "react";

import { NotificationList, type NotificationListItem } from "./notification-list";

function Initials({ children }: { children: string }) {
  return (
    <span className="grid size-full place-items-center bg-primary text-xs font-semibold text-primary-foreground">
      {children}
    </span>
  );
}

const ITEMS: NotificationListItem[] = [
  {
    id: "merge",
    title: "Ada Lovelace merged your pull request",
    body: "feat(ui): notification list — 14 files changed",
    time: "now",
    icon: <Initials>AL</Initials>,
  },
  {
    id: "deploy",
    title: "Production deploy finished",
    body: "dowel-docs is live in 42 seconds.",
    time: "4m",
    icon: <Rocket className="text-success" />,
  },
  {
    id: "comment",
    title: "Grace Hopper commented",
    body: "“Could the deck fan out from the bottom instead?”",
    time: "18m",
    icon: <MessageCircle className="text-info" />,
  },
  {
    id: "security",
    title: "New sign-in from Lisbon",
    body: "Chrome on macOS. If this wasn't you, reset your password.",
    time: "1h",
    icon: <ShieldAlert className="text-warning" />,
  },
  {
    id: "standup",
    title: "Standup in 15 minutes",
    time: "1h",
    icon: <CalendarClock />,
  },
];

const meta: Meta<typeof NotificationList> = {
  title: "Feedback/Notification List",
  component: NotificationList,
  args: {
    defaultItems: ITEMS,
    variant: "card",
    label: "Notifications",
    depth: 3,
    swipeToDismiss: true,
    defaultExpanded: false,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["card", "plain"] },
    depth: { control: { type: "range", min: 1, max: 5, step: 1 } },
    items: { control: false },
    defaultItems: { control: false },
  },
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[min(24rem,90vw)]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NotificationList>;

/**
 * Hover the deck — or tab into it — and it springs open. Dismiss a card with
 * its × or flick it sideways: it slides out, the rest close ranks and the
 * count rolls down. Escape or leaving folds it back.
 */
export const Default: Story = {};

/** Starts fanned out, as if the toggle had been pressed. */
export const Expanded: Story = {
  args: { defaultExpanded: true },
};

/** Without a frame, for a popover or a sidebar that already has one. */
export const Plain: Story = {
  args: { variant: "plain", depth: 2 },
};

const INCOMING: NotificationListItem[] = [
  {
    id: "star",
    title: "dowel-ui reached 1,000 stars",
    time: "now",
    icon: <Star className="text-warning" />,
  },
  { id: "review", title: "Katherine requested your review", time: "now", icon: <GitMerge /> },
  { id: "invite", title: "You were added to #motion", time: "now", icon: <MessageCircle /> },
];

function LiveDemo() {
  const [items, setItems] = useState(ITEMS.slice(0, 2));
  const next = INCOMING.find((item) => !items.some((other) => other.id === item.id));
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={!next}
        className="self-start rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent disabled:opacity-55"
        onClick={() => {
          if (next) setItems((current) => [next, ...current]);
        }}
      >
        Receive a notification
      </button>
      <NotificationList
        items={items}
        onDismiss={(id) => {
          setItems((current) => current.filter((item) => item.id !== id));
        }}
      />
    </div>
  );
}

/** Controlled: new notifications drop onto the top of the deck with a blur, and the count rolls up. */
export const Live: Story = {
  parameters: { controls: { disable: true } },
  render: () => <LiveDemo />,
};
