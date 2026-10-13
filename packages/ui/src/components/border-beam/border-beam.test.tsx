import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BorderBeam } from "./border-beam";

function beamIn(container: HTMLElement) {
  const beam = container.querySelector<HTMLElement>("[data-slot=border-beam]");
  if (!beam) throw new Error("no beam");
  return beam;
}

function sheet() {
  return document.querySelector("style[data-href='dowel-border-beam']")?.textContent ?? "";
}

describe("BorderBeam", () => {
  it("decorates its parent without changing its role, name or hit area", async () => {
    const { container } = render(
      <button type="button" className="relative rounded-lg border">
        Generate
        <BorderBeam />
      </button>,
    );
    const button = screen.getByRole("button", { name: "Generate" });
    const beam = beamIn(container);
    expect(button).toContainElement(beam);
    expect(beam).toHaveAttribute("aria-hidden", "true");
    expect(beam).toHaveClass(
      "pointer-events-none",
      "absolute",
      "-inset-px",
      "rounded-[inherit]",
    );
    expect(beam.querySelector("[data-slot=border-beam-line]")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("ships its own stylesheet once, however many beams there are", () => {
    render(
      <>
        <div className="relative">
          <BorderBeam />
        </div>
        <div className="relative">
          <BorderBeam tone="brand" />
        </div>
      </>,
    );
    expect(document.querySelectorAll("style[data-href='dowel-border-beam']")).toHaveLength(1);
    const css = sheet();
    expect(css).toContain("@property --dowel-border-beam-angle");
    expect(css).toContain("@keyframes dowel-border-beam-turn");
    expect(css).toContain("mask-composite");
    expect(css).toContain("forced-colors:active");
  });

  it("sets duration, delay, length and thickness, scaled and clamped", () => {
    const { container, rerender } = render(<BorderBeam />);
    const beam = beamIn(container);
    expect(beam.style.getPropertyValue("--dowel-border-beam-duration")).toBe(
      "calc(6000ms * var(--motion-scale, 1))",
    );
    expect(beam.style.getPropertyValue("--dowel-border-beam-delay")).toBe(
      "calc(0ms * var(--motion-scale, 1))",
    );
    expect(beam.style.getPropertyValue("--dowel-border-beam-length")).toBe("72deg");
    expect(beam.style.getPropertyValue("--dowel-border-beam-thickness")).toBe("1px");

    rerender(<BorderBeam duration={2400} delay={-600} length={0.5} thickness={2} />);
    expect(beam.style.getPropertyValue("--dowel-border-beam-duration")).toBe(
      "calc(2400ms * var(--motion-scale, 1))",
    );
    expect(beam.style.getPropertyValue("--dowel-border-beam-delay")).toBe(
      "calc(-600ms * var(--motion-scale, 1))",
    );
    expect(beam.style.getPropertyValue("--dowel-border-beam-length")).toBe("180deg");
    expect(beam.style.getPropertyValue("--dowel-border-beam-thickness")).toBe("2px");

    rerender(<BorderBeam duration={-5} length={4} thickness={-1} />);
    expect(beam.style.getPropertyValue("--dowel-border-beam-duration")).toBe(
      "calc(0ms * var(--motion-scale, 1))",
    );
    expect(beam.style.getPropertyValue("--dowel-border-beam-length")).toBe("360deg");
    expect(beam.style.getPropertyValue("--dowel-border-beam-thickness")).toBe("0px");

    rerender(<BorderBeam length={Number.NaN} />);
    expect(beam.style.getPropertyValue("--dowel-border-beam-length")).toBe("72deg");
  });

  it("colours the beam from its tone, and lets color and colorTo override it", () => {
    const { container, rerender } = render(<BorderBeam />);
    const beam = beamIn(container);
    expect(beam.className).toContain("--dowel-border-beam-from:var(--color-primary)");
    rerender(<BorderBeam tone="brand" />);
    expect(beam.className).toContain("--dowel-border-beam-to:var(--color-warning)");
    rerender(<BorderBeam tone="success" />);
    expect(beam.className).toContain("--dowel-border-beam-from:var(--color-success)");

    rerender(<BorderBeam color="var(--color-info)" colorTo="transparent" />);
    expect(beam.style.getPropertyValue("--dowel-border-beam-from")).toBe("var(--color-info)");
    expect(beam.style.getPropertyValue("--dowel-border-beam-to")).toBe("transparent");
  });

  it("travels anticlockwise when reversed", () => {
    const { container, rerender } = render(<BorderBeam />);
    const beam = beamIn(container);
    expect(beam.style.getPropertyValue("--dowel-border-beam-direction")).toBe("");
    rerender(<BorderBeam reverse />);
    expect(beam.style.getPropertyValue("--dowel-border-beam-direction")).toBe("reverse");
  });

  it("adds a glow outside the masked line, where the mask cannot clip it", () => {
    const { container, rerender } = render(<BorderBeam />);
    const beam = beamIn(container);
    expect(beam.className).not.toContain("drop-shadow");
    rerender(<BorderBeam glow />);
    expect(beam.className).toContain("drop-shadow");
    expect(beam.querySelector("[data-slot=border-beam-line]")?.className ?? "").not.toContain(
      "drop-shadow",
    );
  });

  it("runs only while the parent is hovered or focused with trigger=hover", () => {
    const { container, rerender } = render(<BorderBeam />);
    const beam = beamIn(container);
    expect(beam).toHaveAttribute("data-trigger", "always");
    rerender(<BorderBeam trigger="hover" />);
    expect(beam).toHaveAttribute("data-trigger", "hover");
    const css = sheet();
    expect(css).toContain(
      "[data-trigger=hover]>[data-slot=border-beam-line]{animation-play-state:paused}",
    );
    expect(css).toContain(":focus-visible>[data-slot=border-beam][data-trigger=hover]");
    expect(css).toContain(":focus-within>[data-slot=border-beam][data-trigger=hover]");
  });

  it("lets className win a conflict, merges style, forwards its ref and spreads props", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(
      <BorderBeam
        ref={ref}
        className="inset-0"
        style={{ opacity: 0.5 }}
        data-testid="beam"
        id="beam"
      />,
    );
    const beam = beamIn(container);
    expect(ref.current).toBe(beam);
    expect(beam).toHaveClass("inset-0");
    expect(beam).not.toHaveClass("-inset-px");
    expect(beam).toHaveAttribute("id", "beam");
    expect(beam.style.opacity).toBe("0.5");
    expect(beam.style.getPropertyValue("--dowel-border-beam-length")).toBe("72deg");
  });
});
