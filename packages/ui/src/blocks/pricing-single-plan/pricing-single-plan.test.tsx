import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PricingSinglePlanBlock } from "./pricing-single-plan";

describe("PricingSinglePlanBlock", () => {
  it("is a section named by its heading, with the plan's heading below it", () => {
    render(<PricingSinglePlanBlock locale="en-US" />);
    expect(screen.getByRole("region", { name: "Simple pricing for everyone" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "Pro" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
  });

  it("starts annual, says what annual saves, and announces a switch to monthly", async () => {
    const user = userEvent.setup();
    render(<PricingSinglePlanBlock locale="en-US" />);
    expect(screen.getByText("€15")).toBeInTheDocument();
    expect(screen.getByText("Save 20%")).toBeInTheDocument();
    expect(screen.getByText("per month, billed yearly")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Monthly" }));
    expect(screen.getByText("€19")).toBeInTheDocument();
    expect(screen.getByText("Showing monthly pricing.")).toBeInTheDocument();
    expect(screen.getByText("per month")).toBeInTheDocument();
  });

  it("names the call to action after the plan", () => {
    render(<PricingSinglePlanBlock locale="en-US" />);
    expect(screen.getByRole("link", { name: "Get started, Pro plan" })).toHaveAttribute(
      "href",
      "#get-started",
    );
  });

  it("takes a plan from props, with a button call to action and a custom price", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PricingSinglePlanBlock
        locale="en-US"
        savings={null}
        plan={{
          id: "team",
          name: "Team",
          monthly: null,
          featured: true,
          features: ["Everything"],
          cta: { label: "Talk to us", onSelect },
        }}
      />,
    );
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText("Most popular")).toBeInTheDocument();
    expect(screen.queryByText("Save 20%")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Talk to us, Team plan" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("can be controlled, and can hide the toggle", async () => {
    const user = userEvent.setup();
    const onPeriodChange = vi.fn();
    const { rerender } = render(
      <PricingSinglePlanBlock
        locale="en-US"
        period="monthly"
        onPeriodChange={onPeriodChange}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "Annually" }));
    expect(onPeriodChange).toHaveBeenCalledWith("yearly");
    expect(screen.getByText("€19")).toBeInTheDocument();

    rerender(
      <PricingSinglePlanBlock locale="en-US" showPeriodToggle={false} description={null} />,
    );
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("moves focus between periods with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<PricingSinglePlanBlock locale="en-US" />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Annually" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Monthly" })).toHaveFocus();
  });

  it("re-levels its headings", () => {
    render(<PricingSinglePlanBlock locale="en-US" headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Simple pricing");
    expect(screen.getByRole("heading", { level: 4, name: "Pro" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<PricingSinglePlanBlock ref={ref} className="bg-background" locale="en-US" />);
    expect(ref.current).toHaveClass("bg-background");
    expect(ref.current).not.toHaveClass("bg-muted/50");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PricingSinglePlanBlock locale="en-US" />);
    await expectNoA11yViolations(container);
  });
});
