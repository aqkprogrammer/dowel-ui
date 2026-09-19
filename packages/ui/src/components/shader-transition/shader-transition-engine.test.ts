import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildFragmentShader,
  clamp01,
  createProgram,
  createShaderRenderer,
  easeRun,
  markWebGLUnavailable,
  motionScale,
  prefersReducedMotion,
  resolveRgb,
  supportsWebGL,
  tokenToCss,
  VERTEX_SHADER,
} from "./shader-transition-engine";
import {
  getShaderTransitionPreset,
  SHADER_TRANSITION_PRESET_NAMES,
  SHADER_TRANSITION_PRESETS,
} from "./shader-transition-presets";
import { installWebGLMock, mockReducedMotion, type WebGLMock } from "./webgl-mock";

const colors = {
  surface: [1, 1, 1] as const,
  accent: [0.2, 0.3, 0.9] as const,
  accentSecondary: [0.6, 0.6, 0.9] as const,
};

let mock: WebGLMock | undefined;
afterEach(() => {
  mock?.restore();
  mock = undefined;
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty("--motion-scale");
});

describe("preset table", () => {
  it("covers all sixteen SmoothUI shader transitions besides the engine itself", () => {
    const sources = SHADER_TRANSITION_PRESET_NAMES.map(
      (name) => SHADER_TRANSITION_PRESETS[name].source,
    );
    expect(new Set(sources)).toEqual(
      new Set([
        "ApertureBlurTransition",
        "ChromaBlurTransition",
        "PrismSweepTransition",
        "SdfBlobTransition",
        "OrganicMergeTransition",
        "SdfCircleTransition",
        "WarpedCircleTransition",
        "RadialCirclesTransition",
        "ShaderRevealNoiseTransition",
        "ShaderRevealZoomTransition",
        "ShaderRevealCircleTransition",
        "ShaderRevealWipeTransition",
        "ShaderRevealLumaTransition",
        "ShaderRevealPlanetaryTransition",
        "ShaderRevealStripesTransition",
        "ShaderRevealPushTransition",
      ]),
    );
  });

  it("ports only SmoothUI's own designs; the Codrops-derived ones are original", () => {
    const ported = SHADER_TRANSITION_PRESET_NAMES.filter(
      (name) => SHADER_TRANSITION_PRESETS[name].origin === "ported",
    );
    expect(ported.sort()).toEqual(["aperture-blur", "chroma-blur", "prism-sweep"]);
  });

  it.each(SHADER_TRANSITION_PRESET_NAMES)("%s is well-formed data", (name) => {
    const preset = SHADER_TRANSITION_PRESETS[name];
    expect(preset.glsl).toMatch(/float field\(vec2 uv, vec2 p, float t\)/);
    expect(preset.glsl).toMatch(/float sheen\(vec2 uv, vec2 p, float t, float d\)/);
    expect(preset.duration).toBeGreaterThan(0);
    expect(preset.softness).toBeGreaterThan(0);
    expect(preset.softness).toBeLessThan(0.5);
    expect(preset.glow).toBeGreaterThanOrEqual(0);
    expect(preset.sheen).toBeGreaterThanOrEqual(0);
    expect(preset.description.length).toBeGreaterThan(10);
    // Colour is uniforms, never literals.
    expect(preset.glsl).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i);
  });

  it("returns a preset by name, and noise (with a warning) for an unknown one", () => {
    expect(getShaderTransitionPreset("wipe")).toBe(SHADER_TRANSITION_PRESETS.wipe);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getShaderTransitionPreset("nope")).toBe(SHADER_TRANSITION_PRESETS.noise);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"nope"'));
  });
});

