import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CtaSplitImageBlock } from "./cta-split-image";

function stylesheet(): string {
  return [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
}

/** A controllable IntersectionObserver. */
function mockIntersectionObserver() {
  const instances: { callback: IntersectionObserverCallback; disconnect: () => void }[] = [];
  class MockObserver {
    disconnect = vi.fn();
    constructor(public callback: IntersectionObserverCallback) {
      instances.push(this);
    }
    observe() {}
    unobserve() {}
  }
  vi.stubGlobal("IntersectionObserver", MockObserver);
  return {
    instances,
    enter(isIntersecting = true) {
      act(() => {
        for (const instance of instances) {
          instance.callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          );
        }
      });
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CtaSplitImageBlock", () => {
  it("is one section landmark named by its headline", () => {
    render(<CtaSplitImageBlock />);
    expect(
      screen.getByRole("region", { name: "Ship faster with animated components" }),
    ).toBeInTheDocument();
  });

  it("renders the headline at level 2 by default, and at any level asked for", () => {
    const { rerender } = render(<CtaSplitImageBlock />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<CtaSplitImageBlock headingLevel={4} />);
    expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
  });

  it("renders its copy and actions from props, and hides what is null or empty", () => {
    const { rerender } = render(
      <CtaSplitImageBlock
        description="Faster."
        primaryAction={{ label: "Browse", href: "/browse" }}
        secondaryAction={{ label: "Source", href: "/source" }}
      />,
    );
    expect(screen.getByText("Faster.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute("href", "/browse");
    expect(screen.getByRole("link", { name: "Source" })).toHaveAttribute("href", "/source");

    rerender(<CtaSplitImageBlock description="" primaryAction={null} secondaryAction={null} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();

    rerender(<CtaSplitImageBlock primaryAction={null} />);
    expect(screen.getByRole("link", { name: "Read the docs" })).toBeInTheDocument();
    rerender(<CtaSplitImageBlock secondaryAction={null} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows the image as content, or a hidden placeholder without one", () => {
    const { container, rerender } = render(<CtaSplitImageBlock />);
    expect(container.querySelector("[data-slot=cta-split-image-placeholder]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    rerender(<CtaSplitImageBlock image={{ src: "/p.png", alt: "A preview", width: 800 }} />);
    expect(screen.getByRole("img", { name: "A preview" })).toHaveAttribute("src", "/p.png");
  });

  it("renders at rest where scrolling into view cannot be observed", () => {
    const { container } = render(<CtaSplitImageBlock />);
    expect(container.querySelector("[data-slot=cta-split-image-copy]")).toHaveAttribute(
      "data-state",
      "static",
    );
  });

  it("slides both halves in on the first scroll into view, once", () => {
    const observer = mockIntersectionObserver();
    const { container } = render(<CtaSplitImageBlock />);
    const halves = () =>
      [
        container.querySelector("[data-slot=cta-split-image-copy]"),
        container.querySelector("[data-slot=cta-split-image-media]"),
      ].map((node) => node?.getAttribute("data-state"));
    expect(halves()).toEqual(["idle", "idle"]);
    observer.enter(false);
    expect(halves()).toEqual(["idle", "idle"]);
    observer.enter();
    expect(halves()).toEqual(["visible", "visible"]);
    expect(observer.instances[0]?.disconnect).toHaveBeenCalled();
  });

  it("slides along reading direction, on the motion scale, without looping", () => {
    render(<CtaSplitImageBlock />);
    const css = stylesheet();
    expect(css).toContain(
      "[data-slot=cta-split-image-copy]:dir(rtl){--dowel-cta-split-image-from:24px}",
    );
    expect(css).not.toContain("infinite");
    for (const match of css.matchAll(/(\d+)ms/g)) {
      expect(css.slice(match.index, match.index + 40)).toContain("var(--motion-scale");
    }
  });

  it("merges a consumer className, forwards the ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(<CtaSplitImageBlock ref={ref} className="py-8" data-testid="cta" />);
    const section = screen.getByTestId("cta");
    expect(ref.current).toBe(section);
    expect(section).toHaveClass("py-8");
    expect(section).not.toHaveClass("py-24");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <CtaSplitImageBlock image={{ src: "/p.png", alt: "A preview" }} />,
    );
    await expectNoA11yViolations(container);
  });
});
