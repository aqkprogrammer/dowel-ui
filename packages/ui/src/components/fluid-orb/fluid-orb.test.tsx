import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FluidOrb } from "./fluid-orb";

/*
 * jsdom has no WebGL, no 2D context and a timer-driven rAF. `installGL`
 * records a WebGL context's calls, answers colour probes through a 2D context
 * that reads back one chosen pixel, and queues frames so a test can step them.
 */
interface GLOptions {
  noWebGL?: boolean;
  compiles?: boolean;
  links?: boolean;
  pixel?: [number, number, number, number];
}

function installGL({ noWebGL = false, compiles = true, links = true, pixel }: GLOptions = {}) {
  const loseContext = vi.fn(() => {
    gl.lost = true;
  });
  const gl = {
    lost: false,
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    COLOR_BUFFER_BIT: 8,
    TRIANGLE_STRIP: 9,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => compiles),
    getShaderInfoLog: vi.fn(() => "mock compile error"),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => links),
    deleteProgram: vi.fn(),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    viewport: vi.fn(),
    getUniformLocation: vi.fn((_program: unknown, name: string) => ({ name })),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    drawArrays: vi.fn(),
    isContextLost: vi.fn(() => gl.lost),
    getExtension: vi.fn((name: string) =>
      name === "WEBGL_lose_context" ? { loseContext } : null,
    ),
  };
  const ctx2d = {
    fillStyle: "",
    fillRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(pixel ?? [51, 102, 204, 255]) })),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) => {
    if (type === "2d") return ctx2d;
    if (type === "webgl") return noWebGL ? null : gl;
    return null;
  }) as never);

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
    gl,
    ctx2d,
    loseContext,
    cancel,
    pending: () => queue.length,
    flush(frames = 1, step = 16) {
      act(() => {
        for (let index = 0; index < frames; index += 1) {
          const run = queue;
          queue = [];
          if (run.length === 0) return;
          now += step;
          for (const callback of run) callback(now);
        }
      });
    },
    /** The last value written to a named uniform. */
    uniform(name: string) {
      const calls = [
        ...gl.uniform1f.mock.calls,
        ...gl.uniform3f.mock.calls,
        ...gl.uniform2f.mock.calls,
      ];
      const hit = (calls as [{ name: string }, ...number[]][])
        .reverse()
        .find(([location]) => location.name === name);
      return hit?.slice(1) as number[] | undefined;
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

function orb() {
  return document.querySelector<HTMLElement>('[data-slot="fluid-orb"]');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("FluidOrb", () => {
  it("renders a decorative orb with the CSS fallback showing", () => {
    installGL({ noWebGL: true });
    render(<FluidOrb />);
    const root = orb();
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).not.toHaveAttribute("role");
    expect(root).toHaveAttribute("data-renderer", "css");
    expect(root?.style.width).toBe("160px");
    expect(root?.style.height).toBe("160px");
    expect(root?.style.getPropertyValue("--fluid-orb-color")).toBe("var(--color-primary)");
    expect(root?.querySelector('[data-slot="fluid-orb-surface"]')).toBeInTheDocument();
  });

  it("becomes a named image when labelled", () => {
    installGL({ noWebGL: true });
    render(<FluidOrb aria-label="Assistant" />);
    const image = screen.getByRole("img", { name: "Assistant" });
    expect(image).not.toHaveAttribute("aria-hidden");
  });

  it("keeps the CSS orb, and no canvas, without WebGL", () => {
    const gl = installGL({ noWebGL: true });
    render(<FluidOrb />);
    expect(document.querySelector("canvas")).toBeNull();
    expect(gl.pending()).toBe(0);
    expect(orb()).toHaveAttribute("data-renderer", "css");
  });

  it("switches to WebGL once the first frame is drawn", () => {
    const gl = installGL();
    render(<FluidOrb />);
    const canvas = document.querySelector('[data-slot="fluid-orb-canvas"]');
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(orb()).toHaveAttribute("data-renderer", "css");
    gl.flush();
    expect(orb()).toHaveAttribute("data-renderer", "webgl");
    expect(gl.gl.drawArrays).toHaveBeenCalledWith(9, 0, 4);
  });

  it("derives the colour, the pale band and the crown from one resolved colour", () => {
    const gl = installGL({ pixel: [51, 102, 204, 255] });
    render(<FluidOrb color="var(--color-success)" />);
    gl.flush();
    expect(gl.ctx2d.fillStyle).not.toBe("");
    const [r, g, b] = gl.uniform("uColor") ?? [];
    expect([r, g, b]).toEqual([0.2, 0.4, 0.8]);
    const tint = gl.uniform("uTint") ?? [];
    expect(tint[0]).toBeCloseTo(0.2 + 0.8 * 0.5);
    expect(tint[2]).toBeCloseTo(0.8 + 0.2 * 0.5);
    const light = gl.uniform("uLight") ?? [];
    expect(light[0]).toBeCloseTo(1 - 0.8 * 0.05);
  });

  it("falls back to grey when the colour cannot be read", () => {
    const gl = installGL({ pixel: [0, 0, 0, 0] });
    render(<FluidOrb />);
    gl.flush();
    expect(gl.uniform("uColor")).toEqual([0.5, 0.5, 0.5]);
  });

  it("re-resolves the colour when it changes or the theme does", async () => {
    const gl = installGL();
    const { rerender } = render(<FluidOrb />);
    gl.flush();
    expect(gl.ctx2d.getImageData).toHaveBeenCalledTimes(1);
    rerender(<FluidOrb color="var(--color-info)" />);
    gl.flush();
    expect(gl.ctx2d.getImageData).toHaveBeenCalledTimes(2);
    document.documentElement.classList.add("dark");
    await Promise.resolve();
    gl.flush();
    expect(gl.ctx2d.getImageData).toHaveBeenCalledTimes(3);
    document.documentElement.classList.remove("dark");
  });

  it("sizes the backing store to the diameter at DPR, capped at 2", () => {
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(3);
    const gl = installGL();
    const { rerender } = render(<FluidOrb size={100} />);
    gl.flush();
    const canvas = document.querySelector("canvas");
    expect(canvas?.width).toBe(200);
    expect(gl.uniform("uRes")).toEqual([200, 200]);
    rerender(<FluidOrb size={50} />);
    gl.flush();
    expect(canvas?.width).toBe(100);
    expect(orb()?.style.width).toBe("50px");
  });

  it("keeps drifting, advancing its clock every frame", () => {
    const gl = installGL();
    render(<FluidOrb />);
    gl.flush(2);
    const early = gl.uniform("uTime")?.[0] ?? 0;
    gl.flush(10);
    expect(gl.uniform("uTime")?.[0]).toBeGreaterThan(early);
    expect(gl.pending()).toBe(1);
  });

  it("holds a still frame under reduced motion", () => {
    reduceMotion();
    const gl = installGL();
    render(<FluidOrb />);
    gl.flush();
    expect(gl.uniform("uTime")).toEqual([7.5]);
    expect(gl.pending()).toBe(0);
    expect(orb()).toHaveAttribute("data-renderer", "webgl");
  });

  it("pauses off screen and resumes in view", () => {
    let report: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          report = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const gl = installGL();
    render(<FluidOrb />);
    gl.flush();
    report(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    gl.flush();
    expect(gl.pending()).toBe(0);
    report([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(gl.pending()).toBe(1);
  });

  it("pauses while the tab is hidden", () => {
    const gl = installGL();
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    render(<FluidOrb />);
    expect(gl.pending()).toBe(0);
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(gl.pending()).toBe(1);
  });

  it("falls back to CSS when the shader does not compile", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const gl = installGL({ compiles: false });
    render(<FluidOrb />);
    expect(warn).toHaveBeenCalled();
    expect(gl.loseContext).toHaveBeenCalled();
    expect(document.querySelector("canvas")).toBeNull();
    expect(orb()).toHaveAttribute("data-renderer", "css");
  });

  it("falls back to CSS when the program does not link", () => {
    const gl = installGL({ links: false });
    render(<FluidOrb />);
    expect(gl.gl.deleteProgram).toHaveBeenCalled();
    expect(gl.loseContext).toHaveBeenCalled();
    expect(gl.pending()).toBe(0);
  });

  it("hands back to the CSS orb when the context is lost", () => {
    const gl = installGL();
    render(<FluidOrb />);
    gl.flush();
    expect(orb()).toHaveAttribute("data-renderer", "webgl");
    act(() => {
      document.querySelector("canvas")?.dispatchEvent(new Event("webglcontextlost"));
    });
    expect(orb()).toHaveAttribute("data-renderer", "css");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(gl.pending()).toBe(0);
  });

  it("releases the context and removes its canvas on unmount", () => {
    const gl = installGL();
    const { unmount } = render(<FluidOrb />);
    gl.flush();
    unmount();
    expect(gl.cancel).toHaveBeenCalled();
    expect(gl.gl.deleteProgram).toHaveBeenCalled();
    expect(gl.gl.deleteBuffer).toHaveBeenCalled();
    expect(gl.loseContext).toHaveBeenCalled();
    expect(document.querySelector("canvas")).toBeNull();
  });

  it("adds a glow behind the orb", () => {
    installGL({ noWebGL: true });
    const { rerender } = render(<FluidOrb />);
    expect(orb()?.className).not.toContain("before:blur-2xl");
    rerender(<FluidOrb glow />);
    expect(orb()?.className).toContain("before:blur-2xl");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    installGL({ noWebGL: true });
    const ref = createRef<HTMLDivElement>();
    render(
      <FluidOrb ref={ref} data-testid="orb" title="Ambient" className="block rounded-none" />,
    );
    const root = screen.getByTestId("orb");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("title", "Ambient");
    expect(root).toHaveClass("block", "rounded-none");
    expect(root).not.toHaveClass("inline-block");
    expect(root).not.toHaveClass("rounded-full");
  });

  it("has no accessibility violations", async () => {
    installGL({ noWebGL: true });
    const { container } = render(
      <div>
        <FluidOrb />
        <FluidOrb aria-label="Assistant" />
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
