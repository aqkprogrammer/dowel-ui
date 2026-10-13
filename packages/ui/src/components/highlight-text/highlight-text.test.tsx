import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { HighlightText } from "./highlight-text";

function stubObserver() {
  let report: (visible: boolean) => void = () => {};
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        report = (visible) => {
          callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as never);
        };
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    },
  );
  return (visible: boolean) => {
    act(() => {
      report(visible);
    });
  };
}

describe("HighlightText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the words as text and draws once they scroll into view", async () => {
    const fire = stubObserver();
    const { container } = render(
      <p>
        Ship <HighlightText>twice as fast</HighlightText> with less code.
      </p>,
    );
    const mark = screen.getByText("twice as fast");
    expect(screen.getByText(/Ship/)).toHaveTextContent("Ship twice as fast with less code.");
    expect(mark).not.toHaveAttribute("data-drawn");
    fire(true);
    expect(mark).toHaveAttribute("data-drawn", "true");
    // Once drawn it stays drawn.
    fire(false);
    expect(mark).toHaveAttribute("data-drawn", "true");
    await expectNoA11yViolations(container);
  });

  it("is drawn at once with trigger always", () => {
    render(<HighlightText trigger="always">now</HighlightText>);
    expect(screen.getByText("now")).toHaveAttribute("data-drawn", "true");
  });

  it("draws on hover and on keyboard focus with trigger hover", () => {
    render(
      <HighlightText trigger="hover" variant="underline">
        <a href="#docs">docs</a>
      </HighlightText>,
    );
    const highlight = screen.getByText("docs").parentElement;
    expect(highlight).not.toHaveAttribute("data-drawn");
    expect(highlight?.className).toContain("hover:[background-size:100%_0.12em]");
    expect(highlight?.className).toContain("[:focus-within>&]:[background-size:100%_0.12em]");
  });

  it("strokes behind, beneath or through the words, in the colour asked for", () => {
    const { rerender } = render(<HighlightText trigger="always">w</HighlightText>);
    const words = screen.getByText("w");
    expect(words.className).toContain("data-[drawn]:[background-size:100%_0.6em]");
    expect(words.style.getPropertyValue("--highlight-color")).toContain("var(--color-warning)");
    rerender(
      <HighlightText trigger="always" variant="strike" color="destructive">
        w
      </HighlightText>,
    );
    expect(words.className).toContain("data-[drawn]:[background-size:100%_0.09em]");
    expect(words.style.getPropertyValue("--highlight-color")).toBe("var(--color-destructive)");
  });

  it("times the draw with --motion-scale", () => {
    render(
      <HighlightText trigger="always" duration={1200} delay={300}>
        w
      </HighlightText>,
    );
    const words = screen.getByText("w");
    expect(words.style.getPropertyValue("--highlight-duration")).toBe(
      "calc(1200ms * var(--motion-scale, 1))",
    );
    expect(words.style.getPropertyValue("--highlight-delay")).toBe(
      "calc(300ms * var(--motion-scale, 1))",
    );
  });

  it("renders as mark without the browser's own yellow, and forwards its ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <HighlightText ref={ref} as="mark" className="px-0">
        key
      </HighlightText>,
    );
    expect(ref.current?.tagName).toBe("MARK");
    expect(ref.current).toHaveClass("bg-transparent", "px-0");
    expect(ref.current).not.toHaveClass("px-[0.1em]");
  });
});
