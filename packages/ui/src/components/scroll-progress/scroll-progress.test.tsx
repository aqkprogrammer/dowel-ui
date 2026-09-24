import { act, render, screen, waitFor } from "@testing-library/react";
import { createRef, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as MotionModule from "motion/react";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ScrollProgress, type ScrollProgressProps } from "./scroll-progress";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof MotionModule>()),
  useReducedMotion: () => motionPreference.reduced,
}));

beforeEach(() => {
  motionPreference.reduced = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Gives an element 800px of scrollable distance and scrolls it to `top`. */
function scrollTo(element: HTMLElement, top: number) {
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: 1000 });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: 200 });
  element.scrollTop = top;
  act(() => {
    element.dispatchEvent(new Event("scroll"));
  });
}

function bar(root: HTMLElement) {
  return root.querySelector<HTMLElement>('[data-slot="scroll-progress-bar"]')!;
}

function scaleOf(element: HTMLElement) {
  const { transform } = element.style;
  if (transform === "none") return 1;
  const match = /scaleX\(([\d.e-]+)\)/.exec(transform);
  return match ? Number(match[1]) : Number.NaN;
}

function WithRef(props: ScrollProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <>
      <ScrollProgress data-testid="progress" container={ref} position="static" {...props} />
      <div ref={ref} data-testid="scroller" style={{ overflowY: "auto" }}>
        <p>Content</p>
      </div>
    </>
  );
}

describe("ScrollProgress", () => {
  it("renders a decorative bar pinned to the top of the viewport", () => {
    render(<ScrollProgress data-testid="progress" />);
    const root = screen.getByTestId("progress");
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).not.toHaveAttribute("role");
    expect(root).toHaveClass("fixed", "top-0", "h-0.5", "text-foreground");
    expect(bar(root)).toHaveClass("origin-left", "rtl:origin-right", "bg-current");
    expect(scaleOf(bar(root))).toBe(0);
  });

  it("applies position and size variants", () => {
    const { rerender } = render(<ScrollProgress data-testid="progress" position="bottom" />);
    const root = screen.getByTestId("progress");
    expect(root).toHaveClass("fixed", "bottom-0");
    rerender(<ScrollProgress data-testid="progress" position="static" size="lg" />);
    expect(root).toHaveClass("relative", "w-full", "h-1");
    expect(root).not.toHaveClass("fixed");
    rerender(<ScrollProgress data-testid="progress" size="xs" />);
    expect(root).toHaveClass("h-px");
    rerender(<ScrollProgress data-testid="progress" size="md" />);
    expect(root).toHaveClass("h-[3px]");
  });

  it("tracks a container ref directly under reduced motion", async () => {
    motionPreference.reduced = true;
    render(<WithRef />);
    scrollTo(screen.getByTestId("scroller"), 400);
    await waitFor(() => {
      expect(scaleOf(bar(screen.getByTestId("progress")))).toBeCloseTo(0.5);
    });
    scrollTo(screen.getByTestId("scroller"), 800);
    await waitFor(() => {
      expect(scaleOf(bar(screen.getByTestId("progress")))).toBe(1);
    });
  });

  it("tracks a container element", async () => {
    motionPreference.reduced = true;
    const scroller = document.createElement("div");
    document.body.append(scroller);
    render(<ScrollProgress data-testid="progress" container={scroller} position="static" />);
    scrollTo(scroller, 200);
    await waitFor(() => {
      expect(scaleOf(bar(screen.getByTestId("progress")))).toBeCloseTo(0.25);
    });
    scroller.remove();
  });

  it("springs toward the scroll position when motion is allowed", async () => {
    render(<WithRef />);
    scrollTo(screen.getByTestId("scroller"), 600);
    await waitFor(
      () => {
        expect(scaleOf(bar(screen.getByTestId("progress")))).toBeGreaterThan(0.7);
      },
      { timeout: 2000 },
    );
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ScrollProgress ref={ref} data-testid="progress" className="top-14 h-2 text-primary" />,
    );
    const root = screen.getByTestId("progress");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("top-14", "h-2", "text-primary");
    expect(root).not.toHaveClass("top-0", "h-0.5", "text-foreground");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<WithRef />);
    await expectNoA11yViolations(container);
  });
});
