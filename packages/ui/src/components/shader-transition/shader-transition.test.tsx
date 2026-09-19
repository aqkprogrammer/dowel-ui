import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ShaderTransition, type ShaderTransitionProps } from "./shader-transition";
import { installWebGLMock, mockReducedMotion, type WebGLMock } from "./webgl-mock";

const FROM = (
  <div>
    <h2>Draft</h2>
    <button type="button">Edit draft</button>
  </div>
);
const TO = (
  <div>
    <h2>Published</h2>
    <button type="button">View live</button>
  </div>
);

function Harness(props: Partial<ShaderTransitionProps> & { extra?: ReactNode }) {
  const [active, setActive] = useState(false);
  return (
    <>
      <ShaderTransition
        data-testid="frame"
        from={FROM}
        to={TO}
        active={active}
        duration={1000}
        {...props}
      />
      <button
        type="button"
        onClick={() => {
          setActive((value) => !value);
        }}
      >
        Toggle
      </button>
    </>
  );
}

const frame = () => screen.getByTestId("frame");
const layer = (state: string) =>
  frame().querySelector(`[data-slot="shader-transition-layer"][data-state="${state}"]`);

let gl: WebGLMock;
beforeEach(() => {
  gl = installWebGLMock();
});
afterEach(() => {
  gl.restore();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty("--motion-scale");
});

/** Frames 50 ms apart; a 1000 ms run needs ~21 (deltas clamp at 66 ms). */
function frames(count: number) {
  act(() => {
    gl.flush(count, 50);
  });
}

async function toggle() {
  await userEvent.setup().click(screen.getByRole("button", { name: "Toggle" }));
}

