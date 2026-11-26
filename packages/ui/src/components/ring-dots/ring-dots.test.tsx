import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { RingDots } from "./ring-dots";

describe("RingDots", () => {
  it("is a status named Loading by default", () => {
    render(<RingDots />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("announces the label it is given", () => {
    render(<RingDots label="Loading messages" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading messages");
  });

  it("draws eight dots by default, hidden from assistive tech", () => {
    const { container } = render(<RingDots />);
    const dots = container.querySelectorAll("[data-part=dot]");
    expect(dots).toHaveLength(8);
    expect(dots[0]?.closest("[aria-hidden=true]")).not.toBeNull();
  });

  it("takes a dot count", () => {
    const { container } = render(<RingDots count={12} />);
    expect(container.querySelectorAll("[data-part=dot]")).toHaveLength(12);
  });

  it("is an indicator that keeps moving, slowed, under reduced motion", () => {
    render(<RingDots />);
    expect(screen.getByRole("status")).toHaveAttribute("data-motion", "indicator");
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<RingDots ref={ref} className="custom" />);
    expect(ref.current).toBe(screen.getByRole("status"));
    expect(ref.current).toHaveClass("custom", "relative");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<RingDots />);
    await expectNoA11yViolations(container);
  });
});
