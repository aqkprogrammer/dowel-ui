import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { AdminUsersBlock, type AdminUser } from "./admin-users";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const USERS: AdminUser[] = [
  {
    id: "1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "Owner",
    status: "Active",
    lastActive: "2 hours ago",
  },
  {
    id: "2",
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "Admin",
    status: "Active",
    lastActive: "Yesterday",
  },
  {
    id: "3",
    name: "Katherine Johnson",
    email: "kj@example.com",
    role: "Member",
    status: "Invited",
    lastActive: "Never",
  },
  {
    id: "4",
    name: "Radia Perlman",
    email: "radia@example.com",
    role: "Viewer",
    status: "Suspended",
    lastActive: "3 weeks ago",
  },
  {
    id: "5",
    name: "Barbara Liskov",
    email: "barbara@example.com",
    role: "Member",
    status: "Active",
    lastActive: "5 minutes ago",
  },
  {
    id: "6",
    name: "Margaret Hamilton",
    email: "margaret@example.com",
    role: "Admin",
    status: "Active",
    lastActive: "Last week",
  },
];

const meta = {
  title: "Blocks/Admin — users",
  component: AdminUsersBlock,
  args: { users: USERS },
  parameters: { controls: { disable: true } },
  decorators: [withPageWidth],
} satisfies Meta<typeof AdminUsersBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Filter, sort and hide columns. The matching count is announced as you type. */
export const Default: Story = {};

export const Empty: Story = {
  args: { users: [] },
};

export const SinglePerson: Story = {
  args: { users: [USERS[0]!] },
};
