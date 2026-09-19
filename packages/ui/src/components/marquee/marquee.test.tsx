import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Marquee } from "./marquee";

function Items() {
  return (
    <>
      <a href="#one">One</a>
      <a href="#two">Two</a>
    </>
  );
}

function root(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="marquee"]');
}

function halves(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="marquee-group"]')];
}

function reduceMotion(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches,
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

/** Makes every element report a size, and lets the test fire resize callbacks. */
function measure(size: number) {
  let current = size;
  const callbacks: (() => void)[] = [];
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(() => current);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(() => current / 2);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        callbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  return (next: number) => {
    current = next;
    act(() => {
      for (const callback of callbacks) callback();
    });
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Marquee", () => {
  it("exposes the content once, and hides the copy that closes the loop", () => {
    const { container } = render(
      <Marquee>
        <Items />
      </Marquee>,
    );
    expect(screen.getAllByRole("link", { name: "One" })).toHaveLength(1);
    const [first, second] = halves(container);
    expect(first).not.toHaveAttribute("aria-hidden");
    expect(second).toHaveAttribute("aria-hidden", "true");
    expect(second).toHaveAttribute("inert");
    expect(second).toHaveTextContent("OneTwo");
  });

  it("hides every repeated copy", () => {
    const { container } = render(
      <Marquee repeat={3}>
        <Items />
      </Marquee>,
    );
    expect(container.querySelectorAll('a[href="#one"]')).toHaveLength(6);
    expect(screen.getAllByRole("link", { name: "One" })).toHaveLength(1);
    const copies = halves(container)[0]?.children ?? [];
    expect(copies[1]).toHaveAttribute("inert");
  });

  it("scrolls horizontally by default and vertically on request", () => {
    const { container, rerender } = render(<Marquee>x</Marquee>);
    let element = root(container);
    expect(element).toHaveAttribute("data-orientation", "horizontal");
    expect(element?.style.getPropertyValue("--dowel-marquee-name")).toBe("dowel-marquee-x");
    expect(halves(container)[0]?.style.paddingInlineEnd).toBe("16px");

    rerender(
      <Marquee orientation="vertical" gap="1rem">
        x
      </Marquee>,
    );
    element = root(container);
    expect(element).toHaveClass("flex-col");
    expect(element?.style.getPropertyValue("--dowel-marquee-name")).toBe("dowel-marquee-y");
    expect(halves(container)[0]?.style.paddingBlockEnd).toBe("1rem");
    expect(halves(container)[0]?.style.gap).toBe("1rem");
  });

  it("turns speed into a duration from the measured content, through the motion scale", () => {
    const resize = measure(400);
    const { container } = render(<Marquee speed={50}>x</Marquee>);
    const duration = () => root(container)?.style.getPropertyValue("--dowel-marquee-duration");
    expect(duration()).toBe("calc(8000ms * var(--motion-scale, 1))");

    resize(800);
    expect(duration()).toBe("calc(16000ms * var(--motion-scale, 1))");
  });

  it("measures height when vertical", () => {
    measure(400);
    const { container } = render(
      <Marquee orientation="vertical" speed={100}>
        x
      </Marquee>,
    );
    expect(root(container)?.style.getPropertyValue("--dowel-marquee-duration")).toBe(
      "calc(2000ms * var(--motion-scale, 1))",
    );
  });

  it("falls back to a fixed duration before anything is measured", () => {
    const { container } = render(<Marquee>x</Marquee>);
    expect(root(container)?.style.getPropertyValue("--dowel-marquee-duration")).toBe(
      "calc(20000ms * var(--motion-scale, 1))",
    );
  });

  it("reflects reverse, paused and pause-on-hover as data attributes the stylesheet reads", () => {
    const { container, rerender } = render(<Marquee>x</Marquee>);
    const element = root(container);
    expect(element).toHaveAttribute("data-pause-on-hover");
    expect(element).not.toHaveAttribute("data-reverse");
    expect(element).not.toHaveAttribute("data-paused");

    rerender(
      <Marquee reverse paused pauseOnHover={false}>
        x
      </Marquee>,
    );
    expect(element).toHaveAttribute("data-reverse");
    expect(element).toHaveAttribute("data-paused");
    expect(element).not.toHaveAttribute("data-pause-on-hover");
  });

  it("ships its keyframes, the pause rules, RTL mirroring and the reduced-motion stop", () => {
    render(<Marquee>x</Marquee>);
    const css = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    expect(css).toContain("@keyframes dowel-marquee-x{");
    expect(css).toContain("@keyframes dowel-marquee-y{");
    expect(css).toContain(":dir(rtl){--dowel-marquee-sign:-1}");
    expect(css).toContain(
      ":focus-within>[data-slot=marquee-track]{animation-play-state:paused}",
    );
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\{[^}]*animation:none/);
  });

  it("stops under reduced motion and becomes a focusable scroller with no duplicate", () => {
    reduceMotion(true);
    const { container } = render(
      <Marquee>
        <Items />
      </Marquee>,
    );
    const element = root(container);
    expect(element).toHaveAttribute("data-reduced-motion");
    expect(element).toHaveAttribute("tabindex", "0");
    expect(element).toHaveClass("overflow-x-auto");
    expect(halves(container)).toHaveLength(1);
    expect(container.querySelectorAll("a")).toHaveLength(2);
  });

  it("scrolls vertically when reduced and vertical", () => {
    reduceMotion(true);
    const { container } = render(<Marquee orientation="vertical">x</Marquee>);
    expect(root(container)).toHaveClass("overflow-y-auto");
  });

  it("lets a consumer className win a conflict and merges style", () => {
    const { container } = render(
      <Marquee className="overflow-x-visible" style={{ maskImage: "none" }}>
        x
      </Marquee>,
    );
    const element = root(container);
    expect(element).toHaveClass("overflow-x-visible");
    expect(element).not.toHaveClass("overflow-x-hidden");
    expect(element?.style.maskImage).toBe("none");
  });

  it("forwards the ref and native props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Marquee ref={ref} aria-label="Partners" id="partners">
        x
      </Marquee>,
    );
    expect(ref.current).toHaveAttribute("data-slot", "marquee");
    expect(ref.current).toHaveAttribute("id", "partners");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Marquee aria-label="Partners">
        <Items />
      </Marquee>,
    );
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations when reduced", async () => {
    reduceMotion(true);
    const { container } = render(
      <Marquee>
        <Items />
      </Marquee>,
    );
    await expectNoA11yViolations(container);
  });
});
