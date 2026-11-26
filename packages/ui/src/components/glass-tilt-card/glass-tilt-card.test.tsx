import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { GlassTiltCard } from "./glass-tilt-card";

function box(element: Element) {
  element.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
    }) as DOMRect;
}

describe("GlassTiltCard", () => {
  it("renders its children with no role of its own", () => {
    render(
      <GlassTiltCard data-testid="card">
        <a href="/profile">Profile</a>
      </GlassTiltCard>,
    );
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByTestId("card")).not.toHaveAttribute("role");
    expect(screen.getByTestId("card")).not.toHaveAttribute("tabindex");
  });

  it("tilts toward the pointer and rests when it leaves", () => {
    const { container } = render(<GlassTiltCard data-testid="card" />);
    const root = screen.getByTestId("card");
    const surface = container.querySelector<HTMLElement>(
      "[data-slot=glass-tilt-card-surface]",
    )!;
    box(root);

    fireEvent.pointerMove(root, { clientX: 200, clientY: 0, pointerType: "mouse" });
    expect(root).toHaveAttribute("data-tilt", "follow");
    expect(surface.style.transform).toContain("rotateX(14deg)");
    expect(surface.style.transform).toContain("rotateY(14deg)");
    expect(root.style.getPropertyValue("--glass-tilt-card-x")).toBe("100%");

    fireEvent.pointerLeave(root, { pointerType: "mouse" });
    expect(root).not.toHaveAttribute("data-tilt");
    expect(surface.style.transform).toBe("");
  });

  it("does not tilt for touch or when disabled", () => {
    const { container, rerender } = render(<GlassTiltCard data-testid="card" />);
    const root = screen.getByTestId("card");
    const surface = container.querySelector<HTMLElement>(
      "[data-slot=glass-tilt-card-surface]",
    )!;
    box(root);

    fireEvent.pointerMove(root, { clientX: 150, clientY: 50, pointerType: "touch" });
    expect(surface.style.transform).toBe("");

    rerender(<GlassTiltCard data-testid="card" disabled />);
    fireEvent.pointerMove(root, { clientX: 150, clientY: 50, pointerType: "mouse" });
    expect(surface.style.transform).toBe("");
    expect(container.querySelector("[data-sway]")).toBeNull();
  });

  it("sways at rest unless turned off, and can drop the glare", () => {
    const { container, rerender } = render(<GlassTiltCard />);
    expect(container.querySelector("[data-sway]")).not.toBeNull();
    expect(container.querySelector("[data-slot=glass-tilt-card-glare]")).not.toBeNull();
    rerender(<GlassTiltCard sway={false} glare={false} />);
    expect(container.querySelector("[data-sway]")).toBeNull();
    expect(container.querySelector("[data-slot=glass-tilt-card-glare]")).toBeNull();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <GlassTiltCard
        ref={ref}
        data-testid="card"
        className="custom"
        surfaceClassName="glass"
      />,
    );
    expect(ref.current).toBe(screen.getByTestId("card"));
    expect(ref.current).toHaveClass("custom", "inline-block");
    expect(ref.current!.querySelector("[data-slot=glass-tilt-card-surface]")).toHaveClass(
      "glass",
      "rounded-2xl",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <GlassTiltCard>
        <p>Member since 2024</p>
      </GlassTiltCard>,
    );
    await expectNoA11yViolations(container);
  });
});
