import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PricingTwoTierBlock, type PricingTierPlan } from "./pricing-two-tier";

const PLANS: PricingTierPlan[] = [
  { id: "free", name: "Free", monthly: 0, features: ["One"], cta: { label: "Join" } },
  {
    id: "plus",
    name: "Plus",
    monthly: 20,
    yearly: 16,
    featured: true,
    features: ["Two"],
    cta: { label: "Upgrade", href: "/plus" },
  },
];

describe("PricingTwoTierBlock", () => {
  it("is a section named by its heading, with two plans", () => {
    render(<PricingTwoTierBlock locale="en-US" />);
    expect(screen.getByRole("region", { name: "Deploy faster with Pro" })).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Hobby",
      "Pro",
    ]);
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("shows annual prices first, and switches and announces the period", async () => {
    const user = userEvent.setup();
    render(<PricingTwoTierBlock locale="en-US" />);
    expect(screen.getByText("€0")).toBeInTheDocument();
    expect(screen.getByText("€12")).toBeInTheDocument();
    expect(screen.getByText("Showing yearly pricing.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Monthly" }));
    expect(screen.getByText("€25")).toBeInTheDocument();
    expect(screen.getByText("Showing monthly pricing.")).toBeInTheDocument();
  });

  it("moves focus between periods with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<PricingTwoTierBlock locale="en-US" />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Annually" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Monthly" })).toHaveFocus();
  });

  it("names each call to action after its plan, as a link or a button", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const plans = PLANS.map((plan) =>
      plan.id === "free" ? { ...plan, cta: { label: "Join", onSelect } } : plan,
    );
    render(<PricingTwoTierBlock plans={plans} locale="en-US" />);
    expect(screen.getByRole("link", { name: "Upgrade, Plus plan" })).toHaveAttribute(
      "href",
      "/plus",
    );
    await user.click(screen.getByRole("button", { name: "Join, Free plan" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("lists each plan's features under a label", () => {
    render(<PricingTwoTierBlock plans={PLANS} locale="en-US" />);
    const lists = screen.getAllByRole("list", { name: "What’s included:" });
    expect(within(lists[1] as HTMLElement).getByText("Two")).toBeInTheDocument();
  });

  it("can be controlled, and can hide the toggle", async () => {
    const user = userEvent.setup();
    const onPeriodChange = vi.fn();
    const { rerender } = render(
      <PricingTwoTierBlock
        plans={PLANS}
        locale="en-US"
        period="monthly"
        onPeriodChange={onPeriodChange}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "Annually" }));
    expect(onPeriodChange).toHaveBeenCalledWith("yearly");
    expect(screen.getByText("€20")).toBeInTheDocument();

    rerender(
      <PricingTwoTierBlock
        plans={PLANS}
        locale="en-US"
        period="yearly"
        showPeriodToggle={false}
      />,
    );
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByText("€16")).toBeInTheDocument();
    expect(screen.getByText("per month, billed yearly")).toBeInTheDocument();
  });

  it("re-levels its headings", () => {
    render(<PricingTwoTierBlock locale="en-US" headingLevel={1} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Deploy faster with Pro",
    );
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<PricingTwoTierBlock ref={ref} className="bg-background" locale="en-US" />);
    expect(ref.current).toHaveClass("bg-background");
    expect(ref.current).not.toHaveClass("bg-muted/50");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PricingTwoTierBlock locale="en-US" />);
    await expectNoA11yViolations(container);
  });
});
