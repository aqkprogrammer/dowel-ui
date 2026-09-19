"use client";

// Ported from bencho Reorder list (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  animate,
  motion,
  MotionConfig,
  motionValue,
  useSpring,
  type AnimationPlaybackControls,
  type MotionValue,
} from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A short list you put in order by dragging a pill or with the keyboard.
 *
 * `motion` earns its place here (ADR 0014): the held row follows the pointer
 * one to one and, on release, springs to its slot carrying the velocity of the
 * throw, and the held pill leans and squashes with that velocity. Neighbours
 * re-target mid-flight as the held row crosses them, which a CSS transition
 * cannot do without jumping.
 *
 * Two layers stack in one box. Underneath, an aria-hidden layer of pill
 * backgrounds runs through an SVG goo filter, so pills melt into each other as
 * they pass. On top, the real list: one button per row, crisp because the
 * filter never touches it. Each blob shares its row's y motion value.
 *
 * The keyboard path follows the APG / Atlassian sortable pattern: Space or
 * Enter picks a row up, arrows move it, Space or Enter drops it, Escape puts
 * it back. Moves are a draft until the drop, and a polite live region says
 * what happened at every step. Under reduced motion nothing deforms and rows
 * jump to their slots.
 */

/** Vertical distance between rows, in px. */
const STEP = 50;
/** Pill height, in px (the gap between pills is STEP − PILL). */
const PILL = 44;
/** Pointer travel before a press counts as a drag. */
const SLOP = 3;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function moveTo(list: string[], id: string, to: number) {
  const next = list.filter((entry) => entry !== id);
  next.splice(to, 0, id);
  return next;
}

/** Spring for rows settling. `give` 0 is stiff and exact, 100 soft and bouncy. */
export function reorderSpring(give: number) {
  const g = clamp(give, 0, 100) / 100;
  return {
    type: "spring" as const,
    stiffness: 720 - 500 * g,
    damping: 44 - 26 * g,
    restDelta: 0.5,
  };
}

/**
 * How the held pill deforms at a velocity (px/s). `lean` is 0–100; at the
 * default 18 a brisk drag gives about scaleX 0.8, scaleY 1.1, skewY 1.4°.
 */
export function leanFor(velocity: number, lean: number) {
  const gain = clamp(lean, 0, 100) / 100;
  const amount = Math.min(1, Math.abs(velocity) / 1000) * gain;
  return {
    scaleX: Math.max(0.55, 1 - amount * 1.1),
    scaleY: Math.min(1.5, 1 + amount * 0.55),
    skewY: Math.sign(velocity) * amount * 8,
  };
}

export interface ReorderListItem {
  id: string;
  /** The row's name. Announced, and names its button. */
  label: string;
  /** Avatar image URL. Decorative: the label already names the row. */
  avatar?: string;
  /** Shown when there is no image, or it fails to load. */
  initials?: string;
  /** CSS colour behind the avatar, e.g. `var(--color-primary)`. */
  accent?: string;
  /** Shows a presence dot (success token) and adds "online" to the name. */
  online?: boolean;
}

export interface ReorderListAnnouncementDetails {
  item: ReorderListItem;
  /** 1-based. */
  position: number;
  total: number;
}

export interface ReorderListAnnouncements {
  grabbed: (details: ReorderListAnnouncementDetails) => string;
  moved: (details: ReorderListAnnouncementDetails) => string;
  dropped: (details: ReorderListAnnouncementDetails) => string;
  cancelled: (details: ReorderListAnnouncementDetails) => string;
}

const ANNOUNCEMENTS: ReorderListAnnouncements = {
  grabbed: ({ item, position, total }) =>
    `${item.label} grabbed. Current position ${String(position)} of ${String(total)}. ` +
    "Use the arrow keys to move, Space to drop, Escape to cancel.",
  moved: ({ item, position, total }) =>
    `${item.label} moved to position ${String(position)} of ${String(total)}`,
  dropped: ({ item, position, total }) =>
    `${item.label} dropped at position ${String(position)} of ${String(total)}`,
  cancelled: ({ item, position, total }) =>
    `Reorder cancelled. ${item.label} returned to position ${String(position)} of ${String(total)}`,
};

const reorderListVariants = cva("relative w-[12.25rem] text-[0.78125rem] select-none", {
  variants: {
    /** Pill tone. `light` is the card surface; `dark` inverts it. */
    fill: {
      light: "text-card-foreground/80 [--reorder-list-pill:var(--color-card)]",
      dark: "text-background/85 [--reorder-list-pill:var(--color-foreground)]",
    },
  },
  defaultVariants: { fill: "light" },
});

