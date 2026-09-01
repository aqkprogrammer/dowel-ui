import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PricingBlock, type PricingPlan } from "./pricing";

const PLANS: PricingPlan[] = [
  {
    id: "hobby",
    name: "Hobby",
    description: "Personal projects.",
    monthly: 0,
    features: ["1 project"],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Teams shipping to production.",
    monthly: 20,
    yearlyPerMonth: 16,
    features: ["Unlimited projects", "Priority support"],
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "SSO and audit logs.",
    monthly: null,
    features: ["SSO"],
  },
];

describe("PricingBlock", () => {
  it("renders each plan with its price", () => {
    render(<PricingBlock plans={PLANS} />);
    expect(screen.getByText("$20")).toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("shows a custom price as words, not a number", () => {
    render(<PricingBlock plans={PLANS} />);
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("names each call to action after its plan", () => {
    render(<PricingBlock plans={PLANS} />);
    // Three buttons all reading "Choose" are indistinguishable out of context.
    expect(screen.getByRole("button", { name: "Choose Pro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose Hobby" })).toBeInTheDocument();
  });

  it("marks the recommended plan in text", () => {
    render(<PricingBlock plans={PLANS} />);
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("switches every price when the period changes", async () => {
    const user = userEvent.setup();
    render(<PricingBlock plans={PLANS} />);

    expect(screen.getByText("$20")).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Bill yearly" }));
    expect(screen.getByText("$16")).toBeInTheDocument();
  });

  it("announces the period change, since it rewrites the whole page", async () => {
    const user = userEvent.setup();
    render(<PricingBlock plans={PLANS} />);

    expect(screen.getByText("Showing monthly pricing.")).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Bill yearly" }));
    expect(screen.getByText("Showing yearly pricing.")).toBeInTheDocument();
  });

  it("can hide the period toggle", () => {
    render(<PricingBlock plans={PLANS} showPeriodToggle={false} />);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("reports which plan was chosen", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <PricingBlock plans={PLANS.map((p) => (p.id === "pro" ? { ...p, onSelect } : p))} />,
    );

    await user.click(screen.getByRole("button", { name: "Choose Pro" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("is a named section", () => {
    render(<PricingBlock plans={PLANS} title="Plans" />);
    expect(screen.getByRole("region", { name: "Plans" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PricingBlock plans={PLANS} />);
    await expectNoA11yViolations(container);
  });
});
