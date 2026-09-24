"use client";

// Original design (pattern inspired by Rare UI Proximity Sidebar; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A document minimap: one hairline dash per section, stacked at an even
 * 8px pitch. Length and tone carry the hierarchy — titles long and in the
 * foreground colour, body sections short and muted — so the stack reads as
 * the shape of the page rather than as another table of contents.
 *
 * Every dash's length is a `scaleX` from its outer edge, never a width, so
 * nothing lays out while the pointer moves or the page scrolls. The pointer's
 * position over the stack is one shared motion value, in rows; each dash
 * derives its own nearness from its index (the pitch is even, so no dash has
 * to be measured) and follows it through a spring. That is the "value that
 * follows the pointer with physics" ADR 0014 allows `motion` for.
 *
 * Scrolling the page (or whichever scrolling ancestor holds the sections)
 * marks the section at the `activeOffset` line as current. Its dash pulses to
 * full length while scrolling and relaxes half a second after the scrolling
 * stops, so the cue is there while it is useful and quiet after. The current
 * section also carries aria-current="location", which does not fade.
 *
 * Each dash is a real in-page link, so it works without JavaScript and can be
 * opened or copied like any anchor. With JavaScript, activating one scrolls
 * the target into view (instantly under reduced motion), writes its hash to
 * the URL without adding a history entry, and moves focus to it so keyboard
 * and screen reader users continue reading from there. The stack is one Tab
 * stop — arrow keys, Home and End move within it — because a dense minimap
 * would otherwise cost dozens of presses to get past. The section's label
 * shows beside the dash under the pointer or keyboard focus.
 */

export type MinimapNavKind = "title" | "subtitle" | "section" | "body";

export interface MinimapNavSection {
  /** Id of the element this dash scrolls to. */
  id: string;
  /** The dash's accessible name, also shown beside it on hover and focus. */
  label: string;
  /** Visual weight. Wins over `level`. */
  kind?: MinimapNavKind;
  /** Heading level, mapped 1 → title, 2 → subtitle, 3 → section, 4–6 → body. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

const minimapNavVariants = cva("relative flex w-10 flex-col", {
  variants: {
    /** Which edge of the page the stack sits on; dashes grow away from it. */
    side: {
      start: "[--minimap-nav-origin:left] rtl:[--minimap-nav-origin:right]",
      end: "[--minimap-nav-origin:right] rtl:[--minimap-nav-origin:left]",
    },
  },
  defaultVariants: { side: "start" },
});

/** Full length of each kind, as a fraction of the stack's width. */
const WEIGHT: Record<MinimapNavKind, number> = {
  title: 1,
  subtitle: 0.78,
  section: 0.58,
  body: 0.4,
};

const TONE: Record<MinimapNavKind, string> = {
  title: "bg-foreground",
  subtitle: "bg-foreground/80",
  section: "bg-muted-foreground",
  body: "bg-muted-foreground/50",
};

const LABEL_SIDE = { start: "start-full ms-3", end: "end-full me-3" } as const;

/** At rest a dash is this fraction of its full length. */
const REST = 0.5;
/** How many rows either side of the pointer feel it. */
const REACH = 3.5;
/** Pointer position meaning "nowhere near". */
const FAR = -1000;
const PULSE_MS = 500;
const DASH_SPRING = { stiffness: 520, damping: 38 };

/** 1 under the pointer, easing to 0 at `REACH` rows away. */
export function minimapNearness(distance: number): number {
  const d = Math.abs(distance);
  return d >= REACH ? 0 : 0.5 * (1 + Math.cos((Math.PI * d) / REACH));
}

function kindFromLevel(level: number): MinimapNavKind {
  return level <= 1 ? "title" : level === 2 ? "subtitle" : level === 3 ? "section" : "body";
}

