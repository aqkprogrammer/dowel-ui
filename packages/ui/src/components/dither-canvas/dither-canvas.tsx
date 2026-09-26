"use client";

// Ported from amicro "Dither Charts" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type RefObject,
} from "react";

import { cn } from "@/lib/utils";

import { clamp, DITHER_CELL, resolveColor } from "./dither-engine";

// Installed, this file is what `@/components/ui/dither-canvas` resolves to, so it
// exports everything the folder's index does: see scripts/audit/installed-imports.ts.
export {
  cellSquare,
  clamp,
  createSpring,
  createSprings,
  DEFAULT_SPRING,
  DITHER_CELL,
  DITHER_PALETTE,
  ditherFill,
  drift,
  forEachCell,
  hash2,
  lerp,
  resample,
  resolveColor,
  seriesColor,
  shimmer,
  smoothstep,
  tokenToCss,
  type DitherBounds,
  type DitherDensity,
  type DitherFillOptions,
  type Spring,
  type SpringConfig,
  type SpringList,
} from "./dither-engine";
export {
  angleInWedge,
  makePath,
  monotoneTangents,
  niceMax,
  normalizeAngle,
  pieWedges,
  traceRoundedRect,
  traceRoundedWedge,
  tracePolyline,
  traceSpline,
  traceWedge,
  valueAt,
  wedgeAt,
  type PathSink,
  type Point,
  type Wedge,
} from "./dither-geometry";
export {
  DitherCursor,
  indexFromKey,
  indexFromPointer,
  useDitherScrubber,
  type DitherCursorProps,
  type DitherScrubber,
  type DitherScrubberOptions,
  type DitherScrubberProps,
} from "./dither-scrubber";

/*
 * The React half of the dither engine: one canvas, sized to its box, drawn by
 * a function the chart supplies. The engine owns everything a canvas chart
 * gets wrong when each one reimplements it (ADR 0014, Canvas):
 *
 * - Size: a ResizeObserver keeps the backing store at the box size × DPR, with
 *   DPR capped at 2. The draw function works in CSS pixels.
 * - Loop: requestAnimationFrame, paused when the canvas is off-screen
 *   (IntersectionObserver) or the tab is hidden, and cancelled on unmount.
 *   With `animate` off, or under reduced motion, it draws on demand only —
 *   when the draw function changes, the box resizes or the theme changes — and
 *   keeps drawing only while `draw` returns true (a spring still settling).
 * - Reduced motion: the clock stops, so the shimmer is one static frame, and
 *   `frame.reducedMotion` tells springs to jump to their targets.
 * - Colour: `frame.color("primary")` resolves a token at runtime, cached until
 *   the <html> class, data-theme or style changes, or the colour scheme does.
 */

export interface DitherFrame {
  /** Box size in CSS pixels. The context is already scaled to them. */
  width: number;
  height: number;
  /** Device pixel ratio in use, capped at 2. */
  dpr: number;
  /** Seconds of animation clock. Frozen while `animated` is false. */
  time: number;
  /** Seconds since the previous frame, clamped to 1/15; 0 after a pause. */
  delta: number;
  /** Cell pitch in CSS pixels. */
  cell: number;
  /** True when the clock runs: `animate` is on and motion is not reduced. */
  animated: boolean;
  reducedMotion: boolean;
  /** Resolves a colour token (`"primary"`, `"--color-primary"`, `color-mix(…)`). */
  color: (token: string) => string;
}

/**
 * Draws one frame. The canvas is cleared and scaled before it is called.
 * Return true to ask for another frame even when not animating — while a
 * spring is still moving, for example.
 */
export type DitherDraw = (ctx: CanvasRenderingContext2D, frame: DitherFrame) => boolean | void;

export interface DitherCanvasOptions {
  /** Run the shimmer clock. Reduced motion stops it regardless. Default true. */
  animate?: boolean;
  /** Cell pitch in CSS pixels passed to the draw function. Default 4.6. */
  cell?: number;
}

export interface DitherCanvasHandle {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Requests one frame. Coalesced: calling it twice draws once. */
  redraw: () => void;
  reducedMotion: boolean;
}

const MAX_DPR = 2;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const SCHEME_QUERY = "(prefers-color-scheme: dark)";

function media(query: string): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query)
    : null;
}

