import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TestimonialSpotlightBlock } from "./testimonial-spotlight";

const ITEMS = [
  {
    quote: "First quote here.",
    name: "Ada Lovelace",
    subtitle: "Engineer",
    avatarSrc: "/a.png",
  },
  { id: "g", quote: "Second quote here.", name: "Grace Hopper" },
];

/** The slide in front: the only one not hidden. */
function front() {
  return screen.getByRole("group", { name: /of/ });
}

describe("TestimonialSpotlightBlock", () => {
  it("is a section named by its heading, holding a named carousel", () => {
    render(<TestimonialSpotlightBlock />);
    const region = screen.getByRole("region", { name: "What people are saying" });
    expect(within(region).getByRole("region", { name: "Testimonials" })).toHaveAttribute(
      "aria-roledescription",
      "carousel",
    );
  });

  it("shows one testimonial at a time and reads its quote as a sentence", () => {
    render(<TestimonialSpotlightBlock testimonials={ITEMS} />);
    expect(front()).toHaveAccessibleName("1 of 2");
    expect(within(front()).getByText("First quote here.")).toBeInTheDocument();
    expect(within(front()).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(front()).getByText("Engineer")).toBeInTheDocument();
  });

  it("steps forward and back, looping at the ends", async () => {
    const user = userEvent.setup();
    render(<TestimonialSpotlightBlock testimonials={ITEMS} />);
    await user.click(screen.getByRole("button", { name: "Next testimonial" }));
    expect(front()).toHaveAccessibleName("2 of 2");
    await user.click(screen.getByRole("button", { name: "Next testimonial" }));
    expect(front()).toHaveAccessibleName("1 of 2");
    await user.click(screen.getByRole("button", { name: "Previous testimonial" }));
    expect(front()).toHaveAccessibleName("2 of 2");
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(
      <TestimonialSpotlightBlock
        testimonials={ITEMS}
        index={1}
        onIndexChange={onIndexChange}
      />,
    );
    expect(front()).toHaveAccessibleName("2 of 2");
    await user.click(screen.getByRole("button", { name: "Next testimonial" }));
    expect(onIndexChange).toHaveBeenCalledWith(0);
    expect(front()).toHaveAccessibleName("2 of 2");
  });

  it("starts from a default testimonial and takes localised labels", () => {
    render(
      <TestimonialSpotlightBlock
        testimonials={ITEMS}
        defaultIndex={1}
        description={null}
        carouselLabel="Opiniones"
        labels={{ next: "Siguiente" }}
      />,
    );
    expect(screen.getByRole("region", { name: "Opiniones" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
    expect(front()).toHaveAccessibleName("2 of 2");
  });

  it("re-levels its heading", () => {
    render(<TestimonialSpotlightBlock headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "What people are saying",
    );
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<TestimonialSpotlightBlock ref={ref} className="bg-background" />);
    expect(ref.current).toHaveClass("bg-background");
    expect(ref.current).not.toHaveClass("bg-muted");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<TestimonialSpotlightBlock />);
    await expectNoA11yViolations(container);
  });
});
