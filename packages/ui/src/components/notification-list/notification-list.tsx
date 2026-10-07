"use client";

// Original design (pattern inspired by Animate UI Notification List; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  type PanInfo,
  type Transition,
  type Variants,
} from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { NumberFlow } from "@/components/number-flow";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A stack of notifications that rests as a receding deck and springs open
 * into a list.
 *
 * Collapsed, the newest card sits on top and the next two peek out beneath
 * it, each a little smaller and further down, their contents faded; anything
 * deeper is hidden. Hover, or move keyboard focus into the list, and the deck
 * fans out into a full list — every card springs to its own place (a layout
 * animation from stacked to flowing, the reason this uses `motion`) and its
 * contents fade in. Leave, press Escape, or use the header's toggle to fold
 * it back.
 *
 * Dismissing a card (its × button, or a swipe sideways when `swipeToDismiss`
 * is on) slides it out with a blur while the rest close ranks, and the count
 * in the header rolls down. The swipe is never the only way: every card has
 * the button.
 *
 * The deck is presentation only. Every notification is always in the
 * accessibility tree, in a real list labelled by the header; focusing any of
 * them opens the deck, so nothing a keyboard can reach is hidden. The toggle
 * is a disclosure (aria-expanded, aria-controls). When a dismissed card took
 * focus with it, focus moves to the next card's button, else the previous,
 * else the toggle, and a polite status region says what was dismissed.
 * Under reduced motion the deck opens, closes and reflows instantly.
 */

export interface NotificationListItem {
  id: string;
  /** Also names the card's dismiss button: "Dismiss <title>". */
  title: string;
  body?: ReactNode;
  /** When it happened — "2m ago". */
  time?: ReactNode;
  /** An avatar or icon. Decorative: say who or what in the title. */
  icon?: ReactNode;
}

/** The frame around the header and deck. */
const notificationListVariants = cva("flex w-full flex-col gap-3", {
  variants: {
    variant: {
      card: "rounded-2xl border border-border bg-muted/40 p-3",
      plain: "",
    },
  },
  defaultVariants: { variant: "card" },
});

/** How far each card behind the top one drops, in px, and how much it shrinks. */
const STEP_Y = 8;
const STEP_SCALE = 0.05;
const SWIPE_DISTANCE = 96;
const SWIPE_VELOCITY = 600;

const SPRING: Transition = { type: "spring", stiffness: 380, damping: 32, mass: 0.9 };
const INSTANT: Transition = { duration: 0 };

const rowVariants: Variants = {
  exit: (sign: number) => ({
    x: sign * 160,
    opacity: 0,
    scale: 0.94,
    filter: "blur(6px)",
    transition: { type: "spring", bounce: 0, duration: 0.32 },
  }),
};

function CloseGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="size-3.5"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(
        "size-4 text-muted-foreground transition-[rotate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
        "group-aria-expanded/toggle:rotate-180",
      )}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export interface NotificationListProps
  extends
    Omit<ComponentPropsWithRef<"section">, "children" | "defaultValue">,
    VariantProps<typeof notificationListVariants> {
  /** The notifications, newest first (controlled — remove dismissed ones in `onDismiss`). */
  items?: NotificationListItem[];
  /** The notifications at first render (uncontrolled). */
  defaultItems?: NotificationListItem[];
  /** Called when a notification is dismissed, by button or by swipe. */
  onDismiss?: (id: string, item: NotificationListItem) => void;
  /** The header text, which also names the region. */
  label?: string;
  /** Starts fanned out, as if the toggle had been pressed. */
  defaultExpanded?: boolean;
  /** Cards visible in the collapsed deck, including the top one. */
  depth?: number;
  /** Lets a sideways drag dismiss a card. The × button always works. */
  swipeToDismiss?: boolean;
  /** Shown when there is nothing left. */
  emptyMessage?: ReactNode;
  /** The dismiss button's name. */
  dismissLabel?: (item: NotificationListItem) => string;
  /** What the status region says after a dismissal. */
  announceDismiss?: (item: NotificationListItem) => string;
}

const defaultDismissLabel = (item: NotificationListItem) => `Dismiss ${item.title}`;
const defaultAnnounce = (item: NotificationListItem) => `Dismissed ${item.title}`;

