import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, House, Inbox, Search, User } from "lucide-react";

import { BottomNav, BottomNavItem } from "./bottom-nav";

const meta = {
  title: "Navigation/Bottom Nav",
  component: BottomNav,
  args: { hideFrom: "never", position: "static" },
  argTypes: {
    hideFrom: { control: "inline-radio", options: ["md", "lg", "never"] },
    position: { control: "inline-radio", options: ["fixed", "static"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof BottomNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Five destinations, Home current, with a count and a dot. */
export const Default: Story = {
  render: (args) => (
    <div className="w-[min(24rem,95vw)] overflow-hidden rounded-2xl border border-border">
      <div className="grid h-64 place-items-center bg-muted/40 text-sm text-muted-foreground">
        App content
      </div>
      <BottomNav {...args}>
        <BottomNavItem href="#home" icon={<House />} label="Home" active />
        <BottomNavItem href="#search" icon={<Search />} label="Search" />
        <BottomNavItem
          href="#inbox"
          icon={<Inbox />}
          label="Inbox"
          badge={3}
          badgeLabel="unread"
        />
        <BottomNavItem href="#alerts" icon={<Bell />} label="Alerts" badge />
        <BottomNavItem href="#me" icon={<User />} label="Me" />
      </BottomNav>
    </div>
  ),
};
