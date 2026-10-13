import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Carousel,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPlayPause,
  CarouselPrevious,
  CarouselViewport,
  nearestCarouselIndex,
  wrapCarouselIndex,
  type CarouselProps,
} from "./carousel";

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

function Example({
  items = 4,
  playPause = false,
  ...props
}: Partial<CarouselProps> & { items?: number; playPause?: boolean }) {
  return (
    <Carousel label="Featured" {...props}>
      <CarouselViewport>
        {Array.from({ length: items }, (_, i) => (
          <CarouselItem key={i}>Item {i + 1}</CarouselItem>
        ))}
      </CarouselViewport>
      <CarouselPrevious />
      <CarouselNext />
      <CarouselDots />
      {playPause ? <CarouselPlayPause /> : null}
    </Carousel>
  );
}

const viewport = () => screen.getByRole("group", { name: "Items" });
const current = () =>
  screen
    .getAllByRole("button", { name: /^Go to/ })
    .findIndex((dot) => dot.getAttribute("aria-current") === "true");

/**
 * Gives the viewport and its items a layout: items `width` wide in a row,
 * shifted by the viewport's scroll position, which `scrollBy` advances.
 */
function layOut(width = 300) {
  let scroll = 0;
  const node = viewport();
  const items = [...node.querySelectorAll<HTMLElement>("[data-slot=carousel-item]")];
  node.getBoundingClientRect = () => new DOMRect(0, 0, width, 200);
  items.forEach((item, i) => {
    item.getBoundingClientRect = () => new DOMRect(i * width - scroll, 0, width, 200);
  });
  const scrollBy = vi.fn((options: ScrollToOptions) => {
    scroll += options.left ?? 0;
  });
  node.scrollBy = scrollBy as unknown as typeof node.scrollBy;
  return {
    scrollBy,
    setScroll(next: number) {
      scroll = next;
    },
  };
}

