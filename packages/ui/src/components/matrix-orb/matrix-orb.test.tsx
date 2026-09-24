import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { MatrixOrb } from "./matrix-orb";

/*
 * jsdom has no 2D canvas and a timer-driven rAF. Each drawing test installs a
 * recording context and a manual frame queue, then steps frames and reads the
 * dots that were drawn.
 */
function installCanvas() {
  const ctx = {
    fillStyle: "",
    globalAlpha: 1,
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  };
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(() => ctx as never);
  let queue: FrameRequestCallback[] = [];
  let now = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    queue.push(callback);
    return queue.length;
  });
  const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    queue = [];
  });
  return {
    ctx,
    getContext,
    cancel,
    pending: () => queue.length,
    /** Runs up to `frames` queued frames, `step` ms apart. */
    flush(frames = 1, step = 16) {
      for (let index = 0; index < frames; index += 1) {
        const run = queue;
        queue = [];
        if (run.length === 0) return;
        now += step;
        for (const callback of run) callback(now);
      }
    },
    /** The radius drawn at a point in the most recent frame. */
    radiusAt(x: number, y: number) {
      const calls = ctx.arc.mock.calls as number[][];
      const hit = [...calls].reverse().find((call) => call[0] === x && call[1] === y);
      return hit?.[2] ?? Number.NaN;
    },
  };
}

function reduceMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduce"),
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

