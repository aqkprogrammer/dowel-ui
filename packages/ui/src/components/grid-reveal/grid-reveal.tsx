"use client";

// Original design (pattern inspired by Rare UI Grid Reveal; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, MotionConfig, motion, type Transition } from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { ShimmerText } from "@/components/shimmer-text";
import { cn } from "@/lib/utils";

/*
 * A frame for an image that is still being generated, which becomes the
 * picture when it arrives.
 *
 * Waiting. The frame opens as four cells and then keeps splitting its largest
 * cell in two. A cell is cut across its longer side, and a square one across
 * the axis its parent was not cut along, so the cuts alternate and nothing
 * turns into a sliver; each cut lands a little off-centre (seeded per
 * instance) so the grid grows organically rather than as a checkerboard. How
 * many cells there are is a function of progress — `progress` when given,
 * otherwise an eased creep, 0.72 × (1 − e^(−t/τ)) with τ from
 * `estimatedDuration`, which slows forever but never stops. Either way the
 * split holds at 0.72 until the image decodes: the picture landing is what
 * finishes the run. The splits are a shared-layout animation — the half that
 * keeps the old cell's identity springs down to size while the new half fades
 * in beside it — which is what `motion` is for here (ADR 0014). The cells
 * themselves are tiles with a soft blob and a slow sweep of light, pure CSS.
 *
 * Revealing. Once the image has loaded and decoded, the split freezes and
 * every cell becomes a window onto its part of the picture, resolving from
 * blurred to sharp while the gutters close. The order is honest about the
 * image: a 48px copy is drawn to a canvas and each cell is scored by its mean
 * luminance gradient (edge energy — how much is going on in it), blended 70/30
 * with how central it is, and the busiest cells resolve first. A cross-origin
 * image without CORS cannot be read, and then the order is centre-out alone.
 * When every cell has resolved, the pieces are swapped for the single real
 * <img>, and `onRevealComplete` fires.
 *
 * Accessibility: the frame is aria-busy until the picture is complete, and
 * then exposes one <img> with `alt`. Everything drawn along the way — cells,
 * pieces, the hidden full image — is aria-hidden. With no `alt` the frame is
 * decorative and hidden from assistive technology altogether. Under reduced
 * motion the sweep stops, splits happen without the spring and the reveal is
 * near-instant.
 */

const PREFIX = "dowel-grid-reveal";

/** Progress the split holds at until the image decodes. */
const HOLD = 0.72;
const START_CELLS = 4;
const MAX_CELLS = 32;
/** How often the paced clock is sampled, in ms. */
const TICK_MS = 120;
/** One cell's blur-to-sharp, and the spread from first cell to last, in ms. */
const RESOLVE_MS = 560;
const STAGGER_MS = 520;
/** Width in px of the copy the reveal order is measured on. */
const SAMPLE = 48;

const STYLES = `
.${PREFIX}{--grid-reveal-resolve:calc(${String(RESOLVE_MS)}ms * var(--motion-scale,1));--grid-reveal-stagger:calc(${String(STAGGER_MS)}ms * var(--motion-scale,1));--grid-reveal-sweep:calc(2400ms * var(--motion-scale,1))}
.${PREFIX} [data-slot=grid-reveal-cell]{position:absolute;clip-path:inset(var(--grid-reveal-gutter) round var(--grid-reveal-radius))}
.${PREFIX}[data-state=revealing] [data-slot=grid-reveal-cell]{animation:${PREFIX}-seal var(--grid-reveal-resolve) var(--ease-out-quint) both;animation-delay:calc(var(--grid-reveal-order) * var(--grid-reveal-stagger))}
.${PREFIX} [data-slot=grid-reveal-tile]{position:absolute;inset:0;overflow:hidden;background:radial-gradient(circle at var(--grid-reveal-gx) var(--grid-reveal-gy),color-mix(in oklab,var(--color-foreground) calc(var(--grid-reveal-tint) * 10%),transparent),transparent 75%),var(--color-muted)}
.${PREFIX} [data-slot=grid-reveal-tile]::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,color-mix(in oklab,var(--color-background) 40%,transparent) 50%,transparent 70%);transform:translateX(-100%);animation:${PREFIX}-sweep var(--grid-reveal-sweep) var(--ease-in-out-quint) infinite;animation-delay:calc(var(--grid-reveal-phase) * var(--grid-reveal-sweep) * -1)}
.${PREFIX} [data-slot=grid-reveal-veil]{position:absolute;inset:0;overflow:hidden;animation:${PREFIX}-resolve var(--grid-reveal-resolve) var(--ease-out-quint) both;animation-delay:calc(var(--grid-reveal-order) * var(--grid-reveal-stagger))}
.${PREFIX} [data-slot=grid-reveal-veil]>img{position:absolute;max-width:none;object-fit:cover;user-select:none}
@keyframes ${PREFIX}-sweep{to{transform:translateX(100%)}}
@keyframes ${PREFIX}-resolve{from{opacity:0;filter:blur(14px);transform:scale(1.08)}to{opacity:1;filter:blur(0);transform:none}}
@keyframes ${PREFIX}-seal{to{clip-path:inset(0 round 0)}}
`;