describe("ShaderTransition", () => {
  it("renders the from state at rest, with no canvas and no context", () => {
    render(<Harness />);
    expect(frame()).toHaveAttribute("data-state", "idle");
    expect(frame()).toHaveAttribute("data-slot", "shader-transition");
    expect(screen.getByRole("heading", { name: "Draft" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Published" })).toBeNull();
    expect(frame().querySelector("canvas")).toBeNull();
    expect(gl.canvases).toHaveLength(0);
  });

  it("runs idle → running (cover → reveal) → done", async () => {
    const onStart = vi.fn();
    const onSwap = vi.fn();
    const onRest = vi.fn();
    render(<Harness preset="wipe" onStart={onStart} onSwap={onSwap} onRest={onRest} />);
    await toggle();

    expect(frame()).toHaveAttribute("data-state", "running");
    expect(frame()).toHaveAttribute("data-mode", "shader");
    expect(frame()).toHaveAttribute("data-phase", "cover");
    expect(frame()).toHaveAttribute("aria-busy", "true");
    expect(onStart).toHaveBeenCalledTimes(1);
    const canvas = frame().querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas?.closest('[data-slot="shader-transition-overlay"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    frames(12);
    expect(frame()).toHaveAttribute("data-phase", "reveal");
    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(onRest).not.toHaveBeenCalled();
    expect(gl.gl.drawArrays).toHaveBeenCalled();

    frames(20);
    expect(frame()).toHaveAttribute("data-state", "done");
    expect(frame()).not.toHaveAttribute("aria-busy");
    expect(layer("leaving")).toBeNull();
    expect(layer("current")).toHaveTextContent("Published");
    expect(frame().querySelector("canvas")).toBeNull();
    expect(gl.loseContext).toHaveBeenCalledTimes(1);
    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(onRest).toHaveBeenCalledTimes(1);
  });

  it("makes the outgoing state inert and hidden while it leaves, and exposes the incoming one", async () => {
    render(<Harness />);
    await toggle();
    const leaving = layer("leaving");
    expect(leaving).toHaveAttribute("aria-hidden", "true");
    expect(leaving).toHaveAttribute("inert");
    expect(leaving).toHaveTextContent("Draft");
    expect(screen.queryByRole("button", { name: "Edit draft" })).toBeNull();
    expect(screen.getByRole("button", { name: "View live" })).toBeInTheDocument();
    await expectNoA11yViolations(document.body);
  });

  it("moves focus out of the outgoing state", () => {
    const { rerender } = render(<ShaderTransition data-testid="frame" from={FROM} to={TO} />);
    screen.getByRole("button", { name: "Edit draft" }).focus();
    rerender(<ShaderTransition data-testid="frame" from={FROM} to={TO} active />);
    expect(layer("entering")).toHaveFocus();
  });

  it("passes axe at rest", async () => {
    const { container } = render(<Harness />);
    await expectNoA11yViolations(container);
  });

  it("supports the keyed API", () => {
    const { rerender } = render(
      <ShaderTransition data-testid="frame" transitionKey="a" duration={1000}>
        Step A
      </ShaderTransition>,
    );
    rerender(
      <ShaderTransition data-testid="frame" transitionKey="b" duration={1000}>
        Step B
      </ShaderTransition>,
    );
    expect(layer("leaving")).toHaveTextContent("Step A");
    expect(layer("entering")).toHaveTextContent("Step B");
    frames(40);
    expect(frame()).toHaveTextContent("Step B");
    expect(frame()).not.toHaveTextContent("Step A");
  });

  it("updates the shown content in place when the key does not change", () => {
    const { rerender } = render(
      <ShaderTransition data-testid="frame" transitionKey="a">
        One
      </ShaderTransition>,
    );
    rerender(
      <ShaderTransition data-testid="frame" transitionKey="a">
        Two
      </ShaderTransition>,
    );
    expect(frame()).toHaveAttribute("data-state", "idle");
    expect(frame()).toHaveTextContent("Two");
  });

  it("retargets under the cover, and cancels when sent back", () => {
    const onRest = vi.fn();
    const view = (key: string) => (
      <ShaderTransition data-testid="frame" transitionKey={key} onRest={onRest}>
        {key}
      </ShaderTransition>
    );
    const { rerender } = render(view("a"));
    rerender(view("b"));
    rerender(view("c"));
    expect(layer("leaving")).toHaveTextContent("a");
    expect(layer("entering")).toHaveTextContent("c");
    rerender(view("a"));
    expect(frame()).toHaveAttribute("data-state", "done");
    expect(layer("leaving")).toBeNull();
    expect(onRest).toHaveBeenCalledTimes(1);
  });

  it("starts a new run from the incoming state when changed during the reveal", () => {
    const view = (key: string) => (
      <ShaderTransition data-testid="frame" transitionKey={key} duration={1000}>
        {key}
      </ShaderTransition>
    );
    const { rerender } = render(view("a"));
    rerender(view("b"));
    frames(12);
    expect(frame()).toHaveAttribute("data-phase", "reveal");
    rerender(view("c"));
    expect(frame()).toHaveAttribute("data-phase", "cover");
    expect(layer("leaving")).toHaveTextContent("b");
    expect(gl.canvases).toHaveLength(2);
  });

  it("swaps instantly under reduced motion", async () => {
    mockReducedMotion(true);
    const onRest = vi.fn();
    render(<Harness onRest={onRest} />);
    await toggle();
    expect(frame()).toHaveAttribute("data-state", "done");
    expect(layer("leaving")).toBeNull();
    expect(screen.getByRole("heading", { name: "Published" })).toBeInTheDocument();
    expect(gl.canvases).toHaveLength(0);
    expect(onRest).toHaveBeenCalledTimes(1);
  });

  it("swaps instantly when --motion-scale is 0", async () => {
    document.documentElement.style.setProperty("--motion-scale", "0");
    render(<Harness />);
    await toggle();
    expect(frame()).toHaveAttribute("data-state", "done");
  });

  it("scales the run by --motion-scale", async () => {
    document.documentElement.style.setProperty("--motion-scale", "2");
    render(<Harness />);
    await toggle();
    frames(25);
    expect(frame()).toHaveAttribute("data-state", "running");
    frames(20);
    expect(frame()).toHaveAttribute("data-state", "done");
  });

  it("cross-fades without WebGL", () => {
    gl.restore();
    gl = installWebGLMock({ noWebGL: true });
    vi.useFakeTimers();
    const onRest = vi.fn();
    render(<Harness onRest={onRest} />);
    act(() => {
      screen.getByRole("button", { name: "Toggle" }).click();
    });
    expect(frame()).toHaveAttribute("data-mode", "fade");
    expect(frame()).not.toHaveAttribute("data-phase");
    expect(frame().querySelector("canvas")).toBeNull();
    expect(frame().style.getPropertyValue("--shader-transition-fade")).toBe(
      "calc(500ms * var(--motion-scale, 1))",
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(frame()).toHaveAttribute("data-state", "done");
    expect(onRest).toHaveBeenCalledTimes(1);

    // The failure is remembered: the next run skips WebGL entirely.
    act(() => {
      screen.getByRole("button", { name: "Toggle" }).click();
    });
    expect(frame()).toHaveAttribute("data-mode", "fade");
    expect(new Set(gl.canvases).size).toBe(1);
  });

  it("cross-fades when the shader does not build", async () => {
    gl.restore();
    gl = installWebGLMock({ compiles: false });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Harness />);
    await toggle();
    expect(frame()).toHaveAttribute("data-mode", "fade");
  });

  it("finishes as a cross-fade when the context is lost mid-run", async () => {
    render(<Harness />);
    await toggle();
    frames(4);
    const canvas = frame().querySelector("canvas");
    const event = new Event("webglcontextlost", { cancelable: true });
    act(() => {
      canvas?.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(frame()).toHaveAttribute("data-mode", "fade");
    expect(frame().querySelector("canvas")).toBeNull();
  });

  it("skips the run when the frame is off-screen", async () => {
    const observers: IntersectionObserverCallback[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<Harness />);
    act(() => {
      observers[0]?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as never);
    });
    await toggle();
    expect(frame()).toHaveAttribute("data-state", "done");

    act(() => {
      observers[0]?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as never);
    });
    await toggle();
    expect(frame()).toHaveAttribute("data-state", "running");
    act(() => {
      observers[0]?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as never);
    });
    frames(1);
    expect(frame()).toHaveAttribute("data-state", "done");
    vi.unstubAllGlobals();
  });

  it("resizes with the frame and resumes after a hidden tab without jumping", async () => {
    const resizers: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resizers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<Harness />);
    await toggle();
    act(() => {
      resizers.at(-1)?.(
        [{ contentRect: { width: 300, height: 150 } } as ResizeObserverEntry],
        {} as never,
      );
    });
    expect(gl.gl.viewport).toHaveBeenLastCalledWith(0, 0, 300, 150);
    frames(3);
    document.dispatchEvent(new Event("visibilitychange"));
    act(() => {
      gl.flush(1, 5000);
    });
    expect(frame()).toHaveAttribute("data-phase", "cover");
    vi.unstubAllGlobals();
  });

  it("resolves colours from tokens and mirrors the field in RTL", async () => {
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <Harness accentSecondary="ring" surface="card" />
      </div>,
    );
    await toggle();
    expect(gl.gl.uniform1f).toHaveBeenCalledWith({ name: "uFlip" }, 1);
    expect(gl.gl.uniform3f).toHaveBeenCalledWith({ name: "uAccent2" }, 0.2, 0.4, 0.8);
  });

  it("cleans up on unmount mid-run", async () => {
    const { unmount } = render(<Harness />);
    await toggle();
    frames(2);
    unmount();
    expect(gl.loseContext).toHaveBeenCalledTimes(1);
    expect(gl.pending()).toBe(0);
  });

  it("merges className so the consumer wins, forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ShaderTransition
        ref={ref}
        data-testid="frame"
        className="overflow-visible"
        aria-label="Report status"
        role="region"
        from={FROM}
        to={TO}
      />,
    );
    expect(frame()).toHaveClass("overflow-visible");
    expect(frame()).not.toHaveClass("overflow-hidden");
    expect(ref.current).toBe(frame());
    expect(screen.getByRole("region", { name: "Report status" })).toBe(frame());
  });

  it("supports a callback ref", () => {
    const ref = vi.fn();
    render(<ShaderTransition ref={ref} from={FROM} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });
});