export interface ReorderListProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "children">,
    VariantProps<typeof reorderListVariants> {
  items: ReorderListItem[];
  /** Order as item ids (controlled). */
  value?: string[];
  /** Initial order (uncontrolled). Defaults to the order of `items`. */
  defaultValue?: string[];
  /** Called with the new order after a drop that changed it. */
  onValueChange?: (value: string[]) => void;
  /** Replaces the avatar and label inside a row. The label still names the button. */
  renderItem?: (item: ReorderListItem, state: { grabbed: boolean; index: number }) => ReactNode;
  /** Pill corner radius, 0–22 px. */
  corner?: number;
  /** Spring softness for rows settling, 0–100. */
  give?: number;
  /** How much the held pill skews and squashes with velocity, 0–100. */
  lean?: number;
  /** 1px inset hairline on each pill. */
  stroke?: boolean;
  disabled?: boolean;
  /** Overrides for the live-region messages (i18n). */
  announcements?: Partial<ReorderListAnnouncements>;
  /** Describes the keyboard operation; referenced by every row's button. */
  instructions?: string;
}

function RowAvatar({ item }: { item: ReorderListItem }) {
  return (
    <span aria-hidden="true" className="relative shrink-0">
      <Avatar
        size="sm"
        data-slot="reorder-list-avatar"
        style={{ backgroundColor: item.accent }}
        className={cn(!item.accent && "bg-muted")}
      >
        {item.avatar ? <AvatarImage src={item.avatar} alt="" draggable={false} /> : null}
        <AvatarFallback
          className="bg-transparent text-xs font-medium text-primary-foreground"
          style={item.accent ? undefined : { color: "var(--color-muted-foreground)" }}
        >
          {item.initials ?? item.label.slice(0, 1)}
        </AvatarFallback>
      </Avatar>
      {item.online ? (
        <span
          data-slot="reorder-list-presence"
          className="absolute -end-px -bottom-px size-[0.5625rem] rounded-full bg-success ring-2 ring-(--reorder-list-pill)"
        />
      ) : null}
    </span>
  );
}

