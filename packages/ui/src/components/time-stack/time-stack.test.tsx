import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TimeStack, type TimeStackItem } from "./time-stack";

const items: TimeStackItem[] = [
  { label: "Today", title: "Beach", image: "/a.jpg" },
  { label: "1d ago", title: "Mountains", image: "/b.jpg" },
  { label: "1w ago", title: "Forest", image: "/c.jpg" },
  { label: "1m ago", title: "Woods", content: <span>custom</span> },
  { label: "1y ago", title: "Hills" },
];

function ticks(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="time-stack-tick"]')];
}

/** Lays the ticks out bottom-up, 20px apart, as the column-reverse scrubber does. */
function layOut(container: HTMLElement) {
  ticks(container).forEach((tick, i) => {
    const top = 200 - i * 20;
    tick.getBoundingClientRect = () =>
      ({ top, bottom: top + 10, height: 10, left: 0, right: 80, width: 80 }) as DOMRect;
  });
}

function wheel(target: Element, deltaY: number) {
  const event = new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

describe("TimeStack", () => {
  it("renders a named region, the current card as a labelled group, and a slider scrubber", () => {
    render(<TimeStack items={items} />);
    expect(screen.getByRole("region", { name: "Time stack" })).toBeInTheDocument();
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveAccessibleName("Today: Beach");
    const slider = screen.getByRole("slider", { name: "Timeline" });
    expect(slider).toHaveAttribute("aria-orientation", "vertical");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "4");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    expect(slider).toHaveAttribute("aria-valuetext", "Today: Beach");
  });

  it("steps through time with the keyboard", async () => {
    const user = userEvent.setup();
    render(<TimeStack items={items} />);
    const slider = screen.getByRole("slider");
    await user.tab();
    expect(slider).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(slider).toHaveAttribute("aria-valuetext", "1d ago: Mountains");
    await user.keyboard("{ArrowRight}{PageUp}");
    expect(slider).toHaveAttribute("aria-valuenow", "4");
    await user.keyboard("{ArrowUp}");
    expect(slider).toHaveAttribute("aria-valuenow", "4");
    await user.keyboard("{ArrowDown}{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuenow", "2");
    await user.keyboard("{PageDown}");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("{End}");
    expect(slider).toHaveAttribute("aria-valuenow", "4");
    await user.keyboard("{Home}");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("a");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
  });

  it("places cards in depth: passed cards fall away, later ones recede", async () => {
    const user = userEvent.setup();
    const { container } = render(<TimeStack items={items} defaultIndex={1} />);
    const cards = [...container.querySelectorAll<HTMLElement>('[data-slot="time-stack-card"]')];
    expect(cards.map((card) => card.dataset.state)).toEqual([
      "past",
      "current",
      "future",
      "future",
      "future",
    ]);
    expect(cards[0]).toHaveAttribute("inert");
    expect(cards[0]!.style.opacity).toBe("0");
    expect(cards[0]!.style.transform).toContain("scale(1.3)");
    expect(cards[3]!.style.opacity).toBe("0.6");
    expect(cards[3]!.style.transform).toContain("rotateX(4deg)");
    expect(cards[1]!.style.zIndex).toBe("4");

    await user.click(screen.getByRole("slider"));
    await user.keyboard("{Home}");
    expect(cards[0]).toHaveAttribute("data-state", "current");
    expect(cards[0]).not.toHaveAttribute("inert");
  });

  it("scrubs to the nearest tick on press and drag", () => {
    const { container } = render(<TimeStack items={items} />);
    layOut(container);
    const slider = screen.getByRole("slider");

    fireEvent.pointerDown(slider, { button: 0, pointerId: 1, clientY: 145 });
    expect(slider).toHaveAttribute("aria-valuenow", "3");
    fireEvent.pointerMove(slider, { pointerId: 1, clientY: 124 });
    expect(slider).toHaveAttribute("aria-valuenow", "4");
    fireEvent.pointerUp(slider, { pointerId: 1, clientY: 124 });

    // Hovering after release previews the label but does not move the stack.
    fireEvent.pointerMove(slider, { pointerId: 1, clientY: 205 });
    expect(slider).toHaveAttribute("aria-valuenow", "4");
    const label = ticks(container)[0]!.querySelector('[data-slot="time-stack-tick-label"]');
    expect(label).not.toHaveClass("opacity-0");
    fireEvent.pointerLeave(slider);
    expect(label).toHaveClass("opacity-0");

    // Secondary buttons and stray releases are ignored.
    fireEvent.pointerDown(slider, { button: 2, pointerId: 2, clientY: 205 });
    fireEvent.pointerUp(slider, { pointerId: 2 });
    fireEvent.pointerCancel(slider, { pointerId: 2 });
    expect(slider).toHaveAttribute("aria-valuenow", "4");
  });

  it("follows the pointer without pressing when hoverScrub is on", () => {
    const { container } = render(<TimeStack items={items} hoverScrub />);
    layOut(container);
    const slider = screen.getByRole("slider");
    fireEvent.pointerMove(slider, { pointerId: 1, clientY: 165 });
    expect(slider).toHaveAttribute("aria-valuenow", "2");
  });

  it("steps with the wheel, announces it, and lets the page scroll at either end", () => {
    const { container } = render(<TimeStack items={items} />);
    const stack = container.querySelector('[data-slot="time-stack-stack"]')!;
    const slider = screen.getByRole("slider");

    const small = wheel(stack, 30);
    expect(small.defaultPrevented).toBe(true);
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    wheel(stack, 40);
    expect(slider).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("status")).toHaveTextContent("1d ago: Mountains");

    wheel(stack, -100);
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    const atStart = wheel(stack, -100);
    expect(atStart.defaultPrevented).toBe(false);
    expect(wheel(stack, 0).defaultPrevented).toBe(false);
  });

  it("does not listen to the wheel when wheel is off", () => {
    const { container } = render(<TimeStack items={items} wheel={false} />);
    const event = wheel(container.querySelector('[data-slot="time-stack-stack"]')!, 100);
    expect(event.defaultPrevented).toBe(false);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "0");
  });

  it("follows the controlled index and only requests changes", async () => {
    const onIndexChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <TimeStack items={items} index={2} onIndexChange={onIndexChange} />,
    );
    const slider = screen.getByRole("slider");
    await user.click(slider);
    await user.keyboard("{ArrowUp}");
    expect(onIndexChange).toHaveBeenLastCalledWith(3);
    expect(slider).toHaveAttribute("aria-valuenow", "2");
    rerender(<TimeStack items={items} index={3} onIndexChange={onIndexChange} />);
    expect(slider).toHaveAttribute("aria-valuetext", "1m ago: Woods");
  });

  it("renders images, custom content and numbered tiles in the mono tone", () => {
    const { container, rerender } = render(<TimeStack items={items} />);
    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(screen.getByText("custom")).toBeInTheDocument();
    rerender(<TimeStack items={items} tone="mono" size="lg" />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelector('[data-slot="time-stack"]')).toHaveClass(
      "[--ts-card:18rem]",
    );
  });

  it("scales ticks from the inline end in either direction", () => {
    const { container } = render(<TimeStack items={items} />);
    expect(screen.getByRole("slider")).toHaveClass(
      "[--ts-origin:right]",
      "rtl:[--ts-origin:left]",
    );
    expect(container.querySelectorAll('[data-slot="time-stack-subtick"]')).toHaveLength(8);
  });

  it("takes custom names", () => {
    render(<TimeStack items={items} aria-labelledby="h" scrubberLabel="History" />);
    expect(screen.getByRole("region")).not.toHaveAttribute("aria-label");
    expect(screen.getByRole("slider", { name: "History" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards refs and props", () => {
    const ref = createRef<HTMLElement>();
    render(<TimeStack items={items} ref={ref} className="gap-2" data-testid="t" />);
    expect(ref.current).toBe(screen.getByTestId("t"));
    expect(ref.current).toHaveClass("gap-2");
    expect(ref.current).not.toHaveClass("gap-6");
  });

  it("uses token-driven transitions, which collapse under reduced motion", () => {
    const { container } = render(<TimeStack items={items} />);
    for (const card of container.querySelectorAll('[data-slot="time-stack-card"]')) {
      expect(card.className).toContain("duration-[var(--duration-slower)]");
    }
  });

  it("has no axe violations", async () => {
    const { container, rerender } = render(<TimeStack items={items} aria-label="Backups" />);
    await expectNoA11yViolations(container);
    rerender(<TimeStack items={items} aria-label="Backups" tone="mono" />);
    await expectNoA11yViolations(container);
  });
});
