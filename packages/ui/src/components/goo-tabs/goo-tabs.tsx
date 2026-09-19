"use client";

// Ported from bencho Icon bar (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
} from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabsContentProps,
  type TabsListProps,
  type TabsTriggerProps,
} from "@/components/tabs";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Dowel Tabs with a motion flourish: an icon bar whose pill stretches like a
 * caterpillar over the old and new tab, then snaps onto the new one with an
 * overshoot. A thin composition on Dowel's Tabs (Radix), so the tablist,
 * roving focus (RTL-aware), Home/End, automatic activation and aria-controls
 * are Radix's; this file adds only the styling and the indicator.
 *
 * The indicator is an aria-hidden layer of opaque shapes (the pill plus a
 * trailing blob) at 7% opacity as a whole, so overlapping shapes never darken
 * each other. With `goo`, an inline SVG filter (blur + alpha threshold +
 * composite) melts the pill and blob together. The filter sits on a box that
 * never transforms (only its children move), so Chromium rasterises it at the
 * right scale, and it never touches the icons. Without filter support, under
 * reduced motion, or with `goo={false}`, the same two-phase pill runs plain.
 */

const REDUCE = "(prefers-reduced-motion: reduce)";
const STRETCH_EASE = "cubic-bezier(.32,.72,.24,1)";

export type GooTabsProps = ComponentPropsWithRef<typeof Tabs>;

/** The tabs root: value, defaultValue, onValueChange, orientation, dir. */
export function GooTabs({ className, ...props }: GooTabsProps) {
  return (
    <Tabs
      data-slot="goo-tabs"
      className={cn("flex flex-col gap-3 data-[orientation=vertical]:flex-row", className)}
      {...props}
    />
  );
}

const gooTabsListVariants = cva(
  "relative isolate gap-0.5 shadow-sm data-[orientation=vertical]:flex-col",
  {
    variants: {
      /** `default` is the card surface; `inverted` swaps it for the ink colour. */
      tone: {
        default: "bg-card text-foreground",
        inverted: "bg-foreground text-background",
      },
      /** A 1px inset hairline around the bar. */
      stroke: {
        true: "ring-1 ring-border ring-inset",
        false: "",
      },
    },
    defaultVariants: { tone: "default", stroke: false },
  },
);

export interface GooTabsListProps
  extends
    Omit<TabsListProps, "variant" | "indicator">,
    VariantProps<typeof gooTabsListVariants> {
  /** 0–100: how far the stretch phase reaches toward the full old→new span. 0 slides. */
  dilate?: number;
  /** 0–100: overshoot of the settle phase. */
  bounce?: number;
  /** 0–100: stretch/settle take 304/672ms at 0, 190/420ms at 50, 76/168ms at 100. */
  speed?: number;
  /** Radius of the bar and the pill, in px. */
  corner?: number;
  /** Padding of the bar (the pill's inset), in px. */
  hug?: number;
  /** Melt the pill and its trailing blob together with an SVG goo filter. */
  goo?: boolean;
}

/** The bar: a tablist hosting the indicator. */
export function GooTabsList({
  className,
  style,
  children,
  dilate = 100,
  bounce = 50,
  speed = 50,
  corner = 26,
  hug = 6,
  goo = true,
  tone,
  stroke,
  ...props
}: GooTabsListProps) {
  return (
    <TabsList
      data-slot="goo-tabs-list"
      className={cn(gooTabsListVariants({ tone, stroke }), className)}
      style={{ padding: hug, borderRadius: corner, ...style }}
      {...props}
    >
      <GooIndicator dilate={dilate} bounce={bounce} speed={speed} corner={corner} goo={goo} />
      {children}
    </TabsList>
  );
}

type Box = { x: number; y: number; w: number; h: number };
type Phase = "idle" | "stretch" | "settle";
interface IndicatorState {
  box: Box;
  phase: Phase;
  /** The slot the pill left, where the trailing blob sits. */
  from?: Box;
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 100);