/** A deck of notifications that springs open into a list, with dismissable, swipeable cards. */
export function NotificationList({
  className,
  variant,
  items: itemsProp,
  defaultItems = [],
  onDismiss,
  label = "Notifications",
  defaultExpanded = false,
  depth = 3,
  swipeToDismiss = true,
  emptyMessage = "You're all caught up",
  dismissLabel = defaultDismissLabel,
  announceDismiss = defaultAnnounce,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: NotificationListProps) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const listId = `${uid}-list`;
  const reduce = useReducedMotion() ?? false;
  const [uncontrolled, setUncontrolled] = useState(defaultItems);
  const items = itemsProp ?? uncontrolled;

  const [toggled, setToggled] = useState(defaultExpanded);
  const [hovered, setHovered] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  // Escape or the toggle folds the deck even while it is hovered or focused;
  // it stays folded until the pointer or focus leaves and comes back.
  const [suppressed, setSuppressed] = useState(false);
  const expanded = toggled || ((hovered || focusInside) && !suppressed);

  const [message, setMessage] = useState("");
  const [exitSign, setExitSign] = useState(1);
  const list = useRef<HTMLUListElement | null>(null);
  const toggle = useRef<HTMLButtonElement | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const refocus = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (refocus.current === null) return;
    const target = buttons.current.get(refocus.current) ?? toggle.current;
    refocus.current = null;
    target?.focus();
  });

  // The deck's height springs between stacked and fanned out, so the frame
  // around it grows and shrinks with it instead of jumping.
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const element = list.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setHeight(element.offsetHeight);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  function collapse() {
    setToggled(false);
    setSuppressed(true);
  }

  // Escape folds the deck from anywhere inside it. A native listener on the
  // section, because the section itself is not a control.
  useEffect(() => {
    const root = list.current?.closest("[data-slot=notification-list]");
    if (!root || !expanded) return;
    const onKeyDown = (event: Event) => {
      if ((event as globalThis.KeyboardEvent).key !== "Escape") return;
      event.preventDefault();
      setToggled(false);
      setSuppressed(true);
    };
    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  function dismiss(item: NotificationListItem, sign?: number) {
    const index = items.findIndex((other) => other.id === item.id);
    const row = buttons.current.get(item.id)?.closest("li");
    if (row?.contains(document.activeElement)) {
      const neighbour = items[index + 1] ?? items[index - 1];
      refocus.current = neighbour?.id ?? "";
    }
    const rtl = list.current?.closest("[dir]")?.getAttribute("dir") === "rtl";
    setExitSign(sign ?? (rtl ? -1 : 1));
    if (itemsProp === undefined) {
      setUncontrolled((current) => current.filter((other) => other.id !== item.id));
    }
    onDismiss?.(item.id, item);
    setMessage(announceDismiss(item));
  }

  function handleDragEnd(item: NotificationListItem, info: PanInfo) {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) > SWIPE_DISTANCE || Math.abs(velocity.x) > SWIPE_VELOCITY) {
      dismiss(item, Math.sign(offset.x || velocity.x) || 1);
    }
  }

  const count = items.length;
  const transition = reduce ? INSTANT : SPRING;

  return (
    <MotionConfig reducedMotion="user" transition={transition}>
      <section
        data-slot="notification-list"
        data-state={expanded ? "open" : "closed"}
        aria-labelledby={labelId}
        className={cn(notificationListVariants({ variant }), className)}
        onPointerEnter={(event: PointerEvent<HTMLElement>) => {
          onPointerEnter?.(event);
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={(event: PointerEvent<HTMLElement>) => {
          onPointerLeave?.(event);
          setHovered(false);
          setSuppressed(false);
        }}
        onFocus={(event: FocusEvent<HTMLElement>) => {
          onFocus?.(event);
          setFocusInside(list.current?.contains(event.target) ?? false);
        }}
        onBlur={(event: FocusEvent<HTMLElement>) => {
          onBlur?.(event);
          if (event.currentTarget.contains(event.relatedTarget)) return;
          setFocusInside(false);
          setSuppressed(false);
        }}
        {...props}
      >
        <button
          ref={toggle}
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-label={`${label}, ${String(count)}`}
          data-slot="notification-list-toggle"
          onClick={() => {
            if (expanded) {
              collapse();
            } else {
              setToggled(true);
              setSuppressed(false);
            }
          }}
          className={cn(
            "group/toggle flex items-center gap-2 rounded-lg px-1.5 py-1 text-start",
            "transition-colors duration-[var(--duration-fast)] hover:bg-accent/60",
            focusRing,
          )}
        >
          <span id={labelId} className="text-sm font-semibold text-foreground">
            {label}
          </span>
          <span
            data-slot="notification-list-count"
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground tabular-nums"
          >
            <NumberFlow aria-hidden="true" value={count} />
          </span>
          <span className="ms-auto">
            <ChevronGlyph />
          </span>
        </button>

        <motion.div
          data-slot="notification-list-viewport"
          initial={false}
          animate={{ height }}
          transition={reduce ? INSTANT : { type: "spring", bounce: 0.15, duration: 0.5 }}
        >
          <ul
            ref={list}
            id={listId}
            aria-labelledby={labelId}
            data-slot="notification-list-list"
            className={cn("relative isolate flex flex-col", expanded ? "gap-2" : "pb-4")}
          >
            <AnimatePresence initial={false} mode="popLayout" custom={exitSign}>
              {items.map((item, index) => {
                const stacked = !expanded && index > 0;
                const shown = expanded || index < depth;
                const level = expanded ? 0 : Math.min(index, depth - 1);
                const draggable = swipeToDismiss && (expanded || index === 0);
                return (
                  <motion.li
                    key={item.id}
                    layout
                    custom={exitSign}
                    variants={rowVariants}
                    exit="exit"
                    initial={{ opacity: 0, y: -12, scale: 0.96, filter: "blur(6px)" }}
                    animate={{
                      opacity: shown ? 1 : 0,
                      y: level * STEP_Y,
                      scale: 1 - level * STEP_SCALE,
                      filter: "blur(0px)",
                    }}
                    drag={draggable ? "x" : false}
                    dragSnapToOrigin
                    dragElastic={0.5}
                    onDragEnd={(_, info) => {
                      handleDragEnd(item, info);
                    }}
                    data-slot="notification-list-item"
                    data-stacked={stacked ? "" : undefined}
                    className={cn(
                      "origin-bottom touch-pan-y border border-border bg-card text-card-foreground shadow-sm",
                      // Behind the top card, every card takes its size, so the
                      // deck's edges line up as they recede.
                      stacked ? "absolute inset-x-0 top-0 bottom-4" : "relative",
                      !shown && "pointer-events-none",
                    )}
                    // Inline so motion keeps the corners round while it scales the card.
                    style={{ borderRadius: 14, zIndex: count - index }}
                  >
                    <motion.div
                      layout="position"
                      initial={false}
                      animate={{ opacity: stacked ? 0 : 1 }}
                      className="flex items-start gap-3 p-3"
                    >
                      {item.icon ? (
                        <span
                          aria-hidden="true"
                          data-slot="notification-list-icon"
                          className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground [&_svg:not([class*='size-'])]:size-4"
                        >
                          {item.icon}
                        </span>
                      ) : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-baseline gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium">
                            {item.title}
                          </p>
                          {item.time ? (
                            <span className="shrink-0 text-2xs text-muted-foreground">
                              {item.time}
                            </span>
                          ) : null}
                        </div>
                        {item.body ? (
                          <div className="line-clamp-2 text-xs text-muted-foreground">
                            {item.body}
                          </div>
                        ) : null}
                      </div>
                      <button
                        ref={(node) => {
                          if (node) buttons.current.set(item.id, node);
                          else buttons.current.delete(item.id);
                        }}
                        type="button"
                        aria-label={dismissLabel(item)}
                        data-slot="notification-list-dismiss"
                        onClick={() => {
                          dismiss(item);
                        }}
                        className={cn(
                          "-me-1 -mt-1 inline-grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground",
                          "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-accent-foreground",
                          focusRing,
                        )}
                      >
                        <CloseGlyph />
                      </button>
                    </motion.div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </motion.div>

        {count === 0 ? (
          <motion.p
            data-slot="notification-list-empty"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-1.5 pb-1 text-sm text-muted-foreground"
          >
            {emptyMessage}
          </motion.p>
        ) : null}
        <p role="status" aria-live="polite" className="sr-only">
          {message}
        </p>
      </section>
    </MotionConfig>
  );
}

export { notificationListVariants };
