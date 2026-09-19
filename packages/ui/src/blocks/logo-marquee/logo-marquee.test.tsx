import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { LogoMarqueeBlock } from "./logo-marquee";

function marquee(container: HTMLElement) {
  return container.querySelector("[data-slot=marquee]") as HTMLElement;
}

describe("LogoMarqueeBlock", () => {
  it("is a section named by its heading", () => {
    render(<LogoMarqueeBlock />);
    expect(screen.getByRole("region", { name: "Trusted by industry leaders" })).toBeVisible();
  });

  it("exposes each logo once, although the loop repeats it", () => {
    const { container } = render(<LogoMarqueeBlock />);
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(container.querySelectorAll("[data-slot=logo-marquee-item]")).toHaveLength(16);
  });

  it("names supplied logos, hides their graphics and links them", () => {
    render(
      <LogoMarqueeBlock
        logos={[
          { name: "Example", href: "https://example.com", logo: <svg data-testid="mark" /> },
          { name: "Plain" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Example" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(screen.getAllByTestId("mark")[0]?.closest("[aria-hidden=true]")).not.toBeNull();
  });

  it("maps speed, direction and hover pausing onto the marquee", () => {
    const { container, rerender } = render(<LogoMarqueeBlock />);
    expect(marquee(container)).toHaveAttribute("data-pause-on-hover");
    expect(marquee(container)).not.toHaveAttribute("data-reverse");
    rerender(<LogoMarqueeBlock speed="fast" reverse pauseOnHover={false} />);
    expect(marquee(container)).toHaveAttribute("data-reverse");
    expect(marquee(container)).not.toHaveAttribute("data-pause-on-hover");
  });

  it("pauses and resumes from a visible button", async () => {
    const user = userEvent.setup();
    const { container } = render(<LogoMarqueeBlock labels={{ play: "Resume" }} />);
    await user.click(screen.getByRole("button", { name: "Pause logos" }));
    expect(marquee(container)).toHaveAttribute("data-paused");
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(marquee(container)).not.toHaveAttribute("data-paused");
  });

  it("re-levels its heading, lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    render(
      <LogoMarqueeBlock ref={ref} headingLevel={4} description={null} className="max-w-none" />,
    );
    expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
    expect(ref.current).toHaveClass("max-w-none");
    expect(ref.current).not.toHaveClass("max-w-7xl");
  });

  it("has no axe violations", async () => {
    const { container } = render(<LogoMarqueeBlock />);
    await expectNoA11yViolations(container);
  });
});