/** A list you reorder by dragging liquid pills, or with Space and the arrow keys. */
export function ReorderList({
  className,
  items,
  value,
  defaultValue,
  onValueChange,
  renderItem,
  corner = 22,
  give = 50,
  lean = 18,
  fill,
  stroke = false,
  disabled = false,
  announcements,
  instructions = "Press Space or Enter to pick up, the arrow keys to move, Space or Enter to drop, Escape to cancel.",
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: ReorderListProps) {
  const uid = useId().replace(/:/g, "");
  const filterId = `dowel-reorder-list-goo-${uid}`;
  const hintId = `dowel-reorder-list-hint-${uid}`;
  const reduceMotion = usePrefersReducedMotion();
  const messages = { ...ANNOUNCEMENTS, ...announcements };
  const radius = clamp(corner, 0, 22);
  const byId = new Map(items.map((item) => [item.id, item]));

  const [uncontrolled, setUncontrolled] = useState(
    () => defaultValue ?? items.map((item) => item.id),
  );
  const requested = value ?? uncontrolled;
  // Known ids in the requested order, then any items it left out.
  const order = requested
    .filter((id, i) => byId.has(id) && requested.indexOf(id) === i)
    .concat(items.map((item) => item.id).filter((id) => !requested.includes(id)));
  const total = order.length;

  /** The order being arranged, before a drop commits it. */
  const [draft, setDraftState] = useState<string[] | null>(null);
  const draftRef = useRef<string[] | null>(null);
  function setDraft(next: string[] | null) {
    draftRef.current = next;
    setDraftState(next);
  }
  const visual = draft ?? order;

  /** The row lifted by keyboard or pointer. */
  const [held, setHeld] = useState<string | null>(null);
  const grab = useRef<{ id: string; from: number } | null>(null);
  const drag = useRef<{
    id: string;
    pointerId: number;
    startY: number;
    originY: number;
    from: number;
    moved: boolean;
  } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const [announcement, setAnnouncement] = useState("");
  function announce(kind: keyof ReorderListAnnouncements, id: string, index: number) {
    const item = byId.get(id);
    if (item) setAnnouncement(messages[kind]({ item, position: index + 1, total }));
  }

  // One y per row, shared by the row and its blob so the goo tracks the text.
  const [ys] = useState(() => new Map<string, MotionValue<number>>());
  const controls = useRef(new Map<string, AnimationPlaybackControls>());
  function yFor(id: string) {
    let y = ys.get(id);
    if (!y) {
      y = motionValue(Math.max(0, visual.indexOf(id)) * STEP);
      ys.set(id, y);
    }
    return y;
  }

  const skinX = useSpring(1, { stiffness: 420, damping: 26 });
  const skinY = useSpring(1, { stiffness: 420, damping: 26 });
  const skew = useSpring(0, { stiffness: 420, damping: 26 });
  const relax = useRef<ReturnType<typeof setTimeout>>(undefined);
  function deform(velocity: number) {
    if (reduceMotion) return;
    const shape = leanFor(velocity, lean);
    skinX.set(shape.scaleX);
    skinY.set(shape.scaleY);
    skew.set(shape.skewY);
    clearTimeout(relax.current);
    // A held pill relaxes as soon as the pointer is still.
    relax.current = setTimeout(() => deform(0), 80);
  }

  const visualKey = visual.join("\u0000");
  const spring = reorderSpring(give);
  useEffect(() => {
    visual.forEach((id, index) => {
      if (id === dragging) return;
      const y = yFor(id);
      const target = index * STEP;
      controls.current.get(id)?.stop();
      if (reduceMotion) {
        y.set(target);
      } else if (y.get() !== target) {
        controls.current.set(id, animate(y, target, spring));
      }
    });
    // `visualKey` stands for `visual`; the spring is read fresh on each run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualKey, dragging, reduceMotion]);

  useEffect(() => {
    const running = controls.current;
    return () => {
      clearTimeout(relax.current);
      running.forEach((control) => control.stop());
    };
  }, []);

  // Committing reorders the DOM, which can drop focus from the moved button.
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const refocus = useRef<string | null>(null);
  const orderKey = order.join("\u0000");
  useLayoutEffect(() => {
    const id = refocus.current;
    refocus.current = null;
    if (id && document.activeElement !== handles.current.get(id)) {
      handles.current.get(id)?.focus();
    }
  }, [orderKey]);

  function commit(next: string[]) {
    setDraft(null);
    if (next.join("\u0000") === orderKey) return;
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  function cancelGrab() {
    const current = grab.current;
    if (!current) return;
    grab.current = null;
    setHeld(null);
    setDraft(null);
    announce("cancelled", current.id, current.from);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (drag.current) return;
    const list = draftRef.current ?? order;
    const index = list.indexOf(id);
    const last = list.length - 1;
    const key = event.key;
    const pick = key === " " || key === "Enter";

    if (grab.current?.id === id) {
      const to =
        key === "ArrowUp"
          ? index - 1
          : key === "ArrowDown"
            ? index + 1
            : key === "Home"
              ? 0
              : key === "End"
                ? last
                : null;
      if (to !== null) {
        event.preventDefault();
        const target = clamp(to, 0, last);
        if (target === index) return;
        setDraft(moveTo(list, id, target));
        announce("moved", id, target);
      } else if (pick) {
        event.preventDefault();
        grab.current = null;
        setHeld(null);
        refocus.current = id;
        commit(list);
        announce("dropped", id, index);
      } else if (key === "Escape") {
        event.preventDefault();
        cancelGrab();
      }
      return;
    }

    if (pick) {
      event.preventDefault();
      grab.current = { id, from: index };
      setHeld(id);
      setDraft(list);
      announce("grabbed", id, index);
      return;
    }
    const focusTo =
      key === "ArrowUp"
        ? index - 1
        : key === "ArrowDown"
          ? index + 1
          : key === "Home"
            ? 0
            : key === "End"
              ? last
              : null;
    if (focusTo === null) return;
    event.preventDefault();
    const next = list[clamp(focusTo, 0, last)];
    if (next) handles.current.get(next)?.focus();
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (disabled || grab.current || event.button !== 0) return;
    const index = order.indexOf(id);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers cannot be captured; the drag still works.
    }
    controls.current.get(id)?.stop();
    drag.current = {
      id,
      pointerId: event.pointerId,
      startY: event.clientY,
      originY: index * STEP,
      from: index,
      moved: false,
    };
    setDraft(order);
    setHeld(id);
    setDragging(id);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) return;
    const dy = event.clientY - current.startY;
    if (!current.moved && Math.abs(dy) < SLOP) return;
    current.moved = true;
    const y = clamp(current.originY + dy, -STEP / 2, (total - 1) * STEP + STEP / 2);
    const row = yFor(current.id);
    row.set(y);
    deform(row.getVelocity());
    const list = draftRef.current ?? order;
    // A neighbour gives way once the held row is half a step past it.
    const slot = clamp(Math.round(y / STEP), 0, total - 1);
    if (list.indexOf(current.id) !== slot) setDraft(moveTo(list, current.id, slot));
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) return;
    drag.current = null;
    clearTimeout(relax.current);
    deform(0);
    const list = draftRef.current ?? order;
    setHeld(null);
    setDragging(null);
    if (!current.moved) {
      setDraft(null);
      return;
    }
    if (document.activeElement === event.currentTarget) refocus.current = current.id;
    commit(list);
    announce("dropped", current.id, list.indexOf(current.id));
  }

  const blobStyle = { height: PILL, borderRadius: radius };

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-slot="reorder-list"
        data-disabled={disabled ? "" : undefined}
        className={cn(reorderListVariants({ fill }), className)}
        style={{ height: total > 0 ? (total - 1) * STEP + PILL : 0, ...style }}
        {...props}
      >
        <svg aria-hidden="true" className="absolute size-0">
          <defs>
            <filter id={filterId} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -14"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>

        <div
          aria-hidden="true"
          data-slot="reorder-list-blobs"
          className="pointer-events-none absolute inset-0"
          style={{ filter: reduceMotion ? undefined : `url(#${filterId})` }}
        >
          {order.map((id) => {
            const isHeld = id === held;
            return (
              <motion.div
                key={id}
                data-slot="reorder-list-blob"
                className="absolute inset-x-0 top-0"
                style={{ ...blobStyle, y: yFor(id), zIndex: isHeld ? 2 : 1 }}
              >
                <motion.div
                  data-slot="reorder-list-skin"
                  className={cn(
                    "size-full bg-(--reorder-list-pill) shadow-xs",
                    stroke && "ring-1 ring-border ring-inset",
                  )}
                  style={{
                    borderRadius: radius,
                    ...(id === dragging ? { scaleX: skinX, scaleY: skinY, skewY: skew } : null),
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        <ol
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          data-slot="reorder-list-list"
          className="absolute inset-0 m-0 list-none p-0"
        >
          {order.map((id) => {
            const item = byId.get(id);
            if (!item) return null;
            const isHeld = id === held;
            const index = visual.indexOf(id);
            return (
              <motion.li
                key={id}
                data-slot="reorder-list-row"
                data-index={index}
                data-held={isHeld ? "" : undefined}
                className="absolute inset-x-0 top-0"
                style={{ height: PILL, y: yFor(id), zIndex: isHeld ? 2 : 1 }}
              >
                <button
                  ref={(node) => {
                    if (node) handles.current.set(id, node);
                    else handles.current.delete(id);
                  }}
                  type="button"
                  disabled={disabled}
                  aria-describedby={hintId}
                  aria-pressed={isHeld && dragging === null}
                  data-slot="reorder-list-handle"
                  data-grabbed={isHeld ? "" : undefined}
                  className={cn(
                    "flex size-full touch-none items-center gap-[0.6875rem] bg-transparent ps-1.5 pe-4 text-start",
                    "cursor-grab data-grabbed:cursor-grabbing",
                    focusRing,
                    disabledStyles,
                  )}
                  style={{ borderRadius: radius }}
                  onKeyDown={(event) => handleKeyDown(event, id)}
                  onBlur={() => {
                    if (grab.current?.id === id) cancelGrab();
                  }}
                  onPointerDown={(event) => handlePointerDown(event, id)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  {renderItem ? (
                    <>
                      <span aria-hidden="true" className="contents">
                        {renderItem(item, { grabbed: isHeld, index })}
                      </span>
                      <span className="sr-only">{item.label}</span>
                    </>
                  ) : (
                    <>
                      <motion.span
                        className="flex shrink-0"
                        initial={false}
                        animate={{ scale: isHeld ? 1.08 : 1 }}
                        transition={{ type: "spring", stiffness: 520, damping: 20 }}
                      >
                        <RowAvatar item={item} />
                      </motion.span>
                      <span data-slot="reorder-list-label" className="min-w-0 truncate">
                        {item.label}
                      </span>
                    </>
                  )}
                  {item.online ? <span className="sr-only">, online</span> : null}
                </button>
              </motion.li>
            );
          })}
        </ol>

        <span id={hintId} className="sr-only">
          {instructions}
        </span>
        <span role="status" aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </div>
    </MotionConfig>
  );
}

export { reorderListVariants };
