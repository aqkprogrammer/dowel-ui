import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  LIGHT_BEAMS_ORIGINS,
  LightBeams,
  lightBeamsGradient,
  lightBeamsMask,
} from "./light-beams";

const layers = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>("[data-slot=light-beams-layer]"),
];

describe("LightBeams", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders children above an aria-hidden light that ignores the pointer", async () => {
    const { container } = render(
      <LightBeams>
        <h2>Now playing</h2>
      </LightBeams>,
    );
    const scene = container.querySelector("[data-slot=light-beams-scene]");
    expect(scene).toHaveAttribute("aria-hidden", "true");
    expect(scene).toHaveClass("pointer-events-none");
    expect(container.querySelector("[data-slot=light-beams-content]")).toContainElement(
      screen.getByRole("heading", { name: "Now playing" }),
    );
    await expectNoA11yViolations(container);
  });

  it("draws two layers of beams swaying in opposite directions about the light", () => {
    const { container } = render(<LightBeams rays={10} color="info" />);
    const [main, fine] = layers(container);
    expect(layers(container)).toHaveLength(2);
    expect(main?.style.getPropertyValue("--dowel-light-beams-sway")).toBe("3deg");
    expect(fine?.style.getPropertyValue("--dowel-light-beams-sway")).toBe("-4deg");
    expect(main?.style.transformOrigin).toBe("50% 20%");
    expect(
      document.querySelector("style[data-href='dowel-light-beams']")?.textContent,
    ).toContain("@keyframes dowel-light-beams-sway");
  });

  it("sets intensity, blur and speed, scaled and clamped", () => {
    const { container, rerender } = render(<LightBeams />);
    const scene = container.querySelector<HTMLElement>("[data-slot=light-beams-scene]");
    expect(scene?.style.opacity).toBe("0.8");
    expect(scene?.style.filter).toBe("blur(6px)");
    expect(layers(container)[0]?.style.getPropertyValue("--dowel-light-beams-duration")).toBe(
      "calc(9s * var(--motion-scale, 1))",
    );
    rerender(<LightBeams intensity={2} blur={0} speed={3} />);
    expect(scene?.style.opacity).toBe("1");
    expect(scene?.style.filter).toBe("");
    expect(layers(container)[0]?.style.getPropertyValue("--dowel-light-beams-duration")).toBe(
      "calc(3s * var(--motion-scale, 1))",
    );
  });

  it("holds still at speed 0, and pauses off-screen", () => {
    let report: (visible: boolean) => void = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          report = (visible) => {
            callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as never);
          };
        }
        observe() {}
        disconnect() {}
        unobserve() {}
        takeRecords() {
          return [];
        }
      },
    );
    const { container, rerender } = render(<LightBeams />);
    const root = container.firstElementChild;
    expect(root).not.toHaveAttribute("data-paused");
    act(() => {
      report(false);
    });
    expect(root).toHaveAttribute("data-paused", "true");
    act(() => {
      report(true);
    });
    rerender(<LightBeams speed={0} />);
    expect(root).toHaveAttribute("data-paused", "true");
  });

  it("hangs the light where asked", () => {
    const { container } = render(<LightBeams origin="top-left" />);
    expect(container.firstElementChild).toHaveAttribute("data-origin", "top-left");
    expect(layers(container)[0]?.style.transformOrigin).toBe("29% 19%");
  });

  it("blends with screen when asked, lets className win and forwards its ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <LightBeams ref={ref} blend="screen" className="isolation-auto" data-testid="beams" />,
    );
    expect(ref.current).toBe(screen.getByTestId("beams"));
    expect(ref.current?.className).toContain("mix-blend-screen");
    expect(ref.current).toHaveClass("isolation-auto");
    expect(ref.current).not.toHaveClass("isolate");
  });
});

describe("light-beams geometry", () => {
  it("spaces beams evenly across the fan, aimed down from the top", () => {
    const gradient = lightBeamsGradient(LIGHT_BEAMS_ORIGINS.top, 10, 70, "red");
    expect(gradient).toContain("from 145deg at 50% 20%");
    // Each beam's share of a 70° fan of 10 is 7°; it fills half of it.
    expect(gradient).toContain("3.5deg 7deg)");
    expect(lightBeamsGradient(LIGHT_BEAMS_ORIGINS.top, 0, 1, "red")).toContain("from 175deg");
  });

  it("cuts the light to the fan and fades it with distance", () => {
    const mask = lightBeamsMask(LIGHT_BEAMS_ORIGINS.top, 70);
    expect(mask).toContain("conic-gradient(from 145deg at 50% -10%");
    expect(mask).toContain("radial-gradient(farthest-corner at 50% -10%");
    // Feathered: clear at the fan's edges, full a few degrees in.
    expect(mask).toContain(
      "transparent 0deg, var(--color-foreground) 8deg 62deg, transparent 70deg",
    );
    expect(lightBeamsMask(LIGHT_BEAMS_ORIGINS.top, 999)).toContain("360deg");
  });
});
