import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  AdminDashboardBlock,
  type AdminAccount,
  type AdminNavGroup,
  type AdminNotice,
  type AdminStat,
} from "./admin-dashboard";

const NAVIGATION: AdminNavGroup[] = [
  {
    id: "manage",
    label: "Manage",
    items: [
      { id: "overview", label: "Overview", href: "/admin" },
      { id: "accounts", label: "Accounts", href: "/admin/accounts", count: 1284 },
      { id: "tickets", label: "Support tickets", href: "/admin/tickets", count: 12 },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [{ id: "audit", label: "Audit log", href: "/admin/audit" }],
  },
];

const NOTICES: AdminNotice[] = [
  {
    id: "n1",
    title: "3 accounts are past due",
    detail: "Payment failed twice; suspension in 4 days.",
    severity: "warning",
    href: "/admin/billing",
    actionLabel: "Review billing",
  },
];

const STATS: AdminStat[] = [
  {
    id: "mrr",
    label: "Monthly revenue",
    value: 48_200,
    previous: 44_100,
    format: (v) => `$${String(v)}`,
  },
  {
    id: "churn",
    label: "Churn",
    value: 0.021,
    previous: 0.017,
    polarity: "lower-is-better",
    format: (v) => `${String(v * 100)}%`,
  },
];

const ACCOUNTS: AdminAccount[] = [
  {
    id: "a1",
    name: "Acme Corp",
    plan: "Enterprise",
    seats: 240,
    status: "active",
    revenue: "$4,800",
    createdAt: "2025-11-02",
    createdLabel: "4 months ago",
    href: "/admin/accounts/a1",
  },
  {
    id: "a2",
    name: "Northwind",
    plan: "Team",
    seats: 12,
    status: "past-due",
    revenue: "$240",
    createdLabel: "8 months ago",
  },
  {
    id: "a3",
    name: "Globex",
    plan: "Team",
    seats: 5,
    status: "trial",
    revenue: "$0",
    createdLabel: "3 days ago",
  },
];

const BASE = { workspaceName: "Acme Admin", navigation: NAVIGATION, activeHref: "/admin" };

describe("AdminDashboardBlock", () => {
  it("names the navigation landmark and marks the current page", () => {
    render(<AdminDashboardBlock {...BASE} />);

    const nav = screen.getAllByRole("navigation", { name: "Admin" })[0] as HTMLElement;
    expect(within(nav).getByRole("link", { name: /Overview/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: /Accounts/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("says what a count beside a nav item counts", () => {
    render(<AdminDashboardBlock {...BASE} />);

    // "12" on its own is a number with no noun; the noun is there for anyone
    // hearing the link rather than seeing the badge beside it.
    const link = screen.getByRole("link", { name: /Support tickets/ });
    expect(link).toHaveTextContent(/12\s*items/);
  });

  it("hands navigation to the router when asked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<AdminDashboardBlock {...BASE} onNavigate={onNavigate} />);

    await user.click(screen.getByRole("link", { name: /Audit log/ }));
    expect(onNavigate).toHaveBeenCalledWith("/admin/audit");
  });

  it("renders the breadcrumb as its own named landmark, with the page last", () => {
    render(
      <AdminDashboardBlock
        {...BASE}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Accounts" }]}
      />,
    );

    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(within(crumbs).getByText("Accounts")).toHaveAttribute("aria-current", "page");
  });

  it("puts what needs attention first, and does not make it a live region", () => {
    const { container } = render(
      <AdminDashboardBlock {...BASE} notices={NOTICES} stats={STATS} />,
    );

    const main = screen.getByRole("main");
    const attention = within(main).getByRole("region", { name: "Needs attention" });
    const metrics = within(main).getByRole("region", { name: "Key metrics" });
    expect(
      attention.compareDocumentPosition(metrics) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(within(attention).getByRole("link", { name: "Review billing" })).toHaveAttribute(
      "href",
      "/admin/billing",
    );
    expect(
      container.querySelectorAll("[aria-live='polite'], [aria-live='assertive']"),
    ).toHaveLength(0);
  });

  it("treats rising churn as bad news", () => {
    const { container } = render(<AdminDashboardBlock {...BASE} stats={STATS} />);
    const churn = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="metric-delta"]'),
    ].find((element) => element.textContent?.includes("Churn"));
    expect(churn).toHaveAttribute("data-sentiment", "bad");
  });

  it("states every account status as a word", () => {
    render(<AdminDashboardBlock {...BASE} accounts={ACCOUNTS} />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Past due")).toBeInTheDocument();
    expect(within(table).getByText("Trial")).toBeInTheDocument();
    expect(within(table).getByText("Active")).toBeInTheDocument();
  });

  it("names each Open button after its account", async () => {
    const user = userEvent.setup();
    const onOpenAccount = vi.fn();
    render(<AdminDashboardBlock {...BASE} accounts={ACCOUNTS} onOpenAccount={onOpenAccount} />);

    await user.click(screen.getByRole("button", { name: "Open Northwind" }));
    expect(onOpenAccount).toHaveBeenCalledWith(expect.objectContaining({ id: "a2" }));
  });

  it("links an account to its page when there is no handler", () => {
    render(<AdminDashboardBlock {...BASE} accounts={ACCOUNTS} />);
    expect(screen.getByRole("link", { name: "Acme Corp" })).toHaveAttribute(
      "href",
      "/admin/accounts/a1",
    );
  });

  it("explains an empty watch list", () => {
    render(<AdminDashboardBlock {...BASE} />);
    expect(screen.getByText("Nothing to watch")).toBeInTheDocument();
  });

  it("names the account menu after its owner and offers sign out", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    render(
      <AdminDashboardBlock
        {...BASE}
        user={{ name: "Dana Whitfield", role: "Owner" }}
        onSignOut={onSignOut}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Account menu for Dana Whitfield" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the shell and swaps the page when given children", () => {
    render(
      <AdminDashboardBlock
        {...BASE}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit log" }]}
      >
        <h1>Audit log</h1>
      </AdminDashboardBlock>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Audit log" })).toBeInTheDocument();
    expect(screen.queryByText("Nothing to watch")).not.toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Admin" }).length).toBeGreaterThan(0);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AdminDashboardBlock
        {...BASE}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Overview" }]}
        notices={NOTICES}
        stats={STATS}
        accounts={ACCOUNTS}
        onOpenAccount={() => undefined}
        user={{ name: "Dana Whitfield", role: "Owner" }}
        onSignOut={() => undefined}
        onOpenProfile={() => undefined}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