/** The weight of a target element: the element itself if it is a heading, else its first heading. */
export function inferMinimapKind(element: Element | null): MinimapNavKind {
  if (!element) return "body";
  const heading = /^H[1-6]$/.test(element.tagName)
    ? element
    : element.querySelector("h1, h2, h3, h4, h5, h6");
  return heading ? kindFromLevel(Number(heading.tagName.slice(1))) : "body";
}

/** The nearest ancestor that scrolls vertically, or null for the page. */
function scrollParent(node: HTMLElement): HTMLElement | null {
  const { body, documentElement } = node.ownerDocument;
  for (let el = node.parentElement; el && el !== body; el = el.parentElement) {
    if (el === documentElement) break;
    if (/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY)) return el;
  }
  return null;
}

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex], [contenteditable]";

interface DashProps {
  index: number;
  kind: MinimapNavKind;
  pointer: MotionValue<number>;
  pulsing: boolean;
  reduced: boolean;
}

function Dash({ index, kind, pointer, pulsing, reduced }: DashProps) {
  const target = useTransform(pointer, (u) =>
    Math.max(minimapNearness(u - index - 0.5), pulsing ? 1 : 0),
  );
  const sprung = useSpring(target, DASH_SPRING);
  const scaleX = useTransform(
    reduced ? target : sprung,
    (p) => WEIGHT[kind] * (REST + (1 - REST) * p),
  );
  return (
    <motion.span
      aria-hidden="true"
      data-slot="minimap-nav-dash"
      className={cn(
        "block h-px w-full origin-(--minimap-nav-origin)",
        "transition-colors duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
        pulsing ? "bg-foreground" : TONE[kind],
      )}
      style={{ scaleX }}
    />
  );
}

export interface MinimapNavProps
  extends ComponentPropsWithRef<"nav">, VariantProps<typeof minimapNavVariants> {
  /** The sections, in document order. Each id must match an element on the page. */
  sections: MinimapNavSection[];
  /**
   * Distance in px from the top of the scroll area to the reading line: the
   * last section whose top has crossed it is current.
   */
  activeOffset?: number;
}