describe("Carousel", () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("is a labelled carousel region of labelled slides", async () => {
    const { container } = render(<Example items={3} />);
    const region = screen.getByRole("region", { name: "Featured" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    const slides = within(viewport()).getAllByRole("group");
    expect(slides.map((slide) => slide.getAttribute("aria-label"))).toEqual([
      "1 of 3",
      "2 of 3",
      "3 of 3",
    ]);
    for (const slide of slides) expect(slide).toHaveAttribute("aria-roledescription", "slide");
    expect(viewport()).toHaveAttribute("tabindex", "0");
    expect(viewport()).toHaveAttribute("aria-live", "polite");
    await expectNoA11yViolations(container);
  });

  it("steps with previous and next, disabling them at the ends", () => {
    const onIndexChange = vi.fn();
    render(<Example items={3} onIndexChange={onIndexChange} />);
    const previous = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(previous).toBeDisabled();
    expect(current()).toBe(0);
    fireEvent.click(next);
    expect(current()).toBe(1);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    fireEvent.click(next);
    expect(current()).toBe(2);
    expect(next).toBeDisabled();
    fireEvent.click(previous);
    expect(current()).toBe(1);
  });

  it("wraps around the ends when it loops", () => {
    render(<Example items={3} loop />);
    const previous = screen.getByRole("button", { name: "Previous" });
    expect(previous).toBeEnabled();
    fireEvent.click(previous);
    expect(current()).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(current()).toBe(0);
  });

  it("counts positions by how many items show at once, and sizes items from it", () => {
    render(<Example items={5} itemsPerView={2} gap={24} />);
    expect(screen.getAllByRole("button", { name: /^Go to/ })).toHaveLength(4);
    const region = screen.getByRole("region", { name: "Featured" });
    expect(region.style.getPropertyValue("--carousel-per-view")).toBe("2");
    expect(region.style.getPropertyValue("--carousel-gap")).toBe("24px");
    fireEvent.click(screen.getByRole("button", { name: "Go to 4 of 4" }));
    expect(current()).toBe(3);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("steps with the arrow keys in reading direction, and jumps with Home and End", () => {
    const { rerender } = render(<Example items={4} />);
    fireEvent.keyDown(viewport(), { key: "ArrowRight" });
    expect(current()).toBe(1);
    fireEvent.keyDown(viewport(), { key: "End" });
    expect(current()).toBe(3);
    fireEvent.keyDown(viewport(), { key: "ArrowLeft" });
    expect(current()).toBe(2);
    fireEvent.keyDown(viewport(), { key: "Home" });
    expect(current()).toBe(0);
    // Keys on a control inside an item are the control's own.
    fireEvent.keyDown(within(viewport()).getByText("Item 1"), { key: "ArrowRight" });
    expect(current()).toBe(0);

    rerender(<Example items={4} style={{ direction: "rtl" }} />);
    fireEvent.keyDown(viewport(), { key: "ArrowLeft" });
    expect(current()).toBe(1);
  });

  it("steps up and down when vertical", () => {
    render(<Example items={3} orientation="vertical" />);
    fireEvent.keyDown(viewport(), { key: "ArrowDown" });
    expect(current()).toBe(1);
    fireEvent.keyDown(viewport(), { key: "ArrowRight" });
    expect(current()).toBe(1);
    expect(viewport().className).toContain("snap-y");
  });

  it("scrolls the item to the start edge, smoothly unless motion is reduced", () => {
    const { unmount } = render(<Example items={3} />);
    const layout = layOut(300);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(layout.scrollBy).toHaveBeenLastCalledWith({ left: 300, behavior: "smooth" });
    unmount();

    vi.restoreAllMocks();
    mockReducedMotion(true);
    render(<Example items={3} />);
    const reduced = layOut(300);
    fireEvent.click(screen.getByRole("button", { name: "Go to 3 of 3" }));
    expect(reduced.scrollBy).toHaveBeenLastCalledWith({ left: 600, behavior: "auto" });
  });

  it("reads the position back when the reader scrolls", async () => {
    const onIndexChange = vi.fn();
    render(<Example items={4} onIndexChange={onIndexChange} />);
    const layout = layOut(300);
    layout.setScroll(610);
    await act(async () => {
      viewport().dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(current()).toBe(2);
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
  });

  it("follows a controlled index and only reports requests to change it", () => {
    const onIndexChange = vi.fn();
    const { rerender } = render(<Example items={4} index={2} onIndexChange={onIndexChange} />);
    expect(current()).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(3);
    expect(current()).toBe(2);
    rerender(<Example items={4} index={3} onIndexChange={onIndexChange} />);
    expect(current()).toBe(3);
  });

  it("starts at defaultIndex", () => {
    render(<Example items={4} defaultIndex={2} />);
    expect(current()).toBe(2);
  });

  it("rotates on a timer, pausing on hover and focus, and stops with the control", () => {
    vi.useFakeTimers();
    render(<Example items={3} autoplay interval={2000} playPause />);
    const region = screen.getByRole("region", { name: "Featured" });
    expect(region).toHaveAttribute("data-rotating", "true");
    expect(viewport()).toHaveAttribute("aria-live", "off");

    act(() => void vi.advanceTimersByTime(2000));
    expect(current()).toBe(1);

    fireEvent.pointerEnter(region, { pointerType: "mouse" });
    act(() => void vi.advanceTimersByTime(5000));
    expect(current()).toBe(1);
    fireEvent.pointerLeave(region);
    act(() => void vi.advanceTimersByTime(2000));
    expect(current()).toBe(2);

    // Wraps back to the start.
    act(() => void vi.advanceTimersByTime(2000));
    expect(current()).toBe(0);

    act(() => {
      viewport().focus();
    });
    act(() => void vi.advanceTimersByTime(5000));
    expect(current()).toBe(0);
    act(() => {
      viewport().blur();
    });

    const toggle = screen.getByRole("button", { name: "Stop slide rotation" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Start slide rotation" })).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(10000));
    expect(current()).toBe(0);
  });

  it("does not hover-pause for touch, which has no hover", () => {
    vi.useFakeTimers();
    render(<Example items={3} autoplay interval={2000} playPause />);
    fireEvent.pointerEnter(screen.getByRole("region", { name: "Featured" }), {
      pointerType: "touch",
    });
    act(() => void vi.advanceTimersByTime(2000));
    expect(current()).toBe(1);
  });

  it("never starts rotating by itself under reduced motion", () => {
    vi.restoreAllMocks();
    mockReducedMotion(true);
    vi.useFakeTimers();
    render(<Example items={3} autoplay interval={2000} playPause />);
    act(() => void vi.advanceTimersByTime(10000));
    expect(current()).toBe(0);
    expect(screen.getByRole("button", { name: "Start slide rotation" })).toBeInTheDocument();
  });

  it("warns in development when rotation has no control to stop it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { unmount } = render(<Example items={3} autoplay />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no <CarouselPlayPause>"));
    unmount();
    warn.mockClear();
    render(<Example items={3} autoplay playPause />);
    expect(warn).not.toHaveBeenCalled();
  });

  it("shows no rotation control, and no dots, when there is nothing to rotate", () => {
    render(<Example items={1} playPause />);
    expect(screen.queryByRole("button", { name: /slide rotation/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Go to/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("lets className win, forwards refs and refuses parts outside a carousel", () => {
    const ref = createRef<HTMLElement>();
    const viewportRef = createRef<HTMLDivElement>();
    render(
      <Carousel label="Featured" ref={ref} className="gap-8" data-testid="root">
        <CarouselViewport ref={viewportRef} className="snap-none">
          <CarouselItem className="basis-1/3">One</CarouselItem>
        </CarouselViewport>
      </Carousel>,
    );
    expect(ref.current).toBe(screen.getByTestId("root"));
    expect(ref.current).toHaveClass("gap-8");
    expect(ref.current).not.toHaveClass("gap-3");
    expect(viewportRef.current).toHaveClass("snap-none");
    expect(screen.getByText("One")).toHaveClass("basis-1/3");

    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<CarouselNext />)).toThrow(
      "<CarouselNext> must be used inside <Carousel>.",
    );
  });
});

describe("carousel helpers", () => {
  it("wraps an index into range", () => {
    expect(wrapCarouselIndex(5, 3)).toBe(2);
    expect(wrapCarouselIndex(-1, 3)).toBe(2);
    expect(wrapCarouselIndex(4, 0)).toBe(0);
  });

  it("picks the item whose start edge is nearest", () => {
    expect(nearestCarouselIndex([-610, -310, -10, 290])).toBe(2);
    expect(nearestCarouselIndex([0, 300])).toBe(0);
    expect(nearestCarouselIndex([])).toBe(0);
  });
});
