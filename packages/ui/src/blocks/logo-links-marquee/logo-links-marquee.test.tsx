import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { LogoLinksMarqueeBlock } from "./logo-links-marquee";

const LINKED = [
  { name: "Lumen", href: "https://example.com/lumen" },
  { name: "Halcyon", href: "https://example.com/halcyon", logo: <svg data-testid="mark" /> },
  { name: "Plain" },
];

function marquee(container: HTMLElement) {
  return container.querySelector("[data-slot=marquee]") as HTMLElement;
}

describe("LogoLinksMarqueeBlock", () => {
  it("is a section named by its heading", () => {
    render(<LogoLinksMarqueeBlock />);
    expect(
      screen.getByRole("region", { name: "Trusted by the world's most innovative teams" }),
    ).toBeVisible();
  });

  it("exposes each logo once, although the loop repeats it", () => {
    const { container } = render(<LogoLinksMarqueeBlock />);
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(container.querySelectorAll("[data-slot=logo-links-marquee-item]")).toHaveLength(16);
  });

  it("links entries with an href, named by the organisation", () => {
    render(<LogoLinksMarqueeBlock logos={LINKED} />);
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Halcyon" })).toHaveAttribute(
      "href",
      "https://example.com/halcyon",
    );
    expect(screen.getAllByTestId("mark")[0]?.closest("[aria-hidden=true]")).not.toBeNull();
  });

  it("pauses and resumes from a visible button", async () => {
    const user = userEvent.setup();
    const { container } = render(<LogoLinksMarqueeBlock />);
    expect(marquee(container)).not.toHaveAttribute("data-paused");
    await user.click(screen.getByRole("button", { name: "Pause logos" }));
    expect(marquee(container)).toHaveAttribute("data-paused");
    await user.click(screen.getByRole("button", { name: "Play logos" }));
    expect(marquee(container)).not.toHaveAttribute("data-paused");
  });

  it("takes custom labels, speed and heading level", () => {
    render(
      <LogoLinksMarqueeBlock
        headingLevel={3}
        description={null}
        speed={80}
        labels={{ pause: "Stop" }}
      />,
    );
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    render(<LogoLinksMarqueeBlock ref={ref} className="max-w-none" />);
    expect(ref.current).toHaveClass("max-w-none");
    expect(ref.current).not.toHaveClass("max-w-7xl");
  });

  it("has no axe violations", async () => {
    const { container } = render(<LogoLinksMarqueeBlock logos={LINKED} />);
    await expectNoA11yViolations(container);
  });
});
