import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SwipeCarousel } from "./swipe-carousel";

/** Cards as separate children, as a consumer passes them. */
function cards(count = 5) {
  return Array.from({ length: count }, (_, index) => (
    <a key={index} href={`#card-${String(index + 1)}`}>
      Card {index + 1}
    </a>
  ));
}

function slides() {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="swipe-carousel-slide"]')];
}

function viewport() {
  const element = document.querySelector<HTMLElement>('[data-slot="swipe-carousel-viewport"]');
  if (!element) throw new Error("no viewport");
  return element;
}

/** Motion writes styles on the next frame, so a moved card is awaited. */
async function expectFront(slot: number) {
  await waitFor(() => {
    expect(slides()[slot]?.style.getPropertyValue("--swipe-x")).toBe("0%");
  });
}

function front() {
  return screen.getByRole("group");
}

function reduceMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: true,
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

/** A 400px-wide viewport at the origin, and 200px-wide cards. */
function layout() {
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 300 }),
  );
}

/**
 * A slow drag: it holds still before letting go, so no flick velocity is
 * carried and the result depends on distance alone.
 */
async function swipe(from: number, to: number) {
  const element = viewport();
  fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: from });
  fireEvent.pointerMove(element, { pointerId: 1, clientX: (from + to) / 2 });
  fireEvent.pointerMove(element, { pointerId: 1, clientX: to });
  await new Promise((resolve) => setTimeout(resolve, 60));
  fireEvent.pointerUp(element, { pointerId: 1, clientX: to });
}

/** A fast drag, released at once: the flick carries it one card further. */
function flick(from: number, to: number) {
  const element = viewport();
  fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: from });
  fireEvent.pointerMove(element, { pointerId: 1, clientX: (from + to) / 2 });
  fireEvent.pointerMove(element, { pointerId: 1, clientX: to });
  fireEvent.pointerUp(element, { pointerId: 1, clientX: to });
}

