import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { GradientText, gradientTextBackground } from "./gradient-text";

describe("GradientText", () => {
  it("keeps the text as one run of real text", async () => {
    const { container } = render(
      <h2>
        Ship <GradientText>faster</GradientText> today
      </h2>,
    );
    expect(screen.getByRole("heading", { name: "Ship faster today" })).toBeInTheDocument();
    expect(screen.getByText("faster")).toHaveAttribute("data-slot", "gradient-text");
    await expectNoA11yViolations(container);
  });

  it("fills the text from theme tokens and drifts by default", () => {
    render(<GradientText colors={["warning", "destructive"]}>hot</GradientText>);
    const text = screen.getByText("hot");
    expect(text.style.backgroundImage).toBe(
      "linear-gradient(90deg, var(--color-warning), var(--color-destructive))",
    );
    expect(text.style.backgroundSize).toBe("200% 100%");
    expect(text.style.animation).toContain("dowel-gradient-text-drift");
    expect(text.style.animation).toContain("calc(6s * var(--motion-scale, 1))");
    expect(
      document.querySelector("style[data-href='dowel-gradient-text']")?.textContent,
    ).toContain("forced-colors:active");
  });

  it("holds still when not animated", () => {
    render(
      <GradientText animate={false} angle={45}>
        still
      </GradientText>,
    );
    const text = screen.getByText("still");
    expect(text).not.toHaveAttribute("data-animated");
    expect(text.style.animation).toBe("");
    expect(text.style.backgroundSize).toBe("100% 100%");
    expect(text.style.backgroundImage).toContain("45deg");
  });

  it("renders as the element asked for, lets className win and forwards its ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <GradientText ref={ref} as="strong" className="block" id="g">
        bold
      </GradientText>,
    );
    expect(ref.current?.tagName).toBe("STRONG");
    expect(ref.current).toHaveClass("block");
    expect(ref.current).not.toHaveClass("inline");
    expect(ref.current).toHaveAttribute("id", "g");
  });
});

describe("gradientTextBackground", () => {
  it("falls back to the brand colours when given fewer than two", () => {
    expect(gradientTextBackground([], 90)).toBe(
      "linear-gradient(90deg, var(--color-primary), var(--color-info), var(--color-primary))",
    );
    expect(gradientTextBackground(["#fff", "oklch(0.7 0.1 30)"], 10)).toBe(
      "linear-gradient(10deg, #fff, oklch(0.7 0.1 30))",
    );
  });
});
