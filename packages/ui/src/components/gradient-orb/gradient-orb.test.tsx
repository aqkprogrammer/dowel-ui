import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { GradientOrb, type GradientOrbState } from "./gradient-orb";

function root(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="gradient-orb"]');
}

function variable(container: HTMLElement, name: string) {
  return root(container)?.style.getPropertyValue(name) ?? "";
}

const STATES: GradientOrbState[] = [
  "idle",
  "listening",
  "thinking",
  "streaming",
  "speaking",
  "done",
  "error",
];

describe("GradientOrb", () => {
  it("is decorative by default", () => {
    const { container } = render(<GradientOrb />);
    expect(root(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("becomes a named image when labelled", () => {
    render(<GradientOrb aria-label="Assistant" />);
    const image = screen.getByRole("img", { name: "Assistant" });
    expect(image).not.toHaveAttribute("aria-hidden");
  });

  it("is never exempt from reduced motion", () => {
    const { container } = render(<GradientOrb state="thinking" />);
    expect(container.querySelector("[data-motion]")).toBeNull();
  });

  it("renders plain decoration without a state", () => {
    const { container } = render(<GradientOrb />);
    expect(root(container)).not.toHaveAttribute("data-state");
    expect(variable(container, "--orb-glow")).toBe("0");
    expect(variable(container, "--orb-scale")).toBe("1");
  });

  it.each(STATES)("reflects the %s state", (state) => {
    const { container } = render(<GradientOrb state={state} />);
    expect(root(container)).toHaveAttribute("data-state", state);
    expect(Number(variable(container, "--orb-glow"))).toBeGreaterThan(0);
  });

  it("keeps thinking at rest scale and churns faster than idle", () => {
    const idle = render(<GradientOrb state="idle" />);
    const thinking = render(<GradientOrb state="thinking" />);
    expect(variable(thinking.container, "--orb-scale")).toBe("1");
    const period = (container: HTMLElement) =>
      Number(/calc\((\d+)ms/.exec(variable(container, "--orb-period"))?.[1]);
    expect(period(thinking.container)).toBeLessThan(period(idle.container));
  });

  it("desaturates on error rather than growing", () => {
    const { container } = render(<GradientOrb state="error" />);
    expect(Number(variable(container, "--orb-saturation"))).toBeLessThan(1);
    expect(Number(variable(container, "--orb-scale"))).toBeLessThan(1);
  });

  it("scales every duration through the motion scale", () => {
    const { container } = render(<GradientOrb state="idle" duration={10} />);
    for (const name of ["--orb-period", "--orb-drift", "--orb-breathe", "--orb-shake"]) {
      expect(variable(container, name)).toContain("var(--motion-scale");
    }
    expect(variable(container, "--orb-period")).toContain("16667ms");
  });

  it("clamps the amplitude to 0–1", () => {
    const loud = render(<GradientOrb state="listening" amplitude={4} />);
    const quiet = render(<GradientOrb state="listening" amplitude={-1} />);
    expect(variable(loud.container, "--orb-amplitude")).toBe("1");
    expect(variable(quiet.container, "--orb-amplitude")).toBe("0");
  });

  it("tunes blur and the dot screen exactly for numeric sizes", () => {
    const large = render(<GradientOrb size={200} />);
    expect(variable(large.container, "--orb-size")).toBe("200px");
    expect(variable(large.container, "--orb-blur")).toBe("4.00px");
    expect(variable(large.container, "--orb-mask")).toBe("25%");

    const medium = render(<GradientOrb size={64} />);
    expect(variable(medium.container, "--orb-mask")).toBe("15%");

    const small = render(<GradientOrb size={40} />);
    expect(variable(small.container, "--orb-mask")).toBe("5%");
    expect(root(small.container)).not.toHaveAttribute("data-tiny");

    const tiny = render(<GradientOrb size={24} />);
    expect(variable(tiny.container, "--orb-mask")).toBe("0%");
    expect(variable(tiny.container, "--orb-contrast")).toBe("1.100");
    expect(root(tiny.container)).toHaveAttribute("data-tiny");
  });

  it("derives tuning in CSS for a length size", () => {
    const { container } = render(<GradientOrb size="10rem" />);
    expect(variable(container, "--orb-size")).toBe("10rem");
    expect(variable(container, "--orb-blur")).toContain("var(--orb-size)");
  });

  it("colours from theme tokens, and accepts overrides", () => {
    const { container } = render(<GradientOrb colors={{ c1: "var(--color-success)" }} />);
    expect(variable(container, "--orb-c1")).toBe("var(--color-success)");
    expect(variable(container, "--orb-c2")).toBe("var(--color-info)");
  });

  it("defines every keyframe it references", () => {
    render(<GradientOrb state="idle" />);
    const css = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    for (const name of ["rotate", "drift", "breathe", "shake"]) {
      expect(css).toContain(`@keyframes dowel-gradient-orb-${name}{`);
      expect(css).toContain(`dowel-gradient-orb-${name} var(`);
    }
    expect(css).toContain("@property --dowel-gradient-orb-angle");
  });

  it("merges className and style, and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <GradientOrb
        ref={ref}
        className="inline-block"
        style={{ opacity: 0.5 }}
        data-testid="orb"
      />,
    );
    const element = root(container);
    expect(element).toHaveClass("inline-block", "dowel-gradient-orb");
    expect(element?.style.opacity).toBe("0.5");
    expect(ref.current).toBe(element);
    expect(screen.getByTestId("orb")).toBe(element);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <GradientOrb />
        <GradientOrb aria-label="Assistant listening" state="listening" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
