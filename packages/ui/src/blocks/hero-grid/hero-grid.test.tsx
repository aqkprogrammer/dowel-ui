import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { HeroGridBlock } from "./hero-grid";

function stylesheet(): string {
  return [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
}

describe("HeroGridBlock", () => {
  it("is one section landmark named by its headline", () => {
    render(<HeroGridBlock />);
    expect(
      screen.getByRole("region", { name: "Build your next project with confidence" }),
    ).toBeInTheDocument();
  });

  it("renders the headline at level 2 by default, and at any level asked for", () => {
    const { rerender } = render(<HeroGridBlock />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<HeroGridBlock headingLevel={1} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("is data-driven: headline, highlight, description and actions are props", () => {
    render(
      <HeroGridBlock
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
      <HeroGridBlock highlight="" description="" primaryAction={null} secondaryAction={null} />,
    );
    expect(screen.getByRole("heading", { name: "Build your next project with" })).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("keeps one action when the other is hidden", () => {
    const { rerender } = render(<HeroGridBlock secondaryAction={null} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    rerender(<HeroGridBlock primaryAction={null} />);
    expect(screen.getByRole("link", { name: "Get started" })).toBeInTheDocument();
  });

  it("draws the grid as inert decoration: hidden, no buttons, no tab stops", () => {
    const { container } = render(<HeroGridBlock />);
    const backdrop = container.querySelector("[data-slot=hero-grid-backdrop]");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(backdrop?.querySelectorAll("button, a, [tabindex]")).toHaveLength(0);
    expect(backdrop?.querySelectorAll("[data-slot=hero-grid-cell]").length).toBeGreaterThan(
      100,
    );
  });

  it("defaults hover colours to theme tokens and accepts its own, cycled", () => {
    const { container, rerender } = render(<HeroGridBlock />);
    const backdrop = () =>
      container.querySelector<HTMLElement>("[data-slot=hero-grid-backdrop]");
    expect(backdrop()?.style.getPropertyValue("--hero-grid-color-1")).toBe(
      "var(--color-primary)",
    );
    rerender(<HeroGridBlock colors={["red", "blue"]} />);
    expect(backdrop()?.style.getPropertyValue("--hero-grid-color-3")).toBe("red");
    expect(backdrop()?.style.getPropertyValue("--hero-grid-color-4")).toBe("blue");
    rerender(<HeroGridBlock colors={[]} />);
    expect(backdrop()?.style.getPropertyValue("--hero-grid-color-2")).toBe("var(--color-info)");
  });

  it("runs every duration through the motion scale and never loops", () => {
    render(<HeroGridBlock />);
    const css = stylesheet();
    expect(css).toContain("@keyframes dowel-hero-grid-rise{");
    expect(css).not.toContain("infinite");
    for (const match of css.matchAll(/(\d+)ms/g)) {
      const after = css.slice(match.index, match.index + 40);
      expect(after).toContain("var(--motion-scale");
    }
  });

  it("merges a consumer className, forwards the ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(<HeroGridBlock ref={ref} className="py-2" data-testid="hero" id="top" />);
    const section = screen.getByTestId("hero");
    expect(ref.current).toBe(section);
    expect(section).toHaveAttribute("id", "top");
    expect(section).toHaveClass("py-2");
    expect(section).not.toHaveClass("py-24");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<HeroGridBlock headingLevel={1} />);
    await expectNoA11yViolations(container);
  });
});
