import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ScrollRevealText } from "./scroll-reveal-text";

const PARAGRAPH = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

function root(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>('[data-slot="scroll-reveal-text"]');
  if (!element) throw new Error("no root");
  return element;
}

function words(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="scroll-reveal-text-word"]')];
}

function stylesheet(): string {
  return [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
}

function mockReducedMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

/** Frames the test flushes by hand. */
function mockFrames() {
  const queue: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  return {
    get pending() {
      return queue.length;
    },
    flush() {
      for (const callback of queue.splice(0)) callback(0);
    },
  };
}

function placeTop(element: HTMLElement, top: number) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ top } as DOMRect);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ScrollRevealText", () => {
  it("splits the paragraph into words, and is read once from an sr-only copy", () => {
    const { container } = render(<ScrollRevealText>{PARAGRAPH}</ScrollRevealText>);
    expect(words(container).map((word) => word.textContent)).toEqual(PARAGRAPH.split(" "));
    expect(container.querySelector('[data-slot="scroll-reveal-text-words"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByText(PARAGRAPH, { selector: ".sr-only" })).toBeInTheDocument();
    expect(root(container).tagName).toBe("P");
  });

  it("collapses runs of whitespace, as in a template literal", () => {
    const { container } = render(
      <ScrollRevealText>{`Lorem ipsum
        dolor`}</ScrollRevealText>,
    );
    expect(words(container).map((word) => word.textContent)).toEqual([
      "Lorem",
      "ipsum",
      "dolor",
    ]);
  });

  it("gives every word its index and the paragraph the count and dim opacity", () => {
    const { container } = render(
      <ScrollRevealText dimOpacity={0.2}>{PARAGRAPH}</ScrollRevealText>,
    );
    expect(root(container).style.getPropertyValue("--dowel-scroll-reveal-text-n")).toBe("8");
    expect(root(container).style.getPropertyValue("--dowel-scroll-reveal-text-dim")).toBe(
      "0.2",
    );
    expect(words(container)[3]?.style.getPropertyValue("--dowel-scroll-reveal-text-i")).toBe(
      "3",
    );
  });

  it("drives each word over its slice of the source's range with a scroll-driven animation", () => {
    render(<ScrollRevealText>{PARAGRAPH}</ScrollRevealText>);
    const css = stylesheet();
    expect(css).toContain(
      "@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){",
    );
    expect(css).toContain("view-timeline-name:--dowel-scroll-reveal-text");
    expect(css).toContain("animation-timeline:--dowel-scroll-reveal-text");
    expect(css).toContain(
      "animation-range-start:cover calc(10vh + 65vh * var(--dowel-scroll-reveal-text-i) / var(--dowel-scroll-reveal-text-n))",
    );
    // Fades from the dim opacity to fully legible.
    expect(css).toContain(
      "@keyframes dowel-scroll-reveal-text-word{from{opacity:var(--dowel-scroll-reveal-text-dim)}to{opacity:1}}",
    );
  });

  it("leaves the CSS to do the work where scroll timelines are supported", () => {
    vi.stubGlobal("CSS", { supports: () => true });
    const { container } = render(<ScrollRevealText>{PARAGRAPH}</ScrollRevealText>);
    expect(root(container)).not.toHaveAttribute("data-fallback");
  });

  it("falls back to a frame-throttled scroll listener writing progress to a CSS variable", () => {
    vi.stubGlobal("CSS", { supports: () => false });
    vi.stubGlobal("innerHeight", 1000);
    const frames = mockFrames();
    const { container } = render(<ScrollRevealText>{PARAGRAPH}</ScrollRevealText>);
    const element = root(container);
    expect(element).toHaveAttribute("data-fallback");

    // Top edge at 90% of the viewport: the start of the range.
    placeTop(element, 900);
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    expect(frames.pending).toBe(1);
    frames.flush();
    expect(element.style.getPropertyValue("--dowel-scroll-reveal-text-progress")).toBe("0");

    // Halfway to 25%.
    placeTop(element, 575);
    window.dispatchEvent(new Event("scroll"));
    frames.flush();
    expect(element.style.getPropertyValue("--dowel-scroll-reveal-text-progress")).toBe("0.5");

    // Past 25%: fully revealed, and clamped.
    placeTop(element, 0);
    window.dispatchEvent(new Event("scroll"));
    frames.flush();
    expect(element.style.getPropertyValue("--dowel-scroll-reveal-text-progress")).toBe("1");
    expect(stylesheet()).toContain(
      "[data-slot=scroll-reveal-text][data-fallback] [data-slot=scroll-reveal-text-word]{opacity:clamp(",
    );
  });

  it("removes the fallback listener on unmount", () => {
    vi.stubGlobal("CSS", { supports: () => false });
    const frames = mockFrames();
    const { unmount } = render(<ScrollRevealText>{PARAGRAPH}</ScrollRevealText>);
    unmount();
    window.dispatchEvent(new Event("scroll"));
    expect(frames.pending).toBe(0);
  });

  it("stays fully legible under reduced motion", () => {
    vi.stubGlobal("CSS", { supports: () => false });
    mockReducedMotion();
    const { container } = render(<ScrollRevealText>{PARAGRAPH}</ScrollRevealText>);
    // No fallback, and the scroll-driven rules only apply with no-preference.
    expect(root(container)).not.toHaveAttribute("data-fallback");
    for (const word of words(container)) expect(word.style.opacity).toBe("");
  });

  it("is legible without JavaScript: the server markup dims nothing", () => {
    const html = renderToString(<ScrollRevealText>{PARAGRAPH}</ScrollRevealText>);
    // Only the stylesheet mentions the fallback; the markup itself carries no dimming.
    const markup = html.slice(html.indexOf("<p"));
    expect(markup).not.toContain("data-fallback");
    expect(markup).not.toContain("opacity");
    expect(markup).toContain(">Lorem</span>");
  });

  it.each([
    ["sm", "text-base"],
    ["md", "text-lg"],
    ["lg", "text-2xl"],
    ["xl", "text-4xl"],
  ] as const)("renders the %s size", (size, className) => {
    const { container } = render(<ScrollRevealText size={size}>{PARAGRAPH}</ScrollRevealText>);
    expect(root(container)).toHaveClass(className);
  });

  it("lets a consumer class win over the size", () => {
    const { container } = render(
      <ScrollRevealText className="text-sm">{PARAGRAPH}</ScrollRevealText>,
    );
    expect(root(container)).toHaveClass("text-sm");
    expect(root(container)).not.toHaveClass("text-lg");
  });

  it("renders as the element asked for, forwarding its ref and props", () => {
    const ref = createRef<HTMLElement>();
    render(
      <ScrollRevealText as="h2" ref={ref} id="reveal">
        A heading that reveals
      </ScrollRevealText>,
    );
    const heading = screen.getByRole("heading", { level: 2, name: "A heading that reveals" });
    expect(ref.current).toBe(heading);
    expect(heading).toHaveAttribute("id", "reveal");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ScrollRevealText>{PARAGRAPH}</ScrollRevealText>);
    await expectNoA11yViolations(container);
  });
});
