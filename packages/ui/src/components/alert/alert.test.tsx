import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Alert, AlertDescription, AlertTitle } from "./alert";

describe("Alert", () => {
  it("renders its title and description", () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Your trial ends in 3 days.</AlertDescription>
      </Alert>,
    );

    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("Your trial ends in 3 days.")).toBeInTheDocument();
  });

  it("is not a live region by default", () => {
    render(
      <Alert data-testid="alert">
        <AlertTitle>Heads up</AlertTitle>
      </Alert>,
    );

    const alert = screen.getByTestId("alert");
    expect(alert).not.toHaveAttribute("role");
    expect(alert).not.toHaveAttribute("aria-live");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("becomes a polite status region when live is polite", () => {
    render(
      <Alert live="polite">
        <AlertTitle>Saved</AlertTitle>
      </Alert>,
    );

    const alert = screen.getByRole("status");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("becomes an assertive alert region when live is assertive", () => {
    render(
      <Alert live="assertive" variant="destructive">
        <AlertTitle>Payment failed</AlertTitle>
      </Alert>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it.each([
    ["default", "bg-card"],
    ["destructive", "bg-destructive/8"],
    ["success", "bg-success/8"],
    ["warning", "bg-warning/10"],
    ["info", "bg-info/8"],
  ] as const)("applies the %s variant", (variant, expectedClass) => {
    render(
      <Alert variant={variant} data-testid="alert">
        <AlertTitle>Title</AlertTitle>
      </Alert>,
    );
    expect(screen.getByTestId("alert")).toHaveClass(expectedClass);
  });

  it("merges a consumer className", () => {
    render(
      <Alert className="mt-8" data-testid="alert">
        <AlertTitle>Title</AlertTitle>
      </Alert>,
    );
    expect(screen.getByTestId("alert")).toHaveClass("mt-8");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <Alert>
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>Your trial ends in 3 days.</AlertDescription>
        </Alert>
        <Alert live="assertive" variant="destructive">
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>Update your card to continue.</AlertDescription>
        </Alert>
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
