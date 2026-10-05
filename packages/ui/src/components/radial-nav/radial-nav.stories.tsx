import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Bell,
  Calendar,
  Camera,
  Compass,
  Folder,
  Heart,
  Home,
  Inbox,
  Music,
  Search,
  Settings,
  Star,
  User,
} from "lucide-react";
import { useState } from "react";

import { RadialNav, type RadialNavItem } from "./radial-nav";

const ITEMS: RadialNavItem[] = [
  { id: "home", label: "Home", icon: <Home /> },
  { id: "search", label: "Search", icon: <Search /> },
  { id: "inbox", label: "Inbox", icon: <Inbox /> },
  { id: "calendar", label: "Calendar", icon: <Calendar /> },
  { id: "music", label: "Music", icon: <Music /> },
  { id: "photos", label: "Photos", icon: <Camera /> },
  { id: "alerts", label: "Alerts", icon: <Bell /> },
  { id: "settings", label: "Settings", icon: <Settings /> },
];

const meta = {
  title: "Navigation/Radial Nav",
  component: RadialNav,
  args: {
    items: ITEMS,
    defaultValue: "home",
    size: "md",
    "aria-label": "Workspace",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    items: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof RadialNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Pick any item: the arc swings to it the short way round, stretching as it
 * travels, and the hub blurs across to its icon and label. Tab in and use the
 * arrow keys to walk the ring.
 */
export const Default: Story = {};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-10">
      <RadialNav size="sm" items={ITEMS.slice(0, 5)} aria-label="Small" />
      <RadialNav size="md" items={ITEMS.slice(0, 6)} aria-label="Medium" />
      <RadialNav size="lg" items={ITEMS} aria-label="Large" />
    </div>
  ),
};

/** With `href`, items are links and the active one carries aria-current="page". */
export const Links: Story = {
  args: {
    items: [
      { id: "discover", label: "Discover", icon: <Compass />, href: "#discover" },
      { id: "saved", label: "Saved", icon: <Heart />, href: "#saved" },
      { id: "files", label: "Files", icon: <Folder />, href: "#files" },
      { id: "starred", label: "Starred", icon: <Star />, href: "#starred" },
      { id: "profile", label: "Profile", icon: <User />, href: "#profile" },
    ],
    defaultValue: "discover",
  },
};

function ControlledDemo() {
  const [value, setValue] = useState("calendar");
  return (
    <div className="flex flex-col items-center gap-4">
      <RadialNav items={ITEMS} value={value} onValueChange={setValue} aria-label="Apps" />
      <div className="flex gap-2">
        {["home", "settings"].map((id) => (
          <button
            key={id}
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm capitalize hover:bg-accent"
            onClick={() => {
              setValue(id);
            }}
          >
            {id}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Home → Settings is one step back, not seven forward.
      </p>
    </div>
  );
}

/** Controlled from outside: jumping across the seam still takes the short way. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: () => <ControlledDemo />,
};