function tap(x: number) {
  const element = viewport();
  fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: x });
  fireEvent.pointerUp(element, { pointerId: 1, clientX: x });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SwipeCarousel", () => {
  it("follows the APG carousel structure, exposing only the front card", () => {
    render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    const carousel = screen.getByRole("region", { name: "Cards" });
    expect(carousel).toHaveAttribute("aria-roledescription", "carousel");
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(front()).toHaveAttribute("aria-roledescription", "slide");
    expect(front()).toHaveAccessibleName("1 of 5");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(slides()[1]).toHaveAttribute("inert");
  });

  it("places every card on the ring, the front one largest", () => {
    render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    const [first, second, third] = slides();
    expect(first?.style.getPropertyValue("--swipe-x")).toBe("0%");
    expect(first?.style.getPropertyValue("--swipe-s")).toBe("1");
    expect(Number(first?.style.zIndex)).toBe(100);
    // 72° round the ring: out to the side, smaller, and a little higher.
    expect(second?.style.getPropertyValue("--swipe-x")).toBe("63.72%");
    expect(second?.style.getPropertyValue("--swipe-y")).toBe("-4.49%");
    expect(second?.style.getPropertyValue("--swipe-s")).toBe("0.8273");
    // 144°: tucked behind.
    expect(Number(third?.style.zIndex)).toBeLessThan(Number(second?.style.zIndex));
    expect(first).toHaveClass("rtl:translate-x-[calc(var(--swipe-x)*-1)]");
  });

  it("turns with the buttons, wrapping round", async () => {
    reduceMotion();
    const user = userEvent.setup();
    render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    await user.click(screen.getByRole("button", { name: "Previous card" }));
    expect(front()).toHaveAccessibleName("5 of 5");
    await expectFront(4);
    await user.click(screen.getByRole("button", { name: "Next card" }));
    await user.click(screen.getByRole("button", { name: "Next card" }));
    expect(front()).toHaveAccessibleName("2 of 5");
    await expectFront(1);
  });

  it("springs to the new card when motion is allowed", async () => {
    const user = userEvent.setup();
    render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    await user.click(screen.getByRole("button", { name: "Next card" }));
    expect(front()).toHaveAccessibleName("2 of 5");
    await waitFor(
      () => {
        expect(slides()[1]?.style.getPropertyValue("--swipe-x")).toMatch(/^-?0(\.\d+)?%$/);
      },
      { timeout: 3000 },
    );
  });

  it("moves with arrow keys, Home and End, mirrored in RTL", async () => {
    reduceMotion();
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <SwipeCarousel>{cards()}</SwipeCarousel>
      </div>,
    );
    screen.getByRole("button", { name: "Next card" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(front()).toHaveAccessibleName("2 of 5");
    await user.keyboard("{ArrowRight}");
    expect(front()).toHaveAccessibleName("1 of 5");
    await user.keyboard("{End}");
    expect(front()).toHaveAccessibleName("5 of 5");
    await user.keyboard("{Home}");
    expect(front()).toHaveAccessibleName("1 of 5");
  });

  it("turns the ring by a swipe, one card per drag distance", async () => {
    reduceMotion();
    layout();
    render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    // 200px card × 0.64 = 128px per card: a 140px leftward drag is one card on.
    await swipe(300, 160);
    expect(front()).toHaveAccessibleName("2 of 5");
    await expectFront(1);
    await swipe(100, 360);
    expect(front()).toHaveAccessibleName("5 of 5");
  });

  it("carries a flick at most one card beyond where it was let go", () => {
    reduceMotion();
    layout();
    render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    // 20px is not a card by distance; any flick velocity adds at most one.
    flick(200, 180);
    expect(["1 of 5", "2 of 5"]).toContain(front().getAttribute("aria-label"));
  });

  it("mirrors the swipe in RTL", async () => {
    reduceMotion();
    layout();
    render(
      <div dir="rtl">
        <SwipeCarousel>{cards()}</SwipeCarousel>
      </div>,
    );
    await swipe(100, 240);
    expect(front()).toHaveAccessibleName("2 of 5");
  });

  it("snaps back when a drag is too short, and on cancel", async () => {
    reduceMotion();
    layout();
    render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    await swipe(200, 170);
    expect(front()).toHaveAccessibleName("1 of 5");
    expect(slides()[0]?.style.getPropertyValue("--swipe-x")).toBe("0%");

    const element = viewport();
    fireEvent.pointerDown(element, { button: 0, pointerId: 2, clientX: 200 });
    fireEvent.pointerMove(element, { pointerId: 2, clientX: 150 });
    expect(element.closest("section")).toHaveAttribute("data-held");
    fireEvent.pointerCancel(element, { pointerId: 2 });
    expect(element.closest("section")).not.toHaveAttribute("data-held");
    expect(front()).toHaveAccessibleName("1 of 5");
  });

  it("ignores other buttons and other pointers", () => {
    reduceMotion();
    layout();
    render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    const element = viewport();
    fireEvent.pointerDown(element, { button: 2, pointerId: 1, clientX: 300 });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: 0 });
    fireEvent.pointerUp(element, { pointerId: 1, clientX: 0 });
    fireEvent.pointerCancel(element, { pointerId: 1 });
    expect(front()).toHaveAccessibleName("1 of 5");
  });

  it("brings a card peeking out at either side to the front on tap", () => {
    reduceMotion();
    layout();
    render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    tap(380);
    expect(front()).toHaveAccessibleName("2 of 5");
    tap(20);
    tap(20);
    expect(front()).toHaveAccessibleName("5 of 5");
    tap(200);
    expect(front()).toHaveAccessibleName("5 of 5");
  });

  it("does not follow a link at the end of a drag, but does on a plain click", async () => {
    reduceMotion();
    layout();
    const onClick = vi.fn((event: Event) => {
      event.preventDefault();
    });
    render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    const link = screen.getByRole("link", { name: "Card 1" });
    link.addEventListener("click", onClick);
    await swipe(200, 180);
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports a controlled index", async () => {
    reduceMotion();
    const user = userEvent.setup();
    function Controlled() {
      const [index, setIndex] = useState(3);
      return (
        <>
          <SwipeCarousel index={index} onIndexChange={setIndex}>
            {cards()}
          </SwipeCarousel>
          <button
            type="button"
            onClick={() => {
              setIndex(0);
            }}
          >
            Reset
          </button>
        </>
      );
    }
    render(<Controlled />);
    expect(front()).toHaveAccessibleName("4 of 5");
    expect(slides()[3]?.style.getPropertyValue("--swipe-x")).toBe("0%");
    await user.click(screen.getByRole("button", { name: "Next card" }));
    expect(front()).toHaveAccessibleName("5 of 5");
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(front()).toHaveAccessibleName("1 of 5");
    await expectFront(0);
  });

  it("floats each card through the motion scale, and can be still", () => {
    const { container, rerender } = render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    const floating = container.querySelector<HTMLElement>('[data-slot="swipe-carousel-float"]');
    expect(floating?.style.getPropertyValue("--dowel-swipe-carousel-duration")).toBe(
      "calc(7100ms * var(--motion-scale, 1))",
    );
    const css = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    expect(css).toContain("@keyframes dowel-swipe-carousel-float{");
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\{[^}]*animation:none/);

    rerender(<SwipeCarousel float={false}>{cards()}</SwipeCarousel>);
    expect(container.querySelector('[data-slot="swipe-carousel-float"]')).toBeNull();
    expect(container.querySelector('[data-slot="swipe-carousel-card"]')).not.toBeNull();
  });

  it("sizes cards and accepts labels", () => {
    reduceMotion();
    render(
      <SwipeCarousel
        cardWidth="10rem"
        aspectRatio={1.25}
        labels={{
          next: "Forward",
          slide: (index, count) => `Photo ${String(index + 1)} / ${String(count)}`,
        }}
        aria-label="Gallery"
      >
        {cards(3)}
      </SwipeCarousel>,
    );
    expect(slides()[0]?.style.width).toBe("10rem");
    expect(slides()[0]?.style.aspectRatio).toBe("1 / 1.25");
    expect(screen.getByRole("region", { name: "Gallery" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "Forward" }), { key: "ArrowRight" });
    expect(front()).toHaveAccessibleName("Photo 2 / 3");
  });

  it("renders nothing without children", () => {
    const { container } = render(<SwipeCarousel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lets a consumer className win, and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <SwipeCarousel ref={ref} className="gap-8">
        {cards()}
      </SwipeCarousel>,
    );
    expect(ref.current).toHaveClass("gap-8");
    expect(ref.current).not.toHaveClass("gap-4");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SwipeCarousel>{cards()}</SwipeCarousel>);
    await expectNoA11yViolations(container);
  });
});
