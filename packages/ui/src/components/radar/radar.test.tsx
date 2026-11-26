import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Radar } from "./radar";

describe("Radar", () => {
  it("is decorative without a label", () => {
    const { container } = render(<Radar />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("is a named image with a label", () => {
    render(<Radar label="Scanning for devices" />);
    const scope = screen.getByRole("img", { name: "Scanning for devices" });
    expect(scope).not.toHaveAttribute("aria-hidden");
  });

  it("draws one ring per `rings` and one blip per entry", () => {
    const { container } = render(
      <Radar
        rings={4}
        blips={[
          { angle: 90, distance: 0.5 },
          { angle: 180, distance: 1 },
        ]}
      />,
    );
    expect(container.querySelectorAll("circle")).toHaveLength(4);
    const blips = container.querySelectorAll<HTMLElement>("[data-slot=radar-blip]");
    expect(blips).toHaveLength(2);
    // East at half reach, south at full reach.
    expect(blips[0]!.style.left).toBe("73%");
    expect(blips[1]!.style.top).toBe("96%");
  });

  it("scales the period by the motion scale and phases each blip by its bearing", () => {
    const { container } = render(
      <Radar period={3000} blips={[{ angle: 90, distance: 0.5 }]} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--radar-period")).toBe(
      "calc(3000ms * var(--motion-scale, 1))",
    );
    const blip = container.querySelector<HTMLElement>("[data-slot=radar-blip]")!;
    expect(blip.style.getPropertyValue("--radar-delay")).toContain("-0.75");
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Radar ref={ref} label="Radar" className="custom" />);
    expect(ref.current).toBe(screen.getByRole("img"));
    expect(ref.current).toHaveClass("custom", "rounded-full");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Radar label="Scanning" />);
    await expectNoA11yViolations(container);
  });
});
