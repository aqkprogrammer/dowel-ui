import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Separator } from "./separator";

describe("Separator", () => {
  it("is decorative by default and stays out of the accessibility tree", () => {
    render(<Separator data-testid="rule" />);
    expect(screen.getByTestId("rule")).toHaveAttribute("role", "none");
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("exposes a separator role when it is not decorative", () => {
    render(<Separator decorative={false} />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("renders horizontally by default", () => {
    render(<Separator data-testid="rule" />);
    expect(screen.getByTestId("rule")).toHaveClass("h-px", "w-full");
  });

  it("renders vertically when asked", () => {
    render(<Separator orientation="vertical" data-testid="rule" />);
    const rule = screen.getByTestId("rule");
    expect(rule).toHaveClass("w-px", "h-full");
    expect(rule).toHaveAttribute("data-orientation", "vertical");
  });

  it("merges a consumer className", () => {
    render(<Separator className="my-4" data-testid="rule" />);
    expect(screen.getByTestId("rule")).toHaveClass("my-4", "bg-border");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div>
        <p>Above</p>
        <Separator decorative={false} />
        <p>Below</p>
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
