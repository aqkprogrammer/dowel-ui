import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, Profiler } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TiltCard, TiltCardLayer } from "./tilt-card";

/*
 * jsdom does not lay out, so each test pins the card's box to 200 × 100 at
 * the origin — centre (100, 50) — and reads what the component writes.
 */
function pin(element: HTMLElement) {
  return vi
    .spyOn(element, "getBoundingClientRect")
    .mockReturnValue(DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 100 }));
}

function media(matching: string[]) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matching.includes(query),
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

function renderCard(ui: React.ReactElement = <TiltCard data-testid="card">Content</TiltCard>) {
  const result = render(ui);
  const card = screen.getByTestId("card");
  const measure = pin(card);
  return { ...result, card, measure };
}

function move(target: Element, clientX: number, clientY: number, pointerType = "mouse") {
  fireEvent.pointerMove(target, { clientX, clientY, pointerType });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TiltCard", () => {
  it("renders a flat card with its content and a hidden glare", () => {
    const { card } = renderCard();
    expect(card).toHaveAttribute("data-slot", "tilt-card");
    expect(card).toHaveAttribute("data-tilt", "rest");
    expect(card).toHaveTextContent("Content");
    expect(card.style.transform).toBe("");
    const glare = card.querySelector('[data-slot="tilt-card-glare"]');
    expect(glare).toHaveAttribute("aria-hidden", "true");
    expect(glare).toHaveClass("pointer-events-none");
  });

  it("tilts toward the pointer, pressing the side under it away", () => {
    const { card } = renderCard();
    // Right edge, bottom quarter: x = 1, y = 0.5.
    move(card, 200, 75);
    expect(card).toHaveAttribute("data-tilt", "follow");
    expect(card.style.transform).toBe(
      "perspective(800px) rotateX(-5deg) rotateY(10deg) scale3d(1.02, 1.02, 1)",
    );
  });

  it("stays level with the pointer at the centre", () => {
    const { card } = renderCard();
    move(card, 100, 50);
    expect(card.style.transform).toContain("rotateX(0deg) rotateY(0deg)");
  });

  it("honours maxTilt, perspective and scale", () => {
    const { card } = renderCard(
      <TiltCard data-testid="card" maxTilt={20} perspective={500} scale={1}>
        x
      </TiltCard>,
    );
    move(card, 0, 0);
    expect(card.style.transform).toBe(
      "perspective(500px) rotateX(20deg) rotateY(-20deg) scale3d(1, 1, 1)",
    );
  });

  it("clamps a pointer that slips past the edge", () => {
    const { card } = renderCard();
    move(card, 260, -40);
    expect(card.style.transform).toContain("rotateX(10deg) rotateY(10deg)");
  });

  it("moves the glare to the pointer", () => {
    const { card } = renderCard();
    move(card, 50, 25);
    expect(card.style.getPropertyValue("--tilt-glare-x")).toBe("25%");
    expect(card.style.getPropertyValue("--tilt-glare-y")).toBe("25%");
  });

  it("can drop the glare", () => {
    const { card } = renderCard(
      <TiltCard data-testid="card" glare={false}>
        x
      </TiltCard>,
    );
    expect(card.querySelector('[data-slot="tilt-card-glare"]')).toBeNull();
  });

  it("springs back flat when the pointer leaves", () => {
    const { card } = renderCard();
    move(card, 200, 100);
    fireEvent.pointerLeave(card);
    expect(card).toHaveAttribute("data-tilt", "rest");
    expect(card.style.transform).toBe("");
    expect(card.style.getPropertyValue("--tilt-px")).toBe("0");
  });

  it("measures once per hover, not on every move", () => {
    const { card, measure } = renderCard();
    move(card, 10, 10);
    move(card, 20, 20);
    expect(measure).toHaveBeenCalledTimes(1);
    fireEvent.pointerLeave(card);
    move(card, 30, 30);
    expect(measure).toHaveBeenCalledTimes(2);
  });

  it("re-measures after a scroll or resize", () => {
    const { card, measure } = renderCard();
    move(card, 10, 10);
    fireEvent.scroll(window);
    move(card, 20, 20);
    fireEvent(window, new Event("resize"));
    move(card, 30, 30);
    expect(measure).toHaveBeenCalledTimes(3);
  });

  it("ignores a card with no size", () => {
    render(<TiltCard data-testid="card">x</TiltCard>);
    const card = screen.getByTestId("card");
    move(card, 10, 10);
    expect(card.style.transform).toBe("");
  });

  it("does not re-render on pointer move", () => {
    const onRender = vi.fn();
    renderCard(
      <Profiler id="tilt" onRender={onRender}>
        <TiltCard data-testid="card">x</TiltCard>
      </Profiler>,
    );
    const renders = onRender.mock.calls.length;
    const card = screen.getByTestId("card");
    move(card, 10, 10);
    move(card, 150, 80);
    fireEvent.pointerLeave(card);
    expect(onRender).toHaveBeenCalledTimes(renders);
  });

  it("still calls the consumer's pointer handlers", () => {
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    const { card } = renderCard(
      <TiltCard
        data-testid="card"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        x
      </TiltCard>,
    );
    move(card, 10, 10);
    fireEvent.pointerLeave(card);
    expect(onPointerMove).toHaveBeenCalledOnce();
    expect(onPointerLeave).toHaveBeenCalledOnce();
  });

  describe("stays flat", () => {
    it("for users who prefer reduced motion", () => {
      media(["(prefers-reduced-motion: reduce)"]);
      const { card } = renderCard();
      move(card, 200, 100);
      expect(card.style.transform).toBe("");
      expect(card).toHaveAttribute("data-tilt", "rest");
    });

    it("on a coarse pointer", () => {
      media(["(pointer: coarse)"]);
      const { card } = renderCard();
      move(card, 200, 100);
      expect(card.style.transform).toBe("");
    });

    it("for touch", () => {
      const { card } = renderCard();
      move(card, 200, 100, "touch");
      expect(card.style.transform).toBe("");
    });

    it("when disabled", () => {
      const { card } = renderCard(
        <TiltCard data-testid="card" disabled>
          x
        </TiltCard>,
      );
      move(card, 200, 100);
      expect(card.style.transform).toBe("");
    });

    it("with a maxTilt of zero", () => {
      const { card } = renderCard(
        <TiltCard data-testid="card" maxTilt={0}>
          x
        </TiltCard>,
      );
      move(card, 200, 100);
      expect(card.style.transform).toBe("");
    });

    it("and levels out when disabled mid-tilt", () => {
      const { card, rerender } = renderCard();
      move(card, 200, 100);
      expect(card.style.transform).not.toBe("");
      rerender(
        <TiltCard data-testid="card" disabled>
          Content
        </TiltCard>,
      );
      expect(card.style.transform).toBe("");
      expect(card).toHaveAttribute("data-tilt", "rest");
    });

    it("when a touch follows a mouse", () => {
      const { card } = renderCard();
      move(card, 200, 100);
      move(card, 200, 100, "touch");
      expect(card.style.transform).toBe("");
    });
  });

  describe("TiltCardLayer", () => {
    it("drifts toward the pointer by its depth", () => {
      const { card } = renderCard(
        <TiltCard data-testid="card">
          <TiltCardLayer depth={24}>Floating</TiltCardLayer>
        </TiltCard>,
      );
      const layer = screen.getByText("Floating");
      expect(layer).toHaveAttribute("data-slot", "tilt-card-layer");
      expect(layer.style.translate).toBe(
        "calc(var(--tilt-px, 0) * 24px) calc(var(--tilt-py, 0) * 24px)",
      );
      move(card, 150, 25);
      expect(card.style.getPropertyValue("--tilt-px")).toBe("0.5");
      expect(card.style.getPropertyValue("--tilt-py")).toBe("-0.5");
    });

    it("defaults its depth and accepts className and style", () => {
      render(
        <TiltCardLayer className="p-4" style={{ opacity: 0.5 }}>
          Layer
        </TiltCardLayer>,
      );
      const layer = screen.getByText("Layer");
      expect(layer.style.translate).toContain("12px");
      expect(layer.style.opacity).toBe("0.5");
      expect(layer).toHaveClass("p-4", "relative");
    });
  });

  it("lifts, rather than tilts, for keyboard focus inside it", async () => {
    const user = userEvent.setup();
    const { card } = renderCard(
      <TiltCard data-testid="card">
        <a href="#read">Read the story</a>
      </TiltCard>,
    );
    await user.keyboard("{Tab}");
    expect(screen.getByRole("link", { name: "Read the story" })).toHaveFocus();
    expect(card).toHaveClass(
      "has-focus-visible:-translate-y-1",
      "focus-visible:-translate-y-1",
    );
    expect(card.style.transform).toBe("");
  });

  it("lets a consumer className override a conflicting utility", () => {
    const { card } = renderCard(
      <TiltCard data-testid="card" className="rounded-3xl shadow-none">
        x
      </TiltCard>,
    );
    expect(card).toHaveClass("rounded-3xl", "shadow-none");
    expect(card).not.toHaveClass("rounded-xl");
    expect(card).not.toHaveClass("shadow-sm");
  });

  it("forwards object and callback refs", () => {
    const ref = createRef<HTMLDivElement>();
    const { unmount } = render(<TiltCard ref={ref}>x</TiltCard>);
    expect(ref.current).toHaveAttribute("data-slot", "tilt-card");
    unmount();
    expect(ref.current).toBeNull();
    const callback = vi.fn();
    render(<TiltCard ref={callback}>x</TiltCard>);
    expect(callback).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it("forwards native attributes", () => {
    render(
      <TiltCard aria-label="Featured" role="group">
        x
      </TiltCard>,
    );
    expect(screen.getByRole("group", { name: "Featured" })).toBeInTheDocument();
  });

  it("stops listening for scroll on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<TiltCard>x</TiltCard>);
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function), { capture: true });
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <TiltCard>
        <TiltCardLayer depth={16}>
          <h3>Northern lights</h3>
        </TiltCardLayer>
        <a href="#aurora">Read more</a>
      </TiltCard>,
    );
    await expectNoA11yViolations(container);
  });
});
