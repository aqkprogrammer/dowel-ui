// Ported from SmoothUI "Shader Reveal Transition" engine (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.

import type { ShaderTransitionPreset } from "./shader-transition-presets";

/*
 * The GL half of ShaderTransition: no React. What is taken from SmoothUI is the
 * engine's shape — one full-frame quad, a fragment shader driven by a single
 * `progress` uniform, premultiplied-alpha blending over the DOM, and a content
 * swap at the midpoint. The fragment program itself is written here: SmoothUI's
 * own fragment code for the shader-reveal and SDF families is not used (see
 * shader-transition-presets.ts for why).
 *
 * The model. The canvas never shows content — it paints a *cover* in the
 * surface colour. For the first half of the run the cover grows over the
 * outgoing state along the preset's arrival field; at the midpoint the whole
 * frame is covered and the states swap underneath; for the second half the
 * cover recedes along the same field (or its reverse) and uncovers the incoming
 * state. A preset is therefore just a scalar field `field(uv, p, t) → [0, 1]`,
 * "when is this pixel covered", plus a `sheen` term that tints the cover with
 * the secondary accent and a glow on the moving front in the primary accent.
 *
 * Trade-off, documented because it is the whole design: a true per-pixel
 * cross-reveal (old and new state both visible through a mask) needs the canvas
 * to mask DOM, and the only portable route is `mask-image` fed from
 * `canvas.toDataURL()` every frame — a PNG encode per frame, far too slow at
 * frame size. Painting a cover keeps both states as live, accessible DOM at the
 * cost of never showing old and new pixels side by side.
 */

export type Rgb = readonly [number, number, number];

export interface ShaderColors {
  /** The cover: the colour behind the content. */
  surface: Rgb;
  /** Glow on the moving front. */
  accent: Rgb;
  /** Tint mixed into the cover by the preset's sheen. */
  accentSecondary: Rgb;
}

export interface ShaderRenderer {
  /** Draws one frame. `progress` runs 0 → 1 across the whole run. */
  draw: (progress: number, time: number) => void;
  /** Resizes the backing store to a CSS box, DPR capped at 2. */
  resize: (width: number, height: number) => void;
  /** Frees the program, buffer and — where the browser allows — the context. */
  destroy: () => void;
}

export const MAX_DPR = 2;

/** Shared by every preset. Varyings are unnecessary: the fragment reads gl_FragCoord. */
export const VERTEX_SHADER =
  "attribute vec2 aPos;\nvoid main(){ gl_Position = vec4(aPos, 0.0, 1.0); }\n";