/**
 * Whether motion is reduced: the OS preference, or the theme's own
 * `--motion-scale` turned down to (near) zero.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (media(REDUCED_QUERY)?.matches) return true;
  const scale = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue("--motion-scale"),
  );
  return Number.isFinite(scale) && scale < 0.01;
}

/** Tracks `prefersReducedMotion()`, updating when the OS preference changes. */
export function useReducedMotionPreference(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const update = () => {
      setReduced(prefersReducedMotion());
    };
    update();
    const query = media(REDUCED_QUERY);
    query?.addEventListener("change", update);
    return () => query?.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Runs the engine for a canvas you render yourself. */
export function useDitherCanvas(
  draw: DitherDraw,
  options: DitherCanvasOptions = {},
): DitherCanvasHandle {
  const { animate = true, cell = DITHER_CELL } = options;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotionPreference();
  const latest = useRef({ draw, animate, cell, reducedMotion });
  const requestRef = useRef<() => void>(() => {});

  // Every render may carry new data or state, so every render asks for a
  // frame. Requests coalesce into one rAF, so this costs one draw at most.
  useEffect(() => {
    latest.current = { draw, animate, cell, reducedMotion };
    requestRef.current();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const colors = new Map<string, string>();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let last: number | null = null;
    let time = 0;
    let onScreen = true;

    const visible = () => onScreen && !document.hidden;

    const request = () => {
      if (raf || !visible()) return;
      raf = requestAnimationFrame(tick);
    };

    function tick(now: number) {
      raf = 0;
      if (!visible() || !canvas) {
        last = null;
        return;
      }
      const current = latest.current;
      const animated = current.animate && !current.reducedMotion;
      const delta = last === null ? 0 : clamp((now - last) / 1000, 0, 1 / 15);
      last = now;
      if (animated) time += delta;

      const ctx = width > 0 && height > 0 ? canvas.getContext("2d") : null;
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      const more =
        current.draw(ctx, {
          width,
          height,
          dpr,
          time,
          delta,
          cell: current.cell,
          animated,
          reducedMotion: current.reducedMotion,
          color: (token) => {
            let value = colors.get(token);
            if (value === undefined) {
              value = resolveColor(canvas, token);
              colors.set(token, value);
            }
            return value;
          },
        }) === true;
      if (animated || more) request();
      else last = null;
    }

    const resize = (nextWidth: number, nextHeight: number) => {
      width = nextWidth;
      height = nextHeight;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      request();
    };

    const box = canvas.getBoundingClientRect();
    resize(box.width, box.height);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) resize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(canvas);

    let intersectionObserver: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "function") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) onScreen = entry.isIntersecting;
          request();
        },
        { rootMargin: "100px" },
      );
      intersectionObserver.observe(canvas);
    }

    const onVisibility = () => {
      last = null;
      request();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onTheme = () => {
      colors.clear();
      request();
    };
    const themeObserver = new MutationObserver(onTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    const scheme = media(SCHEME_QUERY);
    scheme?.addEventListener("change", onTheme);

    requestRef.current = request;
    request();

    return () => {
      requestRef.current = () => {};
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      themeObserver.disconnect();
      scheme?.removeEventListener("change", onTheme);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const redraw = useCallback(() => {
    requestRef.current();
  }, []);

  return { canvasRef, redraw, reducedMotion };
}

export interface DitherCanvasProps
  extends Omit<ComponentPropsWithRef<"canvas">, "children">, DitherCanvasOptions {
  draw: DitherDraw;
}

/**
 * A canvas the dither engine draws. Decorative by default (aria-hidden): the
 * chart around it carries the accessible name, readouts and data table. Give
 * it a `role` or `aria-label` to expose it instead.
 */
export function DitherCanvas({
  draw,
  animate,
  cell,
  className,
  ref,
  ...props
}: DitherCanvasProps) {
  const { canvasRef } = useDitherCanvas(draw, { animate, cell });
  const exposed = props.role !== undefined || props["aria-label"] !== undefined;
  const setRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node;
      if (typeof ref === "function") return ref(node);
      if (ref) ref.current = node;
      return undefined;
    },
    [canvasRef, ref],
  );

  return (
    <canvas
      aria-hidden={exposed ? undefined : true}
      data-slot="dither-canvas"
      {...props}
      ref={setRef}
      className={cn("block size-full", className)}
    />
  );
}

/** Formats a value with the reader's locale grouping. The charts' default. */
export function formatDitherValue(value: number): string {
  return new Intl.NumberFormat().format(Math.round(value * 100) / 100);
}

export interface DitherTableProps extends ComponentPropsWithRef<"table"> {
  caption: string;
  /** Column headers; the first names the row header column. */
  columns: readonly string[];
  /** One row per datum; the first cell becomes the row header. */
  rows: readonly (readonly string[])[];
  /** Show the table. Hidden tables are still read by assistive technology. */
  visible?: boolean;
}

/**
 * The chart's data as a table: always in the accessibility tree, visible on
 * request. A canvas has no content, and an aria-label summary is too coarse to
 * read exact values from, so every dither chart renders one.
 */
export function DitherTable({
  caption,
  columns,
  rows,
  visible = false,
  className,
  ...props
}: DitherTableProps) {
  return (
    <table
      data-slot="dither-table"
      data-visible={visible || undefined}
      {...props}
      className={cn(
        visible ? "w-full border-collapse text-start text-xs tabular-nums" : "sr-only",
        className,
      )}
    >
      <caption
        className={
          visible ? "pb-2 text-start text-xs font-medium text-muted-foreground" : undefined
        }
      >
        {caption}
      </caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column}
              scope="col"
              className={
                visible ? "border-b border-border py-1 pe-3 text-start font-medium" : undefined
              }
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([head, ...cells], rowIndex) => (
          <tr key={`${head ?? ""}-${String(rowIndex)}`}>
            <th
              scope="row"
              className={visible ? "py-1 pe-3 text-start font-normal" : undefined}
            >
              {head}
            </th>
            {cells.map((cellText, cellIndex) => (
              <td
                key={cellIndex}
                className={visible ? "py-1 pe-3 text-muted-foreground" : undefined}
              >
                {cellText}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
