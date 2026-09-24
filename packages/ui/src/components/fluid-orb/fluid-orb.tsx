"use client";

// Original design (pattern inspired by Rare UI Fluid Orb; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { cn } from "@/lib/utils";

/*
 * An ambient orb of fluid colour: soft patches drift in every direction,
 * merge and pull apart, in three bands derived from one colour — the full
 * colour low down, a pale tint through the middle and a near-white crown.
 *
 * The fragment shader is written for this component. A band coordinate runs
 * from the bottom of the disc to the top, and two things push it around:
 * domain-warped value noise (fbm sampled at a point displaced by two more fbm
 * layers, each layer drifting its own way), which gives the slow marbling,
 * and three gaussian lobes on incommensurate Lissajous paths, which give the
 * larger patches that visibly travel. The band is then mapped through the
 * three colours, with the rim deepened and a soft highlight on the crown so
 * it reads as a body rather than a flat disc.
 *
 * Colour: `color` is any CSS colour (a token by default). The browser resolves
 * it — var(), color-mix() and OKLCH colours included — through a probe, and
 * a 1×1 2D canvas turns that into sRGB for the uniforms. It is re-resolved when
 * the theme changes.
 *
 * Lifecycle: the canvas is created in the effect and removed in its cleanup,
 * with its context explicitly lost, so StrictMode's double mount never meets a
 * dead context and nothing leaks. The loop runs only while the orb is on
 * screen (IntersectionObserver) and the tab is visible; under reduced motion
 * it draws one still frame. Until the first WebGL frame lands — on the
 * server, without WebGL, or after a lost context — the root shows a CSS
 * radial-gradient orb in the same three bands.
 *
 * It is decoration: aria-hidden unless named, when it becomes role="img".
 */

const PREFIX = "dowel-fluid-orb";

// A highlight is the colour of light, not of a theme surface, so the crown
// mixes toward white in every theme — the WebGL crown does the same.
const STYLES = `
.${PREFIX} [data-slot=fluid-orb-surface]{position:absolute;inset:0;border-radius:9999px;overflow:hidden;background:radial-gradient(circle at 36% 20%,color-mix(in oklab,var(--fluid-orb-color) 6%,white) 0%,transparent 38%),linear-gradient(to bottom,color-mix(in oklab,var(--fluid-orb-color) 8%,white) 6%,color-mix(in oklab,var(--fluid-orb-color) 42%,white) 44%,var(--fluid-orb-color) 92%)}
.${PREFIX}[data-renderer=webgl] [data-slot=fluid-orb-surface]{background:none}
`;

const fluidOrbVariants = cva(
  "relative isolate inline-block shrink-0 rounded-full align-middle",
  {
    variants: {
      /** A soft bloom of the colour behind the orb. */
      glow: {
        true: "before:absolute before:inset-[6%] before:-z-10 before:rounded-full before:bg-[var(--fluid-orb-color)] before:opacity-40 before:blur-2xl",
        false: "",
      },
    },
    defaultVariants: { glow: false },
  },
);

type Rgb = readonly [number, number, number];

const MAX_DPR = 2;
/** Clock seconds a still frame is drawn at — a settled, balanced arrangement. */
const STILL_TIME = 7.5;
/** Pale band: this much of the way from the colour to white. */
const TINT_MIX = 0.5;
/** Crown: white with a breath of the colour, so it never reads as a hole. */
const LIGHT_MIX = 0.05;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const DARK_SCHEME = "(prefers-color-scheme: dark)";

const VERTEX_SHADER = "attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}";

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uTint;
uniform vec3 uLight;

