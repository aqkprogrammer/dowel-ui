import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders its label", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it.each([
    ["default", "bg-primary"],
    ["secondary", "bg-secondary"],
    ["outline", "border-border-strong"],
    ["destructive", "bg-destructive"],
    ["success", "bg-success"],
    ["warning", "bg-warning"],
    ["info", "bg-info"],
  ] as const)("applies the %s variant", (variant, expectedClass) => {
    render(<Badge variant={variant}>Label</Badge>);
    expect(screen.getByText("Label")).toHaveClass(expectedClass);
  });

  it.each([
    ["sm", "h-5"],
    ["md", "h-6"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    render(<Badge size={size}>Label</Badge>);
    expect(screen.getByText("Label")).toHaveClass(expectedClass);
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(<Badge className="bg-card">Label</Badge>);
    const badge = screen.getByText("Label");
    expect(badge).toHaveClass("bg-card");
    expect(badge).not.toHaveClass("bg-primary");
  });

  it("renders as a link when asChild is set", () => {
    render(
      <Badge asChild>
        <a href="/status">Active</a>
      </Badge>,
    );
    const link = screen.getByRole("link", { name: "Active" });
    expect(link).toHaveAttribute("href", "/status");
    expect(link).toHaveClass("bg-primary");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <Badge>Active</Badge>
        <Badge variant="destructive">Failed</Badge>
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
