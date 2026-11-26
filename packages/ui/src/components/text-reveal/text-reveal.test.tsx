import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TextReveal } from "./text-reveal";

function stage(container: HTMLElement) {
  return container.querySelector('[data-slot="text-reveal-stage"]');
}

function glyphs(container: HTMLElement, part: string) {
  return [
    ...container.querySelectorAll(`[data-slot="text-reveal-glyph"][data-part="${part}"]`),
  ];
}

describe("TextReveal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads as plain text, with the letter stage hidden", () => {
    const { container } = render(<TextReveal text="Moments" />);
    expect(screen.getByText("Moments")).toHaveClass("sr-only");
    expect(stage(container)).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll('[data-slot="text-reveal-letter"]')).toHaveLength(7);
  });

  it("does not roll on first paint", () => {
    const { container } = render(<TextReveal text="Moments" />);
    expect(glyphs(container, "in")).toHaveLength(0);
    expect(glyphs(container, "out")).toHaveLength(0);
  });

  it("rolls old letters out and new ones in when the text changes, staggered", () => {
    const { container, rerender } = render(<TextReveal text="Cat" stagger={50} />);
    rerender(<TextReveal text="Dog" stagger={50} />);
    expect(glyphs(container, "out").map((node) => node.textContent)).toEqual(["C", "a", "t"]);
    expect(glyphs(container, "in").map((node) => node.textContent)).toEqual(["D", "o", "g"]);
    const letters = container.querySelectorAll<HTMLElement>('[data-slot="text-reveal-letter"]');
    expect(letters[2]?.style.getPropertyValue("--delay")).toBe(
      "calc(100ms * var(--motion-scale, 1))",
    );
    expect(screen.getByText("Dog")).toHaveClass("sr-only");
  });

  it("rolls when a control changes the text", async () => {
    function Harness() {
      const [word, setWord] = useState("One");
      return (
        <>
          <TextReveal text={word} />
          <button
            type="button"
            onClick={() => {
              setWord("Two");
            }}
          >
            Change
          </button>
        </>
      );
    }
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(glyphs(container, "in").map((node) => node.textContent)).toEqual(["T", "w", "o"]);
  });

  it("rolls the word into itself on a loop", () => {
    vi.useFakeTimers();
    const { container } = render(<TextReveal text="Hi" loop interval={1000} />);
    expect(glyphs(container, "in")).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(glyphs(container, "in").map((node) => node.textContent)).toEqual(["H", "i"]);
    expect(glyphs(container, "out").map((node) => node.textContent)).toEqual(["H", "i"]);
  });

  it("does not loop under reduced motion", () => {
    vi.useFakeTimers();
    const spy = vi
      .spyOn(window, "matchMedia")
      .mockImplementation((query: string): MediaQueryList => ({
        matches: query.includes("reduce"),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }));
    const { container } = render(<TextReveal text="Hi" loop interval={500} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(glyphs(container, "in")).toHaveLength(0);
    spy.mockRestore();
  });

  it("merges className and forwards ref and props", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<TextReveal ref={ref} text="Hi" className="text-xs" data-testid="reveal" />);
    const element = screen.getByTestId("reveal");
    expect(ref.current).toBe(element);
    expect(element).toHaveClass("text-xs");
    expect(element).not.toHaveClass("text-3xl");
  });

  it("has no accessibility violations", async () => {
    const { container, rerender } = render(<TextReveal text="Moments" />);
    rerender(<TextReveal text="Motion" />);
    await expectNoA11yViolations(container);
  });
});
