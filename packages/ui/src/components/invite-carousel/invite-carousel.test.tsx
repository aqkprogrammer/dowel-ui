import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { InviteCarousel, type InviteCarouselEvent } from "./invite-carousel";

const events: InviteCarouselEvent[] = [
  {
    id: 1,
    title: "Yoga",
    subtitle: "Sat, June 14, 6:00 AM",
    location: "Central Park",
    badge: "Hosting",
    badgeIcon: <svg data-testid="crown" />,
    image: "/yoga.jpg",
    participants: [{ avatar: "/a.png", name: "Ada" }],
  },
  {
    id: 2,
    title: "Birthday",
    location: "Home",
    badge: "Going",
    image: "/b.jpg",
    imageAlt: "Balloons",
  },
  { id: 3, title: "Golf", location: "Golf Park", background: <div data-testid="gradient" /> },
  { id: 4, title: "Movie night", location: "Cine Town" },
];

function cards() {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="invite-carousel-card"]')];
}

function current() {
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

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("InviteCarousel", () => {
  it("follows the APG carousel structure, exposing only the current card", () => {
    render(<InviteCarousel events={events} autoPlay={false} />);
    const carousel = screen.getByRole("region", { name: "Invitations" });
    expect(carousel).toHaveAttribute("aria-roledescription", "carousel");
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(current()).toHaveAttribute("aria-roledescription", "slide");
    expect(current()).toHaveAccessibleName("1 of 4");
    expect(cards()[1]).toHaveAttribute("inert");
  });

  it("renders the card face: badge, participants, title, subtitle and location", () => {
    render(<InviteCarousel events={events} autoPlay={false} />);
    const card = current();
    expect(card).toHaveTextContent("Hosting");
    expect(card).toHaveTextContent("Yoga");
    expect(card).toHaveTextContent("Sat, June 14, 6:00 AM");
    expect(card).toHaveTextContent("Central Park");
    expect(screen.getByRole("img", { name: "Ada" })).toBeInTheDocument();
    // The badge icon is decorative, and so is an image with no alt given.
    expect(screen.getByTestId("crown").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(card.querySelector('img[src="/yoga.jpg"]')).toHaveAttribute("alt", "");
  });

  it("uses imageAlt and custom backgrounds", () => {
    render(<InviteCarousel events={events} autoPlay={false} />);
    expect(cards()[1]?.querySelector("img")).toHaveAttribute("alt", "Balloons");
    expect(screen.getByTestId("gradient")).toBeInTheDocument();
    expect(
      cards()[3]?.querySelector('[data-slot="invite-carousel-background"]'),
    ).toBeEmptyDOMElement();
  });

  it("fans the neighbours out on either side and hides the rest", () => {
    render(<InviteCarousel events={events} autoPlay={false} />);
    const places = cards().map((card) => card.dataset.place);
    expect(places).toEqual(["current", "next", "hidden", "previous"]);
    expect(cards()[1]?.style.getPropertyValue("--invite-x")).toBe("80%");
    expect(cards()[1]?.style.getPropertyValue("--invite-r")).toBe("12deg");
    expect(cards()[3]?.style.getPropertyValue("--invite-x")).toBe("-80%");
    expect(cards()[2]?.style.opacity).toBe("0");
    // The offset flips sign in RTL, from CSS.
    expect(cards()[0]).toHaveClass("rtl:translate-x-[calc(var(--invite-x)*-1)]");
  });

  it("sizes cards from cardWidth and aspectRatio", () => {
    render(
      <InviteCarousel
        events={events}
        autoPlay={false}
        cardWidth="12rem"
        aspectRatio={1.5}
        cardClassName="rounded-xl"
      />,
    );
    expect(cards()[0]?.style.width).toBe("12rem");
    expect(cards()[0]?.style.aspectRatio).toBe("1 / 1.5");
    expect(cards()[0]).toHaveClass("rounded-xl");
    expect(cards()[0]).not.toHaveClass("rounded-3xl");
  });

  it("wraps in both directions from the buttons", async () => {
    const user = userEvent.setup();
    render(<InviteCarousel events={events} autoPlay={false} />);
    await user.click(screen.getByRole("button", { name: "Previous invitation" }));
    expect(current()).toHaveAccessibleName("4 of 4");
    await user.click(screen.getByRole("button", { name: "Next invitation" }));
    await user.click(screen.getByRole("button", { name: "Next invitation" }));
    expect(current()).toHaveAccessibleName("2 of 4");
  });

  it("moves with arrow keys, Home and End, mirrored in RTL", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <InviteCarousel events={events} autoPlay={false} />
      </div>,
    );
    screen.getByRole("button", { name: "Next invitation" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(current()).toHaveAccessibleName("2 of 4");
    await user.keyboard("{ArrowRight}");
    expect(current()).toHaveAccessibleName("1 of 4");
    await user.keyboard("{End}");
    expect(current()).toHaveAccessibleName("4 of 4");
    await user.keyboard("{Home}");
    expect(current()).toHaveAccessibleName("1 of 4");
  });

  it("rotates by default, like the source, with a stop control first", () => {
    vi.useFakeTimers();
    render(<InviteCarousel events={events} />);
    expect(screen.getAllByRole("button")[0]).toHaveAccessibleName("Stop automatic slide show");
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(current()).toHaveAccessibleName("2 of 4");

    fireEvent.click(screen.getByRole("button", { name: "Stop automatic slide show" }));
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(current()).toHaveAccessibleName("2 of 4");
  });

  it("pauses on hover", () => {
    vi.useFakeTimers();
    render(<InviteCarousel events={events} interval={1000} />);
    fireEvent.pointerEnter(screen.getByRole("region"));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(current()).toHaveAccessibleName("1 of 4");
  });

  it("does not rotate by itself under reduced motion", () => {
    reduceMotion();
    vi.useFakeTimers();
    render(<InviteCarousel events={events} />);
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(current()).toHaveAccessibleName("1 of 4");
    expect(
      screen.getByRole("button", { name: "Start automatic slide show" }),
    ).toBeInTheDocument();
  });

  it("supports a controlled index", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [index, setIndex] = useState(3);
      return (
        <InviteCarousel
          events={events}
          autoPlay={false}
          index={index}
          onIndexChange={setIndex}
        />
      );
    }
    render(<Controlled />);
    expect(current()).toHaveAccessibleName("4 of 4");
    await user.click(screen.getByRole("button", { name: "Next invitation" }));
    expect(current()).toHaveAccessibleName("1 of 4");
  });

  it("renders no controls without navigation or rotation", () => {
    render(<InviteCarousel events={events} autoPlay={false} showNavigation={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("steps from the arrow keys on the rotation control too", () => {
    render(<InviteCarousel events={events} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Stop automatic slide show" }), {
      key: "ArrowRight",
    });
    expect(current()).toHaveAccessibleName("2 of 4");
  });

  it("handles two cards and one card", () => {
    const { rerender } = render(
      <InviteCarousel events={events.slice(0, 2)} autoPlay={false} />,
    );
    expect(cards().map((card) => card.dataset.place)).toEqual(["current", "next"]);
    rerender(<InviteCarousel events={events.slice(0, 1)} autoPlay={false} />);
    expect(cards().map((card) => card.dataset.place)).toEqual(["current"]);
  });

  it("renders nothing without events", () => {
    const { container } = render(<InviteCarousel events={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lets a consumer className win, and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <InviteCarousel
        events={events}
        autoPlay={false}
        ref={ref}
        className="gap-2"
        aria-label="Plans"
      />,
    );
    expect(ref.current).toHaveClass("gap-2");
    expect(ref.current).not.toHaveClass("gap-6");
    expect(screen.getByRole("region", { name: "Plans" })).toBe(ref.current);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<InviteCarousel events={events} />);
    await expectNoA11yViolations(container);
  });
});
