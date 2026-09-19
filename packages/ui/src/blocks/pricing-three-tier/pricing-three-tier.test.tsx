import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PricingThreeTierBlock, type PricingTierPlan } from "./pricing-three-tier";

const PLANS: PricingTierPlan[] = [
  {
    id: "a",
    name: "Starter",
    monthly: 12,
    yearly: 9,
    features: ["One"],
    cta: { label: "Start", href: "/start" },
  },
  {
    id: "b",
    name: "Team",
    monthly: 30,
    features: ["Two"],
    featured: true,
    cta: { label: "Buy", onSelect: () => {} },
  },
];

describe("PricingThreeTierBlock", () => {
  it("is a section named by its heading, with a plan heading per card", () => {
    render(<PricingThreeTierBlock locale="en-US" />);
    expect(screen.getByRole("region", { name: "Choose your perfect plan" })).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Basic",
      "Pro",
      "Enterprise",
    ]);
  });

  it("starts on annual pricing and shows a custom price in words", () => {
    render(<PricingThreeTierBlock locale="en-US" />);
    expect(screen.getByRole("radio", { name: "Annually" })).toBeChecked();
    expect(screen.getByText("€10")).toBeInTheDocument();
    expect(screen.getByText("€25")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getAllByText("per month, billed yearly")).toHaveLength(2);
  });

  it("switches every price with the period, and announces it", async () => {
    const user = userEvent.setup();
    render(<PricingThreeTierBlock locale="en-US" />);
    expect(screen.getByText("Showing yearly pricing.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Monthly" }));
    expect(screen.getByText("€15")).toBeInTheDocument();
    expect(screen.getByText("€35")).toBeInTheDocument();
    expect(screen.getByText("Showing monthly pricing.")).toBeInTheDocument();
    expect(screen.getAllByText("per month")).toHaveLength(2);
  });

  it("moves between periods with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<PricingThreeTierBlock locale="en-US" />);
    const group = screen.getByRole("radiogroup", { name: "Billing period" });
    await user.tab();
    expect(within(group).getByRole("radio", { name: "Annually" })).toHaveFocus();
    // Selection-on-arrow is the primitive's, and jsdom cannot drive it (see radio-group tests).
    await user.keyboard("{ArrowLeft}");
    expect(within(group).getByRole("radio", { name: "Monthly" })).toHaveFocus();
  });

  it("names each call to action after its plan", () => {
    render(<PricingThreeTierBlock locale="en-US" />);
    expect(screen.getByRole("link", { name: "Get started, Pro plan" })).toHaveAttribute(
      "href",
      "#pro",
    );
    expect(screen.getByRole("link", { name: "Contact sales, Enterprise plan" })).toBeVisible();
  });

  it("marks the featured plan in text", () => {
    render(<PricingThreeTierBlock locale="en-US" />);
    expect(screen.getByText("Most popular")).toBeInTheDocument();
  });

  it("lists each plan's features under a label", () => {
    render(<PricingThreeTierBlock plans={PLANS} locale="en-US" />);
    const lists = screen.getAllByRole("list", { name: "What’s included:" });
    expect(lists).toHaveLength(2);
    expect(within(lists[0] as HTMLElement).getByText("One")).toBeInTheDocument();
  });

  it("uses a button, and reports the choice, when a plan has no link", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const plans = PLANS.map((plan) =>
      plan.id === "b" ? { ...plan, cta: { label: "Buy", onSelect } } : plan,
    );
    render(<PricingThreeTierBlock plans={plans} locale="en-US" />);
    await user.click(screen.getByRole("button", { name: "Buy, Team plan" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("bills yearly at the monthly rate when a plan has no yearly price", () => {
    render(<PricingThreeTierBlock plans={PLANS} locale="en-US" />);
    expect(screen.getByText("€30")).toBeInTheDocument();
    expect(screen.getAllByText("per month")).toHaveLength(1);
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    const onPeriodChange = vi.fn();
    render(
      <PricingThreeTierBlock
        plans={PLANS}
        locale="en-US"
        period="monthly"
        onPeriodChange={onPeriodChange}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "Annually" }));
    expect(onPeriodChange).toHaveBeenCalledWith("yearly");
    expect(screen.getByText("€12")).toBeInTheDocument();
  });

  it("formats in another currency and can hide the toggle", () => {
    render(
      <PricingThreeTierBlock
        plans={PLANS}
        locale="en-US"
        currency="USD"
        defaultPeriod="monthly"
        showPeriodToggle={false}
        description={null}
      />,
    );
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByText("$12")).toBeInTheDocument();
  });

  it("takes localised labels", () => {
    render(
      <PricingThreeTierBlock
        locale="en-US"
        labels={{
          period: "Facturación",
          monthly: "Mensual",
          yearly: "Anual",
          planSuffix: (plan) => `, plan ${plan}`,
          announce: (period) =>
            period === "yearly" ? "Precios anuales." : "Precios mensuales.",
        }}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Facturación" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Anual" })).toBeChecked();
    expect(screen.getByText("Precios anuales.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started, plan Pro" })).toBeInTheDocument();
  });

  it("re-levels its headings", () => {
    render(<PricingThreeTierBlock locale="en-US" headingLevel={6} />);
    expect(screen.getAllByRole("heading", { level: 6 })).toHaveLength(4);
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<PricingThreeTierBlock ref={ref} className="bg-background" locale="en-US" />);
    expect(ref.current).toHaveClass("bg-background");
    expect(ref.current).not.toHaveClass("bg-muted/50");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PricingThreeTierBlock locale="en-US" />);
    await expectNoA11yViolations(container);
  });
});
