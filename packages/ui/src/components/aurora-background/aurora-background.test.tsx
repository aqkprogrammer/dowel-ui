import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AuroraBackground } from "./aurora-background";

function layers(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>("[data-slot=aurora-background-layer]")];
}

function scene(container: HTMLElement) {
  const node = container.querySelector<HTMLElement>("[data-slot=aurora-background-scene]");
  if (!node) throw new Error("no scene");
  return node;
}

/** A controllable IntersectionObserver: `fire(visible)` reports every observed node. */
function stubIntersectionObserver() {
  const instances: { callback: IntersectionObserverCallback; disconnect: () => void }[] = [];
  const disconnect = vi.fn();
  class Observer {
    callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      instances.push({ callback, disconnect });
    }
    observe() {}
    unobserve() {}
    disconnect = disconnect;
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", Observer);
  return {
    disconnect,
    fire(visible: boolean) {
      act(() => {
        for (const instance of instances) {
          instance.callback(
            [{ isIntersecting: visible } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          );
        }
      });
    },
  };
}

describe("AuroraBackground", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders its children above an aria-hidden scene that ignores the pointer", async () => {
    const { container } = render(
      <AuroraBackground>
        <h2>Northern release</h2>
      </AuroraBackground>,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-slot", "aurora-background");
    expect(root).toHaveAttribute("data-variant", "curtain");
    expect(root).toHaveClass("relative", "isolate", "overflow-hidden");
    const light = scene(container);
    expect(light).toHaveAttribute("aria-hidden", "true");
    expect(light).toHaveClass("pointer-events-none", "absolute", "inset-0");
    const content = container.querySelector("[data-slot=aurora-background-content]");
    expect(content).toHaveClass("relative", "z-10");
    expect(content).toContainElement(screen.getByRole("heading", { name: "Northern release" }));
    await expectNoA11yViolations(container);
  });

  it("ships its keyframes once, however many auroras there are", () => {
    render(
      <>
        <AuroraBackground />
        <AuroraBackground variant="glow" />
      </>,
    );
    const sheets = document.querySelectorAll("style[data-href='dowel-aurora-background']");
    expect(sheets).toHaveLength(1);
    const css = sheets[0]?.textContent ?? "";
    expect(css).toContain("@keyframes dowel-aurora-background-curtain");
    expect(css).toContain("@keyframes dowel-aurora-background-drift-c");
    expect(css).toContain("animation-play-state:paused");
    expect(css).toContain("forced-colors:active");
    // Layers only ever move by transform.
    expect(css).not.toMatch(/@keyframes[^}]*\{[^}]*background-position/);
  });

  it("draws two streaked curtain layers through the palette, in order", () => {
    const { container } = render(<AuroraBackground colors={["success", "#ff00aa"]} />);
    const [front, back] = layers(container);
    expect(layers(container)).toHaveLength(2);
    expect(front?.style.backgroundImage).toContain("repeating-linear-gradient(100deg");
    expect(back?.style.backgroundImage).toContain("repeating-linear-gradient(76deg");
    const image = front?.style.backgroundImage ?? "";
    expect(image.indexOf("var(--color-success)")).toBeGreaterThan(-1);
    expect(image.indexOf("var(--color-success)")).toBeLessThan(image.indexOf("#ff00aa"));
    expect(front?.style.getPropertyValue("--dowel-aurora-background-name")).toBe(
      "dowel-aurora-background-curtain",
    );
  });

  it("gives each of three glow fields its own colour and path", () => {
    const { container } = render(
      <AuroraBackground variant="glow" colors={["primary", "info"]} />,
    );
    const fields = layers(container);
    expect(fields).toHaveLength(3);
    expect(fields.map((f) => f.style.backgroundImage)).toEqual([
      expect.stringContaining("var(--color-primary)"),
      expect.stringContaining("var(--color-info)"),
      // Two colours cycle across three fields.
      expect.stringContaining("var(--color-primary)"),
    ]);
    expect(
      new Set(fields.map((f) => f.style.getPropertyValue("--dowel-aurora-background-name")))
        .size,
    ).toBe(3);
  });

  it("falls back to the default palette when given none", () => {
    const { container } = render(<AuroraBackground colors={[]} />);
    const image = layers(container)[0]?.style.backgroundImage ?? "";
    expect(image).toContain("var(--color-primary)");
    expect(image).toContain("var(--color-info)");
    expect(image).toContain("var(--color-warning)");
  });

  it("sets intensity, softness and speed, scaled and clamped", () => {
    const { container, rerender } = render(<AuroraBackground />);
    const light = scene(container);
    expect(light.style.opacity).toBe("0.6");
    expect(light.style.filter).toBe("blur(48px)");
    expect(
      layers(container)[0]?.style.getPropertyValue("--dowel-aurora-background-duration"),
    ).toBe("calc(28s * var(--motion-scale, 1))");

    rerender(<AuroraBackground intensity={3} blur={20} speed={2} />);
    expect(light.style.opacity).toBe("1");
    expect(light.style.filter).toBe("blur(20px)");
    const [front, back] = layers(container);
    expect(front?.style.getPropertyValue("--dowel-aurora-background-duration")).toBe(
      "calc(14s * var(--motion-scale, 1))",
    );
    expect(back?.style.getPropertyValue("--dowel-aurora-background-delay")).toBe(
      "calc(-5.5s * var(--motion-scale, 1))",
    );

    rerender(<AuroraBackground variant="glow" intensity={-1} blur={0} />);
    expect(scene(container).style.opacity).toBe("0");
    expect(scene(container).style.filter).toBe("");

    rerender(<AuroraBackground variant="glow" />);
    expect(scene(container).style.filter).toBe("blur(72px)");
  });

  it("holds still at speed 0", () => {
    const { container } = render(<AuroraBackground speed={0} />);
    expect(container.firstElementChild).toHaveAttribute("data-paused", "true");
    expect(
      layers(container)[0]?.style.getPropertyValue("--dowel-aurora-background-duration"),
    ).toBe("calc(28s * var(--motion-scale, 1))");
  });

  it("pauses while off-screen and resumes when it comes back", () => {
    const io = stubIntersectionObserver();
    const { container, unmount } = render(<AuroraBackground />);
    const root = container.firstElementChild;
    expect(root).not.toHaveAttribute("data-paused");
    io.fire(false);
    expect(root).toHaveAttribute("data-paused", "true");
    io.fire(true);
    expect(root).not.toHaveAttribute("data-paused");
    unmount();
    expect(io.disconnect).toHaveBeenCalled();
  });

  it("applies the fade variants and lets className win a conflict", () => {
    const { container, rerender } = render(
      <AuroraBackground fade="edges" className="isolation-auto" />,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain("mask-image:radial-gradient");
    expect(root).toHaveClass("isolation-auto");
    expect(root).not.toHaveClass("isolate");
    rerender(<AuroraBackground fade="top" />);
    expect(root?.className).toContain("mask-image:linear-gradient(to_top");
    rerender(<AuroraBackground fade="bottom" />);
    expect(root?.className).toContain("mask-image:linear-gradient(to_bottom");
    rerender(<AuroraBackground fade="none" />);
    expect(root?.className).not.toContain("mask-image");
  });

  it("forwards object and callback refs, spreads props and keeps style", () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <AuroraBackground
        ref={ref}
        id="aurora"
        data-testid="aurora"
        style={{ minHeight: 200 }}
      />,
    );
    expect(ref.current).toBe(screen.getByTestId("aurora"));
    expect(ref.current).toHaveAttribute("id", "aurora");
    expect(ref.current?.style.minHeight).toBe("200px");
    const callback = vi.fn();
    rerender(<AuroraBackground ref={callback} data-testid="aurora" />);
    expect(callback).toHaveBeenCalledWith(screen.getByTestId("aurora"));
  });
});
