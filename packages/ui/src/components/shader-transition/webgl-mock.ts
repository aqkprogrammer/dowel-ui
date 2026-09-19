/*
 * Test support for ShaderTransition — not shipped (absent from meta.files).
 *
 * jsdom has no WebGL, no 2D context and a timer-driven rAF. This installs a
 * recording WebGL context, a 1×1 2D context whose getImageData returns a
 * chosen colour, and a manual frame queue, so a test can step a run frame by
 * frame and assert what the engine did.
 */
import { vi } from "vitest";

import { resetColorCache, resetWebGLSupport } from "./shader-transition-engine";

export interface WebGLMockOptions {
  /** getContext("webgl") returns null. */
  noWebGL?: boolean;
  compiles?: boolean;
  links?: boolean;
  /** getContext("2d") returns null. */
  no2d?: boolean;
  /** RGBA bytes the 2D context reads back. */
  pixel?: [number, number, number, number];
}

export interface WebGLMock {
  gl: Record<string, ReturnType<typeof vi.fn>> & { lost: boolean };
  loseContext: ReturnType<typeof vi.fn>;
  /** Canvases a WebGL context was requested for. */
  canvases: HTMLCanvasElement[];
  /** Runs queued frames `step` ms apart. Returns how many ran. */
  flush: (frames?: number, step?: number) => number;
  pending: () => number;
  restore: () => void;
}

export function installWebGLMock(options: WebGLMockOptions = {}): WebGLMock {
  const { noWebGL = false, compiles = true, links = true, no2d = false } = options;
  const pixel = options.pixel ?? [51, 102, 204, 255];
  const loseContext = vi.fn(() => {
    gl.lost = true;
  });
  const canvases: HTMLCanvasElement[] = [];

  const constants = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    BLEND: 8,
    ONE: 9,
    ONE_MINUS_SRC_ALPHA: 10,
    COLOR_BUFFER_BIT: 11,
    TRIANGLE_STRIP: 12,
  };
  const methods = [
    "shaderSource",
    "compileShader",
    "deleteShader",
    "attachShader",
    "linkProgram",
    "deleteProgram",
    "useProgram",
    "bindBuffer",
    "bufferData",
    "enableVertexAttribArray",
    "vertexAttribPointer",
    "enable",
    "blendFunc",
    "clearColor",
    "viewport",
    "uniform1f",
    "uniform2f",
    "uniform3f",
    "clear",
    "drawArrays",
    "deleteBuffer",
  ];
  const gl = {
    ...constants,
    lost: false,
  } as unknown as WebGLMock["gl"];
  for (const method of methods) gl[method] = vi.fn();
  gl.createShader = vi.fn(() => ({}));
  gl.createProgram = vi.fn(() => ({}));
  gl.createBuffer = vi.fn(() => ({}));
  gl.getShaderParameter = vi.fn(() => compiles);
  gl.getShaderInfoLog = vi.fn(() => "mock compile error");
  gl.getProgramParameter = vi.fn(() => links);
  gl.getAttribLocation = vi.fn(() => 0);
  gl.getUniformLocation = vi.fn((_program: unknown, name: string) => ({ name }));
  gl.getExtension = vi.fn((name: string) =>
    name === "WEBGL_lose_context" ? { loseContext } : null,
  );
  gl.isContextLost = vi.fn(() => gl.lost);

  const ctx2d = {
    fillStyle: "",
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(pixel) })),
  };

  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(function (this: HTMLCanvasElement, type: string) {
      if (type === "2d") return (no2d ? null : ctx2d) as never;
      if (type === "webgl") {
        canvases.push(this);
        return (noWebGL ? null : gl) as never;
      }
      return null;
    } as never);

  const hadWebGL = "WebGLRenderingContext" in globalThis;
  if (!hadWebGL) {
    (globalThis as Record<string, unknown>).WebGLRenderingContext = class {};
  }
  resetWebGLSupport();
  resetColorCache();

  let queue: FrameRequestCallback[] = [];
  let now = 0;
  const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    queue.push(callback);
    return queue.length;
  });
  const caf = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    queue = [];
  });

  return {
    gl,
    loseContext,
    canvases,
    flush(frames = 1, step = 16) {
      let ran = 0;
      for (let index = 0; index < frames; index += 1) {
        const run = queue;
        queue = [];
        if (run.length === 0) break;
        now += step;
        for (const callback of run) callback(now);
        ran += 1;
      }
      return ran;
    },
    pending: () => queue.length,
    restore() {
      getContext.mockRestore();
      raf.mockRestore();
      caf.mockRestore();
      if (!hadWebGL) delete (globalThis as Record<string, unknown>).WebGLRenderingContext;
      resetWebGLSupport();
      resetColorCache();
    },
  };
}

/** Makes matchMedia report `(prefers-reduced-motion: reduce)` as matching. */
export function mockReducedMotion(matches: boolean) {
  return vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matches && query.includes("reduce"),
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
