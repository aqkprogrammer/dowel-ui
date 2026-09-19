import type { Meta, StoryObj } from "@storybook/react-vite";
import { LogOut, Package, User } from "lucide-react";
import { useState } from "react";

import {
  AccountMenu,
  AccountMenuOrders,
  AccountMenuProfileForm,
  AccountMenuSection,
  type AccountMenuOrder,
  type AccountMenuUser,
} from "./account-menu";

const USER: AccountMenuUser = {
  name: "Jane Doe",
  email: "jane@example.com",
  avatarUrl: "https://picsum.photos/seed/jane/96/96",
};

const ORDERS: AccountMenuOrder[] = [
  { id: "ORD100", date: "2024-06-01", status: "delivered", progress: 100 },
  { id: "ORD101", date: "2024-06-10", status: "shipped", progress: 60 },
];

const meta: Meta<typeof AccountMenu> = {
  title: "Overlays/Account Menu",
  component: AccountMenu,
  args: { user: USER, children: null },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * SmoothUI "User Account Avatar": Edit Profile and Last Orders sections.
 * This is also the Gallery item for the source — it has one demo.
 */
export const Default: Story = {
  render: function Render(args) {
    const [user, setUser] = useState(args.user);
    const [notice, setNotice] = useState("");
    return (
      <div className="flex min-h-[28rem] items-start justify-end p-4">
        <div className="flex flex-col items-end gap-3">
          <AccountMenu {...args} user={user}>
            <AccountMenuSection value="profile" label="Edit Profile" icon={<User />}>
              <AccountMenuProfileForm
                onSave={(next) => {
                  setUser(next);
                  setNotice(`Profile saved: ${next.name} (${next.email})`);
                }}
              />
            </AccountMenuSection>
            <AccountMenuSection value="orders" label="Last Orders" icon={<Package />}>
              <AccountMenuOrders
                orders={ORDERS}
                onView={(id) => setNotice(`View order: ${id}`)}
              />
            </AccountMenuSection>
          </AccountMenu>
          <p role="status" className="text-sm text-muted-foreground">
            {notice}
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Every source item this component covers: SmoothUI "User Account Avatar"
 * (above), plus a custom section to show the parts compose.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <AccountMenu user={USER} defaultSection="orders">
      <AccountMenuSection value="profile" label="Edit Profile" icon={<User />}>
        <AccountMenuProfileForm />
      </AccountMenuSection>
      <AccountMenuSection value="orders" label="Last Orders" icon={<Package />}>
        <AccountMenuOrders orders={ORDERS} />
      </AccountMenuSection>
      <AccountMenuSection value="session" label="Session" icon={<LogOut />}>
        <p className="p-3 text-sm text-muted-foreground">
          Signed in on this device since 09:12.
        </p>
      </AccountMenuSection>
    </AccountMenu>
  ),
};
