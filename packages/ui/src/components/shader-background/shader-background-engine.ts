// Original design.

import type { ShaderBackgroundPresetSpec } from "./shader-background-presets";

/*
 * The GL half of ShaderBackground: no React. One full-frame quad and one
 * fragment program per preset. A preset is a single GLSL function,
 * `vec3 scene(vec2 uv, vec2 p, float t)`, that returns the colour of a pixel at
 * time `t` — `uv` is 0–1 across the box, `p` is centred and aspect-corrected
 * (−0.5…0.5 vertically). Everything else — the palette, the film grain, the
 * vignette, the clock — is shared here, so a preset is only its picture.
 *
 * The output is opaque. A background that blends with what is behind it shows
 * whatever happens to be there; this one is the ground the content sits on.
 */

export type Rgb = readonly [number, number, number];

export interface ShaderBackgroundRenderer {
  /** Draws one frame at `time` seconds. */
  draw: (time: number) => void;
  /** Resizes the backing store to a CSS box at `dpr` device pixels per CSS pixel. */
  resize: (width: number, height: number, dpr: number) => void;
  /** Sets the four palette colours, as 0–1 sRGB. */
  setColors: (colors: readonly Rgb[]) => void;
  /** Sets the shared look: grain amount, vignette amount, and the scene's zoom. */
  setLook: (look: { grain: number; vignette: number; scale: number }) => void;
  /**
   * Frees the program and buffer. The context stays with the canvas, so a
   * remount on the same element can reuse it; `releaseContext` lets it go.
   */
  destroy: () => void;
}

/** Full-frame shaders are fill-bound: past 1.5 the cost grows faster than anyone can see. */
export const MAX_DPR = 1.5;

/** Shared by every preset. Varyings are unnecessary: the fragment reads gl_FragCoord. */
export const VERTEX_SHADER =
  "attribute vec2 aPos;\nvoid main(){ gl_Position = vec4(aPos, 0.0, 1.0); }\n";

/** Uniforms and helpers every preset may use: hashes, value noise, fbm, a cosine ramp. */
const PRELUDE = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uScale;
uniform float uGrain;
uniform float uVignette;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
#define PI 3.14159265359
#define TAU 6.28318530718
float hash11(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float hash21(vec2 q){ q = fract(q * vec2(233.34, 851.73)); q += dot(q, q + 23.45); return fract(q.x * q.y); }
vec2 hash22(vec2 q){ float n = hash21(q); return vec2(n, hash21(q + n + 17.0)); }
float vnoise(vec2 q){
  vec2 i = floor(q); vec2 f = fract(q);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 q){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(q); q = q * 2.03 + vec2(11.3, 7.9); a *= 0.5; }
  return v;
}
float fbm3(vec2 q){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * vnoise(q); q = q * 2.03 + vec2(11.3, 7.9); a *= 0.5; }
  return v;
}
mat2 rot(float a){ float c = cos(a); float s = sin(a); return mat2(c, -s, s, c); }
vec3 ramp(float x){
  x = clamp(x, 0.0, 1.0) * 3.0;
  if (x < 1.0) return mix(uC0, uC1, x);
  if (x < 2.0) return mix(uC1, uC2, x - 1.0);
  return mix(uC2, uC3, x - 2.0);
}
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
`;

const MAIN = `
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) / uScale;
  vec3 col = scene(uv, p, uTime);
  vec2 v = uv - 0.5;
  col *= 1.0 - uVignette * dot(v, v) * 1.6;
  col += (hash21(gl_FragCoord.xy + fract(uTime * 7.13) * 91.0) - 0.5) * uGrain * 0.12;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/** The complete fragment program for one preset. */
export function buildFragmentShader(preset: Pick<ShaderBackgroundPresetSpec, "glsl">): string {
  return `${PRELUDE}\n${preset.glsl}\n${MAIN}`;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ShaderBackground] shader failed to compile:", gl.getShaderInfoLog(shader));
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
  // Linked programs keep their own copy; the shader objects are no longer needed.
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ShaderBackground] program failed to link:", gl.getProgramInfoLog(program));
    }
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

const UNIFORMS = [
  "uRes",
  "uTime",
  "uScale",
  "uGrain",
  "uVignette",
  "uC0",
  "uC1",
  "uC2",
  "uC3",
] as const;

/**
 * A renderer for one preset on one canvas, or `null` if WebGL is unavailable
 * or the program does not build — the caller then shows its CSS fallback.
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  preset: Pick<ShaderBackgroundPresetSpec, "glsl">,
): ShaderBackgroundRenderer | null {
  const gl = getWebGL(canvas);
  if (!gl) return null;
  const program = createProgram(gl, buildFragmentShader(preset));
  const buffer = program ? gl.createBuffer() : null;
  if (!program || !buffer) {
    if (program) gl.deleteProgram(program);
    loseContext(gl);
    return null;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const loc = Object.fromEntries(
    UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]),
  ) as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;
  const colorSlots = [loc.uC0, loc.uC1, loc.uC2, loc.uC3] as const;
  gl.uniform1f(loc.uScale, 1);

  let destroyed = false;
  const live = () => !destroyed && !gl.isContextLost();

  return {
    resize(width, height, dpr) {
      if (!live()) return;
      const w = Math.max(1, Math.round(width * dpr));
      const h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(loc.uRes, w, h);
    },
    setColors(colors) {
      if (!live()) return;
      colorSlots.forEach((slot, index) => {
        const [r, g, b] = colors[index] ?? colors[colors.length - 1] ?? [0, 0, 0];
        gl.uniform3f(slot, r, g, b);
      });
    },
    setLook({ grain, vignette, scale }) {
      if (!live()) return;
      gl.uniform1f(loc.uGrain, grain);
      gl.uniform1f(loc.uVignette, vignette);
      gl.uniform1f(loc.uScale, scale > 0 ? scale : 1);
    },
    draw(time) {
      if (!live()) return;
      gl.uniform1f(loc.uTime, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (!gl.isContextLost()) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      }
    },
  };
}

function getWebGL(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  try {
    return canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
}

/** Releases the context now rather than whenever the canvas is collected. */
function loseContext(gl: WebGLRenderingContext) {
  gl.getExtension("WEBGL_lose_context")?.loseContext();
}

/**
 * Gives a canvas's context back to the browser. Browsers keep around sixteen
 * live contexts per page and drop the oldest past that, so a background that
 * has gone should not hold one until the garbage collector gets to it.
 */
export function releaseContext(canvas: HTMLCanvasElement) {
  const gl = getWebGL(canvas);
  if (gl && !gl.isContextLost()) loseContext(gl);
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
 * Resolves a colour token, as seen from `element`, to 0–1 sRGB for a uniform.
 * The browser resolves the token (so a scoped theme, nested var() and
 * color-mix() all work) and a 1×1 2D canvas converts whatever colour space it
 * came back in — oklch included — to sRGB bytes.
 */
export function resolveRgb(element: Element, token: string, fallback: Rgb = [0, 0, 0]): Rgb {
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  if (!view) return fallback;
  const probe = doc.createElement("span");
  probe.style.display = "none";
  probe.style.color = tokenToCss(token);
  element.appendChild(probe);
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
    if (r !== undefined && g !== undefined && b !== undefined) {
      return [r / 255, g / 255, b / 255];
    }
  }
  return fallback;
}

/** Test hook: forget the cached 2D context. */
export function resetColorCache() {
  scratch = undefined;
}
