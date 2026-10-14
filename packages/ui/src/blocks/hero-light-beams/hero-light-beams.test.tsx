import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { HeroLightBeamsBlock } from "./hero-light-beams";

describe("HeroLightBeamsBlock", () => {
  it("is one section landmark named by an h1 headline", async () => {
    const { container } = render(<HeroLightBeamsBlock />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(screen.getByRole("region", { name: heading.textContent ?? "" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("renders its announcement and actions as real links, and hides what is null", () => {
    const { rerender } = render(
      <HeroLightBeamsBlock
        announcement={{ label: "Version 2 is out", href: "/blog/v2" }}
        primaryAction={{ label: "Start", href: "/start" }}
        secondaryAction={{ label: "Docs", href: "/docs" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Version 2 is out" })).toHaveAttribute(
      "href",
      "/blog/v2",
    );
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", "/start");
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/docs");
    rerender(
      <HeroLightBeamsBlock announcement={null} primaryAction={null} secondaryAction={null} />,
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("keeps the beams out of the accessibility tree", () => {
    const { container } = render(<HeroLightBeamsBlock headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    const scene = container.querySelector('[data-slot="light-beams-scene"]');
    expect(scene?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
