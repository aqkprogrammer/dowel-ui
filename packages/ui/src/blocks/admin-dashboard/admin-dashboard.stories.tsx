import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";

import {
  AdminDashboardBlock,
  type AdminAccount,
  type AdminNavGroup,
  type AdminNotice,
  type AdminStat,
} from "./admin-dashboard";

/** Named so its type is nameable in declaration output (TS2883). */
const withFrame: Decorator = (Story) => (
  <div className="h-[44rem] w-[76rem] max-w-full overflow-hidden rounded-xl border border-border bg-background">
    <Story />
  </div>
);

function Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const NAVIGATION: AdminNavGroup[] = [
  {
    id: "manage",
    label: "Manage",
    items: [
      { id: "overview", label: "Overview", href: "/admin", icon: <Icon /> },
      {
        id: "accounts",
        label: "Accounts",
        href: "/admin/accounts",
        icon: <Icon />,
        count: 1284,
      },
      { id: "users", label: "Users", href: "/admin/users", icon: <Icon /> },
      {
        id: "tickets",
        label: "Support tickets",
        href: "/admin/tickets",
        icon: <Icon />,
        count: 12,
      },
      { id: "billing", label: "Billing", href: "/admin/billing", icon: <Icon /> },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id: "flags", label: "Feature flags", href: "/admin/flags", icon: <Icon /> },
      { id: "audit", label: "Audit log", href: "/admin/audit", icon: <Icon /> },
      { id: "settings", label: "Settings", href: "/admin/settings", icon: <Icon /> },
    ],
  },
];

const NOTICES: AdminNotice[] = [
  {
    id: "n1",
    title: "3 accounts are past due",
    detail:
      "Payment has failed twice for each. They will be suspended in 4 days unless it clears.",
    severity: "warning",
    href: "#billing",
    actionLabel: "Review billing",
  },
  {
    id: "n2",
    title: "A new SSO provider is awaiting approval",
    detail: "Globex requested Okta. Nothing is enabled until an admin approves it.",
    severity: "info",
    href: "#sso",
    actionLabel: "Review request",
  },
];

const money = (value: number) => `$${new Intl.NumberFormat().format(value)}`;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const STATS: AdminStat[] = [
  {
    id: "mrr",
    label: "Monthly revenue",
    value: 48_200,
    previous: 44_100,
    comparisonLabel: "vs last month",
    format: money,
  },
  {
    id: "accounts",
    label: "Active accounts",
    value: 1_284,
    previous: 1_231,
    comparisonLabel: "vs last month",
  },
  {
    id: "churn",
    label: "Churn",
    value: 0.021,
    previous: 0.017,
    polarity: "lower-is-better",
    comparisonLabel: "vs last month",
    format: percent,
  },
  {
    id: "tickets",
    label: "Open tickets",
    value: 12,
    previous: 19,
    polarity: "lower-is-better",
    comparisonLabel: "vs last week",
  },
];

const ACCOUNTS: AdminAccount[] = [
  {
    id: "a1",
    name: "Northwind Traders",
    plan: "Team",
    seats: 12,
    status: "past-due",
    revenue: "$240",
    createdAt: "2025-07-02",
    createdLabel: "8 months ago",
    href: "#a1",
  },
  {
    id: "a2",
    name: "Initech",
    plan: "Team",
    seats: 8,
    status: "past-due",
    revenue: "$160",
    createdAt: "2025-09-14",
    createdLabel: "6 months ago",
    href: "#a2",
  },
  {
    id: "a3",
    name: "Globex",
    plan: "Enterprise",
    seats: 60,
    status: "trial",
    revenue: "$0",
    createdAt: "2026-03-01",
    createdLabel: "3 days ago",
    href: "#a3",
  },
  {
    id: "a4",
    name: "Umbrella Health",
    plan: "Team",
    seats: 25,
    status: "trial",
    revenue: "$0",
    createdAt: "2026-02-28",
    createdLabel: "5 days ago",
    href: "#a4",
  },
  {
    id: "a5",
    name: "Stark Logistics",
    plan: "Business",
    seats: 140,
    status: "active",
    revenue: "$2,800",
    createdAt: "2026-02-26",
    createdLabel: "a week ago",
    href: "#a5",
  },
  {
    id: "a6",
    name: "Hooli",
    plan: "Team",
    seats: 4,
    status: "suspended",
    revenue: "$0",
    createdAt: "2025-03-10",
    createdLabel: "a year ago",
    href: "#a6",
  },
];

const meta = {
  title: "Blocks/Admin dashboard",
  component: AdminDashboardBlock,
  parameters: { controls: { disable: true }, layout: "padded" },
  decorators: [withFrame],
  // The required props, so a story that renders itself still type-checks.
  args: { workspaceName: "Acme Admin", navigation: NAVIGATION },
} satisfies Meta<typeof AdminDashboardBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Default() {
    const [active, setActive] = useState("/admin");

    return (
      <AdminDashboardBlock
        workspaceName="Acme Admin"
        navigation={NAVIGATION}
        activeHref={active}
        onNavigate={setActive}
        breadcrumbs={[{ label: "Admin", href: "#" }, { label: "Overview" }]}
        notices={NOTICES}
        stats={STATS}
        accounts={ACCOUNTS}
        onOpenAccount={() => undefined}
        user={{ name: "Dana Whitfield", role: "Owner" }}
        onSignOut={() => undefined}
        onOpenProfile={() => undefined}
        headerActions={
          <Button variant="outline" size="sm">
            Invite admin
          </Button>
        }
      />
    );
  },
};

/** Nothing is on fire: the loud section is simply absent. */
export const AllQuiet: Story = {
  args: {
    workspaceName: "Acme Admin",
    navigation: NAVIGATION,
    activeHref: "/admin",
    breadcrumbs: [{ label: "Admin", href: "#" }, { label: "Overview" }],
    stats: STATS.map((stat) =>
      stat.id === "churn" ? { ...stat, value: 0.012, previous: 0.017 } : stat,
    ),
    accounts: ACCOUNTS.filter((account) => account.status === "trial"),
    user: { name: "Dana Whitfield", role: "Owner" },
    onSignOut: () => undefined,
  },
};

/** The shell with a page of your own inside it. */
export const WithChildren: Story = {
  args: {
    workspaceName: "Acme Admin",
    navigation: NAVIGATION,
    activeHref: "/admin/audit",
    breadcrumbs: [{ label: "Admin", href: "#" }, { label: "Audit log" }],
    user: { name: "Dana Whitfield", role: "Owner" },
    onSignOut: () => undefined,
    children: (
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your own page, inside the same shell. The navigation, breadcrumb and account menu are
          the block&rsquo;s; everything here is yours.
        </p>
      </div>
    ),
  },
};