float hash(vec2 p){
  p = fract(p * vec2(127.13, 311.71));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  mat2 turn = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = turn * p; a *= 0.5; }
  return v / 0.875;
}
float lobe(vec2 p, vec2 c, float k){ vec2 d = p - c; return exp(-dot(d, d) * k); }

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
  float d = length(uv);
  float px = 2.0 / uRes.y;
  float mask = 1.0 - smoothstep(1.0 - 1.5 * px, 1.0, d);
  if (mask <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float t = uTime;

  vec2 p = uv * 0.85;
  vec2 q = vec2(fbm(p + t * vec2(0.09, -0.04)),
                fbm(p + vec2(4.7, 1.9) + t * vec2(-0.06, 0.08)));
  vec2 r = vec2(fbm(p + 1.1 * q + vec2(1.7, 9.2) + t * vec2(0.04, 0.07)),
                fbm(p + 1.1 * q + vec2(8.3, 2.8) + t * vec2(-0.08, -0.03)));
  float marble = fbm(p + 1.3 * r);

  float lobes = lobe(uv, vec2(sin(t * 0.37), cos(t * 0.29)) * 0.55, 2.2)
              - lobe(uv, vec2(cos(t * 0.23 + 2.0), sin(t * 0.41 + 1.0)) * 0.6, 2.4)
              + 0.7 * lobe(uv, vec2(sin(t * 0.31 + 4.0), sin(t * 0.19 + 3.0)) * 0.5, 2.8);

  float band = 0.46 + 0.42 * uv.y + (marble - 0.5) * 0.7 + lobes * 0.38;
  vec3 col = mix(uColor, uTint, smoothstep(0.1, 0.55, band));
  col = mix(col, uLight, smoothstep(0.66, 0.98, band));

  float rim = smoothstep(0.55, 1.0, d) * (1.0 - smoothstep(-0.2, 0.9, uv.y));
  col = mix(col, uColor * 0.8, rim * 0.35);
  col += uLight * 0.16 * lobe(uv, vec2(-0.3, 0.5), 5.0);
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col * mask, mask);
}
`;

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const WHITE: Rgb = [1, 1, 1];
/** Mid grey, only if the browser cannot resolve the colour at all. */
const FALLBACK_RGB: Rgb = [0.5, 0.5, 0.5];

/**
 * Resolves any CSS colour, as seen from `host`, to 0–1 sRGB. The browser
 * computes the colour on a probe; a 1×1 canvas converts whatever space it came
 * back in to sRGB bytes.
 */
function resolveRgb(host: Element, color: string): Rgb {
  const doc = host.ownerDocument;
  const view = doc.defaultView;
  if (!view) return FALLBACK_RGB;
  const probe = doc.createElement("span");
  probe.style.display = "none";
  probe.style.color = color;
  host.appendChild(probe);
  const computed = view.getComputedStyle(probe).color;
  probe.remove();
  let context: CanvasRenderingContext2D | null;
  try {
    const canvas = doc.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    context = canvas.getContext("2d", { willReadFrequently: true });
  } catch {
    context = null;
  }
  if (context && computed) {
    context.fillStyle = computed;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
    if (a > 0) return [r / 255, g / 255, b / 255];
  }
  return FALLBACK_RGB;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  if (process.env.NODE_ENV !== "production") {
    console.warn("[FluidOrb] shader failed to compile:", gl.getShaderInfoLog(shader));
  }
  gl.deleteShader(shader);
  return null;
}

interface Renderer {
  paint: (time: number) => void;
  setColor: (rgb: Rgb) => void;
  resize: (size: number) => void;
  destroy: () => void;
}

/** One quad and one program on `canvas`, or null when WebGL cannot run here. */
function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  let gl: WebGLRenderingContext | null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
    });
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const context = gl;
  const release = () => context.getExtension("WEBGL_lose_context")?.loseContext();

  const vertex = compile(context, context.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = vertex ? compile(context, context.FRAGMENT_SHADER, FRAGMENT_SHADER) : null;
  const program = vertex && fragment ? context.createProgram() : null;
  if (!vertex || !fragment || !program) {
    if (vertex) context.deleteShader(vertex);
    if (fragment) context.deleteShader(fragment);
    release();
    return null;
  }
  context.attachShader(program, vertex);
  context.attachShader(program, fragment);
  context.linkProgram(program);
  context.deleteShader(vertex);
  context.deleteShader(fragment);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    context.deleteProgram(program);
    release();
    return null;
  }

  const buffer = context.createBuffer();
  context.useProgram(program);
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  context.bufferData(context.ARRAY_BUFFER, QUAD, context.STATIC_DRAW);
  const position = context.getAttribLocation(program, "aPos");
  context.enableVertexAttribArray(position);
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
  context.clearColor(0, 0, 0, 0);
  const at = (name: string) => context.getUniformLocation(program, name);
  const uniforms = {
    res: at("uRes"),
    time: at("uTime"),
    color: at("uColor"),
    tint: at("uTint"),
    light: at("uLight"),
  };
  let destroyed = false;

  return {
    paint(time) {
      if (destroyed || context.isContextLost()) return;
      context.clear(context.COLOR_BUFFER_BIT);
      context.uniform1f(uniforms.time, time);
      context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
    },
    setColor(rgb) {
      if (destroyed) return;
      context.uniform3f(uniforms.color, ...rgb);
      context.uniform3f(uniforms.tint, ...mix(rgb, WHITE, TINT_MIX));
      context.uniform3f(uniforms.light, ...mix(WHITE, rgb, LIGHT_MIX));
    },
    resize(size) {
      if (destroyed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const px = Math.max(1, Math.round(size * dpr));
      if (canvas.width !== px) canvas.width = px;
      if (canvas.height !== px) canvas.height = px;
      context.viewport(0, 0, px, px);
      context.uniform2f(uniforms.res, px, px);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (!context.isContextLost()) {
        context.deleteBuffer(buffer);
        context.deleteProgram(program);
      }
      release();
    },
  };
}

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** The theme's `--motion-scale` turned (nearly) to zero means no motion. */
function motionScaledOff(): boolean {
  const scale = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue("--motion-scale"),
  );
  return Number.isFinite(scale) && scale < 0.01;
}

export interface FluidOrbProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children" | "color">,
    VariantProps<typeof fluidOrbVariants> {
  /**
   * Any CSS colour for the fluid — a token, var(), color-mix() or an OKLCH value.
   * The pale middle band and the near-white crown are derived from it.
   * Defaults to the theme's primary.
   */
  color?: string;
  /** Diameter in pixels. */
  size?: number;
}

/** An ambient WebGL orb of drifting fluid colour. Decorative unless named. */
export function FluidOrb({
  className,
  glow,
  color = "var(--color-primary)",
  size = 160,
  style,
  ...props
}: FluidOrbProps) {
  const reduced = usePrefersReducedMotion();
  const [renderer, setRenderer] = useState<"css" | "webgl">("css");
  const hostRef = useRef<HTMLDivElement | null>(null);
  const diameter = Math.max(1, size);
  const latest = useRef({ color, size: diameter, reduced });
  const syncRef = useRef<() => void>(() => {});
  const named = props["aria-label"] != null || props["aria-labelledby"] != null;

  useLayoutEffect(() => {
    latest.current = { color, size: diameter, reduced };
    syncRef.current();
  }, [color, diameter, reduced]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("data-slot", "fluid-orb-canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;border-radius:inherit";
    host.appendChild(canvas);
    const gl = createRenderer(canvas);
    if (!gl) {
      canvas.remove();
      return;
    }
    const active = gl;

    let raf = 0;
    let time = 0;
    let last: number | null = null;
    let onScreen = true;
    let scaledOff = motionScaledOff();
    let shown = false;
    let lost = false;
    let applied = { color: "", size: 0 };

    const visible = () => onScreen && !document.hidden;
    const still = () => latest.current.reduced || scaledOff;

    const frame = (now: number) => {
      raf = 0;
      const { color: nextColor, size: nextSize } = latest.current;
      if (applied.size !== nextSize) active.resize(nextSize);
      if (applied.color !== nextColor) active.setColor(resolveRgb(host, nextColor));
      applied = { color: nextColor, size: nextSize };

      const frozen = still();
      const dt = frozen || last === null ? 0 : Math.min((now - last) / 1000, 1 / 15);
      last = frozen ? null : now;
      time += dt;
      active.paint(frozen ? STILL_TIME : time);
      if (!shown) {
        shown = true;
        setRenderer("webgl");
      }
      if (!frozen && visible()) raf = requestAnimationFrame(frame);
    };

    const request = () => {
      if (!lost && !raf && visible()) raf = requestAnimationFrame(frame);
    };

    function onLost() {
      // Hand back to the CSS orb for good; a remount builds a fresh context.
      lost = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      setRenderer("css");
    }
    canvas.addEventListener("webglcontextlost", onLost);

    let intersection: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "function") {
      intersection = new IntersectionObserver((entries) => {
        for (const entry of entries) onScreen = entry.isIntersecting;
        last = null;
        request();
      });
      intersection.observe(host);
    }

    const onVisibility = () => {
      last = null;
      request();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // A theme switch can change what the colour resolves to, and the scale.
    const onTheme = () => {
      applied = { ...applied, color: "" };
      scaledOff = motionScaledOff();
      request();
    };
    const theme = new MutationObserver(onTheme);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    const scheme = window.matchMedia(DARK_SCHEME);
    scheme.addEventListener("change", onTheme);

    syncRef.current = request;
    request();

    return () => {
      syncRef.current = () => {};
      if (raf) cancelAnimationFrame(raf);
      intersection?.disconnect();
      theme.disconnect();
      scheme.removeEventListener("change", onTheme);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      active.destroy();
      canvas.remove();
    };
  }, []);

  const variables = {
    "--fluid-orb-color": color,
    width: `${String(diameter)}px`,
    height: `${String(diameter)}px`,
  } as CSSProperties;

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="fluid-orb"
        data-renderer={renderer}
        role={named ? "img" : undefined}
        aria-hidden={named ? undefined : true}
        className={cn(PREFIX, fluidOrbVariants({ glow }), className)}
        style={{ ...variables, ...style }}
        {...props}
      >
        <div ref={hostRef} data-slot="fluid-orb-surface" />
      </div>
    </>
  );
}

export { fluidOrbVariants };