describe("program building", () => {
  it("wraps a preset in the shared prelude and main", () => {
    const source = buildFragmentShader(SHADER_TRANSITION_PRESETS["sdf-circle"]);
    expect(source).toContain("precision mediump float;");
    expect(source).toContain("float fbm(vec2 q)");
    expect(source).toContain("return length(p) / rmax();");
    expect(source.indexOf("float field")).toBeLessThan(source.indexOf("void main()"));
    expect(VERTEX_SHADER).toContain("attribute vec2 aPos");
  });

  it("links the shared vertex shader with the fragment", () => {
    mock = installWebGLMock();
    const gl = mock.gl as unknown as WebGLRenderingContext;
    expect(createProgram(gl, "void main(){}")).not.toBeNull();
    expect(mock.gl.shaderSource).toHaveBeenCalledWith(expect.anything(), VERTEX_SHADER);
    expect(mock.gl.linkProgram).toHaveBeenCalledTimes(1);
  });

  it("returns null and warns when a shader does not compile", () => {
    mock = installWebGLMock({ compiles: false });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(createProgram(mock.gl as unknown as WebGLRenderingContext, "x")).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.any(String), "mock compile error");
    expect(mock.gl.deleteShader).toHaveBeenCalled();
  });

  it("returns null when the program does not link", () => {
    mock = installWebGLMock({ links: false });
    expect(createProgram(mock.gl as unknown as WebGLRenderingContext, "x")).toBeNull();
    expect(mock.gl.deleteProgram).toHaveBeenCalled();
  });
});

describe("renderer", () => {
  it("returns null without a WebGL context", () => {
    mock = installWebGLMock({ noWebGL: true });
    const canvas = document.createElement("canvas");
    expect(createShaderRenderer(canvas, SHADER_TRANSITION_PRESETS.wipe, { colors })).toBeNull();
  });

  it("returns null when getContext throws", () => {
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("blocked");
    });
    const canvas = document.createElement("canvas");
    expect(createShaderRenderer(canvas, SHADER_TRANSITION_PRESETS.wipe, { colors })).toBeNull();
    spy.mockRestore();
  });

  it("releases the context when the program does not build", () => {
    mock = installWebGLMock({ compiles: false });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const canvas = document.createElement("canvas");
    expect(createShaderRenderer(canvas, SHADER_TRANSITION_PRESETS.wipe, { colors })).toBeNull();
    expect(mock.loseContext).toHaveBeenCalled();
  });

  it("sets the preset's uniforms and colours once", () => {
    mock = installWebGLMock();
    const preset = SHADER_TRANSITION_PRESETS.zoom;
    const canvas = document.createElement("canvas");
    createShaderRenderer(canvas, preset, { colors, flip: true });
    const calls = (mock.gl.uniform1f?.mock.calls ?? []) as [{ name: string }, number][];
    const set1 = (name: string) => calls.find(([location]) => location.name === name)?.[1];
    expect(set1("uSoft")).toBe(preset.softness);
    expect(set1("uGlow")).toBe(preset.glow);
    expect(set1("uReverse")).toBe(1);
    expect(set1("uFlip")).toBe(1);
    expect(mock.gl.uniform3f).toHaveBeenCalledWith({ name: "uAccent" }, 0.2, 0.3, 0.9);
    expect(mock.gl.blendFunc).toHaveBeenCalledWith(9, 10);
  });

  it("sizes the backing store to the box with DPR capped at 2", () => {
    mock = installWebGLMock();
    vi.stubGlobal("devicePixelRatio", 3);
    const canvas = document.createElement("canvas");
    const renderer = createShaderRenderer(canvas, SHADER_TRANSITION_PRESETS.noise, { colors });
    renderer?.resize(100, 50);
    expect([canvas.width, canvas.height]).toEqual([200, 100]);
    expect(mock.gl.viewport).toHaveBeenLastCalledWith(0, 0, 200, 100);
    expect(mock.gl.uniform2f).toHaveBeenLastCalledWith({ name: "uRes" }, 200, 100);
    vi.unstubAllGlobals();
  });

  it("draws a clamped progress and the clock, and stops after destroy", () => {
    mock = installWebGLMock();
    const canvas = document.createElement("canvas");
    const renderer = createShaderRenderer(canvas, SHADER_TRANSITION_PRESETS.noise, { colors });
    renderer?.draw(1.4, 2.5);
    expect(mock.gl.uniform1f).toHaveBeenCalledWith({ name: "uProgress" }, 1);
    expect(mock.gl.uniform1f).toHaveBeenCalledWith({ name: "uTime" }, 2.5);
    expect(mock.gl.drawArrays).toHaveBeenCalledWith(12, 0, 4);

    renderer?.destroy();
    expect(mock.gl.deleteProgram).toHaveBeenCalled();
    expect(mock.gl.deleteBuffer).toHaveBeenCalled();
    expect(mock.loseContext).toHaveBeenCalledTimes(1);
    renderer?.destroy();
    renderer?.draw(0.5, 1);
    renderer?.resize(10, 10);
    expect(mock.gl.drawArrays).toHaveBeenCalledTimes(1);
    expect(mock.loseContext).toHaveBeenCalledTimes(1);
  });

  it("skips drawing, and GL deletes, once the context is lost", () => {
    mock = installWebGLMock();
    const canvas = document.createElement("canvas");
    const renderer = createShaderRenderer(canvas, SHADER_TRANSITION_PRESETS.noise, { colors });
    mock.gl.lost = true;
    renderer?.draw(0.3, 0);
    expect(mock.gl.drawArrays).not.toHaveBeenCalled();
    renderer?.destroy();
    expect(mock.gl.deleteProgram).not.toHaveBeenCalled();
  });
});