const gridRevealVariants = cva(
  "relative isolate w-full overflow-hidden rounded-xl bg-muted/50",
  {
    variants: {
      /** The seams between cells while the image is on its way. They close as it resolves. */
      gutter: {
        none: "[--grid-reveal-gutter:0px] [--grid-reveal-radius:0px]",
        sm: "[--grid-reveal-gutter:1px] [--grid-reveal-radius:4px]",
        md: "[--grid-reveal-gutter:2px] [--grid-reveal-radius:8px]",
      },
    },
    defaultVariants: { gutter: "sm" },
  },
);

/** A rectangle of the frame, in 0–1 units of its width and height. */
interface Cell {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The dimension this cell's last cut divided. */
  axis: "x" | "y";
}

/** A well-mixed 32-bit hash, as 0–1. */
function hash(value: number): number {
  let x = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function hashString(text: string): number {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) {
    value = Math.imul(value ^ text.charCodeAt(index), 0x01000193);
  }
  return value >>> 0;
}

/** The four opening cells, then the largest split in two until there are `count`. */
function splitCells(count: number, aspect: number, seed: number): Cell[] {
  const cells: Cell[] = [0, 1, 2, 3].map((id) => ({
    id,
    x: (id % 2) / 2,
    y: Math.floor(id / 2) / 2,
    w: 0.5,
    h: 0.5,
    axis: hash(seed + id) < 0.5 ? "x" : "y",
  }));
  for (let id = START_CELLS; cells.length < count; id += 1) {
    let pick = 0;
    let largest = -1;
    let tie = 2;
    cells.forEach((cell, index) => {
      const area = cell.w * cell.h;
      const rank = hash(seed ^ (cell.id * 7919));
      if (area > largest + 1e-9 || (area > largest - 1e-9 && rank < tie)) {
        pick = index;
        largest = area;
        tie = rank;
      }
    });
    const cell = cells[pick];
    if (!cell) break;
    const wide = cell.w * aspect;
    const axis: Cell["axis"] =
      wide > cell.h * 1.02 ? "x" : cell.h > wide * 1.02 ? "y" : cell.axis === "x" ? "y" : "x";
    const ratio = 0.42 + hash(seed + id * 131) * 0.16;
    const keep: Cell =
      axis === "x"
        ? { ...cell, w: cell.w * ratio, axis }
        : { ...cell, h: cell.h * ratio, axis };
    const added: Cell =
      axis === "x"
        ? { id, x: cell.x + keep.w, y: cell.y, w: cell.w - keep.w, h: cell.h, axis }
        : { id, x: cell.x, y: cell.y + keep.h, w: cell.w, h: cell.h - keep.h, axis };
    cells.splice(pick, 1, keep, added);
  }
  return cells;
}

/** Cells for a point in the wait: four at 0, all of them at the hold. */
function cellCount(progress: number): number {
  const share = Math.min(1, Math.max(0, progress / HOLD));
  return START_CELLS + Math.round(share * (MAX_CELLS - START_CELLS));
}

