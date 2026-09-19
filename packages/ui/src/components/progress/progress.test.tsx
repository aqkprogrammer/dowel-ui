import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("Progress motion (SmoothUI AnimatedProgressBar)", () => {
  const indicatorOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>("[data-slot='progress-indicator']");

  it("keeps the smooth ease and no effect by default", () => {
    const { container } = render(<Progress aria-label="Upload" value={40} />);
    const indicator = indicatorOf(container);
    expect(indicator).toHaveClass("ease-[var(--ease-out-quint)]");
    expect(indicator).not.toHaveAttribute("data-effect");
    expect(document.head.querySelector("style[data-href='dowel-progress']")).toBeNull();
  });

  it("overshoots and settles with the spring easing", () => {
    const { container } = render(<Progress aria-label="Upload" value={40} easing="spring" />);
    const indicator = indicatorOf(container);
    expect(indicator).toHaveClass("ease-[var(--ease-overshoot)]");
    expect(indicator).not.toHaveClass("ease-[var(--ease-out-quint)]");
  });

  it("fills from empty on mount while announcing the real value throughout", async () => {
    const { container } = render(<Progress aria-label="Quota" value={60} fillOnMount />);
    const indicator = indicatorOf(container);

    expect(indicator).toHaveStyle({ transform: "translateX(-100%)" });
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");

    await waitFor(() => {
      expect(indicator).toHaveStyle({ transform: "translateX(-40%)" });
    });
  });

  it("cancels the pending fill if it unmounts first", () => {
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const { unmount } = render(<Progress aria-label="Quota" value={60} fillOnMount />);
    unmount();
    expect(cancel).toHaveBeenCalled();
    cancel.mockRestore();
  });

  it.each(["striped", "shine"] as const)(
    "marks the fill for the %s effect and ships its stylesheet",
    (effect) => {
      const { container } = render(<Progress aria-label="Upload" value={40} effect={effect} />);
      expect(indicatorOf(container)).toHaveAttribute("data-effect", effect);
      const sheet = document.head.querySelector("style[data-href='dowel-progress']");
      expect(sheet?.textContent).toContain("@keyframes dowel-progress-");
      // Durations go through the scale, so reduced motion reaches them.
      expect(sheet?.textContent).toContain("var(--motion-scale, 1)");
    },
  );

  it("leaves effects off an indeterminate bar, which keeps its own indicator sweep", () => {
    const { container } = render(<Progress aria-label="Loading" effect="striped" />);
    const indicator = indicatorOf(container);
    expect(indicator).not.toHaveAttribute("data-effect");
    expect(indicator).toHaveAttribute("data-motion", "indicator");
  });

  it("never exempts a decorated determinate bar from reduced motion", () => {
    const { container } = render(<Progress aria-label="Upload" value={40} effect="shine" />);
    expect(indicatorOf(container)).not.toHaveAttribute("data-motion");
  });

  it("has no accessibility violations with effects", async () => {
    const { container } = render(
      <Progress aria-label="Upload" value={40} effect="striped" easing="spring" fillOnMount />,
    );
    await expectNoA11yViolations(container);
  });
});
