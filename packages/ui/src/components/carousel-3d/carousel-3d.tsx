"use client";

// Ported from amicro Interactive Carousel and CoverFlow Carousel (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
// The Interactive Carousel is credited in amicro as "inspired by vivi" (https://x.com/vivitseng_).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { disabledStyles, focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * One mechanism for amicro's two 3D carousels (ADR 0014): every slide sits in
 * the same grid cell and is placed by a transform computed from its offset to
 * the current index. `arc` fans slides along a tilted wheel rim that spreads
 * further on hover; `coverflow` turns them on the Y axis around a perspective
 * path. The monochrome editions are the same mechanism with neutral numbered
 * cards, so they are `tone="mono"`.
 *
 * Motion is CSS transitions on transform and opacity. Drag follows the pointer
 * directly and settles to the nearest slide on release; no velocity is carried,
 * so there is no animation library. Direction comes from `dir` through a CSS
 * variable, so the strip and the rotations mirror in right-to-left layouts.
 */

const carousel3dVariants = cva(
  cn(
    "group/c3d relative flex w-full flex-col items-center gap-4 overflow-hidden select-none",
    "[--c3d-dir:1] [--c3d-drag:0px] rtl:[--c3d-dir:-1]",
  ),
  {
    variants: {
      variant: {
        arc: "",
        coverflow: "",
      },
      /** Card size. Every distance in the layout derives from it. */
      size: {
        sm: "[--c3d-card:5rem]",
        md: "[--c3d-card:7rem]",
        lg: "[--c3d-card:10rem]",
      },
      /** When the arc fans out: on hover or focus, always, or never. */
      spread: {
        hover: "[--c3d-spread:0] hover:[--c3d-spread:1] has-[:focus-visible]:[--c3d-spread:1]",
        always: "[--c3d-spread:1]",
        never: "[--c3d-spread:0]",
      },
    },
    defaultVariants: {
      variant: "arc",
      size: "md",
      spread: "hover",
    },
  },
);

