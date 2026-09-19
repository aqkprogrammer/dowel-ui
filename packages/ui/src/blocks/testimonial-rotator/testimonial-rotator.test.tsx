import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TestimonialRotatorBlock } from "./testimonial-rotator";

const ITEMS = [
  { quote: "Alpha quote.", name: "Ada Lovelace", subtitle: "Engineer", avatarSrc: "/a.png" },
  { quote: "Beta quote.", name: "Grace Hopper" },
  { id: "c", quote: "Gamma quote.", name: "Alan Turing" },
];

function slide() {
  return screen.getByRole("group");
}

function reduceMotion(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("TestimonialRotatorBlock", () => {
  it("is a carousel section named by a visually hidden heading", () => {
    render(<TestimonialRotatorBlock />);
    const region = screen.getByRole("region", { name: "Testimonials" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("sr-only");
  });

  it("can show its heading, at any level", () => {
    render(<TestimonialRotatorBlock showHeading heading="Kind words" headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3, name: "Kind words" })).not.toHaveClass(
      "sr-only",
    );
  });

  it("shows one testimonial as a labelled slide", () => {
    render(<TestimonialRotatorBlock testimonials={ITEMS} autoPlay={false} />);
    expect(slide()).toHaveAccessibleName("1 of 3");
    expect(screen.getByText("Alpha quote.")).toBeInTheDocument();
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rotating/ })).not.toBeInTheDocument();
  });

  it("advances on the timer, wrapping, and silences the live region meanwhile", () => {
    vi.useFakeTimers();
    const { container } = render(
      <TestimonialRotatorBlock testimonials={ITEMS} interval={1000} />,
    );
    const viewport = container.querySelector("[data-slot=testimonial-rotator-viewport]");
    expect(viewport).toHaveAttribute("aria-live", "off");
    expect(container.querySelector("[data-slot=testimonial-rotator-fill]")).toHaveAttribute(
      "data-state",
      "running",
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(slide()).toHaveAccessibleName("2 of 3");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(slide()).toHaveAccessibleName("1 of 3");
  });

  it("stops and starts from its control, which says what it will do", () => {
    vi.useFakeTimers();
    render(<TestimonialRotatorBlock testimonials={ITEMS} interval={1000} />);
    fireEvent.click(screen.getByRole("button", { name: "Stop rotating testimonials" }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(slide()).toHaveAccessibleName("1 of 3");

    fireEvent.click(screen.getByRole("button", { name: "Start rotating testimonials" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(slide()).toHaveAccessibleName("2 of 3");
  });

  it("pauses while hovered, and while focus is inside (but not on the control)", () => {
    vi.useFakeTimers();
    render(<TestimonialRotatorBlock testimonials={ITEMS} interval={1000} />);
    const region = screen.getByRole("region");

    fireEvent.pointerEnter(region);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(slide()).toHaveAccessibleName("1 of 3");
    fireEvent.pointerLeave(region);

    fireEvent.focus(screen.getByRole("button", { name: "Show testimonial 2 of 3" }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(slide()).toHaveAccessibleName("1 of 3");
    fireEvent.blur(screen.getByRole("button", { name: "Show testimonial 2 of 3" }));

    fireEvent.focus(screen.getByRole("button", { name: "Stop rotating testimonials" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(slide()).toHaveAccessibleName("2 of 3");
  });

  it("does not start by itself under reduced motion, but can be started", () => {
    reduceMotion(true);
    vi.useFakeTimers();
    const { container } = render(
      <TestimonialRotatorBlock testimonials={ITEMS} interval={1000} />,
    );
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(slide()).toHaveAccessibleName("1 of 3");
    expect(container.querySelector("[data-slot=testimonial-rotator-viewport]")).toHaveAttribute(
      "aria-live",
      "polite",
    );

    fireEvent.click(screen.getByRole("button", { name: "Start rotating testimonials" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(slide()).toHaveAccessibleName("2 of 3");
  });

  it("jumps with the indicators, which mark the current one", async () => {
    const user = userEvent.setup();
    render(<TestimonialRotatorBlock testimonials={ITEMS} autoPlay={false} />);
    await user.click(screen.getByRole("button", { name: "Show testimonial 3 of 3" }));
    expect(slide()).toHaveAccessibleName("3 of 3");
    expect(screen.getByRole("button", { name: "Show testimonial 3 of 3" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("moves between indicators with the arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    render(<TestimonialRotatorBlock testimonials={ITEMS} autoPlay={false} />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Show testimonial 1 of 3" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(slide()).toHaveAccessibleName("2 of 3");
    expect(screen.getByRole("button", { name: "Show testimonial 2 of 3" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(slide()).toHaveAccessibleName("3 of 3");
    await user.keyboard("{ArrowRight}");
    expect(slide()).toHaveAccessibleName("1 of 3");
    await user.keyboard("{ArrowLeft}");
    expect(slide()).toHaveAccessibleName("3 of 3");
    await user.keyboard("{Home}");
    expect(slide()).toHaveAccessibleName("1 of 3");
    await user.keyboard("{Enter}");
    expect(slide()).toHaveAccessibleName("1 of 3");
  });

  it("mirrors the arrow keys in a right-to-left document", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <TestimonialRotatorBlock testimonials={ITEMS} autoPlay={false} />
      </div>,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(slide()).toHaveAccessibleName("2 of 3");
    await user.keyboard("{ArrowRight}");
    expect(slide()).toHaveAccessibleName("1 of 3");
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(
      <TestimonialRotatorBlock
        testimonials={ITEMS}
        autoPlay={false}
        index={1}
        onIndexChange={onIndexChange}
      />,
    );
    expect(slide()).toHaveAccessibleName("2 of 3");
    await user.click(screen.getByRole("button", { name: "Show testimonial 1 of 3" }));
    expect(onIndexChange).toHaveBeenCalledWith(0);
    expect(slide()).toHaveAccessibleName("2 of 3");
  });

  it("starts from a default testimonial and takes localised labels", () => {
    render(
      <TestimonialRotatorBlock
        testimonials={ITEMS}
        defaultIndex={2}
        labels={{ stop: "Detener", slide: (i) => `Opinión ${String(i + 1)}` }}
      />,
    );
    expect(slide()).toHaveAccessibleName("Opinión 3");
    expect(screen.getByRole("button", { name: "Detener" })).toBeInTheDocument();
  });

  it("drops the controls for a single testimonial and renders nothing for none", () => {
    const { container, rerender } = render(
      <TestimonialRotatorBlock testimonials={ITEMS.slice(0, 1)} />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    rerender(<TestimonialRotatorBlock testimonials={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("forwards its own handlers, lets className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const handlers = {
      onPointerEnter: vi.fn(),
      onPointerLeave: vi.fn(),
      onFocus: vi.fn(),
      onBlur: vi.fn(),
    };
    render(<TestimonialRotatorBlock ref={ref} className="py-4" {...handlers} />);
    expect(ref.current).toHaveClass("py-4");
    expect(ref.current).not.toHaveClass("py-16");
    const region = screen.getByRole("region");
    fireEvent.pointerEnter(region);
    fireEvent.pointerLeave(region);
    fireEvent.focus(region);
    fireEvent.blur(region);
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<TestimonialRotatorBlock />);
    await expectNoA11yViolations(container);
  });
});
