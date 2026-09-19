"use client";

// Ported from amicro "Dither Donut Graph" and "Device Usage Donut" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useRef,
  useState,
  type ComponentPropsWithRef,
  type PointerEvent,
  type ReactNode,
} from "react";

import {
  angleInWedge,
  createSprings,
  DitherCanvas,
  ditherFill,
  DitherTable,
  drift,
  formatDitherValue,
  hash2,
  makePath,
  pieWedges,
  seriesColor,
  shimmer,
  smoothstep,
  tokenToCss,
  traceRoundedWedge,
  traceWedge,
  wedgeAt,
  type DitherDraw,
} from "@/components/dither-canvas";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A donut drawn in dithered cells. Two looks from amicro:
 *
 * - `graph` (Dither Donut Graph): rounded wedges with gaps, cells that grow
 *   toward the outer edge, a three-sine shimmer, and the active wedge popping
 *   outward with a scatter of highlight particles.
 * - `flat` (Device Usage Donut): plain sectors, even cells, a two-sine drift.
 *
 * Shares and pop-outs are springs in the engine, so a data change morphs.
 * Hovering a wedge or a legend entry previews it; clicking a legend entry pins
 * it (aria-pressed). The period selector in amicro's demo is consumer UI and
 * lives in the stories.
 */

