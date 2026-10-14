import { act, render, screen } from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  installWebGLMock,
  mockReducedMotion,
  type WebGLMock,
} from "../shader-transition/webgl-mock";
import { ShaderBackground } from "./shader-background";
import {
  buildFragmentShader,
  resetColorCache,
  resolveRgb,
  tokenToCss,
} from "./shader-background-engine";
import {
  SHADER_BACKGROUND_PRESETS,
  SHADER_BACKGROUND_PRESET_NAMES,
} from "./shader-background-presets";

let gl: WebGLMock;

beforeEach(() => {
  gl = installWebGLMock();
  resetColorCache();
});

afterEach(() => {
  gl.restore();
  resetColorCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty("--motion-scale");
});

function frames(count: number) {
  act(() => {
    gl.flush(count, 50);
  });
}

/** The last value given to a named uniform. */
function uniform(name: string, method = "uniform1f"): unknown[] | undefined {
  const calls = gl.gl[method]?.mock.calls ?? [];
  const matching = calls.filter(([location]) => (location as { name: string }).name === name);
  return matching.at(-1)?.slice(1);
}

function times(): number[] {
  return (gl.gl.uniform1f?.mock.calls ?? [])
    .filter(([location]) => (location as { name: string }).name === "uTime")
    .map(([, value]) => value as number);
}

