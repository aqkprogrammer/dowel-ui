import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { GradientBackground } from "./gradient-background";

function slot(container: HTMLElement, name: string) {
  return container.querySelector<HTMLElement>(`[data-slot="gradient-background${name}"]`);
}

function slots(container: HTMLElement, name: string) {
  return [
    ...container.querySelectorAll<HTMLElement>(`[data-slot="gradient-background${name}"]`),
  ];
}

function prefersReducedMotion(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GradientBackground", () => {
  it("renders a decorative panning gradient under its content by default", () => {
    const { container } = render(
      <GradientBackground>
        <h2>Launch week</h2>
      </GradientBackground>,
    );
    const root = slot(container, "");
    expect(root).toHaveAttribute("data-variant", "linear");
    expect(root).toHaveClass("relative", "isolate", "overflow-hidden");
    const layer = slot(container, "-layer");
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer).toHaveClass("pointer-events-none");
    const field = slot(container, "-field");
    expect(field?.style.backgroundImage).toContain(
      "linear-gradient(125deg, var(--color-primary)",
    );
    const content = slot(container, "-content");
    expect(content).toHaveClass("relative", "z-10");
    expect(content).toContainElement(screen.getByRole("heading", { name: "Launch week" }));
  });

  it("renders no content layer without children", () => {
    const { container } = render(<GradientBackground />);
    expect(slot(container, "-content")).toBeNull();
  });

  it("sways three tilted aurora ribbons on their own periods", () => {
    const { container } = render(<GradientBackground variant="aurora" />);
    expect(slot(container, "")).toHaveAttribute("data-variant", "aurora");
    expect(slot(container, "-field")).toBeNull();
    const ribbons = slots(container, "-ribbon");
    expect(ribbons).toHaveLength(3);
    const periods = ribbons.map((ribbon) => ribbon.style.getPropertyValue("--ribbon-period"));
    expect(new Set(periods).size).toBe(3);
    expect(periods[0]).toContain("var(--motion-scale, 1)");
    expect(ribbons.map((ribbon) => ribbon.style.rotate)).toEqual(["-8deg", "6deg", "-3deg"]);
    expect(ribbons[1]?.style.animationDirection).toBe("reverse");
  });

  it("orbits four mesh blooms from spread start angles", () => {
    const { container } = render(<GradientBackground variant="mesh" />);
    const orbits = slots(container, "-orbit");
    expect(orbits).toHaveLength(4);
    // The start angle is a static rotate, so the still frame stays spread out.
    expect(orbits.map((orbit) => orbit.style.rotate)).toEqual([
      "0deg",
      "120deg",
      "220deg",
      "300deg",
    ]);
    expect(slots(container, "-bloom")).toHaveLength(4);
    expect(slots(container, "-bloom")[2]?.style.getPropertyValue("--bloom-color")).toBe(
      "var(--color-info)",
    );
  });

  it("takes custom colours, repeating them", () => {
    const { container } = render(
      <GradientBackground
        variant="mesh"
        colors={["var(--color-warning)", "var(--color-destructive)"]}
      />,
    );
    const colours = slots(container, "-bloom").map((bloom) =>
      bloom.style.getPropertyValue("--bloom-color"),
    );
    expect(colours).toEqual([
      "var(--color-warning)",
      "var(--color-destructive)",
      "var(--color-warning)",
      "var(--color-destructive)",
    ]);
  });

  it("falls back to the theme palette when given no colours", () => {
    const { container } = render(<GradientBackground colors={[]} />);
    expect(slot(container, "-field")?.style.backgroundImage).toContain("var(--color-primary)");
  });

  it.each([
    ["slow", "[--gradient-speed:1.75]"],
    ["normal", "[--gradient-speed:1]"],
    ["fast", "[--gradient-speed:0.55]"],
  ] as const)("applies the %s speed", (speed, expected) => {
    const { container } = render(<GradientBackground speed={speed} />);
    expect(slot(container, "")).toHaveClass(expected);
  });

  it("overlays SVG film grain only when asked", () => {
    const { container, rerender } = render(<GradientBackground />);
    expect(slot(container, "-grain")).toBeNull();
    rerender(<GradientBackground grain />);
    const grain = slot(container, "-grain");
    const filter = grain?.querySelector("filter");
    expect(grain?.querySelector("feTurbulence")).toHaveAttribute("type", "fractalNoise");
    expect(grain?.querySelector("rect")).toHaveAttribute(
      "filter",
      `url(#${filter?.id ?? "missing"})`,
    );
  });

  it("has no pointer light unless interactive", () => {
    const { container } = render(<GradientBackground />);
    expect(slot(container, "-spotlight")).toBeNull();
  });

  it("follows the pointer with a soft light when interactive", async () => {
    const { container } = render(<GradientBackground interactive data-testid="bg" />);
    const area = screen.getByTestId("bg");
    expect(area).toHaveAttribute("data-interactive");
    const light = slot(container, "-spotlight");
    expect(light?.style.top).toBe("50%");
    vi.spyOn(area, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 200));
    fireEvent.pointerMove(area, { clientX: 20, clientY: 20, pointerType: "mouse" });
    await waitFor(() => {
      expect(parseFloat(slot(container, "-spotlight")?.style.top ?? "50")).toBeLessThan(50);
    });
    fireEvent.pointerLeave(area);
  });

  it("ignores touch and an unmeasured box", async () => {
    const { container } = render(<GradientBackground interactive data-testid="bg" />);
    const area = screen.getByTestId("bg");
    fireEvent.pointerMove(area, { clientX: 10, clientY: 10, pointerType: "touch" });
    fireEvent.pointerMove(area, { clientX: 10, clientY: 10, pointerType: "mouse" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(slot(container, "-spotlight")?.style.top).toBe("50%");
  });

  it("keeps a still composition with no pointer light under reduced motion", () => {
    prefersReducedMotion(true);
    const { container } = render(<GradientBackground variant="mesh" interactive grain />);
    expect(slot(container, "-spotlight")).toBeNull();
    expect(slot(container, "")).not.toHaveAttribute("data-interactive");
    expect(slots(container, "-orbit")).toHaveLength(4);
    expect(slot(container, "-grain")).not.toBeNull();
  });

  it("keeps content above it interactive from the keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <GradientBackground variant="aurora" interactive>
        <button type="button" onClick={onClick}>
          Join
        </button>
      </GradientBackground>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Join" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards pointer handlers", () => {
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    render(
      <GradientBackground
        data-testid="bg"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      />,
    );
    fireEvent.pointerMove(screen.getByTestId("bg"));
    fireEvent.pointerLeave(screen.getByTestId("bg"));
    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <GradientBackground
        ref={ref}
        className="bg-muted"
        layerClassName="opacity-50"
        data-testid="bg"
        title="Hero"
      />,
    );
    const area = screen.getByTestId("bg");
    expect(ref.current).toBe(area);
    expect(area).toHaveAttribute("title", "Hero");
    expect(area).toHaveClass("bg-muted");
    expect(area).not.toHaveClass("bg-background");
    expect(slot(container, "-layer")).toHaveClass("opacity-50");
  });

  it.each(["linear", "aurora", "mesh"] as const)(
    "has no accessibility violations as %s",
    async (variant) => {
      const { container } = render(
        <GradientBackground variant={variant} grain interactive>
          <h2>Welcome</h2>
          <a href="/start">Start</a>
        </GradientBackground>,
      );
      await expectNoA11yViolations(container);
    },
  );
});
