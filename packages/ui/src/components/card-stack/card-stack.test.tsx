import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { CardStack } from "./card-stack";
import { deckCardStyle, fanCardStyle } from "./card-stack-layout";

const NAMES = ["Ada", "Grace", "Linus", "Margaret"];

// Children must be the cards themselves: the stack counts its direct children.
const cards = NAMES.map((name) => (
  <article key={name} className="p-4">
    <a href={`#${name}`}>{name}</a>
  </article>
));

function slides(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="card-stack-card"]')];
}

function wheel(element: Element, deltaY: number, timeStamp: number) {
  const event = new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true });
  Object.defineProperty(event, "timeStamp", { value: timeStamp });
  act(() => {
    element.dispatchEvent(event);
  });
  return event;
}

describe("CardStack — deck", () => {
  it("is a labelled carousel of labelled slides, with only the top card exposed", () => {
    const { container } = render(<CardStack aria-label="Creators">{cards}</CardStack>);
    const region = screen.getByRole("region", { name: "Creators" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    const [first, second] = slides(container);
    expect(first).toHaveAttribute("aria-roledescription", "slide");
    expect(first).toHaveAttribute("aria-label", "1 of 4");
    expect(first).not.toHaveAttribute("aria-hidden");
    expect(second).toHaveAttribute("aria-hidden", "true");
    expect(second).toHaveAttribute("inert");
    expect(screen.getByRole("link", { name: "Ada" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Grace" })).not.toBeInTheDocument();
  });

  it("names itself 'Cards' by default", () => {
    render(<CardStack>{cards}</CardStack>);
    expect(screen.getByRole("region", { name: "Cards" })).toBeInTheDocument();
  });

  it("moves with the indicator dots and announces the new card", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(<CardStack onIndexChange={onIndexChange}>{cards}</CardStack>);
    const third = screen.getByRole("button", { name: "Card 3 of 4" });
    await user.click(third);
    expect(onIndexChange).toHaveBeenCalledWith(2);
    expect(third).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Card 3 of 4");
    expect(screen.getByRole("link", { name: "Linus" })).toBeInTheDocument();
    // Pressing the current dot again changes nothing.
    await user.click(third);
    expect(onIndexChange).toHaveBeenCalledTimes(1);
  });

  it("steps with arrow keys, Home and End, moving focus along the dots", async () => {
    const user = userEvent.setup();
    render(<CardStack>{cards}</CardStack>);
    const dot = (n: number) => screen.getByRole("button", { name: `Card ${String(n)} of 4` });
    // Only the current dot is in the tab order (roving tabindex).
    expect(dot(1)).toHaveAttribute("tabindex", "0");
    expect(dot(2)).toHaveAttribute("tabindex", "-1");
    act(() => dot(1).focus());

    await user.keyboard("{ArrowRight}");
    expect(dot(2)).toHaveFocus();
    expect(dot(2)).toHaveAttribute("aria-current", "true");
    await user.keyboard("{ArrowDown}");
    expect(dot(3)).toHaveAttribute("aria-current", "true");
    await user.keyboard("{ArrowUp}");
    expect(dot(2)).toHaveAttribute("aria-current", "true");
    await user.keyboard("{ArrowLeft}");
    expect(dot(1)).toHaveAttribute("aria-current", "true");
    await user.keyboard("{End}");
    expect(dot(4)).toHaveFocus();
    await user.keyboard("{Home}");
    expect(dot(1)).toHaveFocus();
    // Past either end nothing happens.
    await user.keyboard("{ArrowUp}");
    expect(dot(1)).toHaveAttribute("aria-current", "true");
    expect(dot(2)).toHaveAttribute("tabindex", "-1");
  });

  it("reverses the horizontal arrows in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <CardStack>{cards}</CardStack>
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Card 1 of 4" }));
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Card 2 of 4" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("ignores other keys", () => {
    render(<CardStack>{cards}</CardStack>);
    const dot = screen.getByRole("button", { name: "Card 1 of 4" });
    fireEvent.keyDown(dot, { key: "a" });
    expect(dot).toHaveAttribute("aria-current", "true");
  });

  it("steps one card per wheel gesture, throttled, and lets the page scroll at the ends", () => {
    const { container } = render(<CardStack>{cards}</CardStack>);
    const stage = container.querySelector('[data-slot="card-stack-stage"]') as HTMLElement;
    const current = () =>
      slides(container).findIndex((slide) => slide.getAttribute("data-active") === "true");

    expect(wheel(stage, 5, 0).defaultPrevented).toBe(false); // below the threshold
    expect(current()).toBe(0);

    const first = wheel(stage, 40, 1000);
    expect(first.defaultPrevented).toBe(true);
    expect(current()).toBe(1);

    wheel(stage, 40, 1100); // inside the interval
    expect(current()).toBe(1);

    wheel(stage, -40, 1500);
    expect(current()).toBe(0);

    // At the first card, scrolling up belongs to the page.
    expect(wheel(stage, -40, 2000).defaultPrevented).toBe(false);
  });

  it("steps with a vertical swipe", () => {
    const { container } = render(<CardStack>{cards}</CardStack>);
    const stage = container.querySelector('[data-slot="card-stack-stage"]') as HTMLElement;
    fireEvent.touchStart(stage, { touches: [{ clientY: 300 }] });
    fireEvent.touchMove(stage, { touches: [{ clientY: 280 }] });
    expect(screen.getByRole("status")).toHaveTextContent("");
    fireEvent.touchMove(stage, { touches: [{ clientY: 200 }] });
    expect(screen.getByRole("status")).toHaveTextContent("Card 2 of 4");
    // One step per swipe.
    fireEvent.touchMove(stage, { touches: [{ clientY: 100 }] });
    expect(screen.getByRole("status")).toHaveTextContent("Card 2 of 4");
    fireEvent.touchEnd(stage);
    fireEvent.touchMove(stage, { touches: [] });
  });

  it("starts from defaultIndex and uses a custom card label", () => {
    render(
      <CardStack defaultIndex={1} getCardLabel={(i) => NAMES[i] ?? ""}>
        {cards}
      </CardStack>,
    );
    expect(screen.getByRole("button", { name: "Card Grace" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("group", { name: "Grace" })).toBeInTheDocument();
  });

  it("follows a controlled index", async () => {
    function Controlled() {
      const [index, setIndex] = useState(0);
      return (
        <>
          <CardStack index={index} onIndexChange={setIndex}>
            {cards}
          </CardStack>
          <output>{index}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Card 4 of 4" }));
    expect(screen.getByRole("button", { name: "Card 4 of 4" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByText("3", { selector: "output" })).toBeInTheDocument();
  });

  it("does not move when controlled without a handler", async () => {
    const user = userEvent.setup();
    render(<CardStack index={0}>{cards}</CardStack>);
    await user.click(screen.getByRole("button", { name: "Card 2 of 4" }));
    expect(screen.getByRole("button", { name: "Card 1 of 4" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <CardStack ref={ref} className="gap-8">
        {cards}
      </CardStack>,
    );
    expect(ref.current).toBe(screen.getByRole("region"));
    expect(ref.current).toHaveClass("gap-8");
    expect(ref.current).not.toHaveClass("gap-4");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<CardStack>{cards}</CardStack>);
    await expectNoA11yViolations(container);
  });
});

describe("CardStack — fan", () => {
  function Fan(props: { open?: boolean }) {
    return (
      <CardStack variant="fan" aria-label="Photos" data-testid="fan" {...props}>
        {cards}
      </CardStack>
    );
  }

  it("is a labelled list of cards", () => {
    render(<Fan />);
    expect(screen.getByRole("list", { name: "Photos" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("fans out on hover and lifts the card under the pointer", () => {
    const { container } = render(<Fan />);
    const fan = screen.getByTestId("fan");
    expect(fan).toHaveAttribute("data-state", "closed");
    fireEvent.pointerEnter(fan);
    expect(fan).toHaveAttribute("data-state", "open");

    const card = slides(container)[1] as HTMLElement;
    fireEvent.pointerEnter(card);
    expect(card.firstElementChild).toHaveAttribute("data-lifted", "true");

    fireEvent.pointerLeave(fan);
    expect(fan).toHaveAttribute("data-state", "closed");
    expect(card.firstElementChild).not.toHaveAttribute("data-lifted");
  });

  it("fans out while focus is inside it, and closes when focus leaves", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <Fan />
        <button type="button">After</button>
      </>,
    );
    const fan = screen.getByTestId("fan");
    await user.tab();
    expect(fan).toHaveAttribute("data-state", "open");
    expect(slides(container)[0]?.firstElementChild).toHaveAttribute("data-lifted", "true");
    await user.tab();
    expect(slides(container)[1]?.firstElementChild).toHaveAttribute("data-lifted", "true");
    await user.tab({ shift: false });
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    expect(fan).toHaveAttribute("data-state", "closed");
  });

  it("can be forced open or shut", () => {
    const { rerender } = render(<Fan open />);
    expect(screen.getByTestId("fan")).toHaveAttribute("data-state", "open");
    rerender(<Fan open={false} />);
    fireEvent.pointerEnter(screen.getByTestId("fan"));
    expect(screen.getByTestId("fan")).toHaveAttribute("data-state", "closed");
  });

  it("forwards pointer and focus handlers", async () => {
    const handlers = {
      onPointerEnter: vi.fn(),
      onPointerLeave: vi.fn(),
      onFocus: vi.fn(),
      onBlur: vi.fn(),
    };
    const user = userEvent.setup();
    render(
      <CardStack variant="fan" {...handlers}>
        {cards}
      </CardStack>,
    );
    const list = screen.getByRole("list", { name: "Cards" });
    fireEvent.pointerEnter(list);
    fireEvent.pointerLeave(list);
    await user.tab();
    await user.tab();
    expect(handlers.onPointerEnter).toHaveBeenCalled();
    expect(handlers.onPointerLeave).toHaveBeenCalled();
    expect(handlers.onFocus).toHaveBeenCalled();
    expect(handlers.onBlur).toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Fan open />);
    await expectNoA11yViolations(container);
  });
});

describe("card stack geometry", () => {
  it("recedes cards behind the top one and hides passed ones", () => {
    expect(deckCardStyle(0, 0, 4)).toMatchObject({ opacity: 1, zIndex: 4 });
    expect(deckCardStyle(1, 0, 4).transform).toBe("translateY(-30px) scale(0.92)");
    expect(deckCardStyle(5, 0, 6).transform).toContain("translateY(-90px)");
    expect(deckCardStyle(0, 1, 4)).toMatchObject({ opacity: 0, filter: "blur(2px)" });
  });

  it("fans cards symmetrically about the centre, and staggers from the top", () => {
    const open = { fanned: true, spread: 50, scatter: 0 };
    const left = fanCardStyle(0, 3, open).transform as string;
    const right = fanCardStyle(2, 3, open).transform as string;
    expect(left).toContain("rotate(calc(var(--card-stack-flip, 1) * -12.500deg))");
    expect(right).toContain("rotate(calc(var(--card-stack-flip, 1) * 12.500deg))");
    expect(fanCardStyle(2, 3, open).transitionDelay).toBe("calc(0ms * var(--motion-scale, 1))");
    expect(fanCardStyle(0, 3, open).transitionDelay).toBe(
      "calc(70ms * var(--motion-scale, 1))",
    );
  });

  it("never collapses the arc, and handles a single card", () => {
    const shut = fanCardStyle(0, 2, { fanned: true, spread: 0, scatter: 0 })
      .transform as string;
    expect(shut).toContain("-5.000deg");
    expect(fanCardStyle(0, 1, { fanned: true, spread: 200, scatter: -5 }).transform).toContain(
      "0.000deg",
    );
  });
});
