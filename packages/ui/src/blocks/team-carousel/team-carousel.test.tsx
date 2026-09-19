import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TeamCarouselBlock } from "./team-carousel";

afterEach(() => {
  vi.restoreAllMocks();
});

function slides() {
  return screen
    .getAllByRole("group")
    .filter((node) => node.getAttribute("aria-roledescription"));
}

describe("TeamCarouselBlock", () => {
  it("is a carousel section named by its two-tone heading", () => {
    render(<TeamCarouselBlock />);
    const section = screen.getByRole("region", { name: "Tech pioneers building the future" });
    expect(section).toHaveAttribute("aria-roledescription", "carousel");
  });

  it("names each card as a slide and each member with a heading", () => {
    render(<TeamCarouselBlock />);
    expect(slides()).toHaveLength(6);
    expect(slides()[1]).toHaveAccessibleName("2 of 6");
    expect(screen.getByRole("heading", { level: 3, name: "Noor Haddad" })).toBeInTheDocument();
  });

  it("makes the track a focusable, named scroller once it overflows", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(1800);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
    render(<TeamCarouselBlock />);
    const track = screen.getByRole("region", { name: "Team members" });
    // Previous is disabled on the first card, so: next, then the track.
    await user.tab();
    await user.tab();
    expect(track).toHaveFocus();
  });

  it("steps through the cards with the buttons and announces the position", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<TeamCarouselBlock />);
    const previous = screen.getByRole("button", { name: "Previous team member" });
    const next = screen.getByRole("button", { name: "Next team member" });
    expect(previous).toBeDisabled();

    await user.click(next);
    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ inline: "start", behavior: "smooth" }),
    );
    expect(screen.getByText("2 of 6", { selector: "[aria-live]" })).toBeInTheDocument();
    expect(previous).toBeEnabled();
    expect(slides()[1]).toHaveAttribute("data-active");

    await user.click(previous);
    expect(screen.getByText("1 of 6", { selector: "[aria-live]" })).toBeInTheDocument();
    expect(previous).toBeDisabled();
  });

  it("disables next on the last card", async () => {
    const user = userEvent.setup();
    render(
      <TeamCarouselBlock
        members={[
          { name: "Ada Park", role: "CEO" },
          { name: "Bo Lin", role: "CTO" },
        ]}
      />,
    );
    const next = screen.getByRole("button", { name: "Next team member" });
    await user.click(next);
    expect(next).toBeDisabled();
  });

  it("jumps rather than glides under reduced motion", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    render(<TeamCarouselBlock />);
    await user.click(screen.getByRole("button", { name: "Next team member" }));
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
  });

  it("tracks the card at the start edge as the track is scrolled", () => {
    render(<TeamCarouselBlock />);
    const track = screen.getByRole("region", { name: "Team members" });
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
      left: 0,
      right: 300,
    } as DOMRect);
    slides().forEach((slide, index) => {
      vi.spyOn(slide, "getBoundingClientRect").mockReturnValue({
        left: (index - 3) * 300,
        right: (index - 2) * 300,
      } as DOMRect);
    });
    fireEvent.scroll(track);
    expect(slides()[3]).toHaveAttribute("data-active");
    expect(screen.getByRole("button", { name: "Previous team member" })).toBeEnabled();
  });

  it("measures from the right edge in a right-to-left page", () => {
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <TeamCarouselBlock />
      </div>,
    );
    const track = screen.getByRole("region", { name: "Team members" });
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
      left: 0,
      right: 300,
    } as DOMRect);
    slides().forEach((slide, index) => {
      vi.spyOn(slide, "getBoundingClientRect").mockReturnValue({
        left: 300 - (index - 1) * 300 - 300,
        right: 300 - (index - 1) * 300,
      } as DOMRect);
    });
    fireEvent.scroll(track);
    expect(slides()[1]).toHaveAttribute("data-active");
  });

  it("takes content and labels from props and omits what is not given", () => {
    render(
      <TeamCarouselBlock
        heading="Crew"
        subheading={null}
        description={null}
        headingLevel={3}
        members={[{ name: "Cher", role: "Singer", avatar: "/c.png" }]}
        labels={{ position: (index, count) => `Card ${String(index + 1)}/${String(count)}` }}
      />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Crew" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Cher" })).toBeInTheDocument();
    expect(slides()[0]).toHaveAccessibleName("Card 1/1");
    expect(screen.getByRole("button", { name: "Next team member" })).toBeDisabled();
    expect(screen.getByText("C")).toHaveAttribute("aria-hidden", "true");
  });

  it("lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    render(<TeamCarouselBlock ref={ref} className="max-w-none" />);
    expect(ref.current).toHaveClass("max-w-none");
    expect(ref.current).not.toHaveClass("max-w-5xl");
  });

  it("leaves a track that fits out of the tab order", () => {
    render(<TeamCarouselBlock />);
    expect(screen.getByRole("region", { name: "Team members" })).not.toHaveAttribute(
      "tabindex",
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(<TeamCarouselBlock />);
    await expectNoA11yViolations(container);
  });
});