/** Stretch and settle durations, interpolated from the source's three stops. */
export function gooTabsTimings(speed: number) {
  const s = clamp(speed);
  return { stretch: 304 - 2.28 * s, settle: 672 - 5.04 * s };
}

/** The pill over the old→new span, `dilate` of the way from the target. */
export function gooTabsStretch(from: Box, to: Box, dilate: number, vertical: boolean): Box {
  const d = clamp(dilate) / 100;
  const [pos, size] = vertical ? (["y", "h"] as const) : (["x", "w"] as const);
  const spanStart = Math.min(from[pos], to[pos]);
  const spanEnd = Math.max(from[pos] + from[size], to[pos] + to[size]);
  const start = to[pos] + (spanStart - to[pos]) * d;
  const end = to[pos] + to[size] + (spanEnd - to[pos] - to[size]) * d;
  return { ...to, [pos]: start, [size]: end - start };
}

/** The active tab's box relative to the list, from its offsets. */
function measure(list: HTMLElement): Box | null {
  const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
  if (!active) return null;
  if (active.offsetParent === list) {
    return {
      x: active.offsetLeft,
      y: active.offsetTop,
      w: active.offsetWidth,
      h: active.offsetHeight,
    };
  }
  // A trigger wrapped in its own positioned element (a tooltip anchor, say).
  const from = list.getBoundingClientRect();
  const to = active.getBoundingClientRect();
  return {
    x: to.left - from.left - list.clientLeft,
    y: to.top - from.top - list.clientTop,
    w: to.width,
    h: to.height,
  };
}

const same = (a: Box, b: Box) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the goo filter can run: supported, and motion not reduced. */
function gooSnapshot() {
  const supported =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("filter", "url(#x)");
  return supported && !window.matchMedia(REDUCE).matches;
}

const ms = (value: number) => `calc(${String(Math.round(value))}ms * var(--motion-scale))`;

interface GooIndicatorProps {
  dilate: number;
  bounce: number;
  speed: number;
  corner: number;
  goo: boolean;
}