describe("colour", () => {
  it("maps token names to custom properties", () => {
    expect(tokenToCss("primary")).toBe("var(--color-primary)");
    expect(tokenToCss("--brand")).toBe("var(--brand)");
    expect(tokenToCss("transparent")).toBe("transparent");
    expect(tokenToCss("color-mix(in oklab, red, blue)")).toBe("color-mix(in oklab, red, blue)");
  });

  it("converts through a 2D canvas to 0–1 RGB", () => {
    mock = installWebGLMock({ pixel: [255, 0, 51, 255] });
    const el = document.createElement("div");
    document.body.append(el);
    expect(resolveRgb(el, "rgb(255, 0, 51)")).toEqual([1, 0, 0.2]);
    el.remove();
  });

  it("parses an sRGB serialisation when there is no 2D canvas", () => {
    mock = installWebGLMock({ no2d: true });
    const el = document.createElement("div");
    document.body.append(el);
    expect(resolveRgb(el, "rgb(0, 51, 255)")).toEqual([0, 0.2, 1]);
    el.remove();
  });

  it("falls back when the colour cannot be read", () => {
    mock = installWebGLMock({ no2d: true });
    const el = document.createElement("div");
    document.body.append(el);
    expect(resolveRgb(el, "primary", [0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3]);
    el.remove();
  });

  it("falls back when a transparent pixel comes back", () => {
    mock = installWebGLMock({ pixel: [0, 0, 0, 0] });
    const el = document.createElement("div");
    document.body.append(el);
    expect(resolveRgb(el, "primary")).toEqual([0.5, 0.5, 0.5]);
    el.remove();
  });
});

describe("timing and preferences", () => {
  it("eases the run symmetrically and clamps", () => {
    expect(easeRun(-1)).toBe(0);
    expect(easeRun(0.5)).toBeCloseTo(0.5);
    expect(easeRun(0.25)).toBeCloseTo(1 - easeRun(0.75));
    expect(easeRun(2)).toBe(1);
    expect(clamp01(-0.2)).toBe(0);
  });

  it("reads --motion-scale, defaulting to 1", () => {
    expect(motionScale()).toBe(1);
    document.documentElement.style.setProperty("--motion-scale", "0.5");
    expect(motionScale()).toBe(0.5);
  });

  it("treats the OS setting or a zero scale as reduced motion", () => {
    expect(prefersReducedMotion()).toBe(false);
    document.documentElement.style.setProperty("--motion-scale", "0");
    expect(prefersReducedMotion()).toBe(true);
    document.documentElement.style.removeProperty("--motion-scale");
    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("caches WebGL support and remembers a failure", () => {
    mock = installWebGLMock();
    expect(supportsWebGL()).toBe(true);
    markWebGLUnavailable();
    expect(supportsWebGL()).toBe(false);
  });
});
