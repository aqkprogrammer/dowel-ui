import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Label } from "./label";

describe("Label", () => {
  it("renders its text", () => {
    render(<Label htmlFor="name">Full name</Label>);
    expect(screen.getByText("Full name")).toBeInTheDocument();
  });

  it("associates itself with a control via htmlFor", () => {
    render(
      <>
        <Label htmlFor="name">Full name</Label>
        <input id="name" />
      </>,
    );
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
  });

  it("moves focus to its control when clicked", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="name">Full name</Label>
        <input id="name" />
      </>,
    );

    await user.click(screen.getByText("Full name"));
    expect(screen.getByLabelText("Full name")).toHaveFocus();
  });

  it("merges a consumer className", () => {
    render(
      <Label htmlFor="name" className="text-destructive">
        Full name
      </Label>,
    );
    expect(screen.getByText("Full name")).toHaveClass("text-destructive", "font-medium");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <Label htmlFor="name">Full name</Label>
        <input id="name" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
