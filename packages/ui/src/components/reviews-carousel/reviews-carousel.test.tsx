import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { wrapIndex } from "./carousel-controls";
import { ReviewsCarousel, type Review } from "./reviews-carousel";

const reviews: Review[] = [
  { id: 1, body: "First body", author: "Ada", title: "Engineer" },
  { id: 2, body: "Second body", author: "Grace" },
  { id: 3, body: "Third body", author: "Linus", avatar: <span data-testid="avatar" /> },
  { id: 4, body: "Fourth body", author: "Barbara" },
  { id: 5, body: "Fifth body", author: "Ken" },
];

function slides() {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="reviews-carousel-slide"]')];
}

function activeSlide() {
  return screen.getByRole("group");
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

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ReviewsCarousel", () => {
  it("follows the APG carousel structure", () => {
    render(<ReviewsCarousel reviews={reviews} />);
    const carousel = screen.getByRole("region", { name: "Reviews" });
    expect(carousel).toHaveAttribute("aria-roledescription", "carousel");
    const slide = activeSlide();
    expect(slide).toHaveAttribute("aria-roledescription", "slide");
    expect(slide).toHaveAccessibleName("1 of 5");
    expect(slide).toHaveTextContent("First body");
    expect(slide).toHaveTextContent("Engineer");
    // Only the active slide is exposed.
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(slides()[1]).toHaveAttribute("aria-hidden", "true");
    expect(slides()[1]).toHaveAttribute("inert");
  });

  it("stacks upcoming cards behind and fades read ones out", () => {
    render(<ReviewsCarousel reviews={reviews} defaultIndex={1} />);
    const [past, active, next, , last] = slides();
    expect(past).toHaveAttribute("data-state", "past");
    expect(past?.style.opacity).toBe("0");
    expect(past?.style.filter).toBe("blur(2px)");
    expect(active).toHaveAttribute("data-state", "active");
    expect(active?.style.scale).toBe("1");
    expect(next).toHaveAttribute("data-state", "upcoming");
    expect(next?.style.translate).toBe("0 -1.875rem");
    expect(next?.style.scale).toBe("0.92");
    expect(last?.style.opacity).toBe("1");
  });

  it("hides cards more than three deep", () => {
    render(<ReviewsCarousel reviews={reviews} />);
    expect(slides()[4]?.style.opacity).toBe("0");
    expect(slides()[4]?.style.translate).toBe("0 -5.625rem");
  });

  it("steps with the previous and next buttons, stopping at the ends", async () => {
    const user = userEvent.setup();
    render(<ReviewsCarousel reviews={reviews} />);
    const previous = screen.getByRole("button", { name: "Previous review" });
    const next = screen.getByRole("button", { name: "Next review" });
    expect(previous).toHaveAttribute("aria-disabled", "true");

    await user.click(next);
    expect(activeSlide()).toHaveAccessibleName("2 of 5");
    expect(previous).not.toHaveAttribute("aria-disabled");

    await user.click(previous);
    expect(activeSlide()).toHaveAccessibleName("1 of 5");

    fireEvent.click(previous);
    expect(activeSlide()).toHaveAccessibleName("1 of 5");
  });

  it("wraps when looping", async () => {
    const user = userEvent.setup();
    render(<ReviewsCarousel reviews={reviews} loop />);
    await user.click(screen.getByRole("button", { name: "Previous review" }));
    expect(activeSlide()).toHaveAccessibleName("5 of 5");
    await user.click(screen.getByRole("button", { name: "Next review" }));
    expect(activeSlide()).toHaveAccessibleName("1 of 5");
  });

  it("jumps from an indicator, which marks itself current", async () => {
    const user = userEvent.setup();
    render(<ReviewsCarousel reviews={reviews} />);
    const third = screen.getByRole("button", { name: "Review 3" });
    await user.click(third);
    expect(activeSlide()).toHaveAccessibleName("3 of 5");
    expect(third).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Review 1" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("moves with arrow keys, Home and End while focus is inside", async () => {
    const user = userEvent.setup();
    render(<ReviewsCarousel reviews={reviews} />);
    screen.getByRole("button", { name: "Review 1" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(activeSlide()).toHaveAccessibleName("2 of 5");
    await user.keyboard("{End}");
    expect(activeSlide()).toHaveAccessibleName("5 of 5");
    await user.keyboard("{ArrowLeft}");
    expect(activeSlide()).toHaveAccessibleName("4 of 5");
    await user.keyboard("{Home}");
    expect(activeSlide()).toHaveAccessibleName("1 of 5");
    // Modified keys are left alone.
    await user.keyboard("{Control>}{ArrowRight}{/Control}");
    expect(activeSlide()).toHaveAccessibleName("1 of 5");
  });

  it("mirrors the arrow keys in right-to-left documents", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <ReviewsCarousel reviews={reviews} />
      </div>,
    );
    screen.getByRole("button", { name: "Review 1" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(activeSlide()).toHaveAccessibleName("2 of 5");
    await user.keyboard("{ArrowRight}");
    expect(activeSlide()).toHaveAccessibleName("1 of 5");
  });

  it("leaves arrow keys inside a review's content alone", () => {
    render(
      <ReviewsCarousel
        reviews={[
          { id: 1, body: <input aria-label="Reply" />, author: "Ada" },
          ...reviews.slice(1),
        ]}
      />,
    );
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Reply" }), { key: "ArrowRight" });
    expect(activeSlide()).toHaveAccessibleName("1 of 5");
  });

  it("renders no controls when every control is hidden", () => {
    render(<ReviewsCarousel reviews={reviews} showNavigation={false} showIndicators={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="reviews-carousel-controls"]')).toBeNull();
  });

  it("supports a controlled index", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    function Controlled() {
      const [index, setIndex] = useState(2);
      return (
        <ReviewsCarousel
          reviews={reviews}
          index={index}
          onIndexChange={(next) => {
            onIndexChange(next);
            setIndex(next);
          }}
        />
      );
    }
    render(<Controlled />);
    expect(activeSlide()).toHaveAccessibleName("3 of 5");
    await user.click(screen.getByRole("button", { name: "Next review" }));
    expect(onIndexChange).toHaveBeenCalledWith(3);
    expect(activeSlide()).toHaveAccessibleName("4 of 5");
  });

  it("does not move a controlled carousel the owner does not update", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(<ReviewsCarousel reviews={reviews} index={0} onIndexChange={onIndexChange} />);
    await user.click(screen.getByRole("button", { name: "Next review" }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
    expect(activeSlide()).toHaveAccessibleName("1 of 5");
  });

  describe("autoPlay", () => {
    it("advances on a timer, wrapping, with the live region off while rotating", () => {
      vi.useFakeTimers();
      render(
        <ReviewsCarousel reviews={reviews.slice(0, 2)} autoPlay autoPlayInterval={1000} />,
      );
      const viewport = document.querySelector('[data-slot="reviews-carousel-viewport"]');
      expect(viewport).toHaveAttribute("aria-live", "off");
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(activeSlide()).toHaveAccessibleName("2 of 2");
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(activeSlide()).toHaveAccessibleName("1 of 2");
    });

    it("stops and starts from the rotation control, which comes first", () => {
      vi.useFakeTimers();
      render(<ReviewsCarousel reviews={reviews} autoPlay autoPlayInterval={1000} />);
      const buttons = screen.getAllByRole("button");
      const stop = screen.getByRole("button", { name: "Stop automatic slide show" });
      expect(buttons[0]).toBe(stop);

      fireEvent.click(stop);
      const start = screen.getByRole("button", { name: "Start automatic slide show" });
      expect(document.querySelector('[data-slot="reviews-carousel-viewport"]')).toHaveAttribute(
        "aria-live",
        "polite",
      );
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(activeSlide()).toHaveAccessibleName("1 of 5");

      fireEvent.click(start);
      // Focus on the rotation control does not pause rotation.
      fireEvent.focus(start);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(activeSlide()).toHaveAccessibleName("2 of 5");
    });

    it("pauses while hovered and while focus is inside", () => {
      vi.useFakeTimers();
      render(<ReviewsCarousel reviews={reviews} autoPlay autoPlayInterval={1000} />);
      const carousel = screen.getByRole("region");

      fireEvent.pointerEnter(carousel);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(activeSlide()).toHaveAccessibleName("1 of 5");
      fireEvent.pointerLeave(carousel);

      const next = screen.getByRole("button", { name: "Next review" });
      fireEvent.focus(next);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(activeSlide()).toHaveAccessibleName("1 of 5");

      // Moving within the carousel keeps it paused; leaving it resumes.
      fireEvent.blur(next, { relatedTarget: screen.getByRole("button", { name: "Review 1" }) });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(activeSlide()).toHaveAccessibleName("1 of 5");
      fireEvent.blur(next, { relatedTarget: document.body });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(activeSlide()).toHaveAccessibleName("2 of 5");
    });

    it("does not start by itself under reduced motion, but can be started", () => {
      reduceMotion(true);
      vi.useFakeTimers();
      render(<ReviewsCarousel reviews={reviews} autoPlay autoPlayInterval={1000} />);
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(activeSlide()).toHaveAccessibleName("1 of 5");

      fireEvent.click(screen.getByRole("button", { name: "Start automatic slide show" }));
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(activeSlide()).toHaveAccessibleName("2 of 5");
      expect(
        screen.getByRole("button", { name: "Stop automatic slide show" }),
      ).toBeInTheDocument();
    });
  });

  it("accepts localised labels", () => {
    render(
      <ReviewsCarousel
        reviews={reviews}
        aria-label="Testimonios"
        labels={{
          previous: "Anterior",
          next: "Siguiente",
          slide: (index, count) => `${String(index + 1)} de ${String(count)}`,
          indicator: (index) => `Ir al testimonio ${String(index + 1)}`,
        }}
      />,
    );
    expect(screen.getByRole("region", { name: "Testimonios" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ir al testimonio 2" })).toBeInTheDocument();
    expect(activeSlide()).toHaveAccessibleName("1 de 5");
  });

  it("drops its default name when labelled by another element", () => {
    render(
      <>
        <h2 id="heading">What people say</h2>
        <ReviewsCarousel reviews={reviews} aria-labelledby="heading" />
      </>,
    );
    expect(screen.getByRole("region", { name: "What people say" })).toBeInTheDocument();
  });

  it("renders nothing without reviews", () => {
    const { container } = render(<ReviewsCarousel reviews={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls the consumer's own handlers", () => {
    const onKeyDown = vi.fn();
    const onPointerEnter = vi.fn();
    render(
      <ReviewsCarousel
        reviews={reviews}
        onKeyDown={onKeyDown}
        onPointerEnter={onPointerEnter}
      />,
    );
    const carousel = screen.getByRole("region");
    fireEvent.keyDown(carousel, { key: "x" });
    fireEvent.pointerEnter(carousel);
    expect(onKeyDown).toHaveBeenCalled();
    expect(onPointerEnter).toHaveBeenCalled();
  });

  it("lets a consumer className win a conflict", () => {
    render(<ReviewsCarousel reviews={reviews} className="h-96 max-w-sm" />);
    const carousel = screen.getByRole("region");
    expect(carousel).toHaveClass("h-96", "max-w-sm");
    expect(carousel).not.toHaveClass("h-80");
  });

  it("forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<ReviewsCarousel reviews={reviews} ref={ref} />);
    expect(ref.current).toHaveAttribute("data-slot", "reviews-carousel");
  });

  it("wraps indices in both directions", () => {
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(7, 5)).toBe(2);
    expect(wrapIndex(3, 0)).toBe(0);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ReviewsCarousel reviews={reviews} autoPlay />);
    await expectNoA11yViolations(container);
  });
});