/** A dash-per-section minimap of the page that swells near the pointer and pulses as you scroll. */
export function MinimapNav({
  className,
  sections,
  side,
  activeOffset = 80,
  "aria-label": ariaLabel = "On this page",
  ...props
}: MinimapNavProps) {
  const [inferred, setInferred] = useState<Record<string, MinimapNavKind>>({});
  const [current, setCurrent] = useState(-1);
  const [pulse, setPulse] = useState(-1);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const pointer = useMotionValue(FAR);
  const reduced = useReducedMotion() ?? false;
  const listRef = useRef<HTMLUListElement | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ids = sections.map((section) => section.id).join("\n");
  const unweighted = sections
    .filter((section) => !section.kind && !section.level)
    .map((section) => section.id)
    .join("\n");
  const edge = side ?? "start";

  // Sections with no kind or level take their weight from the page, read
  // before paint so the stack never draws at the wrong lengths first.
  useLayoutEffect(() => {
    const page = listRef.current?.ownerDocument;
    if (!page) return;
    const next: Record<string, MinimapNavKind> = {};
    for (const id of unweighted ? unweighted.split("\n") : []) {
      next[id] = inferMinimapKind(page.getElementById(id));
    }
    setInferred(next);
  }, [unweighted]);

  // The current section: read on the next frame, then on every scroll and
  // resize, at most once a frame. Only scrolling pulses.
  useEffect(() => {
    const page = listRef.current?.ownerDocument ?? document;
    const targets = (ids ? ids.split("\n") : []).map((id) => page.getElementById(id));
    const first = targets.findIndex((target) => target !== null);
    const firstTarget = targets[first];
    if (!firstTarget) return;
    const scroller = scrollParent(firstTarget);
    let frame = 0;
    let pulseNext = false;

    const read = () => {
      frame = 0;
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      let found = first;
      targets.forEach((target, index) => {
        if (target && target.getBoundingClientRect().top - top <= activeOffset + 1)
          found = index;
      });
      setCurrent(found);
      if (!pulseNext) return;
      pulseNext = false;
      setPulse(found);
      clearTimeout(pulseTimer.current);
      pulseTimer.current = setTimeout(() => {
        setPulse(-1);
      }, PULSE_MS);
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(read);
    };
    const onScroll = () => {
      pulseNext = true;
      schedule();
    };

    const source: HTMLElement | Window = scroller ?? window;
    schedule();
    source.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      clearTimeout(pulseTimer.current);
      source.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
    };
  }, [ids, activeOffset]);

  function trackPointer(event: PointerEvent<HTMLUListElement>) {
    if (event.pointerType === "touch") return;
    const box = event.currentTarget.getBoundingClientRect();
    const pitch = box.height / Math.max(sections.length, 1);
    pointer.set(pitch > 0 ? (event.clientY - box.top) / pitch : FAR);
  }

  function jump(event: MouseEvent<HTMLAnchorElement>, index: number) {
    const section = sections[index];
    const target = section
      ? event.currentTarget.ownerDocument.getElementById(section.id)
      : null;
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!target || event.defaultPrevented || event.button !== 0 || modified) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    window.history.replaceState(
      window.history.state,
      "",
      event.currentTarget.getAttribute("href"),
    );
    if (!target.matches(FOCUSABLE)) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    setCurrent(index);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLAnchorElement>, index: number) {
    const last = sections.length - 1;
    const next =
      event.key === "ArrowDown"
        ? Math.min(index + 1, last)
        : event.key === "ArrowUp"
          ? Math.max(index - 1, 0)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    listRef.current
      ?.querySelectorAll<HTMLAnchorElement>('[data-slot="minimap-nav-item"]')
      [next]?.focus();
  }

  function handleBlur(event: FocusEvent<HTMLAnchorElement>) {
    if (!listRef.current?.contains(event.relatedTarget)) setFocusIndex(null);
  }

  const tabStop = focusIndex ?? Math.max(current, 0);

  return (
    <MotionConfig reducedMotion="user">
      <nav
        data-slot="minimap-nav"
        data-side={edge}
        aria-label={ariaLabel}
        className={cn(minimapNavVariants({ side }), className)}
        {...props}
      >
        <ul
          ref={listRef}
          data-slot="minimap-nav-list"
          className="flex flex-col"
          onPointerMove={trackPointer}
          onPointerLeave={() => {
            pointer.set(FAR);
          }}
        >
          {sections.map((section, index) => {
            const kind =
              section.kind ??
              (section.level ? kindFromLevel(section.level) : (inferred[section.id] ?? "body"));
            const pulsing = pulse === index;
            return (
              <li key={section.id} className="flex h-2 items-center">
                <a
                  href={`#${section.id}`}
                  data-slot="minimap-nav-item"
                  data-kind={kind}
                  data-state={pulsing ? "pulse" : "idle"}
                  aria-current={current === index ? "location" : undefined}
                  tabIndex={tabStop === index ? 0 : -1}
                  className={cn(
                    "group/item relative flex size-full items-center rounded-xs",
                    focusRing,
                  )}
                  onClick={(event) => {
                    jump(event, index);
                  }}
                  onKeyDown={(event) => {
                    handleKeyDown(event, index);
                  }}
                  onFocus={() => {
                    setFocusIndex(index);
                  }}
                  onBlur={handleBlur}
                >
                  <Dash
                    index={index}
                    kind={kind}
                    pointer={pointer}
                    pulsing={pulsing}
                    reduced={reduced}
                  />
                  <span
                    data-slot="minimap-nav-label"
                    className={cn(
                      "pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 rounded-md border border-border bg-popover px-2 py-0.5",
                      "text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-sm",
                      "transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
                      "group-hover/item:opacity-100 group-focus-visible/item:opacity-100",
                      LABEL_SIDE[edge],
                    )}
                  >
                    {section.label}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </MotionConfig>
  );
}

export { minimapNavVariants };
