import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BillingBlock, describeUsage, type BillingInvoice, type BillingUsage } from "./billing";

const PLAN = {
  name: "Team",
  price: "$240",
  interval: "per month, billed annually",
  renewsAt: "2027-03-03",
  renewsLabel: "3 March 2027",
};

const USAGE: BillingUsage[] = [
  { id: "seats", label: "Seats", used: 8, limit: 10, unit: "seats" },
  { id: "storage", label: "Storage", used: 42, limit: 40, unit: "GB" },
  { id: "requests", label: "API requests", used: 128_400 },
];

const INVOICES: BillingInvoice[] = [
  {
    id: "in_3",
    at: "2026-02-01",
    label: "1 February 2026",
    amount: "$240.00",
    status: "paid",
    href: "/invoices/in_3.pdf",
  },
  {
    id: "in_2",
    at: "2026-01-01",
    label: "1 January 2026",
    amount: "$240.00",
    status: "past-due",
    href: "/invoices/in_2.pdf",
  },
];

describe("describeUsage", () => {
  it("says how much is left", () => {
    expect(describeUsage({ id: "a", label: "Seats", used: 8, limit: 10, unit: "seats" })).toBe(
      "8 of 10 seats used — 2 seats left",
    );
  });

  it("says when it is exactly at the limit, rather than that none are left", () => {
    expect(describeUsage({ id: "a", label: "Seats", used: 10, limit: 10, unit: "seats" })).toBe(
      "10 of 10 seats used — at the limit",
    );
  });

  it("says how far over, not a negative remainder", () => {
    expect(describeUsage({ id: "a", label: "Storage", used: 42, limit: 40, unit: "GB" })).toBe(
      "42 of 40 GB used — 2 GB over the limit",
    );
  });

  it("states the figure alone for an unmetered resource", () => {
    expect(describeUsage({ id: "a", label: "Requests", used: 1000 })).toBe("1,000 used");
  });

  it("uses the caller's formatter", () => {
    expect(
      describeUsage({
        id: "a",
        label: "Spend",
        used: 12,
        limit: 100,
        format: (value) => `$${String(value)}`,
      }),
    ).toBe("$12 of $100 used — $88 left");
  });
});

describe("BillingBlock", () => {
  it("shows the plan and what it costs", () => {
    render(<BillingBlock plan={PLAN} />);
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("$240")).toBeInTheDocument();
  });

  it("gives the renewal date a machine-readable time", () => {
    render(<BillingBlock plan={PLAN} />);
    const time = screen.getByText("3 March 2027");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "2027-03-03");
  });

  it("says access ends, not renews, when the plan is cancelling", () => {
    render(<BillingBlock plan={{ ...PLAN, cancelsAtPeriodEnd: true }} />);
    expect(screen.getByText(/Access ends/)).toBeInTheDocument();
    expect(screen.queryByText(/Renews/)).not.toBeInTheDocument();
  });

  it("states every usage figure in words, not only as a bar", () => {
    render(<BillingBlock plan={PLAN} usage={USAGE} />);
    expect(screen.getByText("8 of 10 seats used — 2 seats left")).toBeInTheDocument();
    expect(screen.getByText("42 of 40 GB used — 2 GB over the limit")).toBeInTheDocument();
  });

  it("hides the bar from the accessibility tree, so the fact is announced once", () => {
    const { container } = render(<BillingBlock plan={PLAN} usage={USAGE} />);

    const bars = container.querySelectorAll('[data-slot="progress"]');
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("draws no bar for an unmetered resource", () => {
    const { container } = render(
      <BillingBlock plan={PLAN} usage={[{ id: "r", label: "Requests", used: 10 }]} />,
    );
    expect(container.querySelector('[data-slot="progress"]')).toBeNull();
    expect(screen.getByText("10 used")).toBeInTheDocument();
  });

  it("spells a card's last four digits so they are not read as a number", () => {
    render(
      <BillingBlock
        plan={PLAN}
        paymentMethod={{ brand: "Visa", last4: "4242", expires: "04/2029" }}
      />,
    );

    expect(screen.getByText("ending 4 2 4 2")).toBeInTheDocument();
    // Still the familiar masked form on screen.
    expect(screen.getByText("•••• 4242")).toHaveAttribute("aria-hidden");
  });

  it("names each invoice download after its invoice", () => {
    render(<BillingBlock plan={PLAN} invoices={INVOICES} />);

    // The whole point: two links that a links list can tell apart.
    expect(
      screen.getByRole("link", { name: "Download invoice for 1 February 2026" }),
    ).toHaveAttribute("href", "/invoices/in_3.pdf");
    expect(
      screen.getByRole("link", { name: "Download invoice for 1 January 2026" }),
    ).toBeInTheDocument();
  });

  it("omits the download when there is no file", () => {
    render(<BillingBlock plan={PLAN} invoices={[{ ...INVOICES[0]!, href: undefined }]} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("marks each invoice's status in words", () => {
    render(<BillingBlock plan={PLAN} invoices={INVOICES} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Paid")).toBeInTheDocument();
    expect(within(table).getByText("Past due")).toBeInTheDocument();
  });

  it("explains an empty invoice list instead of showing an empty table", () => {
    render(<BillingBlock plan={PLAN} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("No invoices yet")).toBeInTheDocument();
  });

  it("changes plan from the keyboard", async () => {
    const user = userEvent.setup();
    const onChangePlan = vi.fn();
    render(<BillingBlock plan={PLAN} onChangePlan={onChangePlan} />);

    const button = screen.getByRole("button", { name: "Change plan" });
    button.focus();
    await user.keyboard("{Enter}");

    expect(onChangePlan).toHaveBeenCalledTimes(1);
  });

  it("adds rather than updates a payment method when there is none", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<BillingBlock plan={PLAN} onUpdatePaymentMethod={onUpdate} />);

    await user.click(screen.getByRole("button", { name: "Add payment method" }));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <BillingBlock
        plan={PLAN}
        usage={USAGE}
        paymentMethod={{ brand: "Visa", last4: "4242", expires: "04/2029" }}
        invoices={INVOICES}
        onChangePlan={() => undefined}
        onUpdatePaymentMethod={() => undefined}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
