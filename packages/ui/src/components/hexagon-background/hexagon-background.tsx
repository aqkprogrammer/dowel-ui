"use client";

// Original design (pattern inspired by Animate UI Hexagon Background; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A honeycomb of hexagon tiles that lights up under the pointer and leaves a
 * fading trail behind it, with an optional idle ripple.
 *
 * Geometry. Pointy-top hexagons, every centre one pitch (tile width + gap)
 * from its six neighbours, so the gap is even in every direction: rows are
 * pitch·√3/2 apart and every other row is offset by half a pitch. The box is
 * measured with ResizeObserver and overfilled by one tile on every side, so
 * the edges are always covered.
 *
 * Bounded DOM. A big box with small tiles could ask for thousands of nodes,
 * so the tile count is capped at HEXAGON_BACKGROUND_MAX_TILES (720). Past
 * the cap the tiles grow — the honeycomb still fills the box, just coarser —
 * rather than the page paying for a node per few pixels.
 *
 * No re-render per pointer move. The pointer is read from the root as events
 * bubble (content above stays fully interactive), mapped to the nearest tile
 * centre — in a hex grid the nearest centre *is* the containing hexagon — and
 * the tile's `data-lit` attribute is written directly. Fast strokes would
 * skip tiles, so the segment since the last event is sampled at half-pitch
 * steps and every tile it crosses lights too. A tile the pointer has left
 * lingers briefly, then fades over a long CSS transition: that is the trail.
 *
 * Idle ripples (`idle`) start from a random point every few seconds while the
 * pointer is elsewhere: each tile gets a delay proportional to its distance,
 * and the root flips between two identical keyframes so the animation
 * restarts without touching every tile's animation. Paused off-screen and in
 * hidden tabs.
 *
 * Reduced motion turns both off. The honeycomb itself is a still pattern, and
 * the tiles are aria-hidden decoration.
 */

const PREFIX = "dowel-hexagon-background";

/** Upper bound on rendered tiles; past it, tiles grow to fit. */
export const HEXAGON_BACKGROUND_MAX_TILES = 720;

/** Tile widths in px for each size, before any growth from the cap. */
const TILE_WIDTH = { sm: 36, md: 56, lg: 84 } as const;

/** How long a tile the pointer has passed stays lit before fading (ms). */
const LINGER = 140;

/** Ripple travel speed, px per ms of delay. */
const RIPPLE_SPEED = 0.7;

