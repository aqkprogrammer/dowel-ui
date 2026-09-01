import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("is hidden from assistive technology", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector("[data-slot='skeleton']")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("animates", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveClass("animate-pulse-soft");
  });

  it("takes its shape from the consumer className", () => {
    const { container } = render(<Skeleton className="h-4 w-32 rounded-full" />);
    const skeleton = container.firstElementChild;
    expect(skeleton).toHaveClass("h-4", "w-32", "rounded-full");
    expect(skeleton).not.toHaveClass("rounded-md");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div aria-busy="true">
        <Skeleton className="h-4 w-32" />
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
