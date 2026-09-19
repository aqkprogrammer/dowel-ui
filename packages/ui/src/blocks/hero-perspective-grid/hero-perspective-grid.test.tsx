import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { HeroPerspectiveGridBlock } from "./hero-perspective-grid";

function stylesheet(): string {
  return [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
}

describe("HeroPerspectiveGridBlock", () => {
  it("is one section landmark named by its headline", () => {
    render(<HeroPerspectiveGridBlock />);
    expect(
      screen.getByRole("region", { name: "Build your next project with confidence" }),
    ).toBeInTheDocument();
  });

  it("renders the headline at level 2 by default, and at any level asked for", () => {
    const { rerender } = render(<HeroPerspectiveGridBlock />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<HeroPerspectiveGridBlock headingLevel={1} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("is data-driven: headline, highlight, description and actions are props", () => {
    render(
      <HeroPerspectiveGridBlock
        title="Ship it"
        highlight="today"
        description="All of it."
        primaryAction={{ label: "Start", href: "/start" }}
        secondaryAction={{ label: "Docs", href: "/docs" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Ship it today" })).toBeInTheDocument();
    expect(screen.getByText("All of it.", { selector: ".sr-only" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", "/start");
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/docs");
  });

  it("hides whatever is set to null or left empty", () => {
    render(
      <HeroPerspectiveGridBlock
        highlight=""
        description=""
        primaryAction={null}
        secondaryAction={null}
      />,
    );
    expect(screen.getByRole("heading", { name: "Build your next project with" })).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("keeps one action when the other is hidden", () => {
    const { rerender } = render(<HeroPerspectiveGridBlock secondaryAction={null} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    rerender(<HeroPerspectiveGridBlock primaryAction={null} />);
    expect(screen.getByRole("link", { name: "Get started" })).toBeInTheDocument();
  });

  it("draws the grid as inert decoration: hidden, no buttons, no tab stops", () => {
    const { container } = render(<HeroPerspectiveGridBlock />);
    const backdrop = container.querySelector("[data-slot=hero-perspective-grid-backdrop]");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(backdrop?.querySelectorAll("button, a, [tabindex]")).toHaveLength(0);
    expect(backdrop?.querySelectorAll("[data-slot=hero-perspective-grid-tile]")).toHaveLength(
      1600,
    );
  });

  it("defaults the hover colour to the primary token and accepts one or four", () => {
    const { container, rerender } = render(<HeroPerspectiveGridBlock />);
    const backdrop = () =>
      container.querySelector<HTMLElement>("[data-slot=hero-perspective-grid-backdrop]");
    const color = (n: number) =>
      backdrop()?.style.getPropertyValue(`--hero-perspective-grid-color-${String(n)}`);
    expect(color(1)).toBe("var(--color-primary)");
    expect(color(4)).toBe("var(--color-primary)");
    rerender(<HeroPerspectiveGridBlock hoverColors="teal" />);
    expect(color(3)).toBe("teal");
    rerender(<HeroPerspectiveGridBlock hoverColors={["a", "b", "c", "d"]} />);
    expect(color(2)).toBe("b");
    expect(color(4)).toBe("d");
    rerender(<HeroPerspectiveGridBlock hoverColors={[]} />);
    expect(color(1)).toBe("var(--color-primary)");
  });

  it("lays the plane flat under reduced motion", () => {
    render(<HeroPerspectiveGridBlock />);
    expect(stylesheet()).toMatch(/prefers-reduced-motion:reduce\)\{[^}]*rotateZ\(20deg\)\}/);
  });

  it("runs every duration through the motion scale and never loops", () => {
    render(<HeroPerspectiveGridBlock />);
    const css = stylesheet();
    expect(css).toContain("@keyframes dowel-hero-perspective-grid-rise{");
    expect(css).not.toContain("infinite");
    for (const match of css.matchAll(/(\d+)ms/g)) {
      const after = css.slice(match.index, match.index + 40);
      expect(after).toContain("var(--motion-scale");
    }
  });

  it("merges a consumer className, forwards the ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(<HeroPerspectiveGridBlock ref={ref} className="py-2" data-testid="hero" id="top" />);
    const section = screen.getByTestId("hero");
    expect(ref.current).toBe(section);
    expect(section).toHaveAttribute("id", "top");
    expect(section).toHaveClass("py-2");
    expect(section).not.toHaveClass("py-24");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<HeroPerspectiveGridBlock headingLevel={1} />);
    // axe takes seconds over 1,600 tiles. The plane is aria-hidden and has no
    // focusable parts (asserted above), so it cannot hold a violation; empty it.
    container.querySelector("[data-slot=hero-perspective-grid-plane]")?.replaceChildren();
    await expectNoA11yViolations(container);
  });
});
