import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TestimonialStarGridBlock } from "./testimonial-star-grid";

describe("TestimonialStarGridBlock", () => {
  it("is a section named by its heading, with a list of reviews", () => {
    render(<TestimonialStarGridBlock />);
    expect(screen.getByRole("region", { name: "What people are saying" })).toBeVisible();
    expect(screen.getAllByRole("figure")).toHaveLength(4);
  });

  it("reads each rating as one phrase", () => {
    render(<TestimonialStarGridBlock />);
    expect(screen.getAllByRole("img", { name: "Rated 5 out of 5" })).toHaveLength(3);
    expect(screen.getByRole("img", { name: "Rated 4 out of 5" })).toBeInTheDocument();
  });

  it("names each review by its author", () => {
    render(<TestimonialStarGridBlock />);
    const figure = screen.getAllByRole("figure")[1] as HTMLElement;
    expect(within(figure).getByText("Michael Chen")).toBeInTheDocument();
    expect(within(figure).getByText("Product designer")).toBeInTheDocument();
  });

  it("takes reviews from props, clamping ratings and allowing none", () => {
    const { container } = render(
      <TestimonialStarGridBlock
        heading="Reviews"
        description={null}
        ratingLabel={(rating) => `${String(rating)} stars`}
        testimonials={[
          { id: "a", name: "Ada Lovelace", quote: "Superb.", rating: 7, avatarSrc: "/a.png" },
          { id: "b", name: "Grace", quote: "Fine.", rating: -2 },
          { id: "c", name: "Alan", quote: "No rating." },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "5 stars" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "0 stars" })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
    // Initials while the image loads; the avatar itself is hidden.
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-filled]")).toHaveLength(5);
  });

  it("re-levels its heading", () => {
    render(<TestimonialStarGridBlock headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "What people are saying",
    );
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<TestimonialStarGridBlock ref={ref} className="max-w-none" />);
    expect(ref.current).toHaveClass("max-w-none");
    expect(ref.current).not.toHaveClass("max-w-5xl");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<TestimonialStarGridBlock />);
    await expectNoA11yViolations(container);
  });
});