/** Helpers every preset's GLSL may call: value noise, fbm, a soft minimum. */
const PRELUDE = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uProgress;
uniform float uSoft;
uniform float uGlow;
uniform float uSheen;
uniform float uReverse;
uniform float uFlip;
uniform vec3 uSurface;
uniform vec3 uAccent;
uniform vec3 uAccent2;
#define PI 3.14159265359
#define TAU 6.28318530718
float hash21(vec2 q){ q = fract(q * vec2(233.34, 851.73)); q += dot(q, q + 23.45); return fract(q.x * q.y); }
float vnoise(vec2 q){
  vec2 i = floor(q); vec2 f = fract(q);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 q){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(q); q = q * 2.07 + vec2(11.3, 7.9); a *= 0.5; }
  return v;
}
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float rmax(){ return length(vec2(uRes.x / uRes.y, 1.0) * 0.5); }
float tri(float x){ return abs(fract(x) * 2.0 - 1.0); }
`;

const MAIN = `
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.x = mix(uv.x, 1.0 - uv.x, uFlip);
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float f = clamp(field(uv, p, uTime), 0.0, 1.0);
  bool covering = uProgress < 0.5;
  float q = covering ? uProgress * 2.0 : uProgress * 2.0 - 1.0;
  float x = q * (1.0 + uSoft);
  float g = covering ? f : mix(f, 1.0 - f, uReverse);
  float c = covering ? 1.0 - smoothstep(x - uSoft, x, g) : smoothstep(x - uSoft, x, g);
  float d = g - x;
  float w = uSoft * 0.5 + 0.004;
  float edge = exp(-(d * d) / (w * w)) * smoothstep(0.0, 0.06, q) * smoothstep(1.0, 0.94, q);
  float glow = clamp(edge * uGlow, 0.0, 0.92);
  float tint = clamp(sheen(uv, p, uTime, d) * uSheen, 0.0, 1.0);
  vec3 base = mix(uSurface, uAccent2, tint);
  float cover = c * (1.0 - glow);
  gl_FragColor = vec4(base * cover + uAccent * glow, cover + glow);
}
`;

/** The complete fragment program for one preset. */
export function buildFragmentShader(preset: Pick<ShaderTransitionPreset, "glsl">): string {
  return `${PRELUDE}\n${preset.glsl}\n${MAIN}`;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ShaderTransition] shader failed to compile:", gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Compiles and links the shared vertex shader with a fragment source. */
export function createProgram(
  gl: WebGLRenderingContext,
  fragmentSource: string,
): WebGLProgram | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = vertex ? compile(gl, gl.FRAGMENT_SHADER, fragmentSource) : null;
  const program = vertex && fragment ? gl.createProgram() : null;
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

const UNIFORMS = [
  "uRes",
  "uTime",
  "uProgress",
  "uSoft",
  "uGlow",
  "uSheen",
  "uReverse",
  "uFlip",
  "uSurface",
  "uAccent",
  "uAccent2",
] as const;

export interface RendererOptions {
  colors: ShaderColors;
  /** Mirror the field horizontally, so sweeps travel toward inline-end in RTL. */
  flip?: boolean;
}

/**
 * Creates a context and program on `canvas` for one preset. Returns null when
 * WebGL is unavailable or the program does not build — the caller falls back
 * to a CSS cross-fade.
 */
export function createShaderRenderer(
  canvas: HTMLCanvasElement,
  preset: ShaderTransitionPreset,
  { colors, flip = false }: RendererOptions,
): ShaderRenderer | null {
  const context = getWebGL(canvas);
  if (!context) return null;

  const program = createProgram(context, buildFragmentShader(preset));
  if (!program) {
    loseContext(context);
    return null;
  }

  const buffer = context.createBuffer();
  context.useProgram(program);
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  context.bufferData(context.ARRAY_BUFFER, QUAD, context.STATIC_DRAW);
  const position = context.getAttribLocation(program, "aPos");
  context.enableVertexAttribArray(position);
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
  context.enable(context.BLEND);
  context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA);
  context.clearColor(0, 0, 0, 0);

  const loc = Object.fromEntries(
    UNIFORMS.map((name) => [name, context.getUniformLocation(program, name)]),
  ) as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

  context.uniform1f(loc.uSoft, preset.softness);
  context.uniform1f(loc.uGlow, preset.glow);
  context.uniform1f(loc.uSheen, preset.sheen);
  context.uniform1f(loc.uReverse, preset.reverse ? 1 : 0);
  context.uniform1f(loc.uFlip, flip ? 1 : 0);
  context.uniform3f(loc.uSurface, ...colors.surface);
  context.uniform3f(loc.uAccent, ...colors.accent);
  context.uniform3f(loc.uAccent2, ...colors.accentSecondary);

  let destroyed = false;

  return {
    resize(width, height) {
      if (destroyed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(width * dpr));
      const h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      context.viewport(0, 0, w, h);
      context.uniform2f(loc.uRes, w, h);
    },
    draw(progress, time) {
      if (destroyed || context.isContextLost()) return;
      context.clear(context.COLOR_BUFFER_BIT);
      context.uniform1f(loc.uProgress, clamp01(progress));
      context.uniform1f(loc.uTime, time);
      context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (!context.isContextLost()) {
        context.deleteBuffer(buffer);
        context.deleteProgram(program);
      }
      loseContext(context);
    },
  };
}

function getWebGL(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  try {
    return canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });
  } catch {
    return null;
  }
}

/** Releases the context now rather than whenever the canvas is collected. */
function loseContext(gl: WebGLRenderingContext) {
  gl.getExtension("WEBGL_lose_context")?.loseContext();
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Symmetric ease for the whole run: slow in, fast through the swap, slow out. */
export function easeRun(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/* Colour ------------------------------------------------------------------ */

/** `"primary"` → `var(--color-primary)`; `--x` → `var(--x)`; anything else as is. */
export function tokenToCss(token: string): string {
  if (token.startsWith("--")) return `var(${token})`;
  if (/^[a-z][a-z0-9-]*$/.test(token) && token !== "transparent" && token !== "currentcolor") {
    return `var(--color-${token})`;
  }
  return token;
}

let scratch: CanvasRenderingContext2D | null | undefined;

/**
 * Resolves a colour token, as seen from `element`, to linear 0–1 RGB for a
 * uniform. The browser resolves the token (so a scoped theme, nested var() and
 * color-mix() all work) and a 1×1 2D canvas converts whatever colour space it
 * came back in — oklch included — to sRGB bytes.
 */
export function resolveRgb(
  element: Element,
  token: string,
  fallback: Rgb = [0.5, 0.5, 0.5],
): Rgb {
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  if (!view) return fallback;
  const probe = doc.createElement("span");
  probe.style.display = "none";
  probe.style.color = tokenToCss(token);
  (element.parentElement ?? doc.body).appendChild(probe);
  const computed = view.getComputedStyle(probe).color;
  probe.remove();
  if (!computed) return fallback;

  if (scratch === undefined) {
    try {
      const canvas = doc.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      scratch = canvas.getContext("2d", { willReadFrequently: true });
    } catch {
      scratch = null;
    }
  }
  if (scratch) {
    scratch.clearRect(0, 0, 1, 1);
    scratch.fillStyle = computed;
    scratch.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = scratch.getImageData(0, 0, 1, 1).data;
    if (a > 0) return [r / 255, g / 255, b / 255];
  }
  // No 2D canvas: read the channels from an sRGB serialisation, if that is what came back.
  if (computed.startsWith("rgb")) {
    const [r, g, b] = (computed.match(/[\d.]+/g) ?? []).map(Number);
    if (r !== undefined && g !== undefined && b !== undefined)
      return [r / 255, g / 255, b / 255];
  }
  return fallback;
}

/** Test hook: forget the cached 2D context. */
export function resetColorCache() {
  scratch = undefined;
}

/* Motion preferences ------------------------------------------------------ */

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** The theme's `--motion-scale` (1 when unset). 0 means motion is off. */
export function motionScale(element?: Element): number {
  if (typeof window === "undefined") return 1;
  const raw = window
    .getComputedStyle(element ?? document.documentElement)
    .getPropertyValue("--motion-scale");
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? Math.max(0, value) : 1;
}

/** OS reduced-motion preference, or the theme's scale turned (nearly) to zero. */
export function prefersReducedMotion(element?: Element): boolean {
  if (typeof window === "undefined") return false;
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  ) {
    return true;
  }
  return motionScale(element) < 0.01;
}

/** Whether a WebGL context can be created here at all. Cached per page. */
let webglSupport: boolean | undefined;
export function supportsWebGL(): boolean {
  if (webglSupport !== undefined) return webglSupport;
  if (typeof document === "undefined") return false;
  try {
    webglSupport = typeof WebGLRenderingContext !== "undefined";
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** Records that creating a context failed, so later runs skip straight to the fallback. */
export function markWebGLUnavailable() {
  webglSupport = false;
}

/** Test hook: forget the cached support check. */
export function resetWebGLSupport() {
  webglSupport = undefined;
}