export const ditherDonutVariants = cva("flex flex-wrap items-center gap-x-6 gap-y-4", {
  variants: {
    size: {
      sm: "[--dither-donut-size:8rem]",
      md: "[--dither-donut-size:11rem]",
      lg: "[--dither-donut-size:14rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface DitherDonutDatum {
  label: string;
  value: number;
  /** Colour token (`"primary"`) or CSS colour expression. Defaults to the palette. */
  color?: string;
}

export interface DitherDonutLabels {
  category?: string;
  value?: string;
  share?: string;
  total?: string;
}

export interface DitherDonutProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof ditherDonutVariants> {
  data: readonly DitherDonutDatum[];
  /** What the chart shows. Names the image, the legend and the data table. */
  label: string;
  /** Replaces the generated summary in the image's accessible name. */
  description?: string;
  variant?: "graph" | "flat";
  /** Ring thickness as a fraction of the radius. Default 0.36. */
  thickness?: number;
  formatValue?: (value: number) => string;
  /** Centre content. Defaults to the active entry, or the total; null hides it. */
  center?: ReactNode;
  showLegend?: boolean;
  /** Show the data table. It is always present for assistive technology. */
  showTable?: boolean;
  /** Run the shimmer. Reduced motion stops it regardless. */
  animate?: boolean;
  cell?: number;
  /** The pinned entry (controlled). */
  activeIndex?: number | null;
  defaultActiveIndex?: number | null;
  onActiveIndexChange?: (index: number | null) => void;
  labels?: DitherDonutLabels;
}

const PERCENT = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 0,
});

function donutLayout(width: number, height: number, thickness: number, graph: boolean) {
  const size = Math.min(width, height);
  const pop = graph ? size * 0.03 : 0;
  const outer = Math.max(0, size / 2 - pop - 1);
  return {
    center: { x: width / 2, y: height / 2 },
    outer,
    inner: outer * (1 - Math.min(0.9, Math.max(0.1, thickness))),
    pop,
  };
}

export function DitherDonut({
  data,
  label,
  description,
  variant = "graph",
  size,
  thickness = 0.36,
  formatValue = formatDitherValue,
  center,
  showLegend = true,
  showTable = false,
  animate = true,
  cell,
  activeIndex,
  defaultActiveIndex = null,
  onActiveIndexChange,
  labels,
  className,
  ...props
}: DitherDonutProps) {
  const [uncontrolled, setUncontrolled] = useState<number | null>(defaultActiveIndex);
  const [preview, setPreview] = useState<number | null>(null);
  const pinned = activeIndex !== undefined ? activeIndex : uncontrolled;
  const active = preview ?? pinned;

  const graph = variant === "graph";
  const values = data.map((datum) => (datum.value > 0 ? datum.value : 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  const targets = values.map((value) => (total > 0 ? value / total : 0));

  const shares = useRef(createSprings(targets));
  const pops = useRef(
    createSprings(
      targets.map(() => 0),
      { stiffness: 320, damping: 24 },
    ),
  );

  const pin = (index: number) => {
    const next = pinned === index ? null : index;
    if (activeIndex === undefined) setUncontrolled(next);
    onActiveIndexChange?.(next);
  };

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height, time, animated } = frame;
    const step = frame.cell;
    const { center: c, outer, inner, pop } = donutLayout(width, height, thickness, graph);
    shares.current.set(targets);
    pops.current.set(targets.map((_, index) => (index === active ? 1 : 0)));
    const sharesMoving = shares.current.step(frame.delta, frame.reducedMotion);
    const moving = pops.current.step(frame.delta, frame.reducedMotion) || sharesMoving;
    const popped = pops.current.values;
    const t = time * 1.2;
    const bounds = {
      x: c.x - outer - step,
      y: c.y - outer - step,
      width: 2 * (outer + step),
      height: 2 * (outer + step),
    };

    for (const wedge of pieWedges(shares.current.values, { gap: graph ? 0.07 : 0 })) {
      if (wedge.share <= 0 || wedge.end <= wedge.start) continue;
      const { index, start, end, mid } = wedge;
      const isActive = index === active;
      const lift = pop * (popped[index] ?? 0);
      ctx.save();
      ctx.translate(Math.cos(mid) * lift, Math.sin(mid) * lift);
      const clip = makePath((sink) => {
        if (graph) traceRoundedWedge(sink, c, inner, outer, start, end, 6);
        else traceWedge(sink, c, inner, outer, start, end);
      });
      const inside = (cx: number, cy: number) => {
        const distance = Math.hypot(cx - c.x, cy - c.y);
        return (
          distance >= inner - step &&
          distance <= outer + step &&
          angleInWedge(Math.atan2(cy - c.y, cx - c.x), start, end)
        );
      };
      ditherFill(ctx, {
        clip,
        bounds,
        cell: step,
        color: frame.color(seriesColor(index, data[index]?.color)),
        alpha: isActive ? 1 : active !== null ? 0.3 : graph ? 0.78 : 0.85,
        density: (cx, cy) => {
          if (!inside(cx, cy)) return 0;
          const jitter = hash2(cx, cy);
          if (!graph)
            return (0.4 + 0.4 * (animated ? drift(cx, cy, t) : 0.5)) * (0.8 + 0.4 * jitter);
          const dx = cx - c.x;
          const dy = cy - c.y;
          const distance = Math.hypot(dx, dy);
          const fullness = smoothstep(0.62, 1, (distance - inner) / Math.max(1, outer - inner));
          const wave = animated
            ? shimmer(
                Math.sin(distance * 0.1 - t),
                Math.sin(Math.atan2(dy, dx) * 3 + t * 1.5),
                Math.sin((dx + dy) * 0.05 + t * 2),
              )
            : 0.5;
          return (
            ((isActive ? 0.46 : 0.34) + 0.36 * fullness + 0.26 * wave) * (0.78 + 0.42 * jitter)
          );
        },
      });
      if (isActive) {
        // Highlight particles: a sparse second layer, re-seeded a few times a
        // second while animating, still under reduced motion.
        const seed = animated ? 1 + Math.floor(time * 6) : 1;
        ditherFill(ctx, {
          clip,
          bounds,
          cell: step,
          color: frame.color("foreground"),
          alpha: 0.9,
          density: (cx, cy) => (inside(cx, cy) && hash2(cx, cy, seed) > 0.92 ? 0.8 : 0),
        });
      }
      ctx.restore();
    }
    return moving;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const layout = donutLayout(rect.width, rect.height, thickness, graph);
    const hit = wedgeAt(
      pieWedges(targets, { gap: graph ? 0.07 : 0 }),
      layout.center,
      layout.inner,
      layout.outer + layout.pop,
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
    );
    if (hit !== preview) setPreview(hit);
  };

  const share = (index: number) => PERCENT.format(targets[index] ?? 0);
  const summary =
    description ??
    `${data.map((datum, index) => `${datum.label} ${formatValue(datum.value)} (${share(index)})`).join(", ")}. ${labels?.total ?? "Total"} ${formatValue(total)}.`;
  const activeDatum = active !== null ? data[active] : undefined;

  const readout =
    center !== undefined ? (
      center
    ) : (
      <>
        <span className="text-xs text-muted-foreground">
          {activeDatum?.label ?? labels?.total ?? "Total"}
        </span>
        <span className="text-lg font-semibold text-foreground tabular-nums">
          {formatValue(activeDatum ? activeDatum.value : total)}
        </span>
        {activeDatum && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {share(active ?? 0)}
          </span>
        )}
      </>
    );

  return (
    <div
      data-slot="dither-donut"
      data-variant={variant}
      {...props}
      className={cn(ditherDonutVariants({ size }), className)}
    >
      <div
        data-slot="dither-donut-plot"
        className="relative size-[var(--dither-donut-size)] shrink-0"
      >
        <div
          role="img"
          aria-label={`${label}: ${summary}`}
          className="size-full"
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            setPreview(null);
          }}
        >
          <DitherCanvas draw={draw} animate={animate} cell={cell} />
        </div>
        {readout !== null && (
          <div
            data-slot="dither-donut-readout"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-tight"
          >
            {readout}
          </div>
        )}
      </div>
      {showLegend && (
        <ul
          data-slot="dither-donut-legend"
          aria-label={label}
          className="flex min-w-0 flex-1 flex-col gap-1"
        >
          {data.map((datum, index) => (
            <li key={`${datum.label}-${String(index)}`}>
              <button
                type="button"
                aria-pressed={pinned === index}
                aria-label={`${datum.label}: ${formatValue(datum.value)} (${share(index)})`}
                data-active={active === index || undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] hover:bg-muted aria-pressed:bg-accent aria-pressed:text-accent-foreground data-active:bg-muted",
                  focusRing,
                )}
                onPointerEnter={() => {
                  setPreview(index);
                }}
                onPointerLeave={() => {
                  setPreview(null);
                }}
                onFocus={() => {
                  setPreview(index);
                }}
                onBlur={() => {
                  setPreview(null);
                }}
                onClick={() => {
                  pin(index);
                }}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: tokenToCss(seriesColor(index, datum.color)) }}
                />
                <span className="min-w-0 flex-1 truncate text-start font-medium text-foreground">
                  {datum.label}
                </span>
                <span className="text-foreground tabular-nums">{formatValue(datum.value)}</span>
                <span className="w-9 text-end font-mono text-2xs text-muted-foreground">
                  {share(index)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <DitherTable
        caption={label}
        columns={[
          labels?.category ?? "Category",
          labels?.value ?? "Value",
          labels?.share ?? "Share",
        ]}
        rows={data.map((datum, index) => [datum.label, formatValue(datum.value), share(index)])}
        visible={showTable}
        className={showTable ? "basis-full" : undefined}
      />
    </div>
  );
}