function GooIndicator({ dilate, bounce, speed, corner, goo }: GooIndicatorProps) {
  const node = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<IndicatorState | null>(null);
  const target = useRef<Box | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const feel = useRef({ dilate, speed });
  const filterId = `dowel-goo-tabs-${useId().replace(/[^\w-]/g, "")}`;
  const gooOn = useSyncExternalStore(subscribe, gooSnapshot, () => false) && goo;

  useEffect(() => {
    feel.current = { dilate, speed };
  }, [dilate, speed]);

  const update = useCallback((animate: boolean) => {
    const list = node.current?.parentElement;
    if (!list) return;
    const next = measure(list);
    const previous = target.current;
    if (!next || (previous && same(previous, next))) return;
    target.current = next;
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
    if (!animate || !previous || window.matchMedia(REDUCE).matches) {
      setState({ box: next, phase: "idle" });
      return;
    }
    const vertical = list.getAttribute("aria-orientation") === "vertical";
    const { stretch, settle } = gooTabsTimings(feel.current.speed);
    setState({
      box: gooTabsStretch(previous, next, feel.current.dilate, vertical),
      phase: "stretch",
      from: previous,
    });
    // The settle starts a little before the stretch finishes, as the source does.
    timers.current.push(
      setTimeout(() => {
        setState({ box: next, phase: "settle", from: previous });
        timers.current.push(setTimeout(() => setState({ box: next, phase: "idle" }), settle));
      }, stretch * 0.82),
    );
  }, []);

  useLayoutEffect(() => {
    const list = node.current?.parentElement;
    if (!list) return;
    update(false);
    const mutations = new MutationObserver(() => update(true));
    mutations.observe(list, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
    });
    const resizes = new ResizeObserver(() => update(false));
    resizes.observe(list);
    for (const tab of list.querySelectorAll('[role="tab"]')) resizes.observe(tab);
    return () => {
      mutations.disconnect();
      resizes.disconnect();
      for (const timer of timers.current) clearTimeout(timer);
    };
  }, [update]);

  const { stretch, settle } = gooTabsTimings(speed);
  const b = clamp(bounce) / 100;
  const y1 = (k: number) => String(Math.round((1 + k * b) * 1000) / 1000);
  const move = `cubic-bezier(.28,${y1(0.56)},.36,1)`;
  const size = `cubic-bezier(.24,${y1(0.68)},.38,1)`;
  const phase = state?.phase ?? "idle";
  const transition =
    phase === "stretch"
      ? ["transform", "width", "height"]
          .map((p) => `${p} ${ms(stretch)} ${STRETCH_EASE}`)
          .join(",")
      : phase === "settle"
        ? `transform ${ms(settle)} ${move},width ${ms(settle)} ${size},height ${ms(settle)} ${size}`
        : "none";
  const box = state?.box;
  const blob = gooOn && state?.from && phase !== "idle" ? state.from : null;

  return (
    <span
      ref={node}
      aria-hidden="true"
      data-slot="goo-tabs-indicator"
      data-phase={phase}
      data-goo={gooOn ? "" : undefined}
      className={cn("pointer-events-none absolute inset-0 -z-10 opacity-7", !box && "hidden")}
    >
      {gooOn ? (
        <svg className="absolute size-0" focusable="false">
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </svg>
      ) : null}
      {/* The filtered box never moves; only its children do. */}
      <span
        data-slot="goo-tabs-goo"
        className="absolute inset-0"
        style={gooOn ? { filter: `url(#${filterId})` } : undefined}
      >
        {box ? (
          <span
            data-slot="goo-tabs-pill"
            className="absolute bg-current"
            // Physical top-left, because the offsets it moves by are physical.
            style={{
              top: 0,
              left: 0,
              width: box.w,
              height: box.h,
              borderRadius: corner,
              transform: `translate3d(${String(box.x)}px,${String(box.y)}px,0)`,
              transition,
            }}
          />
        ) : null}
        {blob ? (
          <span
            data-slot="goo-tabs-blob"
            className="absolute rounded-full bg-current"
            style={{
              top: 0,
              left: 0,
              width: blob.w,
              height: blob.h,
              transform: `translate3d(${String(blob.x)}px,${String(blob.y)}px,0) scale(${phase === "stretch" ? 1 : 0})`,
              transition: phase === "settle" ? `transform ${ms(settle * 0.7)} ease-in` : "none",
            }}
          />
        ) : null}
      </span>
    </span>
  );
}

export type GooTabsTriggerProps = Omit<TabsTriggerProps, "asChild" | "variant">;

/** An icon tab. Icon-only tabs must be named with aria-label (it warns in development). */
export function GooTabsTrigger({ className, children, ...props }: GooTabsTriggerProps) {
  const named = Boolean(
    props["aria-label"] || props["aria-labelledby"] || typeof children === "string",
  );
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || named) return;
    console.warn("[GooTabsTrigger] An icon-only tab has no accessible name. Pass aria-label.");
  }, [named]);

  return (
    <TabsTrigger
      data-slot="goo-tabs-trigger"
      className={cn(
        "group/goo relative size-9.5 shrink-0 rounded-full px-0 text-current",
        focusRing,
        "hover:text-current data-[state=active]:bg-transparent data-[state=active]:text-current data-[state=active]:shadow-none",
        "[&_svg:not([class*='size-'])]:size-4.5",
        className,
      )}
      {...props}
    >
      <span
        data-slot="goo-tabs-icon"
        className={cn(
          "inline-flex items-center justify-center gap-2 opacity-42",
          "transition-opacity duration-[calc(260ms*var(--motion-scale))] ease-[cubic-bezier(.32,.72,.24,1)]",
          "group-hover/goo:opacity-72 group-data-[state=active]/goo:opacity-100",
        )}
      >
        {children}
      </span>
    </TabsTrigger>
  );
}

export type GooTabsContentProps = TabsContentProps;

/** A panel. Dowel's TabsContent, re-exported under this family's name. */
export const GooTabsContent = TabsContent;

export { gooTabsListVariants };
