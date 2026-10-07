import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Archive,
  CalendarDays,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Star,
} from "lucide-react";
import { useState } from "react";

import { PinList, type PinListItem } from "./pin-list";

const ITEMS: PinListItem[] = [
  { id: "inbox", title: "Inbox", description: "12 unread messages", icon: <Inbox /> },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Weekly metrics",
    icon: <LayoutDashboard />,
  },
  { id: "calendar", title: "Calendar", description: "3 events today", icon: <CalendarDays /> },
  { id: "docs", title: "Documents", description: "Shared with your team", icon: <FileText /> },
  { id: "chat", title: "Messages", description: "#design, #launch", icon: <MessageSquare /> },
  {
    id: "archive",
    title: "Archive",
    description: "Everything older than 90 days",
    icon: <Archive />,
  },
];

const meta: Meta<typeof PinList> = {
  title: "Data/Pin List",
  component: PinList,
  args: {
    items: ITEMS,
    defaultPinned: ["inbox", "calendar"],
    variant: "card",
    pinnedLabel: "Pinned",
    unpinnedLabel: "All",
    disabled: false,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["card", "plain"] },
    items: { control: false },
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
type Story = StoryObj<typeof PinList>;

/**
 * Press a pin: the row glides into the other section while the rest close
 * ranks, and the pin stands upright and fills. Unpin both to watch the pinned
 * section fold away.
 */
export const Default: Story = {};

/** Plain rows that tint on hover, for a sidebar. */
export const Plain: Story = {
  args: { variant: "plain", defaultPinned: ["dashboard"] },
};

/** Nothing pinned yet: the pinned section is absent until the first pin. */
export const NothingPinned: Story = {
  args: { defaultPinned: [] },
};

function ControlledDemo() {
  const [pinned, setPinned] = useState<string[]>(["chat"]);
  return (
    <div className="flex flex-col gap-4">
      <PinList
        items={ITEMS.slice(0, 4).concat({
          id: "settings",
          title: "Settings",
          icon: <Settings />,
        })}
        pinned={pinned}
        onPinnedChange={setPinned}
        pinnedLabel={
          <span className="inline-flex items-center gap-1.5">
            <Star className="size-3" aria-hidden="true" /> Favourites
          </span>
        }
        unpinnedLabel="Workspace"
        pinLabel={(item) => `Favourite ${item.title}`}
        announce={(item, isPinned) =>
          `${item.title} ${isPinned ? "added to" : "removed from"} favourites`
        }
      />
      <p className="text-xs text-muted-foreground">
        Pinned: <code>{pinned.length > 0 ? pinned.join(", ") : "none"}</code>
      </p>
    </div>
  );
}

/** Controlled, with custom section labels, button names and announcements. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: () => <ControlledDemo />,
};