/** The card face: an image, custom content, or a neutral numbered tile. */
const carousel3dCardVariants = cva(
  "relative grid size-full place-items-center overflow-hidden rounded-xl border shadow-lg",
  {
    variants: {
      tone: {
        media: "border-border bg-card text-card-foreground",
        mono: "border-border bg-muted text-sm font-bold text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "media",
    },
  },
);

export interface Carousel3DItem {
  /** Visible caption under the active slide, and the name of its dot. */
  title: string;
  /** Image URL shown as the card when `tone="media"` and no `content` is given. */
  image?: string;
  /** Alternative text for `image`. Defaults to empty: the title already names the slide. */
  alt?: string;
  /** Custom card content. Replaces the image or the numbered tile. */
  content?: ReactNode;
}

export interface Carousel3DProps
  extends
    Omit<ComponentPropsWithRef<"section">, "children">,
    VariantProps<typeof carousel3dVariants>,
    VariantProps<typeof carousel3dCardVariants> {
  items: Carousel3DItem[];
  /** Controlled index of the current slide. */
  index?: number;
  /** Initial slide when uncontrolled. Defaults to the middle one, as in the source. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Wrap from the last slide to the first, and back. The strip rewinds rather than circling. */
  loop?: boolean;
  previousLabel?: string;
  nextLabel?: string;
  /** Name of the dot list. */
  dotsLabel?: string;
  /** Label of each slide, announced with its position. */
  slideLabel?: (index: number, count: number) => string;
}

const DRAG_THRESHOLD = 6;
const SWIPE_THRESHOLD = 40;

function isRtl(element: HTMLElement | null) {
  return element?.closest("[dir]")?.getAttribute("dir") === "rtl";
}

/** Transform and stacking for one slide, by its offset from the current index. */
function slideStyle(variant: "arc" | "coverflow", offset: number): CSSProperties {
  const abs = Math.abs(offset);
  const drag = "var(--c3d-drag)";
  if (variant === "coverflow") {
    const turn = offset === 0 ? 0 : offset < 0 ? 38 : -38;
    return {
      width: "var(--c3d-card)",
      aspectRatio: "3 / 4",
      zIndex: 100 - abs,
      opacity: abs > 2 ? 0 : 1 - abs * 0.25,
      transform: [
        `translateX(calc(${offset} * var(--c3d-dir) * var(--c3d-card) * 0.4 + ${drag}))`,
        `translateZ(calc(var(--c3d-card) * ${offset === 0 ? 0.6 : -abs * 0.6}))`,
        `rotateY(calc(${turn} * var(--c3d-dir) * 1deg))`,
        `scale(${offset === 0 ? 1.1 : 1 - abs * 0.08})`,
      ].join(" "),
    };
  }
  return {
    width: "calc(var(--c3d-card) * 1.45)",
    zIndex: 100 - abs,
    transform: [
      `translateX(calc(${offset} * var(--c3d-dir) * var(--c3d-card) * 1.45 + ${drag}))`,
      `translateY(calc(${offset} * var(--c3d-spread) * var(--c3d-card) * 0.22))`,
      `rotate(calc(${offset} * var(--c3d-dir) * (5deg + var(--c3d-spread) * 15deg)))`,
      `scale(${offset === 0 ? "1.05" : "calc(0.8 - var(--c3d-spread) * 0.15)"})`,
    ].join(" "),
  };
}

const control = cn(
  "inline-grid shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground",
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  "hover:bg-accent hover:text-foreground",
  focusRing,
  disabledStyles,
);

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-3.5", mirrorForDirection)}
    >
      <path d={back ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

/** A 3D carousel: an arc of cards or a CoverFlow path, driven by buttons, dots, keys and swipe. */
export function Carousel3D({
  className,
  items,
  index: indexProp,
  defaultIndex,
  onIndexChange,
  loop = false,
  variant,
  size,
  spread,
  tone,
  previousLabel = "Previous slide",
  nextLabel = "Next slide",
  dotsLabel = "Slides",
  slideLabel = (i, count) => `${String(i + 1)} of ${String(count)}`,
  ref,
  "aria-label": ariaLabel,
  ...props
}: Carousel3DProps) {
  const count = items.length;
  const last = Math.max(0, count - 1);
  const clamp = (value: number) => Math.min(last, Math.max(0, value));
  const [uncontrolled, setUncontrolled] = useState(() =>
    clamp(defaultIndex ?? Math.floor(last / 2)),
  );
  const index = clamp(indexProp ?? uncontrolled);
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{ x: number; pointer: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);
  const shape = variant ?? "arc";

  function goTo(next: number) {
    const target = loop && count > 0 ? ((next % count) + count) % count : clamp(next);
    if (target === index) return index;
    if (indexProp === undefined) setUncontrolled(target);
    onIndexChange?.(target);
    const item = items[target];
    if (item) setAnnouncement(`${item.title}, ${slideLabel(target, count)}`);
    return target;
  }

  const atStart = !loop && index === 0;
  const atEnd = !loop && index === last;

  /** Arrow keys, Home and End on the controls; slide content keeps its own keys. */
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const forward = isRtl(rootRef.current) ? -1 : 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index + forward;
    else if (event.key === "ArrowLeft") next = index - forward;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    const landed = goTo(next);
    // Arrow keys on the dots move focus with the selection, as in a tablist.
    if (event.target instanceof HTMLElement && event.target.getAttribute("role") === "tab") {
      tabRefs.current[landed]?.focus();
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, pointer: event.pointerId, active: false };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    const dx = event.clientX - state.x;
    if (!state.active && Math.abs(dx) > DRAG_THRESHOLD) {
      state.active = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (state.active) event.currentTarget.style.setProperty("--c3d-drag", `${String(dx)}px`);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const state = drag.current;
    drag.current = null;
    if (!state?.active) return;
    const dx = event.clientX - state.x;
    event.currentTarget.style.setProperty("--c3d-drag", "0px");
    setDragging(false);
    suppressClick.current = true;
    if (cancelled || Math.abs(dx) < SWIPE_THRESHOLD) return;
    // An arc slide is one step wide; CoverFlow cards overlap, 0.4 of a card apart.
    const width = slideRefs.current[index]?.offsetWidth ?? 0;
    const step = width * (shape === "coverflow" ? 0.4 : 1);
    const steps = step > 0 ? Math.max(1, Math.round(Math.abs(dx) / step)) : 1;
    // Dragging toward the inline start pulls the next slide in.
    const toward = (dx < 0 ? 1 : -1) * (isRtl(rootRef.current) ? -1 : 1);
    goTo(index + toward * steps);
  }

  /** A click on a neighbouring card selects it. The neighbours are inert, so hit-test by geometry. */
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (event.detail === 0) return;
    let hit: number | null = null;
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const rect = slide.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (inside && (hit === null || Math.abs(i - index) < Math.abs(hit - index))) hit = i;
    });
    if (hit !== null && hit !== index) goTo(hit);
  }

  const cardClass = carousel3dCardVariants({ tone });

  return (
    <section
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") return ref(node);
        if (ref) ref.current = node;
      }}
      data-slot="carousel-3d"
      data-variant={shape}
      aria-roledescription="carousel"
      aria-label={ariaLabel ?? (props["aria-labelledby"] ? undefined : "Carousel")}
      className={cn(carousel3dVariants({ variant, size, spread }), className)}
      {...props}
    >
      {/* Pointer-only conveniences (swipe, click a neighbour); the buttons and dots cover both. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        id={`${id}-viewport`}
        data-slot="carousel-3d-viewport"
        data-dragging={dragging ? "" : undefined}
        className={cn(
          "relative grid w-full touch-pan-y place-items-center",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={
          shape === "coverflow"
            ? {
                perspective: "calc(var(--c3d-card) * 12)",
                transformStyle: "preserve-3d",
                height: "calc(var(--c3d-card) * 1.9)",
              }
            : { height: "calc(var(--c3d-card) * 2.1)" }
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          endDrag(event, false);
        }}
        onPointerCancel={(event) => {
          endDrag(event, true);
        }}
        onClick={handleClick}
      >
        {items.map((item, i) => {
          const offset = i - index;
          const current = offset === 0;
          const face =
            item.content ??
            (tone !== "mono" && item.image ? (
              <img
                src={item.image}
                alt={item.alt ?? ""}
                draggable={false}
                className="size-full object-cover"
              />
            ) : (
              <span aria-hidden="true">{i + 1}</span>
            ));
          const caption = (
            <span
              data-slot="carousel-3d-caption"
              className={cn(
                "max-w-full truncate text-xs font-semibold text-foreground",
                // CoverFlow hangs the caption under a card that fills the slide.
                shape === "coverflow" && "absolute inset-x-0 top-full mt-2 text-center",
                "transition-[opacity,scale] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                !current && "scale-75 opacity-0",
              )}
            >
              {item.title}
            </span>
          );
          return (
            <div
              key={i}
              ref={(node) => {
                slideRefs.current[i] = node;
              }}
              id={`${id}-slide-${String(i)}`}
              role="tabpanel"
              aria-roledescription="slide"
              aria-label={slideLabel(i, count)}
              // Inert and hidden both: inert alone is not yet honoured by every screen reader.
              aria-hidden={current ? undefined : true}
              inert={!current}
              data-slot="carousel-3d-slide"
              data-state={current ? "active" : "inactive"}
              className={cn(
                "relative col-start-1 row-start-1 flex flex-col items-center gap-1.5 will-change-transform",
                "transition-[transform,opacity] duration-[var(--duration-slower)]",
                shape === "arc"
                  ? "ease-[var(--ease-overshoot)]"
                  : "ease-[var(--ease-out-quint)]",
                "group-data-[dragging]/c3d:transition-none",
              )}
              style={slideStyle(shape, offset)}
            >
              {shape === "arc" ? caption : null}
              <div
                data-slot="carousel-3d-card"
                className={cardClass}
                style={
                  shape === "arc"
                    ? { width: "var(--c3d-card)", height: "var(--c3d-card)" }
                    : undefined
                }
              >
                {face}
              </div>
              {shape === "coverflow" ? caption : null}
            </div>
          );
        })}
      </div>

      <div
        data-slot="carousel-3d-controls"
        className="z-10 flex items-center gap-1 rounded-full border border-border bg-card/70 px-1.5 py-0.5 shadow-sm backdrop-blur-md"
      >
        <button
          type="button"
          data-slot="carousel-3d-previous"
          aria-label={previousLabel}
          aria-controls={`${id}-viewport`}
          aria-disabled={atStart || undefined}
          className={cn(control, "size-6")}
          onKeyDown={handleKeyDown}
          onClick={() => {
            if (!atStart) goTo(index - 1);
          }}
        >
          <Chevron back />
        </button>
        <div
          role="tablist"
          aria-label={dotsLabel}
          data-slot="carousel-3d-dots"
          className="flex items-center"
        >
          {items.map((item, i) => {
            const selected = i === index;
            return (
              <button
                key={i}
                ref={(node) => {
                  tabRefs.current[i] = node;
                }}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${id}-slide-${String(i)}`}
                aria-label={item.title}
                tabIndex={selected ? 0 : -1}
                data-slot="carousel-3d-dot"
                data-state={selected ? "active" : "inactive"}
                className={cn(
                  "group/dot grid h-6 cursor-pointer place-items-center rounded-full px-0.5",
                  focusRing,
                )}
                onClick={() => goTo(i)}
                onKeyDown={handleKeyDown}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-1 rounded-full transition-[width,background-color] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                    selected
                      ? "w-4 bg-foreground"
                      : "w-1 bg-foreground/30 group-hover/dot:bg-foreground/50",
                  )}
                />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          data-slot="carousel-3d-next"
          aria-label={nextLabel}
          aria-controls={`${id}-viewport`}
          aria-disabled={atEnd || undefined}
          className={cn(control, "size-6")}
          onKeyDown={handleKeyDown}
          onClick={() => {
            if (!atEnd) goTo(index + 1);
          }}
        >
          <Chevron />
        </button>
      </div>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

export { carousel3dCardVariants, carousel3dVariants };