/**
 * Mean luminance gradient per cell, measured on a small copy of the image
 * cropped as object-fit: cover crops it. Null when the pixels cannot be read.
 */
function measureDetail(
  image: HTMLImageElement,
  cells: Cell[],
  aspect: number,
): number[] | null {
  const width = SAMPLE;
  const height = Math.max(8, Math.round(SAMPLE / aspect));
  let data: Uint8ClampedArray;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const { naturalWidth: nw, naturalHeight: nh } = image;
    if (!context || !nw || !nh) return null;
    const frame = width / height;
    const sw = nw / nh > frame ? nh * frame : nw;
    const sh = nw / nh > frame ? nh : nw / frame;
    context.drawImage(image, (nw - sw) / 2, (nh - sh) / 2, sw, sh, 0, 0, width, height);
    // Throws for a cross-origin image served without CORS.
    data = context.getImageData(0, 0, width, height).data;
  } catch {
    return null;
  }
  const luma = new Float32Array(width * height);
  for (let index = 0; index < luma.length; index += 1) {
    const offset = index * 4;
    luma[index] =
      0.2126 * (data[offset] ?? 0) +
      0.7152 * (data[offset + 1] ?? 0) +
      0.0722 * (data[offset + 2] ?? 0);
  }
  const at = (x: number, y: number) =>
    luma[Math.min(height - 1, y) * width + Math.min(width - 1, x)] ?? 0;
  return cells.map((cell) => {
    const x0 = Math.min(width - 1, Math.floor(cell.x * width));
    const y0 = Math.min(height - 1, Math.floor(cell.y * height));
    const x1 = Math.max(x0 + 1, Math.round((cell.x + cell.w) * width));
    const y1 = Math.max(y0 + 1, Math.round((cell.y + cell.h) * height));
    let sum = 0;
    let samples = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const here = at(x, y);
        sum += Math.abs(at(x + 1, y) - here) + Math.abs(at(x, y + 1) - here);
        samples += 1;
      }
    }
    return sum / samples;
  });
}

/** Cell id → when it resolves, 0 (first) to 1 (last): busiest and most central first. */
function revealOrder(cells: Cell[], aspect: number, detail: number[] | null) {
  const peak = detail ? Math.max(...detail) : 0;
  const reach = Math.hypot(0.5 * aspect, 0.5);
  const scored = cells.map((cell, index) => {
    const centre =
      1 - Math.hypot((cell.x + cell.w / 2 - 0.5) * aspect, cell.y + cell.h / 2 - 0.5) / reach;
    const busy = detail && peak > 0 ? (detail[index] ?? 0) / peak : null;
    return { id: cell.id, score: busy === null ? centre : busy * 0.7 + centre * 0.3 };
  });
  scored.sort((a, b) => b.score - a.score);
  const last = Math.max(1, scored.length - 1);
  return Object.fromEntries(scored.map((entry, rank) => [entry.id, rank / last]));
}

/** The reveal's time scale: 0 under reduced motion, else the theme's --motion-scale. */
function revealScale(): number {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  const scale = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue("--motion-scale"),
  );
  return Number.isFinite(scale) ? Math.max(0, scale) : 1;
}

function percent(value: number): string {
  return `${String(Math.round(value * 1e6) / 1e4)}%`;
}

/** A critically damped spring: a split settles without overshoot. */
const SPLIT: Transition = { type: "spring", duration: 0.55, bounce: 0 };
const APPEAR: Transition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] };
const LEAVE: Transition = { duration: 0.14, ease: [0.64, 0, 0.78, 0] };

type Phase = "generating" | "revealing" | "done";

interface Run {
  /** Increments whenever a new image is awaited. */
  id: number;
  src: string | null;
  phase: Phase;
  /** Cells frozen when the image decoded. */
  count: number;
  /** Cell id → reveal delay, 0–1. */
  order: Record<number, number>;
  failed: boolean;
}

