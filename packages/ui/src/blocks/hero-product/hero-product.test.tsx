import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { HeroProductBlock } from "./hero-product";

function stylesheet(): string {
  return [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
}

describe("HeroProductBlock", () => {
  it("is one section landmark named by its headline", () => {
    render(<HeroProductBlock />);
    expect(
      screen.getByRole("region", { name: "Build beautiful interfaces, effortlessly" }),
    ).toBeInTheDocument();
  });

  it("renders the headline at level 2 by default, and at any level asked for", () => {
    const { rerender } = render(<HeroProductBlock />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<HeroProductBlock headingLevel={1} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the announcement and both actions as real links", () => {
    render(
      <HeroProductBlock
        announcement={{ label: "Version 2 is out", href: "/changelog" }}
        primaryAction={{ label: "Start", href: "/start" }}
        secondaryAction={{ label: "Watch", href: "/video" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Version 2 is out" })).toHaveAttribute(
      "href",
      "/changelog",
    );
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", "/start");
    expect(screen.getByRole("link", { name: "Watch" })).toHaveAttribute("href", "/video");
  });

  it("hides the announcement, description and actions when asked", () => {
    render(
      <HeroProductBlock
        announcement={null}
        description=""
        primaryAction={null}
        secondaryAction={null}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("keeps one action when the other is hidden", () => {
    const { rerender } = render(
      <HeroProductBlock secondaryAction={null} announcement={null} />,
    );
    expect(screen.getByRole("link", { name: "Start building" })).toBeInTheDocument();
    rerender(<HeroProductBlock primaryAction={null} announcement={null} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows the screenshot as content with its alt text", () => {
    render(
      <HeroProductBlock
        image={{ src: "/shot.png", alt: "The editor", width: 1200, height: 750 }}
      />,
    );
    const image = screen.getByRole("img", { name: "The editor" });
    expect(image).toHaveAttribute("src", "/shot.png");
    expect(image).toHaveAttribute("width", "1200");
  });

  it("holds the screenshot's place with a hidden placeholder when there is none", () => {
    const { container } = render(<HeroProductBlock />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("[data-slot=hero-product-placeholder]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("stages the entrance on the motion scale, each part from its own pose", () => {
    const { container } = render(<HeroProductBlock />);
    const css = stylesheet();
    expect(css).toContain("@keyframes dowel-hero-product-rise{");
    expect(css).toContain("calc(var(--duration) * var(--motion-scale, 1))");
    expect(css).toContain("calc(var(--delay, 0ms) * var(--motion-scale, 1))");
    expect(css).not.toContain("infinite");
    const parts = [
      ...container.querySelectorAll<HTMLElement>("[data-slot=hero-product-reveal]"),
    ];
    // Every part sets every variable, so none inherits its parent's pose.
    for (const part of parts) {
      for (const name of [
        "--delay",
        "--duration",
        "--from-y",
        "--from-scale",
        "--from-opacity",
      ]) {
        expect(part.style.getPropertyValue(name)).not.toBe("");
      }
    }
  });

  it("keeps hover motion behind motion-safe", () => {
    const { container } = render(<HeroProductBlock />);
    const frame = container.querySelector("[data-slot=hero-product-frame]");
    expect(frame?.className).toContain("motion-safe:hover:rotate-y-2");
    expect(screen.getByRole("link", { name: "Start building" })).toHaveClass(
      "motion-safe:hover:scale-105",
    );
  });

  it("merges a consumer className, forwards the ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(<HeroProductBlock ref={ref} className="py-2" data-testid="hero" />);
    const section = screen.getByTestId("hero");
    expect(ref.current).toBe(section);
    expect(section).toHaveClass("py-2");
    expect(section).not.toHaveClass("py-20");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <HeroProductBlock headingLevel={1} image={{ src: "/shot.png", alt: "The editor" }} />,
    );
    await expectNoA11yViolations(container);
  });
});
