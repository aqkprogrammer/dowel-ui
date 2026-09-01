import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Progress } from "./progress";

describe("Progress", () => {
  it("exposes a progressbar with its value", () => {
    render(<Progress value={40} aria-label="Upload" />);

    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("reports an indeterminate state differently from zero", () => {
    render(<Progress aria-label="Working" />);

    const bar = screen.getByRole("progressbar");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("data-state", "indeterminate");
  });

  it("treats zero as a real value, not as unknown", () => {
    render(<Progress value={0} aria-label="Upload" />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(bar).toHaveAttribute("data-state", "loading");
  });

  it("fills proportionally to the value", () => {
    const { container } = render(<Progress value={25} aria-label="Upload" />);
    const indicator = container.querySelector("[data-slot='progress-indicator']");
    expect(indicator).toHaveStyle({ transform: "translateX(-75%)" });
  });

  it("clamps a value outside the range", () => {
    const { container } = render(<Progress value={150} aria-label="Upload" max={100} />);
    const indicator = container.querySelector("[data-slot='progress-indicator']");
    expect(indicator).toHaveStyle({ transform: "translateX(-0%)" });
  });

  it.each([
    ["sm", "h-1"],
    ["md", "h-2"],
    ["lg", "h-3"],
  ] as const)("applies the %s size", (size, expectedClass) => {
    render(<Progress value={40} size={size} aria-label="Upload" />);
    expect(screen.getByRole("progressbar")).toHaveClass(expectedClass);
  });

  it.each([
    ["primary", "--progress-fill:var(--color-primary)"],
    ["success", "--progress-fill:var(--color-success)"],
    ["destructive", "--progress-fill:var(--color-destructive)"],
  ] as const)("applies the %s tone", (tone, expectedClass) => {
    render(<Progress value={40} tone={tone} aria-label="Upload" />);
    expect(screen.getByRole("progressbar").className).toContain(expectedClass);
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(<Progress value={40} className="h-6" aria-label="Upload" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveClass("h-6");
    expect(bar).not.toHaveClass("h-2");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div>
        <span id="upload-label">Uploading</span>
        <Progress value={40} aria-labelledby="upload-label" />
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
