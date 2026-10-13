"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useRef, useState, type ComponentPropsWithRef, type Ref } from "react";

import { cn } from "@/lib/utils";

import {
  MAX_DPR,
  createRenderer,
  releaseContext,
  resolveRgb,
  tokenToCss,
  type ShaderBackgroundRenderer,
} from "./shader-background-engine";
import {
  SHADER_BACKGROUND_PRESETS,
  type ShaderBackgroundPreset,
} from "./shader-background-presets";

// Re-exported so the installed component, imported by its own path, has the presets too.
export {
  SHADER_BACKGROUND_PRESETS,
  SHADER_BACKGROUND_PRESET_NAMES,
  type ShaderBackgroundCategory,
  type ShaderBackgroundPreset,
  type ShaderBackgroundPresetSpec,
} from "./shader-background-presets";

/*
 * A full-bleed, procedural scene behind content — dunes, a storm at sea, a
 * nebula, a mesh of the theme's colours — drawn by one fragment shader on one
 * canvas. Fourteen presets share the engine; a preset is its picture and its
 * palette, and the palette is a prop, so every scene can be re-dressed.
 *
 * What it costs, and what keeps that bounded:
 * - one WebGL context per background, created on mount and released on
 *   unmount (browsers cap live contexts at around sixteen per page);
 * - the backing store is capped at 1.5 device pixels per CSS pixel, and
 *   `resolution` lowers it further for large or low-power surfaces;
 * - nothing is drawn while the background is off-screen or the tab is hidden.
 *
 * Under reduced motion (the OS setting, or --motion-scale at 0) each preset
 * draws one chosen frame and stops. Without WebGL — or when the context is
 * lost — a CSS gradient in the same palette stands in, so the box is never
 * empty. Colours may be theme tokens; they are re-read when the theme changes.
 */

const shaderBackgroundVariants = cva("relative isolate", {
  variants: {
    /**
     * `box` fills the element. `viewport` pins the scene to the screen, so one
     * background can sit behind a whole page while the content scrolls over it
     * — and the root does not clip, so sticky headers inside keep sticking.
     */
    attach: {
      box: "overflow-hidden [&>[data-slot=shader-background-scene]]:absolute",
      viewport: "[&>[data-slot=shader-background-scene]]:fixed",
    },
    /** Fades the scene out toward the edges so it sits inside a section. */
    fade: {
      none: "",
      edges:
        "[&>[data-slot=shader-background-scene]]:[mask-image:radial-gradient(ellipse_at_center,var(--color-foreground)_45%,transparent_100%)]",
      bottom:
        "[&>[data-slot=shader-background-scene]]:[mask-image:linear-gradient(to_bottom,var(--color-foreground)_50%,transparent)]",
      top: "[&>[data-slot=shader-background-scene]]:[mask-image:linear-gradient(to_top,var(--color-foreground)_50%,transparent)]",
    },
  },
  defaultVariants: { attach: "box", fade: "none" },
});

export interface ShaderBackgroundProps
  extends
    Omit<ComponentPropsWithRef<"div">, "ref">,
    VariantProps<typeof shaderBackgroundVariants> {
  ref?: Ref<HTMLDivElement>;
  /** Which scene to draw. Default `"mesh-gradient"`, which follows the theme. */
  preset?: ShaderBackgroundPreset;
  /**
   * The palette, tokens (`"primary"`) or any CSS colour, in the order the
   * scene reads them — up to four. Missing entries keep the preset's own.
   */
  colors?: readonly string[];
  /** Animation speed multiplier. Default 1; 0 holds the scene on its still frame. */
  speed?: number;
  /** Zoom into the scene. Default 1; above 1 is closer. */
  scale?: number;
  /** Film grain, 0–1. Default 0.25. */
  grain?: number;
  /** Darkening toward the corners, 0–1. Default 0.3. */
  vignette?: number;
  /** Fraction of the display's pixel density to render at, 0.25–1. Default 1. */
  resolution?: number;
}

