import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FeaturesAlternatingBlock } from "./features-alternating";

function stubObserver() {
  const fires: ((isIntersecting: boolean) => void)[] = [];
  const disconnect = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        fires.push((isIntersecting) => {
          callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        });
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  return { fires, disconnect };
}

function belowFold() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 5000,
  } as DOMRect);
}

function rows(container: HTMLElement) {
  return [...container.querySelectorAll("[data-slot=features-alternating-row]")];
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FeaturesAlternatingBlock", () => {
  it("is a section named by its heading, with one list item per row", () => {
    render(<FeaturesAlternatingBlock />);
    expect(screen.getByRole("region", { name: "Why developers choose us" })).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("alternates sides with grid order, not writing direction", () => {
    const { container } = render(<FeaturesAlternatingBlock />);
    const [first, second] = rows(container);
    expect(first).not.toHaveAttribute("data-reversed");
    expect(second).toHaveAttribute("data-reversed");
    expect(second?.querySelector("[data-slot=features-alternating-media]")).toHaveClass(
      "md:order-first",
    );
    expect(container.innerHTML).not.toContain("direction:rtl");
  });

  it("draws a decorative panel when no media is given, and shows media when it is", () => {
    const { container } = render(
      <FeaturesAlternatingBlock
        features={[
          { title: "One", description: "First." },
          { title: "Two", description: "Second.", media: <img src="/two.png" alt="Two" /> },
        ]}
      />,
    );
    const [first] = rows(container);
    expect(first?.querySelector("[aria-hidden=true]")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Two" })).toBeInTheDocument();
  });

  it("re-levels its headings and takes its copy from props", () => {
    render(<FeaturesAlternatingBlock heading="How" description={null} headingLevel={4} />);
    expect(screen.getByRole("heading", { level: 4, name: "How" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 5 })).toHaveLength(3);
  });

  it("lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    render(<FeaturesAlternatingBlock ref={ref} className="max-w-none" />);
    expect(ref.current).toHaveClass("max-w-none");
    expect(ref.current).not.toHaveClass("max-w-6xl");
  });

  it("reveals each row below the fold on its own", () => {
    const observer = stubObserver();
    belowFold();
    const { container } = render(<FeaturesAlternatingBlock />);
    expect(rows(container).map((row) => row.getAttribute("data-reveal"))).toEqual([
      "pending",
      "pending",
      "pending",
    ]);
    act(() => {
      observer.fires[1]?.(true);
    });
    expect(rows(container).map((row) => row.getAttribute("data-reveal"))).toEqual([
      "pending",
      "shown",
      "pending",
    ]);
  });

  it("hides nothing on screen, under reduced motion, or without an observer", () => {
    stubObserver();
    const onScreen = render(<FeaturesAlternatingBlock />);
    expect(rows(onScreen.container)[0]).not.toHaveAttribute("data-reveal");
    onScreen.unmount();

    belowFold();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const reduced = render(<FeaturesAlternatingBlock />);
    expect(rows(reduced.container)[0]).not.toHaveAttribute("data-reveal");
    reduced.unmount();

    vi.stubGlobal("IntersectionObserver", undefined);
    const unsupported = render(<FeaturesAlternatingBlock />);
    expect(rows(unsupported.container)[0]).not.toHaveAttribute("data-reveal");
  });

  it("has no axe violations", async () => {
    const { container } = render(<FeaturesAlternatingBlock />);
    await expectNoA11yViolations(container);
  });
});