describe("MatrixOrb", () => {
  it("renders an image named by its state, with a decorative canvas", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<MatrixOrb />);
    const orb = screen.getByRole("img", { name: "Idle" });
    expect(orb).toHaveAttribute("data-slot", "matrix-orb");
    expect(orb).toHaveAttribute("data-state", "idle");
    const canvas = orb.querySelector("canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas?.style.width).toBe("120px");
    expect(orb.querySelector('[data-slot="matrix-orb-caption"]')).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps its name in step with the state", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { rerender } = render(<MatrixOrb state="listening" />);
    expect(screen.getByRole("img", { name: "Listening" })).toBeInTheDocument();
    rerender(<MatrixOrb state="thinking" />);
    expect(screen.getByRole("img", { name: "Thinking" })).toHaveAttribute(
      "data-state",
      "thinking",
    );
  });

  it("shows a caption per state and takes its name from it", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const labels = { idle: "Tap to talk", thinking: "Working it out" };
    const { rerender } = render(<MatrixOrb labels={labels} />);
    const orb = screen.getByRole("img", { name: "Tap to talk" });
    const caption = orb.querySelector('[data-slot="matrix-orb-caption"]');
    expect(caption).toHaveTextContent("Tap to talk");
    expect(caption).toHaveAttribute("aria-hidden", "true");
    // No entrance on first paint.
    expect(caption).not.toHaveAttribute("data-enter");

    rerender(<MatrixOrb labels={labels} state="thinking" />);
    const next = screen
      .getByRole("img", { name: "Working it out" })
      .querySelector('[data-slot="matrix-orb-caption"]');
    expect(next).toHaveTextContent("Working it out");
    expect(next).toHaveAttribute("data-enter");

    // A state without a caption falls back to the default name and shows none.
    rerender(<MatrixOrb labels={labels} state="listening" />);
    expect(screen.getByRole("img", { name: "Listening" })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="matrix-orb-caption"]')).toBeNull();
  });

  it("lets aria-label or aria-labelledby replace the state name", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { rerender } = render(<MatrixOrb aria-label="Voice assistant" />);
    expect(screen.getByRole("img", { name: "Voice assistant" })).toBeInTheDocument();
    rerender(
      <>
        <span id="orb-name">Helper</span>
        <MatrixOrb aria-labelledby="orb-name" />
      </>,
    );
    const orb = screen.getByRole("img", { name: "Helper" });
    expect(orb).not.toHaveAttribute("aria-label");
  });

  it("announces a state change only when asked, and never on first paint", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { rerender } = render(<MatrixOrb announce labels={{ thinking: "Thinking…" }} />);
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    rerender(<MatrixOrb announce labels={{ thinking: "Thinking…" }} state="thinking" />);
    expect(screen.getByRole("status")).toHaveTextContent("Thinking…");
  });

  it("colours the dots by tone, or any CSS colour", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { rerender } = render(<MatrixOrb data-testid="orb" />);
    expect(screen.getByTestId("orb")).toHaveClass("text-primary");
    rerender(<MatrixOrb data-testid="orb" tone="muted" />);
    expect(screen.getByTestId("orb")).toHaveClass("text-muted-foreground");
    rerender(<MatrixOrb data-testid="orb" tone="foreground" color="var(--color-success)" />);
    expect(screen.getByTestId("orb")).toHaveClass("text-foreground");
    expect(screen.getByTestId("orb").style.color).toBe("var(--color-success)");
  });

  it("draws a circle of dots from the grid, at device pixel ratio capped at 2", () => {
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(3);
    const canvas = installCanvas();
    const { container } = render(<MatrixOrb dots={5} size={100} />);
    // Painted on mount, before any animation frame — a background tab never
    // gets one. A 5 × 5 grid keeps the 13 dots inside the circle and drops the corners.
    expect(canvas.ctx.arc).toHaveBeenCalledTimes(13);
    expect(canvas.ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    const element = container.querySelector("canvas");
    expect(element?.width).toBe(200);
    expect(element?.height).toBe(200);
    expect(canvas.ctx.globalAlpha).toBe(1);
  });

  it("clamps the grid density", () => {
    const canvas = installCanvas();
    render(<MatrixOrb dots={2} size={100} />);
    expect(canvas.ctx.arc).toHaveBeenCalledTimes(13);
  });

  it("keeps animating while on screen", () => {
    const canvas = installCanvas();
    render(<MatrixOrb />);
    canvas.flush(3);
    expect(canvas.pending()).toBe(1);
  });

  it("blends into a new state instead of jumping", () => {
    const canvas = installCanvas();
    const { rerender } = render(<MatrixOrb dots={5} size={100} state="thinking" />);
    canvas.flush(20);
    const before = canvas.radiusAt(50, 50);
    rerender(<MatrixOrb dots={5} size={100} state="listening" level={1} />);
    canvas.ctx.arc.mockClear();
    canvas.flush();
    const first = canvas.radiusAt(50, 50);
    canvas.flush(200);
    const settled = canvas.radiusAt(50, 50);
    // The centre dot is dim in the thinking field and fully lit in a full
    // bloom; one frame after the change it has moved only a little way.
    expect(settled).toBeGreaterThan(before + 3);
    expect(Math.abs(first - before)).toBeLessThan((settled - before) * 0.2);
  });

  it("blooms further with a higher level", () => {
    const canvas = installCanvas();
    const { rerender } = render(<MatrixOrb dots={5} size={100} state="listening" level={0} />);
    canvas.flush(120);
    const quiet = canvas.radiusAt(90, 50);
    rerender(<MatrixOrb dots={5} size={100} state="listening" level={1} />);
    canvas.flush(120);
    expect(canvas.radiusAt(90, 50)).toBeGreaterThan(quiet * 1.5);
  });

  it("follows its own envelope when listening without a level", () => {
    const canvas = installCanvas();
    render(<MatrixOrb dots={5} size={100} state="listening" />);
    const radii = new Set<number>();
    for (let index = 0; index < 30; index += 1) {
      canvas.flush(4, 32);
      radii.add(Math.round(canvas.radiusAt(70, 50) * 100));
    }
    expect(radii.size).toBeGreaterThan(5);
  });

  it("draws one still frame under reduced motion", () => {
    reduceMotion();
    const canvas = installCanvas();
    const { rerender } = render(<MatrixOrb dots={5} size={100} state="idle" />);
    canvas.flush();
    expect(canvas.ctx.arc).toHaveBeenCalledTimes(13);
    expect(canvas.pending()).toBe(0);
    const idle = canvas.radiusAt(50, 50);

    // A state change redraws once, straight into the new state.
    rerender(<MatrixOrb dots={5} size={100} state="thinking" />);
    expect(canvas.pending()).toBe(1);
    canvas.flush();
    expect(canvas.pending()).toBe(0);
    expect(canvas.radiusAt(50, 50)).not.toBe(idle);
  });

  it("stops at a --motion-scale of zero", () => {
    document.documentElement.style.setProperty("--motion-scale", "0");
    const canvas = installCanvas();
    render(<MatrixOrb />);
    canvas.flush();
    expect(canvas.pending()).toBe(0);
    document.documentElement.style.removeProperty("--motion-scale");
  });

  it("pauses while the tab is hidden and resumes when it returns", () => {
    const canvas = installCanvas();
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    render(<MatrixOrb />);
    expect(canvas.pending()).toBe(0);
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(canvas.pending()).toBe(1);
  });

  it("re-reads its colour when the theme changes", async () => {
    const canvas = installCanvas();
    const styles = vi.spyOn(window, "getComputedStyle");
    render(<MatrixOrb />);
    canvas.flush();
    const reads = styles.mock.calls.filter(([element]) => element instanceof HTMLCanvasElement);
    expect(reads).toHaveLength(1);
    document.documentElement.classList.add("dark");
    await Promise.resolve();
    canvas.flush();
    expect(
      styles.mock.calls.filter(([element]) => element instanceof HTMLCanvasElement),
    ).toHaveLength(2);
    document.documentElement.classList.remove("dark");
  });

  it("draws nothing, and does not fail, without a 2D context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("no canvas");
    });
    const raf = vi.spyOn(window, "requestAnimationFrame");
    render(<MatrixOrb />);
    expect(raf).not.toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "Idle" })).toBeInTheDocument();
  });

  it("stops its loop on unmount", () => {
    const canvas = installCanvas();
    const { unmount } = render(<MatrixOrb />);
    unmount();
    expect(canvas.cancel).toHaveBeenCalled();
    expect(canvas.pending()).toBe(0);
  });

  it("lets a consumer className win and forwards ref and props", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const ref = createRef<HTMLDivElement>();
    render(
      <MatrixOrb
        ref={ref}
        data-testid="orb"
        id="assistant"
        className="gap-1 text-foreground"
      />,
    );
    const orb = screen.getByTestId("orb");
    expect(ref.current).toBe(orb);
    expect(orb).toHaveAttribute("id", "assistant");
    expect(orb).toHaveClass("gap-1", "text-foreground");
    expect(orb).not.toHaveClass("gap-3");
    expect(orb).not.toHaveClass("text-primary");
  });

  it("has no accessibility violations", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container, rerender } = render(
      <MatrixOrb announce labels={{ idle: "Ready", listening: "Listening…" }} />,
    );
    await expectNoA11yViolations(container);
    rerender(
      <MatrixOrb
        announce
        labels={{ idle: "Ready", listening: "Listening…" }}
        state="listening"
      />,
    );
    await expectNoA11yViolations(container);
  });
});
