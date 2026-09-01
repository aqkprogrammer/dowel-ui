import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("is hidden from assistive technology by default", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces itself when given a label", () => {
    render(<Spinner label="Loading results" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading results");
  });

  it.each([
    ["xs", "size-3"],
    ["sm", "size-3.5"],
    ["md", "size-4"],
    ["lg", "size-5"],
    ["xl", "size-6"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    const { container } = render(<Spinner size={size} />);
    expect(container.querySelector("svg")).toHaveClass(expectedClass);
  });

  it("lets a consumer className override the size", () => {
    const { container } = render(<Spinner className="size-10" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("size-10");
    expect(svg).not.toHaveClass("size-4");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Spinner label="Loading" />);
    await expectNoA11yViolations(container);
  });
});