/** A controllable IntersectionObserver: `fire(visible)` reports every observed node. */
function stubIntersectionObserver() {
  const callbacks: IntersectionObserverCallback[] = [];
  class Observer {
    constructor(callback: IntersectionObserverCallback) {
      callbacks.push(callback);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", Observer);
  return (visible: boolean) => {
    act(() => {
      for (const callback of callbacks) {
        callback(
          [{ isIntersecting: visible } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      }
    });
  };
}

describe("ShaderBackground", () => {
  it("renders its children above an aria-hidden scene that ignores the pointer", async () => {
    const { container } = render(
      <ShaderBackground>
        <h2>Launch week</h2>
      </ShaderBackground>,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-slot", "shader-background");
    expect(root).toHaveAttribute("data-preset", "mesh-gradient");
    expect(root).toHaveClass("relative", "isolate", "overflow-hidden");
    expect(root?.className).toContain("[&>[data-slot=shader-background-scene]]:absolute");
    const scene = container.querySelector("[data-slot=shader-background-scene]");
    expect(scene).toHaveAttribute("aria-hidden", "true");
    expect(scene).toHaveClass("pointer-events-none", "inset-0", "forced-colors:hidden");
    const content = container.querySelector("[data-slot=shader-background-content]");
    expect(content).toHaveClass("relative", "z-10");
    expect(content).toContainElement(screen.getByRole("heading", { name: "Launch week" }));
    await expectNoA11yViolations(container);
  });

  it("builds the preset's scene into the program and keeps drawing while it moves", () => {
    render(<ShaderBackground preset="dunes" />);
    const fragment = gl.gl.shaderSource?.mock.calls.at(-1)?.[1] as string;
    expect(fragment).toContain("vec3 scene(vec2 uv, vec2 p, float t)");
    expect(fragment).toContain("duneH");
    expect(fragment).toContain("void main()");
    expect(gl.gl.drawArrays).not.toHaveBeenCalled();
    frames(6);
    expect(gl.gl.drawArrays).toHaveBeenCalledTimes(6);
    const drawn = times();
    expect(drawn[0]).toBe(SHADER_BACKGROUND_PRESETS.dunes.still);
    expect(drawn.at(-1)).toBeGreaterThan(drawn[0] ?? 0);
    expect(gl.pending()).toBe(1);
  });

  it("scales time by speed and the theme's motion scale", () => {
    document.documentElement.style.setProperty("--motion-scale", "2");
    render(<ShaderBackground preset="warp" speed={4} />);
    frames(2);
    const [first, second] = times();
    // 50 ms frames, ×4 speed, ÷2 motion scale.
    expect((second ?? 0) - (first ?? 0)).toBeCloseTo(0.1);
  });

  it("resolves the palette through the theme, keeping the preset's colours where none are given", () => {
    render(<ShaderBackground preset="helix" colors={["primary"]} />);
    expect(uniform("uC0", "uniform3f")).toEqual([0.2, 0.4, 0.8]);
    expect(gl.gl.uniform3f?.mock.calls.length).toBeGreaterThanOrEqual(4);
    const style = document.querySelector<HTMLElement>(
      "[data-slot=shader-background-scene]",
    )?.style;
    expect(style?.backgroundColor).toBe("var(--color-primary)");
    // The preset's second colour, #38bdf8, as the browser serialises it.
    expect(style?.backgroundImage).toContain("rgb(56, 189, 248)");
  });

  it("sets the shared look, clamped, and updates it without rebuilding", () => {
    const { rerender } = render(<ShaderBackground grain={3} vignette={-1} scale={1.5} />);
    expect(uniform("uGrain")).toEqual([1]);
    expect(uniform("uVignette")).toEqual([0]);
    expect(uniform("uScale")).toEqual([1.5]);
    rerender(<ShaderBackground grain={0.5} vignette={0.5} scale={0} />);
    expect(uniform("uGrain")).toEqual([0.5]);
    expect(uniform("uScale")).toEqual([1]);
    expect(gl.gl.createProgram).toHaveBeenCalledTimes(1);
  });

  it("draws one still frame under reduced motion, and none after", () => {
    mockReducedMotion(true);
    render(<ShaderBackground preset="nebula" />);
    frames(5);
    expect(gl.gl.drawArrays).toHaveBeenCalledTimes(1);
    expect(times()).toEqual([SHADER_BACKGROUND_PRESETS.nebula.still]);
    expect(gl.pending()).toBe(0);
  });

  it("holds the still frame at speed 0, and at a motion scale of 0", () => {
    const { unmount } = render(<ShaderBackground preset="silk" speed={0} />);
    frames(3);
    expect(times()).toEqual([SHADER_BACKGROUND_PRESETS.silk.still]);
    unmount();
    gl.gl.uniform1f?.mockClear();
    document.documentElement.style.setProperty("--motion-scale", "0");
    render(<ShaderBackground preset="silk" />);
    frames(3);
    expect(times()).toEqual([SHADER_BACKGROUND_PRESETS.silk.still]);
  });

  it("shows the CSS fallback when WebGL is unavailable", () => {
    gl.restore();
    gl = installWebGLMock({ noWebGL: true });
    const { container } = render(<ShaderBackground />);
    expect(container.firstElementChild).toHaveAttribute("data-fallback", "true");
    expect(container.querySelector("canvas")).toHaveClass("hidden");
  });

  it("shows the CSS fallback when the program does not compile", () => {
    gl.restore();
    gl = installWebGLMock({ compiles: false });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<ShaderBackground />);
    expect(container.firstElementChild).toHaveAttribute("data-fallback", "true");
    expect(gl.loseContext).toHaveBeenCalled();
  });

  it("stops drawing off-screen and while the tab is hidden, and resumes after", () => {
    const fire = stubIntersectionObserver();
    render(<ShaderBackground />);
    frames(1);
    fire(false);
    gl.flush(1);
    expect(gl.pending()).toBe(0);
    fire(true);
    expect(gl.pending()).toBe(1);

    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    gl.flush(1);
    expect(gl.pending()).toBe(0);
    hidden.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(gl.pending()).toBe(1);
  });

  it("falls back on a lost context and rebuilds when it is restored", () => {
    const { container } = render(<ShaderBackground />);
    const canvas = container.querySelector("canvas");
    if (!canvas) throw new Error("no canvas");
    const lost = new Event("webglcontextlost", { cancelable: true });
    act(() => {
      canvas.dispatchEvent(lost);
    });
    expect(lost.defaultPrevented).toBe(true);
    expect(container.firstElementChild).toHaveAttribute("data-fallback", "true");
    act(() => {
      canvas.dispatchEvent(new Event("webglcontextrestored"));
    });
    expect(container.firstElementChild).not.toHaveAttribute("data-fallback");
    expect(gl.gl.createProgram).toHaveBeenCalledTimes(2);
  });

  it("rebuilds for a new preset and releases the context once the canvas has gone", async () => {
    const { container, rerender, unmount } = render(<ShaderBackground preset="hills" />);
    const first = container.querySelector("canvas");
    rerender(<ShaderBackground preset="petals" />);
    expect(container.querySelector("canvas")).not.toBe(first);
    expect(gl.gl.createProgram).toHaveBeenCalledTimes(2);
    expect(gl.gl.deleteProgram).toHaveBeenCalledTimes(1);
    unmount();
    expect(gl.gl.deleteProgram).toHaveBeenCalledTimes(2);
    expect(gl.loseContext).not.toHaveBeenCalled();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    // Both canvases have left the document, so both contexts are released.
    expect(gl.loseContext).toHaveBeenCalled();
  });

  it("keeps the context for a remount on the same canvas", async () => {
    const { container } = render(
      <StrictMode>
        <ShaderBackground />
      </StrictMode>,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(gl.loseContext).not.toHaveBeenCalled();
    expect(container.firstElementChild).not.toHaveAttribute("data-fallback");
  });

  it("pins the scene to the viewport without clipping the page", () => {
    const { container } = render(
      <ShaderBackground attach="viewport">
        <header className="sticky top-0">Nav</header>
      </ShaderBackground>,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-attach", "viewport");
    expect(root).not.toHaveClass("overflow-hidden");
    expect(root?.className).toContain("[&>[data-slot=shader-background-scene]]:fixed");
    expect(root?.className).not.toContain("scene]]:absolute");
  });

  it("applies the fade variants, forwards refs and spreads props", () => {
    const ref = createRef<HTMLDivElement>();
    const { container, rerender } = render(
      <ShaderBackground ref={ref} fade="edges" id="hero" className="isolation-auto" />,
    );
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("id", "hero");
    expect(root?.className).toContain("mask-image:radial-gradient");
    expect(root).toHaveClass("isolation-auto");
    expect(root).not.toHaveClass("isolate");
    rerender(<ShaderBackground fade="bottom" />);
    expect(root?.className).toContain("mask-image:linear-gradient(to_bottom");
    const callback = vi.fn();
    rerender(<ShaderBackground ref={callback} />);
    expect(callback).toHaveBeenCalledWith(root);
  });
});

describe("shader-background presets", () => {
  it.each(SHADER_BACKGROUND_PRESET_NAMES)("%s is a complete scene", (name) => {
    const spec = SHADER_BACKGROUND_PRESETS[name];
    expect(spec.title).not.toBe("");
    expect(spec.description).toMatch(/\.$/);
    expect(spec.colors).toHaveLength(4);
    expect(spec.glsl).toContain("vec3 scene(vec2 uv, vec2 p, float t)");
    // GLSL ES 1.0 needs constant loop bounds; a `for` over a uniform would not compile on WebGL 1.
    expect(spec.glsl).not.toMatch(/for \(int \w+ = 0; \w+ < u/);
    const source = buildFragmentShader(spec);
    expect(source.indexOf("vec3 scene(")).toBeLessThan(source.indexOf("void main()"));
  });

  it("covers every category", () => {
    const categories = new Set(Object.values(SHADER_BACKGROUND_PRESETS).map((p) => p.category));
    expect([...categories].sort()).toEqual([
      "abstract",
      "cosmic",
      "floral",
      "landscape",
      "particles",
      "science",
    ]);
  });
});

describe("shader-background colour", () => {
  it("maps tokens to custom properties and leaves CSS colours alone", () => {
    expect(tokenToCss("primary")).toBe("var(--color-primary)");
    expect(tokenToCss("--brand")).toBe("var(--brand)");
    expect(tokenToCss("#ff00aa")).toBe("#ff00aa");
    expect(tokenToCss("oklch(0.7 0.1 200)")).toBe("oklch(0.7 0.1 200)");
    expect(tokenToCss("transparent")).toBe("transparent");
  });

  it("reads channels from an sRGB serialisation when there is no 2D canvas", () => {
    gl.restore();
    gl = installWebGLMock({ no2d: true });
    resetColorCache();
    expect(resolveRgb(document.body, "rgb(255, 0, 51)")).toEqual([1, 0, 0.2]);
    expect(resolveRgb(document.body, "var(--nothing)", [0.1, 0.2, 0.3])).toEqual([
      0.1, 0.2, 0.3,
    ]);
  });
});
