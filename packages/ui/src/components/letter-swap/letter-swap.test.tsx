import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { LetterSwap } from "./letter-swap";

describe("LetterSwap", () => {
  it("is read as one word inside a link, not letter by letter", async () => {
    const { container } = render(
      <a href="#pricing">
        <LetterSwap>Pricing</LetterSwap>
      </a>,
    );
    expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
    expect(container.querySelector("[data-slot=letter-swap-letters]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await expectNoA11yViolations(container);
  });

  it("splits the label into letters, each with a copy waiting to roll in", () => {
    const { container } = render(<LetterSwap>Go on</LetterSwap>);
    const letters = container.querySelectorAll("[data-slot=letter-swap-letters] > span");
    expect(letters).toHaveLength(5);
    // Each letter is the outgoing glyph and its incoming copy.
    expect(letters[0]?.children).toHaveLength(2);
    // A space keeps its width.
    expect(letters[2]?.textContent).toBe("  ");
  });

  it("staggers the letters and rolls on hover or focus, its own or its parent's", () => {
    const { container } = render(<LetterSwap stagger={30}>abc</LetterSwap>);
    const outgoing = [
      ...container.querySelectorAll<HTMLElement>(
        "[data-slot=letter-swap-letters] > span > span:first-child",
      ),
    ];
    expect(outgoing.map((letter) => letter.style.transitionDelay)).toEqual([
      "calc(0ms * var(--motion-scale, 1))",
      "calc(30ms * var(--motion-scale, 1))",
      "calc(60ms * var(--motion-scale, 1))",
    ]);
    expect(outgoing[0]?.className).toContain(
      "[:hover>[data-slot=letter-swap]_&]:translate-y-(--letter-swap-to)",
    );
    expect(outgoing[0]?.className).toContain(
      "[[data-slot=letter-swap]:focus-visible_&]:translate-y-(--letter-swap-to)",
    );
  });

  it("rolls down when asked, and times the roll with --motion-scale", () => {
    const { container } = render(
      <LetterSwap direction="down" duration={500}>
        x
      </LetterSwap>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("[--letter-swap-to:100%]");
    expect(root.style.getPropertyValue("--letter-swap-duration")).toBe(
      "calc(500ms * var(--motion-scale, 1))",
    );
  });

  it("keeps an accented letter whole", () => {
    const { container } = render(<LetterSwap>Café</LetterSwap>);
    expect(container.querySelectorAll("[data-slot=letter-swap-letters] > span")).toHaveLength(
      4,
    );
  });

  it("renders as the element asked for, lets className win and forwards its ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <LetterSwap ref={ref} as="strong" className="flex" id="l">
        Bold
      </LetterSwap>,
    );
    expect(ref.current?.tagName).toBe("STRONG");
    expect(ref.current).toHaveClass("flex");
    expect(ref.current).not.toHaveClass("inline-flex");
    expect(ref.current).toHaveAttribute("id", "l");
  });
});