/** A full-bleed WebGL scene behind content, from one of fourteen procedural presets. */
export function ShaderBackground({
  preset = "mesh-gradient",
  colors,
  speed = 1,
  scale = 1,
  grain = 0.25,
  vignette = 0.3,
  resolution = 1,
  attach,
  fade,
  className,
  ref,
  children,
  ...props
}: ShaderBackgroundProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fallback, setFallback] = useState(false);

  const spec = SHADER_BACKGROUND_PRESETS[preset] ?? SHADER_BACKGROUND_PRESETS["mesh-gradient"];
  const palette = spec.colors.map((color, index) => colors?.[index] ?? color);
  const paletteKey = palette.join("|");

  const latest = useRef({
    speed,
    scale,
    grain,
    vignette,
    resolution,
    palette,
    still: spec.still,
  });
  const applyRef = useRef<() => void>(() => {});

  // Declared before the renderer's effect, so a rebuilt renderer reads this render's props.
  useEffect(() => {
    latest.current = { speed, scale, grain, vignette, resolution, palette, still: spec.still };
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    let renderer: ShaderBackgroundRenderer | null = null;
    let raf = 0;
    let last: number | null = null;
    let time = 0;
    let onScreen = true;
    let width = 0;
    let height = 0;
    let disposed = false;

    const motion = () => {
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia(REDUCED_MOTION_QUERY).matches;
      const raw = Number.parseFloat(getComputedStyle(root).getPropertyValue("--motion-scale"));
      const motionScale = Number.isFinite(raw) ? Math.max(0, raw) : 1;
      return reduced || motionScale < 0.01 ? 0 : 1 / motionScale;
    };
    let rate = motion();

    const visible = () => onScreen && !document.hidden;
    const animated = () => rate > 0 && latest.current.speed > 0;

    const request = () => {
      if (raf || disposed || !renderer || !visible()) return;
      raf = requestAnimationFrame(tick);
    };

    function tick(now: number) {
      raf = 0;
      if (!renderer || !visible()) {
        last = null;
        return;
      }
      const moving = animated();
      const delta = last === null ? 0 : Math.min(Math.max((now - last) / 1000, 0), 1 / 15);
      last = now;
      if (moving) time += delta * latest.current.speed * rate;
      renderer.draw(moving ? latest.current.still + time : latest.current.still);
      if (moving) request();
      else last = null;
    }

    const sizeTo = (nextWidth: number, nextHeight: number) => {
      width = nextWidth;
      height = nextHeight;
      const density = clamp(latest.current.resolution, 0.25, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * density;
      renderer?.resize(width, height, dpr);
      request();
    };

    const apply = () => {
      if (!renderer) return;
      const { palette: current, grain: g, vignette: v, scale: s } = latest.current;
      renderer.setColors(current.map((token) => resolveRgb(root, token)));
      renderer.setLook({ grain: clamp(g, 0, 1), vignette: clamp(v, 0, 1), scale: s });
      sizeTo(width, height);
      // A still scene redraws on demand; a moving one picks this up next frame.
      if (!animated()) {
        last = null;
        request();
      }
    };

    const build = () => {
      renderer?.destroy();
      renderer = createRenderer(canvas, spec);
      setFallback(renderer === null);
      if (!renderer) return;
      const box = canvas.getBoundingClientRect();
      width = box.width;
      height = box.height;
      apply();
    };

    build();
    applyRef.current = apply;

    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver((entries) => {
            for (const entry of entries) {
              sizeTo(entry.contentRect.width, entry.contentRect.height);
            }
          })
        : undefined;
    resizeObserver?.observe(canvas);

    let intersectionObserver: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "function") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) onScreen = entry.isIntersecting;
          last = null;
          request();
        },
        { rootMargin: "100px" },
      );
      intersectionObserver.observe(root);
    }

    const onVisibility = () => {
      last = null;
      request();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onPreference = () => {
      rate = motion();
      apply();
    };
    const themeObserver = new MutationObserver(onPreference);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    const queries = [REDUCED_MOTION_QUERY, COLOR_SCHEME_QUERY].map((query) =>
      typeof window.matchMedia === "function" ? window.matchMedia(query) : null,
    );
    for (const query of queries) query?.addEventListener("change", onPreference);

    const onLost = (event: Event) => {
      event.preventDefault();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      setFallback(true);
    };
    const onRestored = () => {
      renderer = null;
      build();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    return () => {
      disposed = true;
      applyRef.current = () => {};
      if (raf) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      themeObserver.disconnect();
      for (const query of queries) query?.removeEventListener("change", onPreference);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      renderer?.destroy();
      renderer = null;
      // Released only once the canvas has really gone. A remount on the same
      // element (React's development double-run, a Suspense retry) reuses the
      // context, and a lost context cannot be revived by asking for it again.
      setTimeout(() => {
        if (!canvas.isConnected) releaseContext(canvas);
      }, 0);
    };
    // The renderer is rebuilt only when the scene changes; everything else is a uniform.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  useEffect(() => {
    applyRef.current();
  }, [paletteKey, speed, scale, grain, vignette, resolution]);

  const setRef = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const css = palette.map(tokenToCss);

  return (
    <div
      ref={setRef}
      data-slot="shader-background"
      data-preset={preset}
      data-attach={attach ?? "box"}
      data-fallback={fallback || undefined}
      className={cn(shaderBackgroundVariants({ attach, fade }), className)}
      {...props}
    >
      <div
        aria-hidden="true"
        data-slot="shader-background-scene"
        className="pointer-events-none inset-0 overflow-hidden forced-colors:hidden"
        style={{
          backgroundColor: css[0],
          backgroundImage: `radial-gradient(ellipse 80% 60% at 30% 25%, ${css[1] ?? "transparent"}, transparent 70%), radial-gradient(ellipse 70% 60% at 75% 80%, ${css[2] ?? "transparent"}, transparent 70%)`,
        }}
      >
        {/* Keyed by preset: a context released by the old scene cannot be reused by the new one. */}
        <canvas
          key={preset}
          ref={canvasRef}
          data-slot="shader-background-canvas"
          className={cn("absolute inset-0 size-full", fallback && "hidden")}
        />
      </div>
      <div data-slot="shader-background-content" className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : max;
}

export { shaderBackgroundVariants };
