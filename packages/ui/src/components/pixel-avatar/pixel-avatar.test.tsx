import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PixelAvatar } from "./pixel-avatar";

function avatar(container: HTMLElement) {
  return container.querySelector<SVGSVGElement>('[data-slot="pixel-avatar"]');
}

function fills(container: HTMLElement) {
  return [...container.querySelectorAll("[data-part=cell]")].map(
    (cell) => `${cell.getAttribute("fill") ?? ""}|${cell.getAttribute("opacity") ?? ""}`,
  );
}

describe("PixelAvatar", () => {
  it("is decorative by default and a named image when labelled", () => {
    const { container } = render(<PixelAvatar seed="Harper" />);
    expect(avatar(container)).toHaveAttribute("aria-hidden", "true");
    render(<PixelAvatar seed="Harper" aria-label="Harper" />);
    expect(screen.getByRole("img", { name: "Harper" })).toBeInTheDocument();
  });

  it("draws a cells × cells grid of SVG rects", () => {
    const { container } = render(<PixelAvatar seed="Lucas" />);
    expect(container.querySelectorAll("[data-part=cell]")).toHaveLength(36);
    const eight = render(<PixelAvatar seed="Lucas" cells={8} />);
    expect(eight.container.querySelectorAll("[data-part=cell]")).toHaveLength(64);
    expect(avatar(eight.container)).toHaveAttribute("viewBox", "0 0 8 8");
  });

  it("is deterministic: the same seed draws the same avatar", () => {
    const a = render(<PixelAvatar seed="Olivia" />);
    const b = render(<PixelAvatar seed="Olivia" />);
    const c = render(<PixelAvatar seed="Benjamin" />);
    expect(fills(a.container)).toEqual(fills(b.container));
    expect(fills(a.container)).not.toEqual(fills(c.container));
  });

  it("colours only from theme tokens, unless given a palette", () => {
    const { container } = render(<PixelAvatar seed="Charlotte" />);
    for (const fill of fills(container)) expect(fill).toMatch(/var\(--color-/);
    const custom = render(
      <PixelAvatar seed="Charlotte" palette={["var(--a)", "var(--b)", "var(--c)"]} />,
    );
    for (const fill of fills(custom.container)) expect(fill).toMatch(/var\(--[abc]\)/);
  });

  it("animates with phased, motion-scaled delays, and can be still", () => {
    const { container } = render(<PixelAvatar seed="Harper" />);
    expect(avatar(container)).toHaveAttribute("data-animated");
    const cell = container.querySelector<SVGRectElement>("[data-part=cell]");
    expect(cell?.style.getPropertyValue("--delay")).toContain("var(--motion-scale");
    expect(container.querySelector("[data-sparkle]")).not.toBeNull();
    const still = render(<PixelAvatar seed="Harper" animated={false} />);
    expect(avatar(still.container)).not.toHaveAttribute("data-animated");
    expect(avatar(container)).not.toHaveAttribute("data-motion");
  });

  it("defines every keyframe it references", () => {
    render(<PixelAvatar seed="x" />);
    const css = [...document.querySelectorAll("style")]
      .map((node) => node.textContent)
      .join("");
    for (const name of ["pulse", "sparkle", "breathe"]) {
      expect(css).toContain(`@keyframes dowel-pixel-avatar-${name}{`);
    }
  });

  it("clips to a circle or a rounded square with a unique id", () => {
    const { container } = render(
      <>
        <PixelAvatar seed="a" />
        <PixelAvatar seed="a" shape="square" />
      </>,
    );
    const clips = [...container.querySelectorAll("clipPath")];
    expect(new Set(clips.map((clip) => clip.id)).size).toBe(2);
    expect(clips[0]?.querySelector("circle")).not.toBeNull();
    expect(clips[1]?.querySelector("rect")).not.toBeNull();
    const svgs = container.querySelectorAll('[data-slot="pixel-avatar"]');
    expect(svgs[0]).toHaveClass("rounded-full");
    expect(svgs[1]).toHaveClass("rounded-[22%]");
  });

  it("sizes, merges className and style, forwards ref and props", () => {
    const ref = createRef<SVGSVGElement>();
    const { container } = render(
      <PixelAvatar
        ref={ref}
        seed="s"
        size="3rem"
        className="rounded-none"
        style={{ opacity: 0.5 }}
        data-testid="av"
      />,
    );
    const element = avatar(container);
    expect(element?.style.width).toBe("3rem");
    expect(element?.style.opacity).toBe("0.5");
    expect(element).toHaveClass("rounded-none");
    expect(element).not.toHaveClass("rounded-full");
    expect(ref.current).toBe(element);
    expect(screen.getByTestId("av")).toBe(element);
    expect(avatar(render(<PixelAvatar seed="s" size={80} />).container)?.style.width).toBe(
      "80px",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <PixelAvatar seed="a" />
        <PixelAvatar seed="b" aria-label="Research agent" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