export interface GridRevealProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children" | "onError">,
    VariantProps<typeof gridRevealVariants> {
  /**
   * The image to reveal. Keep it null while the image is generating — the
   * grid only runs while it is empty, and a src that is already loaded makes
   * the whole run flash by.
   */
  src?: string | null;
  /** Describes the finished image. Without it the frame is hidden from assistive technology. */
  alt?: string;
  /**
   * How far through the wait, 0–1; drives how far the grid has split. Held at
   * 0.72 until the image decodes. Omit it to pace the grid by `estimatedDuration`.
   */
  progress?: number;
  /** Width ÷ height of the frame. It fills its parent's width, so size the parent. */
  aspect?: number;
  /** Status text in a frosted pill at the bottom-start of the frame. Changes cross-fade. */
  caption?: string;
  /** Roughly how long the work takes, in ms, to pace the grid without `progress`. Overrunning is fine. */
  estimatedDuration?: number;
  /** Forwarded to the images. Set "anonymous" for a CORS-enabled host so the reveal order can read the pixels. */
  crossOrigin?: "anonymous" | "use-credentials";
  /** Fires once the image has fully resolved. */
  onRevealComplete?: () => void;
  /** Fires when the image fails to load. The grid keeps waiting, so show your own fallback. */
  onError?: () => void;
}

