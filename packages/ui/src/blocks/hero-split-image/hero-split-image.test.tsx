import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { HeroSplitImageBlock } from "./hero-split-image";

function stylesheet(): string {
  return [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
}

describe("HeroSplitImageBlock", () => {
  it("is one section landmark named by its headline", () => {
    render(<HeroSplitImageBlock />);
    expect(
      screen.getByRole("region", { name: "Build beautiful interfaces, effortlessly." }),
    ).toBeInTheDocument();
  });

  it("renders the headline at level 2 by default, and at any level asked for", () => {
    const { rerender } = render(<HeroSplitImageBlock />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<HeroSplitImageBlock headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("states the rating in words, once", () => {
    render(
      <HeroSplitImageBlock
        reviews={{ avatars: [{ name: "Ada Lovelace" }], count: 1200, rating: 4.4 }}
      />,
    );
    expect(screen.getByRole("img", { name: "Rated 4.4 out of 5" })).toBeInTheDocument();
    expect(screen.getByText("4.4")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(/from 1,200\+ reviews/)).toBeInTheDocument();
    // 4.4 rounds to four filled stars.
    const stars = screen.getByRole("img", { name: "Rated 4.4 out of 5" });
    expect(stars.querySelectorAll("[data-filled]")).toHaveLength(4);
  });

  it("names every reviewer avatar", () => {
    render(<HeroSplitImageBlock />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("Amara Okafor")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("shows a review count without a rating or avatars", () => {
    render(<HeroSplitImageBlock reviews={{ avatars: [], count: 50 }} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Rated/ })).not.toBeInTheDocument();
    expect(screen.getByText(/from 50\+ reviews/)).toBeInTheDocument();
  });

  it("renders actions as links and hides what is null or empty", () => {
    const { rerender } = render(
      <HeroSplitImageBlock
        primaryAction={{ label: "Start", href: "/start" }}
        secondaryAction={{ label: "Demo", href: "/demo" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", "/start");
    expect(screen.getByRole("link", { name: "Demo" })).toHaveAttribute("href", "/demo");

    rerender(
      <HeroSplitImageBlock
        reviews={null}
        description=""
        primaryAction={null}
        secondaryAction={null}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/reviews/)).not.toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();

    rerender(<HeroSplitImageBlock primaryAction={null} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    rerender(<HeroSplitImageBlock secondaryAction={null} />);
    expect(screen.getByRole("link", { name: "Get started" })).toBeInTheDocument();
  });

  it("shows the image as content, or a hidden placeholder without one", () => {
    const { container, rerender } = render(<HeroSplitImageBlock />);
    expect(container.querySelector("[data-slot=hero-split-image-placeholder]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    rerender(<HeroSplitImageBlock image={{ src: "/app.png", alt: "The app", width: 800 }} />);
    expect(screen.getByRole("img", { name: "The app" })).toHaveAttribute("src", "/app.png");
  });

  it("staggers the entrance on the motion scale and never loops", () => {
    const { container } = render(<HeroSplitImageBlock />);
    const css = stylesheet();
    expect(css).toContain("@keyframes dowel-hero-split-image-enter{");
    expect(css).not.toContain("infinite");
    for (const match of css.matchAll(/(\d+)ms/g)) {
      expect(css.slice(match.index, match.index + 40)).toContain("var(--motion-scale");
    }
    const steps = [
      ...container.querySelectorAll<HTMLElement>("[data-slot=hero-split-image-reveal]"),
    ].map((part) => part.style.getPropertyValue("--i"));
    expect(steps).toEqual(["0", "1", "2", "3"]);
  });

  it("merges a consumer className, forwards the ref and native props", () => {
    const ref = createRef<HTMLElement>();
    render(<HeroSplitImageBlock ref={ref} className="to-card" data-testid="hero" />);
    const section = screen.getByTestId("hero");
    expect(ref.current).toBe(section);
    expect(section).toHaveClass("to-card");
    expect(section).not.toHaveClass("to-muted");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <HeroSplitImageBlock headingLevel={1} image={{ src: "/app.png", alt: "The app" }} />,
    );
    await expectNoA11yViolations(container);
  });
});
