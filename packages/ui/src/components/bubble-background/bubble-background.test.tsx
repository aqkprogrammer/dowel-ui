import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BubbleBackground } from "./bubble-background";

function root(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="bubble-background"]');
}

function blobs(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="bubble-background-blob"]')];
}

function follower(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="bubble-background-follower"]');
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

describe("BubbleBackground", () => {
  it("renders a decorative layer of five drifting blobs under its content", () => {
    const { container } = render(
      <BubbleBackground>
        <h2>Ship faster</h2>
      </BubbleBackground>,
    );
    const layer = container.querySelector('[data-slot="bubble-background-layer"]');
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer).toHaveClass("pointer-events-none", "absolute", "inset-0");
    expect(blobs(container)).toHaveLength(5);
    for (const blob of blobs(container)) {
      expect(blob.style.animation).toContain("dowel-bubble-background-");
      expect(blob.style.animation).toContain("var(--bubble-speed, 1)");
    }
    const content = container.querySelector('[data-slot="bubble-background-content"]');
    expect(content).toHaveClass("relative", "z-10");
    expect(content).toContainElement(screen.getByRole("heading", { name: "Ship faster" }));
    expect(root(container)).toHaveClass("relative", "isolate", "overflow-hidden");
  });

  it("drifts some blobs in reverse so the paths never sync", () => {
    const { container } = render(<BubbleBackground />);
    const reversed = blobs(container).filter((blob) =>
      blob.style.animation.endsWith("reverse"),
    );
    expect(reversed.length).toBeGreaterThan(0);
    expect(reversed.length).toBeLessThan(5);
  });

  it("fuses the blobs through its own goo filter", () => {
    const { container } = render(<BubbleBackground />);
    const filter = container.querySelector("filter");
    const group = container.querySelector<HTMLElement>('[data-slot="bubble-background-blobs"]');
    expect(filter?.id).toMatch(/^dowel-bubble-background-/);
    expect(group?.style.filter).toContain(`url(#${filter?.id ?? ""})`);
    expect(container.querySelector("feColorMatrix")).not.toBeNull();
    // The follower takes the sixth colour, set on the group so its spring stays untouched.
    expect(group?.style.getPropertyValue("--bubble-follower-color")).toBe(
      "color-mix(in oklab, var(--color-primary) 70%, var(--color-accent))",
    );
  });

  it("renders no content layer without children", () => {
    const { container } = render(<BubbleBackground />);
    expect(container.querySelector('[data-slot="bubble-background-content"]')).toBeNull();
  });

  it("uses theme tokens by default and takes custom colours, repeating them", () => {
    const { container, rerender } = render(<BubbleBackground />);
    expect(blobs(container)[0]?.style.getPropertyValue("--bubble-color")).toBe(
      "var(--color-primary)",
    );
    rerender(<BubbleBackground colors={["var(--color-warning)", "var(--color-success)"]} />);
    const colours = blobs(container).map((blob) =>
      blob.style.getPropertyValue("--bubble-color"),
    );
    expect(colours).toEqual([
      "var(--color-warning)",
      "var(--color-success)",
      "var(--color-warning)",
      "var(--color-success)",
      "var(--color-warning)",
    ]);
  });

  it("falls back to the theme palette when given no colours", () => {
    const { container } = render(<BubbleBackground colors={[]} />);
    expect(blobs(container)[0]?.style.getPropertyValue("--bubble-color")).toBe(
      "var(--color-primary)",
    );
  });

  it.each([
    ["sm", "[--bubble-blur:0.75rem]"],
    ["md", "[--bubble-blur:2rem]"],
    ["lg", "[--bubble-blur:4rem]"],
  ] as const)("applies the %s blur", (blur, expected) => {
    const { container } = render(<BubbleBackground blur={blur} />);
    expect(root(container)).toHaveClass(expected);
  });

  it.each([
    ["slow", "[--bubble-speed:1.75]"],
    ["normal", "[--bubble-speed:1]"],
    ["fast", "[--bubble-speed:0.55]"],
  ] as const)("applies the %s speed", (speed, expected) => {
    const { container } = render(<BubbleBackground speed={speed} />);
    expect(root(container)).toHaveClass(expected);
  });

  it("has no pointer follower unless interactive", () => {
    const { container } = render(<BubbleBackground />);
    expect(follower(container)).toBeNull();
    expect(root(container)).not.toHaveAttribute("data-interactive");
  });

  it("follows the pointer on a spring when interactive", async () => {
    const { container } = render(<BubbleBackground interactive data-testid="bg" />);
    const area = screen.getByTestId("bg");
    expect(area).toHaveAttribute("data-interactive");
    expect(follower(container)?.style.left).toBe("50%");
    vi.spyOn(area, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 400, 200));
    fireEvent.pointerMove(area, { clientX: 400, clientY: 200, pointerType: "mouse" });
    await waitFor(() => {
      expect(parseFloat(follower(container)?.style.left ?? "50")).toBeGreaterThan(50);
    });
    fireEvent.pointerLeave(area);
  });

  it("ignores touch and an unmeasured box", async () => {
    const { container } = render(<BubbleBackground interactive data-testid="bg" />);
    const area = screen.getByTestId("bg");
    fireEvent.pointerMove(area, { clientX: 300, clientY: 100, pointerType: "touch" });
    // jsdom reports a zero-size box, which cannot be mapped to a fraction.
    fireEvent.pointerMove(area, { clientX: 300, clientY: 100, pointerType: "mouse" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(follower(container)?.style.left).toBe("50%");
  });

  it("renders a still composition with no follower under reduced motion", () => {
    prefersReducedMotion(true);
    const { container } = render(<BubbleBackground interactive />);
    expect(follower(container)).toBeNull();
    expect(blobs(container)).toHaveLength(5);
    expect(root(container)).not.toHaveAttribute("data-interactive");
  });

  it("keeps content above it interactive from the keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <BubbleBackground interactive>
        <button type="button" onClick={onClick}>
          Get started
        </button>
      </BubbleBackground>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Get started" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards pointer handlers", () => {
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    render(
      <BubbleBackground
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
      <BubbleBackground
        ref={ref}
        className="bg-card"
        layerClassName="opacity-60"
        data-testid="bg"
        id="hero"
      />,
    );
    const area = screen.getByTestId("bg");
    expect(ref.current).toBe(area);
    expect(area).toHaveAttribute("id", "hero");
    expect(area).toHaveClass("bg-card");
    expect(area).not.toHaveClass("bg-background");
    expect(container.querySelector('[data-slot="bubble-background-layer"]')).toHaveClass(
      "opacity-60",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <BubbleBackground interactive>
        <h2>Welcome</h2>
        <a href="/start">Start</a>
      </BubbleBackground>,
    );
    await expectNoA11yViolations(container);
  });
});