const SQRT3 = Math.sqrt(3);

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(Math.round(ms))}ms * var(--motion-scale, 1))`;
}

const TILE = "[data-slot=hexagon-background-tile]";
const HEX = "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)";
const LIT_EDGE = "var(--color-primary)";
const LIT_FILL = "color-mix(in oklab,var(--color-primary) 42%,var(--color-background))";

const STYLES = `
@keyframes ${PREFIX}-wave-a{30%{background-color:color-mix(in oklab,var(--color-primary) 70%,var(--hexagon-edge-color));scale:.88}}
@keyframes ${PREFIX}-wave-b{30%{background-color:color-mix(in oklab,var(--color-primary) 70%,var(--hexagon-edge-color));scale:.88}}
@keyframes ${PREFIX}-fill-a{30%{background-color:color-mix(in oklab,var(--color-primary) 22%,var(--hexagon-fill-color))}}
@keyframes ${PREFIX}-fill-b{30%{background-color:color-mix(in oklab,var(--color-primary) 22%,var(--hexagon-fill-color))}}
${TILE}{position:absolute;top:0;left:0;clip-path:${HEX};background-color:var(--hexagon-edge-color);transition:background-color ${scaled(1100)} var(--ease-out-quint),scale ${scaled(900)} var(--ease-out-quint)}
${TILE}::before{content:"";position:absolute;inset:var(--hexagon-edge);clip-path:${HEX};background-color:var(--hexagon-fill-color);transition:background-color ${scaled(1100)} var(--ease-out-quint)}
${TILE}[data-lit]{background-color:${LIT_EDGE};scale:.94;transition-duration:var(--duration-fast)}
${TILE}[data-lit]::before{background-color:${LIT_FILL};transition-duration:var(--duration-fast)}
[data-ripple=a] ${TILE}{animation:${PREFIX}-wave-a ${scaled(1200)} var(--ease-out-quint) var(--hexagon-delay,0ms)}
[data-ripple=b] ${TILE}{animation:${PREFIX}-wave-b ${scaled(1200)} var(--ease-out-quint) var(--hexagon-delay,0ms)}
[data-ripple=a] ${TILE}::before{animation:${PREFIX}-fill-a ${scaled(1200)} var(--ease-out-quint) var(--hexagon-delay,0ms)}
[data-ripple=b] ${TILE}::before{animation:${PREFIX}-fill-b ${scaled(1200)} var(--ease-out-quint) var(--hexagon-delay,0ms)}
`;

const hexagonBackgroundVariants = cva(
  cn(
    "relative isolate overflow-hidden bg-background",
    "[--hexagon-edge-color:color-mix(in_oklab,var(--color-border)_85%,transparent)]",
    "[--hexagon-fill-color:color-mix(in_oklab,var(--color-muted)_45%,var(--color-background))]",
  ),
  {
    variants: {
      /** Tile width — sm 36px, md 56px, lg 84px — and the weight of each tile's edge. */
      size: {
        sm: "[--hexagon-edge:1px]",
        md: "[--hexagon-edge:1.5px]",
        lg: "[--hexagon-edge:2px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const REDUCE = "(prefers-reduced-motion: reduce)";

/** Live reduced-motion preference; false on the server, where nothing moves anyway. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(REDUCE);
      query.addEventListener("change", notify);
      return () => {
        query.removeEventListener("change", notify);
      };
    },
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
}

interface Grid {
  /** Tile width and height in px. */
  width: number;
  height: number;
  /** Centre-to-centre distance along a row, and between rows. */
  pitch: number;
  rowPitch: number;
  rows: number;
  columns: number;
}

/** Lays a honeycomb over a box, overfilled by a tile on each side and capped. */
function layoutGrid(boxWidth: number, boxHeight: number, tileWidth: number, gap: number): Grid {
  let width = tileWidth;
  for (;;) {
    const pitch = width + gap;
    const rowPitch = (pitch * SQRT3) / 2;
    const columns = Math.ceil(boxWidth / pitch) + 2;
    const rows = Math.ceil(boxHeight / rowPitch) + 2;
    if (rows * columns <= HEXAGON_BACKGROUND_MAX_TILES) {
      return { width, height: (width * 2) / SQRT3, pitch, rowPitch, rows, columns };
    }
    width *= Math.sqrt((rows * columns) / HEXAGON_BACKGROUND_MAX_TILES) * 1.02;
  }
}

/** Centre of the tile at a row and column, in px from the box's top-left. */
function centre(grid: Grid, row: number, column: number): [number, number] {
  // Row 0 sits a row above the box, and even rows carry the half-pitch shift.
  const shift = row % 2 === 0 ? grid.pitch / 2 : 0;
  return [(column - 1) * grid.pitch + shift, (row - 1) * grid.rowPitch];
}

/** The tile containing a point: the nearest centre, searched around the estimate. */
function tileAt(grid: Grid, x: number, y: number): number {
  const estimate = Math.round(y / grid.rowPitch) + 1;
  let best = -1;
  let bestDistance = Infinity;
  for (let row = estimate - 1; row <= estimate + 1; row += 1) {
    if (row < 0 || row >= grid.rows) continue;
    const shift = row % 2 === 0 ? grid.pitch / 2 : 0;
    const guess = Math.round((x - shift) / grid.pitch) + 1;
    for (let column = guess - 1; column <= guess + 1; column += 1) {
      if (column < 0 || column >= grid.columns) continue;
      const [cx, cy] = centre(grid, row, column);
      const distance = (cx - x) ** 2 + (cy - y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = row * grid.columns + column;
      }
    }
  }
  return best;
}

export interface HexagonBackgroundProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof hexagonBackgroundVariants> {
  /** Space between tiles in px. */
  gap?: number;
  /** Light tiles under the pointer, leaving a fading trail. On by default. */
  interactive?: boolean;
  /** Send a soft ripple across the tiles from a random point every few seconds. */
  idle?: boolean;
  /** Milliseconds between idle ripples. */
  idleInterval?: number;
  /** Classes for the decorative layer. */
  layerClassName?: string;
}

/** A honeycomb background that lights a trail under the pointer, with content rendered above. */
export function HexagonBackground({
  className,
  layerClassName,
  size,
  gap = 4,
  interactive = true,
  idle = false,
  idleInterval = 3600,
  children,
  ref,
  onPointerMove,
  onPointerLeave,
  ...props
}: HexagonBackgroundProps) {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const grid = box ? layoutGrid(box.width, box.height, TILE_WIDTH[size ?? "md"], gap) : null;

  const gridRef = useRef(grid);
  const current = useRef(-1);
  const last = useRef<[number, number] | null>(null);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const hovering = useRef(false);

  useEffect(() => {
    gridRef.current = grid;
  });

  // Measure the box, and re-measure as it resizes.
  useLayoutEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const measure = (width: number, height: number) => {
      setBox((previous) =>
        previous && previous.width === width && previous.height === height
          ? previous
          : width > 0 && height > 0
            ? { width, height }
            : null,
      );
    };
    const rect = element.getBoundingClientRect();
    measure(rect.width, rect.height);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) measure(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Pending fades are dropped with the component.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  // Idle ripples, paused off-screen and in hidden tabs.
  useEffect(() => {
    const root = rootRef.current;
    if (!idle || reduced || !root) return;
    let onScreen = true;
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver((entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
      });
      observer.observe(root);
    }
    const ripple = () => {
      const layout = gridRef.current;
      const tiles = tilesRef.current?.children;
      if (!layout || !tiles || !onScreen || document.hidden || hovering.current) return;
      const ox = Math.random() * (layout.columns - 2) * layout.pitch;
      const oy = Math.random() * (layout.rows - 2) * layout.rowPitch;
      for (let index = 0; index < tiles.length; index += 1) {
        const tile = tiles[index] as HTMLElement;
        const [cx, cy] = centre(
          layout,
          Math.floor(index / layout.columns),
          index % layout.columns,
        );
        const delay = Math.hypot(cx - ox, cy - oy) / RIPPLE_SPEED;
        tile.style.setProperty("--hexagon-delay", scaled(delay));
      }
      // Flipping between two identical keyframes restarts every tile's wave.
      root.setAttribute("data-ripple", root.getAttribute("data-ripple") === "a" ? "b" : "a");
    };
    const timer = setInterval(ripple, idleInterval);
    return () => {
      clearInterval(timer);
      observer?.disconnect();
      root.removeAttribute("data-ripple");
    };
  }, [idle, idleInterval, reduced]);

  function tile(index: number): HTMLElement | null {
    return (tilesRef.current?.children[index] as HTMLElement | undefined) ?? null;
  }

  /** Lights a tile; unless held, it starts fading after the linger. */
  function light(index: number, hold: boolean) {
    const element = tile(index);
    if (!element) return;
    element.setAttribute("data-lit", "");
    const pending = timers.current.get(index);
    if (pending !== undefined) clearTimeout(pending);
    timers.current.delete(index);
    if (!hold) release(index);
  }

  function release(index: number) {
    timers.current.set(
      index,
      setTimeout(() => {
        timers.current.delete(index);
        tile(index)?.removeAttribute("data-lit");
      }, LINGER),
    );
  }

  const tracks = interactive && !reduced;

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    const layout = gridRef.current;
    if (!tracks || !layout || event.pointerType === "touch") return;
    hovering.current = true;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Sample the stroke since the last event so a fast move leaves no gaps.
    const from = last.current ?? [x, y];
    const steps = Math.min(
      24,
      Math.ceil(Math.hypot(x - from[0], y - from[1]) / (layout.pitch / 2)),
    );
    for (let step = 1; step < steps; step += 1) {
      const passed = tileAt(
        layout,
        from[0] + ((x - from[0]) * step) / steps,
        from[1] + ((y - from[1]) * step) / steps,
      );
      if (passed !== current.current) light(passed, false);
    }
    last.current = [x, y];

    const index = tileAt(layout, x, y);
    if (index === current.current) return;
    if (current.current >= 0) release(current.current);
    current.current = index;
    light(index, true);
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    hovering.current = false;
    last.current = null;
    if (current.current >= 0) release(current.current);
    current.current = -1;
  }

  const tiles: CSSProperties[] = [];
  if (grid) {
    for (let row = 0; row < grid.rows; row += 1) {
      for (let column = 0; column < grid.columns; column += 1) {
        const [cx, cy] = centre(grid, row, column);
        tiles.push({
          width: grid.width,
          height: grid.height,
          // Physical: the honeycomb is laid out from measured, physical coordinates.
          translate: `${(cx - grid.width / 2).toFixed(2)}px ${(cy - grid.height / 2).toFixed(2)}px`,
        });
      }
    }
  }

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") return ref(node);
        if (ref) ref.current = node;
      }}
      data-slot="hexagon-background"
      data-interactive={tracks ? "" : undefined}
      className={cn(hexagonBackgroundVariants({ size }), className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        aria-hidden="true"
        data-slot="hexagon-background-layer"
        className={cn("pointer-events-none absolute inset-0 overflow-hidden", layerClassName)}
      >
        <div ref={tilesRef} data-slot="hexagon-background-tiles" className="absolute inset-0">
          {tiles.map((style, index) => (
            <span key={index} data-slot="hexagon-background-tile" style={style} />
          ))}
        </div>
      </div>
      {children === undefined || children === null ? null : (
        <div data-slot="hexagon-background-content" className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}

export { hexagonBackgroundVariants };