/** A loading frame for a generated image that splits while it waits and resolves into the picture. */
export function GridReveal({
  className,
  gutter,
  src = null,
  alt,
  progress,
  aspect = 1,
  caption,
  estimatedDuration = 10000,
  crossOrigin,
  onRevealComplete,
  onError,
  style,
  ...props
}: GridRevealProps) {
  const ratio = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  const seed = hashString(useId());
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [run, setRun] = useState<Run>({
    id: 0,
    src,
    phase: "generating",
    count: START_CELLS,
    order: {},
    failed: false,
  });
  if (src !== run.src) {
    // null → an image: the awaited picture arrived, and this run carries on.
    // Anything else is a new wait from four cells.
    setRun(
      run.src === null
        ? { ...run, src }
        : {
            id: run.id + 1,
            src,
            phase: "generating",
            count: START_CELLS,
            order: {},
            failed: false,
          },
    );
  }

  const paced = progress === undefined;
  const [clock, setClock] = useState({ run: 0, count: START_CELLS });
  const started = useRef({ run: -1, at: 0 });
  useEffect(() => {
    if (!paced || run.phase !== "generating") return;
    if (started.current.run !== run.id)
      started.current = { run: run.id, at: performance.now() };
    const runId = run.id;
    const tau = Math.max(1, estimatedDuration) / 2.2;
    const timer = setInterval(() => {
      const elapsed = performance.now() - started.current.at;
      const count = cellCount(HOLD * (1 - Math.exp(-elapsed / tau)));
      setClock((current) =>
        current.run === runId && current.count === count ? current : { run: runId, count },
      );
      // Fully split: nothing left to pace until the image arrives.
      if (count >= MAX_CELLS) clearInterval(timer);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paced, run.id, run.phase, estimatedDuration]);

  const liveCount = paced
    ? clock.run === run.id
      ? clock.count
      : START_CELLS
    : cellCount(Math.min(progress, HOLD));
  const count = run.phase === "generating" ? liveCount : run.count;
  const cells = useMemo(() => splitCells(count, ratio, seed), [count, ratio, seed]);

  const latest = useRef({ count, ratio, seed, onRevealComplete, onError });
  useLayoutEffect(() => {
    latest.current = { count, ratio, seed, onRevealComplete, onError };
  });

  const begun = useRef(-1);
  const begin = (image: HTMLImageElement) => {
    const runId = run.id;
    if (begun.current === runId || run.phase !== "generating") return;
    begun.current = runId;
    const decoded =
      typeof image.decode === "function"
        ? image.decode().catch(() => undefined)
        : Promise.resolve();
    void decoded.then(() => {
      const frozen = latest.current;
      const frozenCells = splitCells(frozen.count, frozen.ratio, frozen.seed);
      const order = revealOrder(
        frozenCells,
        frozen.ratio,
        measureDetail(image, frozenCells, frozen.ratio),
      );
      setRun((current) =>
        current.id === runId && current.phase === "generating"
          ? { ...current, phase: "revealing", count: frozen.count, order, failed: false }
          : current,
      );
    });
  };

  // An image that finished loading before hydration fires no load event.
  useLayoutEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) begin(image);
  });

  useEffect(() => {
    if (run.phase !== "revealing") return;
    const runId = run.id;
    const timer = setTimeout(
      () => {
        setRun((current) =>
          current.id === runId && current.phase === "revealing"
            ? { ...current, phase: "done" }
            : current,
        );
        latest.current.onRevealComplete?.();
      },
      (RESOLVE_MS + STAGGER_MS) * revealScale(),
    );
    return () => clearTimeout(timer);
  }, [run.id, run.phase]);

  const done = run.phase === "done";
  const revealing = run.phase === "revealing";

  return (
    <MotionConfig reducedMotion="user">
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="grid-reveal"
        data-state={run.phase}
        data-error={run.failed ? "" : undefined}
        aria-busy={done ? undefined : true}
        aria-hidden={alt ? undefined : true}
        className={cn(PREFIX, gridRevealVariants({ gutter }), className)}
        style={{ aspectRatio: String(ratio), ...style }}
        {...props}
      >
        {run.src ? (
          <img
            ref={imageRef}
            data-slot="grid-reveal-image"
            src={run.src}
            alt={done ? (alt ?? "") : ""}
            aria-hidden={done ? undefined : true}
            crossOrigin={crossOrigin}
            decoding="async"
            draggable={false}
            onLoad={(event) => begin(event.currentTarget)}
            onError={() => {
              setRun((current) =>
                current.id === run.id ? { ...current, failed: true } : current,
              );
              latest.current.onError?.();
            }}
            className={cn("absolute inset-0 size-full object-cover", !done && "opacity-0")}
          />
        ) : null}
        {done ? null : (
          <div data-slot="grid-reveal-cells" aria-hidden="true" className="absolute inset-0">
            <AnimatePresence initial={false}>
              {cells.map((cell) => (
                <motion.div
                  key={cell.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: LEAVE }}
                  transition={SPLIT}
                  data-slot="grid-reveal-cell"
                  style={
                    {
                      left: percent(cell.x),
                      top: percent(cell.y),
                      width: percent(cell.w),
                      height: percent(cell.h),
                      "--grid-reveal-order": String(run.order[cell.id] ?? 1),
                      "--grid-reveal-phase": String((cell.x + cell.y) / 2),
                      "--grid-reveal-tint": String(0.3 + hash(seed + cell.id * 17) * 0.7),
                      "--grid-reveal-gx": percent(0.2 + hash(seed + cell.id * 23) * 0.6),
                      "--grid-reveal-gy": percent(0.2 + hash(seed + cell.id * 29) * 0.6),
                    } as CSSProperties
                  }
                >
                  <span data-slot="grid-reveal-tile" />
                  {revealing && run.src ? (
                    <span data-slot="grid-reveal-veil">
                      <img
                        src={run.src}
                        alt=""
                        crossOrigin={crossOrigin}
                        draggable={false}
                        style={{
                          left: percent(-cell.x / cell.w),
                          top: percent(-cell.y / cell.h),
                          width: percent(1 / cell.w),
                          height: percent(1 / cell.h),
                        }}
                      />
                    </span>
                  ) : null}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        {caption && !done ? (
          <motion.div
            layout
            transition={SPLIT}
            data-slot="grid-reveal-caption"
            data-state={revealing ? "hidden" : "visible"}
            style={{ borderRadius: 9999 }}
            className={cn(
              "absolute start-3 bottom-3 z-10 flex max-w-[calc(100%-1.5rem)] overflow-hidden",
              "border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md",
              "transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-in-quint)] data-[state=hidden]:opacity-0",
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={caption}
                layout
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, transition: LEAVE }}
                transition={APPEAR}
                className="block truncate"
              >
                <ShimmerText duration={3200}>{caption}</ShimmerText>
              </motion.span>
            </AnimatePresence>
          </motion.div>
        ) : null}
      </div>
    </MotionConfig>
  );
}

export { gridRevealVariants };
