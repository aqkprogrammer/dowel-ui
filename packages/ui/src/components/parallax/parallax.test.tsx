import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Parallax, parallaxOffset } from "./parallax";

function mockReducedMotion(reduced: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduced && query.includes("reduced-motion"),
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

/** Places the measured box so its centre is at `centre`, in a 800px viewport. */
function boxAt(centre: number) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, centre - 50, 400, 100),
  );
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
}

const layer = () =>
  screen.getByText("Layer").closest("[data-slot=parallax-layer]") as HTMLElement;

describe("Parallax", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wraps its content in a moving layer and stays out of the accessibility tree's way", async () => {
    const { container } = render(
      <Parallax>
        <p>Layer</p>
      </Parallax>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-slot", "parallax");
    expect(layer()).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("offsets the layer by its distance from the middle of the viewport", () => {
    boxAt(600);
    render(
      <Parallax speed={0.5}>
        <p>Layer</p>
      </Parallax>,
    );
    // Centre 600 in an 800px viewport is 200 below the middle: lag by half.
    expect(layer().style.transform).toBe("translate3d(0, -100.0px, 0)");
  });

  it("follows the scroll, once a frame", async () => {
    boxAt(400);
    render(
      <Parallax speed={0.5}>
        <p>Layer</p>
      </Parallax>,
    );
    expect(layer().style.transform).toBe("translate3d(0, 0.0px, 0)");
    boxAt(200);
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(layer().style.transform).toBe("translate3d(0, 100.0px, 0)");
  });

  it("moves sideways on the horizontal axis, within max", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(1000, 0, 200, 100),
    );
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
    render(
      <Parallax axis="horizontal" speed={1} max={50}>
        <p>Layer</p>
      </Parallax>,
    );
    expect(layer().style.transform).toBe("translate3d(-50.0px, 0, 0)");
  });

  it("does not move under reduced motion, or at speed 0", () => {
    mockReducedMotion(true);
    boxAt(600);
    const { rerender } = render(
      <Parallax speed={0.5}>
        <p>Layer</p>
      </Parallax>,
    );
    expect(layer().style.transform).toBe("");
    vi.restoreAllMocks();
    boxAt(600);
    rerender(
      <Parallax speed={0}>
        <p>Layer</p>
      </Parallax>,
    );
    expect(layer().style.transform).toBe("");
  });

  it("stops listening when it unmounts", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Parallax>x</Parallax>);
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("lets className win, forwards its ref and styles the layer", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Parallax ref={ref} className="static" layerClassName="opacity-50" data-testid="p">
        <p>Layer</p>
      </Parallax>,
    );
    expect(ref.current).toBe(screen.getByTestId("p"));
    expect(ref.current).toHaveClass("static");
    expect(ref.current).not.toHaveClass("relative");
    expect(layer()).toHaveClass("opacity-50");
  });
});

describe("parallaxOffset", () => {
  it("lags with positive speed, leads with negative, and clamps", () => {
    expect(parallaxOffset(400, 800, 0.5, 999)).toBe(0);
    expect(parallaxOffset(600, 800, 0.5, 999)).toBe(-100);
    expect(parallaxOffset(600, 800, -0.5, 999)).toBe(100);
    expect(parallaxOffset(2000, 800, 1, 300)).toBe(-300);
  });
});
