import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SwitchboardCard } from "./switchboard-card";

function lights(container: HTMLElement, state?: string) {
  const selector = state
    ? `[data-slot="switchboard-card-light"][data-state="${state}"]`
    : '[data-slot="switchboard-card-light"]';
  return container.querySelectorAll(selector);
}

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matches && query.includes("reduce"),
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

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SwitchboardCard", () => {
  it("renders the heading, description and a decorative grid of columns × rows lights", () => {
    const { container } = render(
      <SwitchboardCard heading="Edge network" description="Close to every user." />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Edge network" })).toBeInTheDocument();
    expect(screen.getByText("Close to every user.")).toHaveClass("text-muted-foreground");
    expect(lights(container)).toHaveLength(90);
    expect(lights(container, "off")).toHaveLength(90);
    expect(
      container.querySelector('[data-slot="switchboard-card-illustration"]'),
    ).toHaveAttribute("aria-hidden", "true");
  });

  it("lights a flat pattern", () => {
    const { container } = render(
      <SwitchboardCard
        heading="Flat"
        columns={3}
        rows={2}
        gridPattern={[1, 0, 0, 0, 1, 0, 1]}
      />,
    );
    const all = [...lights(container)];
    expect(all).toHaveLength(6);
    expect(all.map((light) => light.getAttribute("data-state"))).toEqual([
      "high",
      "off",
      "off",
      "off",
      "high",
      "off",
    ]);
  });

  it("lights a two-dimensional pattern, ignoring cells outside the grid", () => {
    const { container } = render(
      <SwitchboardCard
        heading="2D"
        columns={2}
        rows={2}
        gridPattern={[
          [1, 0, 1],
          [0, 1],
          [1, 1],
        ]}
      />,
    );
    expect(lights(container, "high")).toHaveLength(2);
    expect(lights(container)[3]).toHaveAttribute("data-state", "high");
  });

  it("describes a meaningful pattern as one image", () => {
    render(
      <SwitchboardCard
        heading="Hi"
        columns={2}
        rows={1}
        gridPattern={[1, 1]}
        illustrationLabel="The word HI"
      />,
    );
    expect(screen.getByRole("img", { name: "The word HI" })).toBeInTheDocument();
  });

  describe("random lights", () => {
    it("flickers off → medium → high → off on the interval", () => {
      vi.useFakeTimers();
      vi.spyOn(Math, "random").mockReturnValue(0);
      const { container } = render(
        <SwitchboardCard heading="Random" columns={4} rows={2} randomLights interval={100} />,
      );
      expect(lights(container, "off")).toHaveLength(8);
      expect(container.querySelector('[data-slot="switchboard-card-lights"]')).toHaveAttribute(
        "data-animated",
      );

      act(() => {
        vi.advanceTimersByTime(100);
      });
      // 20% of 8 lights is one step, always index 0 with Math.random() = 0.
      expect(lights(container)[0]).toHaveAttribute("data-state", "medium");
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(lights(container)[0]).toHaveAttribute("data-state", "high");
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(lights(container)[0]).toHaveAttribute("data-state", "off");
    });

    it("pauses while the tab is hidden", () => {
      vi.useFakeTimers();
      vi.spyOn(Math, "random").mockReturnValue(0);
      vi.spyOn(document, "hidden", "get").mockReturnValue(true);
      const { container } = render(
        <SwitchboardCard heading="Hidden" columns={4} rows={2} randomLights />,
      );
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(lights(container, "off")).toHaveLength(8);
    });

    it("pauses while off-screen and resumes when visible", () => {
      vi.useFakeTimers();
      vi.spyOn(Math, "random").mockReturnValue(0);
      let report: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
      const disconnect = vi.fn();
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
            report = callback;
          }
          observe() {}
          disconnect = disconnect;
        },
      );
      const { container, unmount } = render(
        <SwitchboardCard heading="Scroll" columns={4} rows={2} randomLights />,
      );
      act(() => {
        report([{ isIntersecting: false }]);
        vi.advanceTimersByTime(1000);
      });
      expect(lights(container, "off")).toHaveLength(8);

      act(() => {
        report([{ isIntersecting: true }]);
        vi.advanceTimersByTime(200);
      });
      expect(lights(container, "medium")).toHaveLength(1);

      unmount();
      expect(disconnect).toHaveBeenCalled();
    });

    it("treats a missing entry as visible", () => {
      vi.useFakeTimers();
      vi.spyOn(Math, "random").mockReturnValue(0);
      let report: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
            report = callback;
          }
          observe() {}
          disconnect() {}
        },
      );
      const { container } = render(
        <SwitchboardCard heading="Edge" columns={4} rows={2} randomLights />,
      );
      act(() => {
        report([]);
        vi.advanceTimersByTime(200);
      });
      expect(lights(container, "medium")).toHaveLength(1);
    });

    it("shows a still, seeded frame under reduced motion and never ticks", () => {
      vi.useFakeTimers();
      mockReducedMotion(true);
      const random = vi.spyOn(Math, "random");
      const { container } = render(
        <SwitchboardCard heading="Still" columns={10} rows={10} randomLights seed={7} />,
      );
      const first = [...lights(container)].map((light) => light.getAttribute("data-state"));
      expect(first.filter((state) => state === "high").length).toBeGreaterThan(0);
      expect(
        container.querySelector('[data-slot="switchboard-card-lights"]'),
      ).not.toHaveAttribute("data-animated");
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect([...lights(container)].map((light) => light.getAttribute("data-state"))).toEqual(
        first,
      );
      expect(random).not.toHaveBeenCalled();
    });

    it("prefers a pattern over random lights", () => {
      vi.useFakeTimers();
      const { container } = render(
        <SwitchboardCard
          heading="Both"
          columns={2}
          rows={1}
          gridPattern={[0, 1]}
          randomLights
        />,
      );
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(lights(container, "high")).toHaveLength(1);
    });

    it("resizes the flicker when the grid changes size", () => {
      vi.useFakeTimers();
      vi.spyOn(Math, "random").mockReturnValue(0);
      const { container, rerender } = render(
        <SwitchboardCard heading="Grow" columns={2} rows={1} randomLights />,
      );
      rerender(<SwitchboardCard heading="Grow" columns={3} rows={2} randomLights />);
      expect(lights(container)).toHaveLength(6);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(lights(container, "medium")).toHaveLength(1);
    });
  });

  it("renders as a single link with href", async () => {
    const user = userEvent.setup();
    render(<SwitchboardCard heading="Docs" description="Read the guide." href="/docs" />);
    const link = screen.getByRole("link", { name: /Docs/ });
    expect(link).toHaveAttribute("href", "/docs");
    await user.tab();
    expect(link).toHaveFocus();
    expect(link.className).toContain("focus-visible:ring-2");
  });

  it("renders its child as the card with asChild", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <SwitchboardCard asChild heading="Open">
        <button type="button" onClick={onClick} />
      </SwitchboardCard>,
    );
    const button = screen.getByRole("button", { name: /Open/ });
    expect(button).toHaveAttribute("data-slot", "switchboard-card");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("appends extra children to a plain card", () => {
    render(
      <SwitchboardCard heading="Extra">
        <span>Footer</span>
      </SwitchboardCard>,
    );
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("applies the inverted variant and a chosen heading level", () => {
    render(
      <SwitchboardCard
        heading="Next"
        description="Full-stack"
        variant="inverted"
        headingAs="h2"
        data-testid="card"
      />,
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-variant", "inverted");
    expect(card).toHaveClass("text-background");
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("text-2xl");
    expect(screen.getByText("Full-stack")).toHaveClass("opacity-85");
  });

  it("lets a consumer className win and forwards a ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SwitchboardCard ref={ref} heading="Ref" className="p-2" />);
    expect(ref.current).toHaveClass("p-2");
    expect(ref.current).not.toHaveClass("p-6");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div>
        <SwitchboardCard heading="Plain" description="A card." randomLights />
        <SwitchboardCard
          heading="Link"
          href="/x"
          gridPattern={[1, 0, 1]}
          illustrationLabel="Dots"
        />
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
